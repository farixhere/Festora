import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  organizationMembers,
  organizations,
  programs,
  scheduleItems,
  announcements,
  registrations,
} from "@/lib/db/schema";
import type { Event, MemberRole } from "@/lib/db/schema";
import { can, type Permission } from "@/lib/permissions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type EventAccess = { event: Event; role: MemberRole };

/**
 * Loads an event ONLY if `userId` is a member of the event's organization.
 * Membership is checked against the event's own organization (not the
 * "active org" cookie), so changing a URL or payload can never expose
 * another organization's data. Returns null when missing OR forbidden, so
 * callers respond identically and don't leak existence.
 */
export async function getEventAccess(
  eventId: string,
  userId: string,
  permission: Permission = "event.view",
): Promise<EventAccess | null> {
  if (!isUuid(eventId)) return null;
  const [row] = await db
    .select({ event: events, role: organizationMembers.role })
    .from(events)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, events.organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .where(eq(events.id, eventId))
    .limit(1);
  if (!row || !can(row.role, permission)) return null;
  return row;
}

/** Same check for a child record (program/schedule item/announcement/registration). */
async function childEventId(
  table: "program" | "schedule" | "announcement" | "registration",
  id: string,
): Promise<string | null> {
  if (!isUuid(id)) return null;
  switch (table) {
    case "program": {
      const [r] = await db
        .select({ eventId: programs.eventId })
        .from(programs)
        .where(eq(programs.id, id))
        .limit(1);
      return r?.eventId ?? null;
    }
    case "schedule": {
      const [r] = await db
        .select({ eventId: scheduleItems.eventId })
        .from(scheduleItems)
        .where(eq(scheduleItems.id, id))
        .limit(1);
      return r?.eventId ?? null;
    }
    case "announcement": {
      const [r] = await db
        .select({ eventId: announcements.eventId })
        .from(announcements)
        .where(eq(announcements.id, id))
        .limit(1);
      return r?.eventId ?? null;
    }
    case "registration": {
      const [r] = await db
        .select({ eventId: registrations.eventId })
        .from(registrations)
        .where(eq(registrations.id, id))
        .limit(1);
      return r?.eventId ?? null;
    }
  }
}

export async function getChildAccess(
  table: "program" | "schedule" | "announcement" | "registration",
  id: string,
  userId: string,
  permission: Permission,
): Promise<EventAccess | null> {
  const eventId = await childEventId(table, id);
  if (!eventId) return null;
  return getEventAccess(eventId, userId, permission);
}

/** Organization-level check (settings, members). */
export async function getOrgAccess(
  organizationId: string,
  userId: string,
  permission: Permission,
) {
  if (!isUuid(organizationId)) return null;
  const [row] = await db
    .select({ org: organizations, role: organizationMembers.role })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, organizations.id),
        eq(organizationMembers.userId, userId),
      ),
    )
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!row || !can(row.role, permission)) return null;
  return row;
}
