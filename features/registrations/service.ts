import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, registrations } from "@/lib/db/schema";
import { newRegistrationCode } from "@/lib/utils/slug";
import { formatDateTime } from "@/lib/utils/dates";
import { SEAT_HOLDING_STATUSES, registrationWindow } from "./policy";

export type RegistrationValues = {
  fullName: string;
  email: string;
  phone: string;
  institution: string;
  notes: string;
};

export type RegisterResult =
  | { ok: true; code: string; status: "pending" | "confirmed" }
  | { ok: false; error: string };

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Creates a registration atomically.
 *
 * The event row is locked (SELECT … FOR UPDATE) for the duration of the
 * transaction, so concurrent registrations for the same event are
 * serialized: the seat count read below cannot change before our insert
 * commits. A partial unique index on (event_id, email) for active
 * registrations is the final backstop against duplicates.
 */
export async function registerForEvent(args: {
  slug: string;
  userId: string | null;
  values: RegistrationValues;
}): Promise<RegisterResult> {
  try {
    return await db.transaction(async (tx): Promise<RegisterResult> => {
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.slug, args.slug))
        .for("update");

      if (!event || event.status !== "published" || event.hiddenByAdmin) {
        return { ok: false, error: "This event isn't open for registration." };
      }

      const now = new Date();
      const state = registrationWindow(event, now);
      if (state === "disabled") {
        return { ok: false, error: "Registration is not open for this event." };
      }
      if (state === "ended") {
        return { ok: false, error: "This event has already ended." };
      }
      if (state === "not_started" && event.registrationOpensAt) {
        return {
          ok: false,
          error: `Registration opens ${formatDateTime(event.registrationOpensAt, event.timezone)}.`,
        };
      }
      if (state === "closed") {
        return { ok: false, error: "Registration for this event has closed." };
      }

      const [existing] = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, event.id),
            eq(registrations.email, args.values.email),
            inArray(registrations.status, SEAT_HOLDING_STATUSES),
          ),
        )
        .limit(1);
      if (existing) {
        return {
          ok: false,
          error: "This email is already registered for the event.",
        };
      }

      if (event.capacity !== null) {
        const [row] = await tx
          .select({ n: count() })
          .from(registrations)
          .where(
            and(
              eq(registrations.eventId, event.id),
              inArray(registrations.status, SEAT_HOLDING_STATUSES),
            ),
          );
        if ((row?.n ?? 0) >= event.capacity) {
          return { ok: false, error: "Sorry, this event is full." };
        }
      }

      const status = event.requiresApproval ? "pending" : "confirmed";
      const code = newRegistrationCode();
      await tx.insert(registrations).values({
        eventId: event.id,
        userId: args.userId,
        code,
        fullName: args.values.fullName,
        email: args.values.email,
        phone: args.values.phone,
        institution: args.values.institution,
        notes: args.values.notes,
        status,
        decidedAt: status === "confirmed" ? now : null,
      });
      return { ok: true, code, status };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        error: "This email is already registered for the event.",
      };
    }
    console.error("registerForEvent failed", err);
    return {
      ok: false,
      error: "We couldn't complete your registration. Please try again.",
    };
  }
}

/** Active seat count per event (pending + confirmed). */
export async function getSeatCounts(
  eventIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (eventIds.length === 0) return map;
  const rows = await db
    .select({ eventId: registrations.eventId, n: count() })
    .from(registrations)
    .where(
      and(
        inArray(registrations.eventId, eventIds),
        inArray(registrations.status, SEAT_HOLDING_STATUSES),
      ),
    )
    .groupBy(registrations.eventId);
  for (const r of rows) map.set(r.eventId, r.n);
  return map;
}
