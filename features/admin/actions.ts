"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getUserOrNull } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/permissions/access";
import { logActivity } from "@/lib/activity";
import { fail, succeed, type ActionResult } from "@/lib/utils/result";

/**
 * Platform administrators can hide an event from public discovery and
 * registration (e.g. after a report). The organizer keeps full access and is
 * not notified automatically. Every use is recorded in the audit log.
 */
export async function setEventHiddenByAdminAction(
  eventId: string,
  hidden: boolean,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user || !isPlatformAdmin(user.id)) return fail("Not found.");
  if (!isUuid(eventId)) return fail("Event not found.");

  const [event] = await db
    .update(events)
    .set({ hiddenByAdmin: hidden, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning({
      id: events.id,
      title: events.title,
      organizationId: events.organizationId,
    });
  if (!event) return fail("Event not found.");

  await logActivity({
    organizationId: event.organizationId,
    actorId: user.id,
    action: hidden ? "admin.event.hide" : "admin.event.unhide",
    entityType: "event",
    entityId: event.id,
    summary: `Platform admin ${hidden ? "hid" : "restored"} “${event.title}”`,
    metadata: { platformAdmin: true },
  });
  return succeed({
    message: hidden ? "Event hidden from the public site." : "Event restored.",
  });
}
