"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { programs, scheduleItems } from "@/lib/db/schema";
import { getUserOrNull } from "@/lib/auth/session";
import { getChildAccess, getEventAccess } from "@/lib/permissions/access";
import { logActivity } from "@/lib/activity";
import { parseScheduleForm } from "@/lib/validation/items";
import {
  fail,
  formDataToObject,
  succeed,
  type ActionResult,
} from "@/lib/utils/result";

/** A session may only reference a program of the SAME event. */
async function programBelongsToEvent(programId: string, eventId: string) {
  const [row] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.eventId, eventId)))
    .limit(1);
  return Boolean(row);
}

export async function createScheduleItemAction(
  eventId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "schedule.manage");
  if (!access) return fail("Event not found.");

  const parsed = parseScheduleForm(formDataToObject(fd), access.event);
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.fieldErrors);
  if (
    parsed.data.programId &&
    !(await programBelongsToEvent(parsed.data.programId, eventId))
  ) {
    return fail("Please fix the highlighted fields.", {
      programId: "Choose a program from this event",
    });
  }

  await db.insert(scheduleItems).values({ ...parsed.data, eventId });
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: "schedule.create",
    entityType: "schedule_item",
    summary: `Added session “${parsed.data.title}” to ${access.event.title}`,
  });
  return succeed({ message: "Session added to the schedule." });
}

export async function updateScheduleItemAction(
  itemId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess("schedule", itemId, user.id, "schedule.manage");
  if (!access) return fail("Session not found.");

  const parsed = parseScheduleForm(formDataToObject(fd), access.event);
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.fieldErrors);
  if (
    parsed.data.programId &&
    !(await programBelongsToEvent(parsed.data.programId, access.event.id))
  ) {
    return fail("Please fix the highlighted fields.", {
      programId: "Choose a program from this event",
    });
  }

  await db
    .update(scheduleItems)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(eq(scheduleItems.id, itemId), eq(scheduleItems.eventId, access.event.id)),
    );
  return succeed({ message: "Session updated." });
}

export async function deleteScheduleItemAction(itemId: string): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess("schedule", itemId, user.id, "schedule.manage");
  if (!access) return fail("Session not found.");
  await db
    .delete(scheduleItems)
    .where(
      and(eq(scheduleItems.id, itemId), eq(scheduleItems.eventId, access.event.id)),
    );
  return succeed({ message: "Session removed." });
}
