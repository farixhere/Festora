"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  programs,
  registrations,
  scheduleItems,
} from "@/lib/db/schema";
import type { EventStatus } from "@/lib/db/schema";
import { getUserOrNull, resolveActiveOrg } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/permissions/access";
import { can } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { isUniqueViolation } from "@/features/registrations/service";
import { SEAT_HOLDING_STATUSES } from "@/features/registrations/policy";
import { parseEventForm, publishBlockers } from "@/lib/validation/event";
import { randomSuffix, slugify } from "@/lib/utils/slug";
import {
  fail,
  formDataToObject,
  succeed,
  type ActionResult,
} from "@/lib/utils/result";

function newSlug(title: string): string {
  const base = slugify(title) || "event";
  return `${base}-${randomSuffix()}`;
}

export async function createEventAction(
  fd: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const active = await resolveActiveOrg(user.id);
  if (!active) return fail("Create an organization first.");
  if (!can(active.role, "event.create")) {
    return fail("You don't have permission to create events.");
  }

  const parsed = parseEventForm(formDataToObject(fd));
  if (!parsed.ok) {
    return fail("Please fix the highlighted fields.", parsed.fieldErrors);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [created] = await db
        .insert(events)
        .values({
          ...parsed.data,
          organizationId: active.org.id,
          slug: newSlug(parsed.data.title),
          status: "draft",
          createdBy: user.id,
        })
        .returning({ id: events.id });
      if (!created) return fail("Couldn't create the event.");
      await logActivity({
        organizationId: active.org.id,
        actorId: user.id,
        action: "event.create",
        entityType: "event",
        entityId: created.id,
        summary: `Created event “${parsed.data.title}”`,
      });
      return succeed({
        message: "Event saved as a draft.",
        data: { id: created.id },
        redirectTo: `/dashboard/events/${created.id}`,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) {
        console.error("createEvent failed", err);
        return fail("Couldn't create the event. Please try again.");
      }
      // Slug collision (extremely unlikely): retry with a new suffix.
    }
  }
  return fail("Couldn't create the event. Please try again.");
}

export async function updateEventAction(
  eventId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "event.edit");
  if (!access) return fail("Event not found.");

  const parsed = parseEventForm(formDataToObject(fd));
  if (!parsed.ok) {
    return fail("Please fix the highlighted fields.", parsed.fieldErrors);
  }

  if (parsed.data.capacity !== null) {
    const [row] = await db
      .select({ n: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          inArray(registrations.status, SEAT_HOLDING_STATUSES),
        ),
      );
    const active = row?.n ?? 0;
    if (parsed.data.capacity < active) {
      return fail("Capacity is lower than current registrations.", {
        capacity: `Already ${active} registered — capacity can't go below that.`,
      });
    }
  }

  if (access.event.status === "published") {
    const blockers = publishBlockers(parsed.data);
    if (blockers.length) {
      return fail(`Can't save a published event: ${blockers[0]}.`);
    }
  }

  // Existing programs/schedule items keep their instants; the schedule UI
  // flags any that now fall outside the event window.
  await db
    .update(events)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(events.id, eventId));

  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: "event.update",
    entityType: "event",
    entityId: eventId,
    summary: `Updated event “${parsed.data.title}”`,
  });
  return succeed({ message: "Event updated." });
}

const ALLOWED: Record<EventStatus, EventStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export async function setEventStatusAction(
  eventId: string,
  next: EventStatus,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "event.publish");
  if (!access) return fail("Event not found.");
  const { event } = access;

  if (!ALLOWED[event.status].includes(next)) {
    return fail(`A ${event.status} event can't be moved to ${next}.`);
  }
  if (next === "published") {
    const blockers = publishBlockers(event);
    if (blockers.length) return fail(`Can't publish yet: ${blockers[0]}.`);
  }

  await db
    .update(events)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(events.id, eventId));

  const verb =
    next === "published"
      ? "Published"
      : next === "archived"
        ? "Archived"
        : event.status === "archived"
          ? "Restored"
          : "Unpublished";
  await logActivity({
    organizationId: event.organizationId,
    actorId: user.id,
    action: `event.${next}`,
    entityType: "event",
    entityId: eventId,
    summary: `${verb} event “${event.title}”`,
  });
  return succeed({
    message:
      next === "published"
        ? "Event published — it's now live."
        : next === "archived"
          ? "Event archived."
          : event.status === "archived"
            ? "Event restored as a draft."
            : "Event unpublished and moved back to drafts.",
  });
}

