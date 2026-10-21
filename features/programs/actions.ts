"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { getUserOrNull } from "@/lib/auth/session";
import { getChildAccess, getEventAccess } from "@/lib/permissions/access";
import { logActivity } from "@/lib/activity";
import { parseProgramForm } from "@/lib/validation/items";
import {
  fail,
  formDataToObject,
  succeed,
  type ActionResult,
} from "@/lib/utils/result";

export async function createProgramAction(
  eventId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "program.manage");
  if (!access) return fail("Event not found.");

  const parsed = parseProgramForm(formDataToObject(fd), access.event);
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.fieldErrors);

  const [last] = await db
    .select({ max: sql<number>`coalesce(max(${programs.position}), -1)` })
    .from(programs)
    .where(eq(programs.eventId, eventId));
  await db.insert(programs).values({
    ...parsed.data,
    eventId,
    position: Number(last?.max ?? -1) + 1,
  });
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: "program.create",
    entityType: "program",
    summary: `Added program “${parsed.data.title}” to ${access.event.title}`,
  });
  return succeed({ message: "Program added." });
}

export async function updateProgramAction(
  programId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess("program", programId, user.id, "program.manage");
  if (!access) return fail("Program not found.");

  const parsed = parseProgramForm(formDataToObject(fd), access.event);
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.fieldErrors);

  await db
    .update(programs)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(programs.id, programId), eq(programs.eventId, access.event.id)));
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: "program.update",
    entityType: "program",
    entityId: programId,
    summary: `Updated program “${parsed.data.title}”`,
  });
  return succeed({ message: "Program updated." });
}

export async function deleteProgramAction(programId: string): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess("program", programId, user.id, "program.manage");
  if (!access) return fail("Program not found.");

  await db
    .delete(programs)
    .where(and(eq(programs.id, programId), eq(programs.eventId, access.event.id)));
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: "program.delete",
    entityType: "program",
    entityId: programId,
    summary: `Deleted a program from ${access.event.title}`,
  });
  return succeed({ message: "Program deleted." });
}

/** Swap with the neighbour above/below; positions are re-normalised to 0..n-1. */
export async function moveProgramAction(
  programId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess("program", programId, user.id, "program.manage");
  if (!access) return fail("Program not found.");

  await db.transaction(async (tx) => {
    const siblings = await tx
      .select({ id: programs.id })
      .from(programs)
      .where(eq(programs.eventId, access.event.id))
      .orderBy(asc(programs.position), asc(programs.startsAt), asc(programs.id))
      .for("update");
    const ids = siblings.map((s) => s.id);
    const i = ids.indexOf(programId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    for (let pos = 0; pos < ids.length; pos++) {
      await tx
        .update(programs)
        .set({ position: pos })
        .where(eq(programs.id, ids[pos]!));
    }
  });
  return succeed();
}
