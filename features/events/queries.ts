import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  ne,
  or,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  announcements,
  events,
  organizations,
  programs,
  scheduleItems,
} from "@/lib/db/schema";
import type {
  Announcement,
  Event,
  EventStatus,
  Program,
  ScheduleItem,
} from "@/lib/db/schema";
import { getSeatCounts } from "@/features/registrations/service";
import { PAGE_SIZE, TABLE_PAGE_SIZE } from "@/lib/constants";

/** Escape %, _ and \ so user text is matched literally by ILIKE. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** The subset of an event that is safe to show publicly. */
export type PublicEvent = Omit<
  Event,
  "createdBy" | "hiddenByAdmin" | "organizationId" | "createdAt" | "updatedAt"
>;

export function toPublicEvent(e: Event): PublicEvent {
  // Explicit allow-list: new private columns never leak by accident.
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    shortDescription: e.shortDescription,
    description: e.description,
    category: e.category,
    coverImage: e.coverImage,
    mode: e.mode,
    venue: e.venue,
    city: e.city,
    onlineUrl: e.mode === "in_person" ? "" : e.onlineUrl,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    timezone: e.timezone,
    registrationOpensAt: e.registrationOpensAt,
    registrationClosesAt: e.registrationClosesAt,
    capacity: e.capacity,
    registrationEnabled: e.registrationEnabled,
    requiresApproval: e.requiresApproval,
    visibility: e.visibility,
    status: e.status,
    schedulePublished: e.schedulePublished,
    organizerName: e.organizerName,
    organizerEmail: e.organizerEmail,
  };
}

export type PublicEventCardData = {
  event: PublicEvent;
  orgName: string;
  seatsTaken: number;
};

const publicWhere = () =>
  and(
    eq(events.status, "published"),
    eq(events.visibility, "public"),
    eq(events.hiddenByAdmin, false),
    gt(events.endsAt, new Date()),
  );

export type PublicListParams = {
  q?: string;
  category?: string;
  city?: string;
  sort?: "soonest" | "latest";
  page?: number;
  pageSize?: number;
};

export async function listPublicEvents(params: PublicListParams) {
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const conds = [publicWhere()];
  if (params.q) {
    const like = `%${escapeLike(params.q)}%`;
    conds.push(
      or(
        ilike(events.title, like),
        ilike(events.shortDescription, like),
        ilike(events.city, like),
      )!,
    );
  }
  if (params.category) conds.push(eq(events.category, params.category));
  if (params.city) conds.push(eq(events.city, params.city));
  const where = and(...conds);

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(events)
    .where(where);

  const rows = await db
    .select({ event: events, orgName: organizations.name })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(where)
    .orderBy(
      params.sort === "latest" ? desc(events.createdAt) : asc(events.startsAt),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const seats = await getSeatCounts(rows.map((r) => r.event.id));
  const items: PublicEventCardData[] = rows.map((r) => ({
    event: toPublicEvent(r.event),
    orgName: r.orgName,
    seatsTaken: seats.get(r.event.id) ?? 0,
  }));
  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listPublicCities(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: events.city })
    .from(events)
    .where(and(publicWhere(), ne(events.city, "")))
    .orderBy(asc(events.city));
  return rows.map((r) => r.city);
}

export async function getFeaturedEvents(limit = 3): Promise<PublicEventCardData[]> {
  const res = await listPublicEvents({ pageSize: limit, sort: "soonest" });
  return res.items;
}

export type PublicEventDetail = {
  event: PublicEvent;
  orgName: string;
  seatsTaken: number;
  programs: Program[];
  schedule: ScheduleItem[];
  announcements: Pick<Announcement, "id" | "title" | "body" | "publishedAt">[];
};

/**
 * Public event page data. Draft/archived/admin-hidden events return null.
 * "Unlisted" events are reachable by their link but never listed.
 */
