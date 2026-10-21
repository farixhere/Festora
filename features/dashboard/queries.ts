import "server-only";
import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, events, registrations, user } from "@/lib/db/schema";
import type { Event } from "@/lib/db/schema";
import { getSeatCounts } from "@/features/registrations/service";

export type DashboardData = {
  totals: {
    events: number;
    published: number;
    drafts: number;
    archived: number;
    registrations: number;
    pending: number;
    confirmed: number;
  };
  upcoming: { event: Event; seatsTaken: number }[];
  recentRegistrations: {
    id: string;
    fullName: string;
    email: string;
    status: string;
    createdAt: Date;
    eventId: string;
    eventTitle: string;
  }[];
  registrationsByDay: { day: string; count: number }[];
  registrationsByEvent: { title: string; count: number }[];
  activity: {
    id: string;
    summary: string;
    createdAt: Date;
    actorName: string | null;
  }[];
};

export async function getDashboardData(orgId: string): Promise<DashboardData> {
  const now = new Date();
  const since = new Date(now.getTime() - 13 * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const [eventCounts, regCounts, upcomingRows, recent, byDay, byEvent, activityRows] =
    await Promise.all([
      db
        .select({ status: events.status, n: count() })
        .from(events)
        .where(eq(events.organizationId, orgId))
        .groupBy(events.status),
      db
        .select({ status: registrations.status, n: count() })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(eq(events.organizationId, orgId))
        .groupBy(registrations.status),
      db
        .select()
        .from(events)
        .where(
          and(
            eq(events.organizationId, orgId),
            eq(events.status, "published"),
            gte(events.endsAt, now),
          ),
        )
        .orderBy(asc(events.startsAt))
        .limit(5),
      db
        .select({
          id: registrations.id,
          fullName: registrations.fullName,
          email: registrations.email,
          status: registrations.status,
          createdAt: registrations.createdAt,
          eventId: events.id,
          eventTitle: events.title,
        })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(eq(events.organizationId, orgId))
        .orderBy(desc(registrations.createdAt))
        .limit(6),
      db
        .select({
          day: sql<string>`to_char(${registrations.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
          n: count(),
        })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(
          and(eq(events.organizationId, orgId), gte(registrations.createdAt, since)),
        )
        .groupBy(sql`1`),
      db
        .select({ title: events.title, n: count() })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(
          and(
            eq(events.organizationId, orgId),
            inArray(registrations.status, ["pending", "confirmed"]),
          ),
        )
        .groupBy(events.id, events.title)
        .orderBy(desc(count()))
        .limit(6),
      db
        .select({
          id: activityLogs.id,
          summary: activityLogs.summary,
          createdAt: activityLogs.createdAt,
          actorName: user.name,
        })
        .from(activityLogs)
        .leftJoin(user, eq(user.id, activityLogs.actorId))
        .where(eq(activityLogs.organizationId, orgId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(8),
    ]);

  const ev = { draft: 0, published: 0, archived: 0 };
  for (const r of eventCounts) ev[r.status] = r.n;
  const rg = { pending: 0, confirmed: 0, rejected: 0, cancelled: 0 };
  for (const r of regCounts) rg[r.status] = r.n;

  const seats = await getSeatCounts(upcomingRows.map((e) => e.id));

  // Fill every one of the last 14 days so the chart has no gaps.
  const dayMap = new Map(byDay.map((d) => [d.day, d.n]));
  const registrationsByDay: { day: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    registrationsByDay.push({ day: key, count: dayMap.get(key) ?? 0 });
  }

  return {
    totals: {
      events: ev.draft + ev.published + ev.archived,
      published: ev.published,
      drafts: ev.draft,
      archived: ev.archived,
      registrations: rg.pending + rg.confirmed + rg.rejected + rg.cancelled,
      pending: rg.pending,
      confirmed: rg.confirmed,
    },
    upcoming: upcomingRows.map((event) => ({
      event,
      seatsTaken: seats.get(event.id) ?? 0,
    })),
    recentRegistrations: recent,
    registrationsByDay,
    registrationsByEvent: byEvent.map((r) => ({ title: r.title, count: r.n })),
    activity: activityRows,
  };
}

export type PlatformStats = {
  users: number;
  organizations: number;
  events: number;
  publishedEvents: number;
  registrations: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const q = (table: string) =>
    db.execute(sql.raw(`select count(*)::int as n from "${table}"`));
  const [u, o, e, r, p] = await Promise.all([
    q("user"),
    q("organizations"),
    q("events"),
    q("registrations"),
    db.execute(sql`select count(*)::int as n from events where status = 'published'`),
  ]);
  const n = (res: { rows: unknown[] }) =>
    Number((res.rows[0] as { n: number } | undefined)?.n ?? 0);
  return {
    users: n(u),
    organizations: n(o),
    events: n(e),
    publishedEvents: n(p),
    registrations: n(r),
  };
}
