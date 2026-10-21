"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, registrations } from "@/lib/db/schema";
import type { RegistrationStatus } from "@/lib/db/schema";
import { getUserOrNull } from "@/lib/auth/session";
import { getChildAccess } from "@/lib/permissions/access";
import { logActivity } from "@/lib/activity";
import { getClientIp, rateLimit } from "@/lib/utils/rate-limit";
import {
  fail,
  formDataToObject,
  succeed,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/utils/result";
import { registrationSchema } from "@/lib/validation/misc";
import { canTransition } from "./policy";
import { registerForEvent } from "./service";

/** Public: anyone may register; signed-in users are linked to the record. */
export async function registerAction(
  slug: string,
  fd: FormData,
): Promise<ActionResult<{ code: string; status: string }>> {
  const ip = await getClientIp();
  const limit = await rateLimit(`register:${ip}`, 10, 600);
  if (!limit.allowed) {
    return fail(
      `Too many attempts. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    );
  }

  const parsed = registrationSchema.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const user = await getUserOrNull();
  const result = await registerForEvent({
    slug,
    userId: user?.id ?? null,
    values: parsed.data,
  });
  if (!result.ok) return fail(result.error);

  return succeed({
    message:
      result.status === "confirmed"
        ? "You're registered!"
        : "Request sent — the organizers will review it.",
    data: { code: result.code, status: result.status },
    redirectTo: `/registrations/${result.code}`,
  });
}

/** Public: the unguessable code acts as the participant's capability. */
export async function cancelOwnRegistrationAction(
  code: string,
): Promise<ActionResult> {
  const ip = await getClientIp();
  const limit = await rateLimit(`cancel:${ip}`, 20, 600);
  if (!limit.allowed) return fail("Too many attempts. Please try again shortly.");

  const [row] = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      endsAt: events.endsAt,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(registrations.code, code))
    .limit(1);
  if (!row) return fail("Registration not found.");
  if (!canTransition(row.status, "cancelled")) {
    return fail("This registration can no longer be cancelled.");
  }
  if (row.endsAt.getTime() <= Date.now()) {
    return fail("This event has already ended.");
  }
  await db
    .update(registrations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(registrations.id, row.id));
  return succeed({ message: "Your registration was cancelled." });
}

/** Organizer: approve / reject / cancel. */
export async function updateRegistrationStatusAction(
  registrationId: string,
  next: RegistrationStatus,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  if (!["confirmed", "rejected", "cancelled"].includes(next)) {
    return fail("Invalid status.");
  }
  const access = await getChildAccess(
    "registration",
    registrationId,
    user.id,
    "registration.manage",
  );
  if (!access) return fail("Registration not found.");

  try {
    const outcome = await db.transaction(async (tx) => {
      const [reg] = await tx
        .select()
        .from(registrations)
        .where(eq(registrations.id, registrationId))
        .for("update");
      if (!reg) return { ok: false, error: "Registration not found." } as const;
      if (!canTransition(reg.status, next)) {
        return {
          ok: false,
          error: `A ${reg.status} registration can't be changed to ${next}.`,
        } as const;
      }
      await tx
        .update(registrations)
        .set({
          status: next,
          decidedAt: new Date(),
          decidedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(registrations.id, registrationId));
      return { ok: true, name: reg.fullName } as const;
    });
    if (!outcome.ok) return fail(outcome.error);

    await logActivity({
      organizationId: access.event.organizationId,
      actorId: user.id,
      action: `registration.${next}`,
      entityType: "registration",
      entityId: registrationId,
      summary: `${next === "confirmed" ? "Approved" : next === "rejected" ? "Rejected" : "Cancelled"} ${outcome.name} for ${access.event.title}`,
    });
    return succeed({
      message:
        next === "confirmed"
          ? "Registration approved."
          : next === "rejected"
            ? "Registration rejected."
            : "Registration cancelled.",
    });
  } catch (err) {
    console.error("updateRegistrationStatus failed", err);
    return fail("Couldn't update the registration. Please try again.");
  }
}

/** Organizer: edit permitted participant fields (email is immutable). */
export async function updateParticipantAction(
  registrationId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getChildAccess(
    "registration",
    registrationId,
    user.id,
    "registration.manage",
  );
  if (!access) return fail("Registration not found.");

  const raw = formDataToObject(fd);
  const parsed = registrationSchema
    .pick({ fullName: true, phone: true, institution: true, notes: true })
    .safeParse(raw);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }
  await db
    .update(registrations)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(registrations.id, registrationId),
        eq(registrations.eventId, access.event.id),
      ),
    );
  await logActivity({
    organizationId: access.event.organizationId,
    actorId: user.id,
    action: "registration.update",
    entityType: "registration",
    entityId: registrationId,
    summary: `Updated participant details for ${parsed.data.fullName}`,
  });
  return succeed({ message: "Participant updated." });
}