export async function getPublicEventBySlug(
  slug: string,
): Promise<PublicEventDetail | null> {
  const [row] = await db
    .select({ event: events, orgName: organizations.name })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(
      and(
        eq(events.slug, slug),
        eq(events.status, "published"),
        eq(events.hiddenByAdmin, false),
      ),
    )
    .limit(1);
  if (!row) return null;

  const id = row.event.id;
  const [seats, progs, items, notes] = await Promise.all([
    getSeatCounts([id]),
    row.event.schedulePublished
      ? db
          .select()
          .from(programs)
          .where(eq(programs.eventId, id))
          .orderBy(asc(programs.position), asc(programs.startsAt))
      : Promise.resolve([] as Program[]),
    row.event.schedulePublished
      ? db
          .select()
          .from(scheduleItems)
          .where(eq(scheduleItems.eventId, id))
          .orderBy(asc(scheduleItems.startsAt), asc(scheduleItems.position))
      : Promise.resolve([] as ScheduleItem[]),
    db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        publishedAt: announcements.publishedAt,
      })
      .from(announcements)
      .where(
        and(eq(announcements.eventId, id), eq(announcements.status, "published")),
      )
      .orderBy(desc(announcements.publishedAt))
      .limit(20),
  ]);

  return {
    event: toPublicEvent(row.event),
    orgName: row.orgName,
    seatsTaken: seats.get(id) ?? 0,
    programs: progs,
    schedule: items,
    announcements: notes,
  };
}

/** Organizer preview: same shape as the public page, for ANY status. */
export async function getEventPreview(event: Event): Promise<PublicEventDetail> {
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, event.organizationId))
    .limit(1);
  const [seats, progs, items, notes] = await Promise.all([
    getSeatCounts([event.id]),
    listPrograms(event.id),
    listScheduleItems(event.id),
    db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        publishedAt: announcements.publishedAt,
      })
      .from(announcements)
      .where(and(eq(announcements.eventId, event.id), eq(announcements.status, "published")))
      .orderBy(desc(announcements.publishedAt))
      .limit(20),
  ]);
  return {
    // Preview always shows the schedule so organizers can check it.
    event: { ...toPublicEvent(event), schedulePublished: true },
    orgName: org?.name ?? "",
    seatsTaken: seats.get(event.id) ?? 0,
    programs: progs,
    schedule: items,
    announcements: notes,
  };
}

export async function listPublishedSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return db
    .select({ slug: events.slug, updatedAt: events.updatedAt })
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        eq(events.visibility, "public"),
        eq(events.hiddenByAdmin, false),
      ),
    )
    .limit(5000);
}

/* ───────────── Organizer-side ───────────── */

export type OrgEventRow = { event: Event; seatsTaken: number };

export async function listOrgEvents(args: {
  orgId: string;
  q?: string;
  status?: EventStatus | "all";
  page?: number;
  pageSize?: number;
}) {
  const pageSize = args.pageSize ?? TABLE_PAGE_SIZE;
  const page = Math.max(1, args.page ?? 1);
  const conds = [eq(events.organizationId, args.orgId)];
  if (args.status && args.status !== "all") conds.push(eq(events.status, args.status));
  if (args.q) conds.push(ilike(events.title, `%${escapeLike(args.q)}%`));
  const where = and(...conds);

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(events)
    .where(where);
  const rows = await db
    .select()
    .from(events)
    .where(where)
    .orderBy(desc(events.startsAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const seats = await getSeatCounts(rows.map((r) => r.id));
  const items: OrgEventRow[] = rows.map((event) => ({
    event,
    seatsTaken: seats.get(event.id) ?? 0,
  }));
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listOrgEventOptions(orgId: string) {
  return db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(eq(events.organizationId, orgId))
    .orderBy(desc(events.startsAt))
    .limit(200);
}

export async function listPrograms(eventId: string): Promise<Program[]> {
  return db
    .select()
    .from(programs)
    .where(eq(programs.eventId, eventId))
    .orderBy(asc(programs.position), asc(programs.startsAt));
}

export async function listScheduleItems(eventId: string): Promise<ScheduleItem[]> {
  return db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.eventId, eventId))
    .orderBy(asc(scheduleItems.startsAt), asc(scheduleItems.position));
}

export async function listEventAnnouncements(eventId: string): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.eventId, eventId))
    .orderBy(desc(announcements.createdAt));
}

export async function listOrgAnnouncements(
  orgId: string,
): Promise<(Announcement & { eventTitle: string })[]> {
  const rows = await db
    .select({ a: announcements, eventTitle: events.title })
    .from(announcements)
    .innerJoin(events, eq(events.id, announcements.eventId))
    .where(eq(events.organizationId, orgId))
    .orderBy(desc(announcements.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...r.a, eventTitle: r.eventTitle }));
}

export async function getEventsByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(events).where(inArray(events.id, ids));
}