export async function duplicateEventAction(
  eventId: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "event.create");
  if (!access) return fail("Event not found.");
  const src = access.event;

  try {
    const newId = await db.transaction(async (tx) => {
      const [copy] = await tx
        .insert(events)
        .values({
          organizationId: src.organizationId,
          slug: newSlug(src.title),
          title: `Copy of ${src.title}`.slice(0, 120),
          shortDescription: src.shortDescription,
          description: src.description,
          category: src.category,
          coverImage: src.coverImage,
          mode: src.mode,
          venue: src.venue,
          city: src.city,
          onlineUrl: src.onlineUrl,
          startsAt: src.startsAt,
          endsAt: src.endsAt,
          timezone: src.timezone,
          registrationOpensAt: src.registrationOpensAt,
          registrationClosesAt: src.registrationClosesAt,
          capacity: src.capacity,
          registrationEnabled: src.registrationEnabled,
          requiresApproval: src.requiresApproval,
          visibility: src.visibility,
          status: "draft",
          schedulePublished: false,
          organizerName: src.organizerName,
          organizerEmail: src.organizerEmail,
          createdBy: user.id,
        })
        .returning({ id: events.id });
      if (!copy) throw new Error("copy failed");

      const progs = await tx
        .select()
        .from(programs)
        .where(eq(programs.eventId, src.id));
      const idMap = new Map<string, string>();
      for (const p of progs) {
        const [np] = await tx
          .insert(programs)
          .values({
            eventId: copy.id,
            title: p.title,
            description: p.description,
            label: p.label,
            venue: p.venue,
            startsAt: p.startsAt,
            endsAt: p.endsAt,
            position: p.position,
          })
          .returning({ id: programs.id });
        if (np) idMap.set(p.id, np.id);
      }
      const items = await tx
        .select()
        .from(scheduleItems)
        .where(eq(scheduleItems.eventId, src.id));
      if (items.length) {
        await tx.insert(scheduleItems).values(
          items.map((i) => ({
            eventId: copy.id,
            programId: i.programId ? (idMap.get(i.programId) ?? null) : null,
            title: i.title,
            description: i.description,
            speaker: i.speaker,
            stage: i.stage,
            startsAt: i.startsAt,
            endsAt: i.endsAt,
            position: i.position,
          })),
        );
      }
      return copy.id;
    });

    await logActivity({
      organizationId: src.organizationId,
      actorId: user.id,
      action: "event.duplicate",
      entityType: "event",
      entityId: newId,
      summary: `Duplicated “${src.title}”`,
    });
    return succeed({
      message: "Event duplicated as a draft.",
      data: { id: newId },
      redirectTo: `/dashboard/events/${newId}`,
    });
  } catch (err) {
    console.error("duplicateEvent failed", err);
    return fail("Couldn't duplicate the event. Please try again.");
  }
}

/**
 * Deleting is permanent. Safeguards: owner/admin only, the title must be
 * typed to confirm, and events holding active registrations must be archived
 * (or have registrations cancelled) first so participant records are never
 * wiped by accident.
 */
export async function deleteEventAction(
  eventId: string,
  confirmTitle: string,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "event.delete");
  if (!access) return fail("Event not found or you can't delete it.");
  const { event } = access;

  if (confirmTitle.trim() !== event.title) {
    return fail("The title you typed doesn't match.");
  }
  const [row] = await db
    .select({ n: count() })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        inArray(registrations.status, SEAT_HOLDING_STATUSES),
      ),
    );
  if ((row?.n ?? 0) > 0) {
    return fail(
      `This event has ${row?.n} active registration(s). Archive it instead, or cancel the registrations first.`,
    );
  }

  await db.delete(events).where(eq(events.id, eventId));
  await logActivity({
    organizationId: event.organizationId,
    actorId: user.id,
    action: "event.delete",
    entityType: "event",
    entityId: eventId,
    summary: `Deleted event “${event.title}”`,
  });
  return succeed({ message: "Event deleted.", redirectTo: "/dashboard/events" });
}

export async function setSchedulePublishedAction(
  eventId: string,
  published: boolean,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "schedule.manage");
  if (!access) return fail("Event not found.");
  await db
    .update(events)
    .set({ schedulePublished: published, updatedAt: new Date() })
    .where(eq(events.id, eventId));
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: published ? "schedule.publish" : "schedule.unpublish",
    entityType: "event",
    entityId: eventId,
    summary: `${published ? "Published" : "Unpublished"} the schedule for “${access.event.title}”`,
  });
  return succeed({
    message: published ? "Schedule is now public." : "Schedule hidden from the public page.",
  });
}
