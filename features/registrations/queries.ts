import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, registrations } from "@/lib/db/schema";
import type { Registration, RegistrationStatus } from "@/lib/db/schema";
import { escapeLike } from "@/features/events/queries";
import { TABLE_PAGE_SIZE } from "@/lib/constants";

export type RegistrationRow = Registration & {
  eventTitle: string;
  eventTimezone: string;
};

export type RegistrationFilters = {
  orgId: string;
  eventId?: string;
  status?: RegistrationStatus | "all";
  q?: string;
  page?: number;
  pageSize?: number;
};

function buildWhere(f: RegistrationFilters) {
  // ALWAYS scoped to the organization through the events join.
  const conds = [eq(events.organizationId, f.orgId)];
  if (f.eventId) conds.push(eq(registrations.eventId, f.eventId));
  if (f.status && f.status !== "all") conds.push(eq(registrations.status, f.status));
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`;
    conds.push(
      or(ilike(registrations.fullName, like), ilike(registrations.email, like))!,
    );
  }
  return and(...conds);
}

export async function listRegistrations(f: RegistrationFilters) {
  const pageSize = f.pageSize ?? TABLE_PAGE_SIZE;
  const page = Math.max(1, f.page ?? 1);
  const where = buildWhere(f);

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(where);

  const rows = await db
    .select({
      reg: registrations,
      eventTitle: events.title,
      eventTimezone: events.timezone,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(where)
    .orderBy(desc(registrations.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items: RegistrationRow[] = rows.map((r) => ({
    ...r.reg,
    eventTitle: r.eventTitle,
    eventTimezone: r.eventTimezone,
  }));
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** All rows for CSV export (capped). */
export async function listRegistrationsForExport(f: RegistrationFilters) {
  const rows = await db
    .select({ reg: registrations, eventTitle: events.title })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(buildWhere(f))
    .orderBy(desc(registrations.createdAt))
    .limit(20000);
  return rows.map((r) => ({ ...r.reg, eventTitle: r.eventTitle }));
}

export type StatusCounts = Record<RegistrationStatus, number>;

export async function getStatusCounts(eventId: string): Promise<StatusCounts> {
  const rows = await db
    .select({ status: registrations.status, n: count() })
    .from(registrations)
    .where(eq(registrations.eventId, eventId))
    .groupBy(registrations.status);
  const out: StatusCounts = { pending: 0, confirmed: 0, rejected: 0, cancelled: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/** Public confirmation page: looked up by the unguessable code only. */
export async function getRegistrationByCode(code: string) {
  const [row] = await db
    .select({
      reg: registrations,
      title: events.title,
      slug: events.slug,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      timezone: events.timezone,
      venue: events.venue,
      city: events.city,
      mode: events.mode,
      onlineUrl: events.onlineUrl,
      eventStatus: events.status,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(registrations.code, code))
    .limit(1);
  return row ?? null;
}

export async function listUserRegistrations(userId: string) {
  return db
    .select({
      reg: registrations,
      title: events.title,
      slug: events.slug,
      startsAt: events.startsAt,
      timezone: events.timezone,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(registrations.userId, userId))
    .orderBy(desc(registrations.createdAt))
    .limit(100);
}
