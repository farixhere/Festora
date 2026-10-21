"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { getUserOrNull } from "@/lib/auth/session";
import { getChildAccess, getEventAccess } from "@/lib/permissions/access";
import { logActivity } from "@/lib/activity";
import { announcementSchema } from "@/lib/validation/items";
import {
  fail,
  formDataToObject,
  succeed,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/utils/result";

export async function createAnnouncementAction(
  eventId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getEventAccess(eventId, user.id, "announcement.manage");
  if (!access) return fail("Event not found.");

  const raw = formDataToObject(fd);
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const publish = raw.publish === "on";
  await db.insert(announcements).values({
    eventId,
    title: parsed.data.title,
    body: parsed.data.body,
    status: publish ? "published" : "draft",
    publishedAt: publish ? new Date() : null,
    createdBy: user.id,
  });
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: publish ? "announcement.publish" : "announcement.create",
    entityType: "announcement",
    summary: `${publish ? "Published" : "Drafted"} announcement “${parsed.data.title}” for ${access.event.title}`,
  });
  return succeed({
    message: publish ? "Announcement published." : "Announcement saved as a draft.",
  });
}

export async function updateAnnouncementAction(
  announcementId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess(
    "announcement",
    announcementId,
    user.id,
    "announcement.manage",
  );
  if (!access) return fail("Announcement not found.");

  const parsed = announcementSchema.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }
  await db
    .update(announcements)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(announcements.id, announcementId),
        eq(announcements.eventId, access.event.id),
      ),
    );
  return succeed({ message: "Announcement updated." });
}

export async function setAnnouncementPublishedAction(
  announcementId: string,
  published: boolean,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess(
    "announcement",
    announcementId,
    user.id,
    "announcement.manage",
  );
  if (!access) return fail("Announcement not found.");

  await db
    .update(announcements)
    .set({
      status: published ? "published" : "draft",
      // Publishing stamps the publication time; unpublishing keeps the last one.
      ...(published ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(announcements.id, announcementId),
        eq(announcements.eventId, access.event.id),
      ),
    );
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: published ? "announcement.publish" : "announcement.unpublish",
    entityType: "announcement",
    entityId: announcementId,
    summary: `${published ? "Published" : "Unpublished"} an announcement for ${access.event.title}`,
  });
  return succeed({
    message: published ? "Announcement published." : "Announcement unpublished.",
  });
}

export async function deleteAnnouncementAction(
  announcementId: string,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess(
    "announcement",
    announcementId,
    user.id,
    "announcement.manage",
  );
  if (!access) return fail("Announcement not found.");
  await db
    .delete(announcements)
    .where(
      and(
        eq(announcements.id, announcementId),
        eq(announcements.eventId, access.event.id),
      ),
    );
  return succeed({ message: "Announcement deleted." });
}
