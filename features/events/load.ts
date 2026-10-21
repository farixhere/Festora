import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getEventAccess } from "@/lib/permissions/access";

/**
 * Per-request cached event loader for dashboard pages. Returns the event and
 * the user's role in the event's OWN organization, or renders 404 when the
 * event doesn't exist or belongs to an organization the user isn't part of.
 * Callers check finer permissions with `can(role, …)`.
 */
export const loadEventOr404 = cache(async (eventId: string, userId: string) => {
  const access = await getEventAccess(eventId, userId, "event.view");
  if (!access) notFound();
  return access;
});
