import type { RegistrationStatus } from "@/lib/db/schema";

/**
 * SEAT POLICY (documented, enforced in the registration transaction):
 *
 *  - "pending" and "confirmed" registrations HOLD a seat.
 *  - "cancelled" and "rejected" registrations FREE their seat immediately.
 *  - Approving a pending registration never changes seat usage, so it can
 *    never overbook an event.
 *  - Cancelled/rejected registrations are terminal: they cannot be
 *    reinstated (that would need a fresh capacity check). The person simply
 *    registers again, subject to capacity at that moment.
 */
export const SEAT_HOLDING_STATUSES: RegistrationStatus[] = ["pending", "confirmed"];

export function holdsSeat(status: RegistrationStatus): boolean {
  return SEAT_HOLDING_STATUSES.includes(status);
}

const TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["cancelled"],
  rejected: [],
  cancelled: [],
};

export function canTransition(
  from: RegistrationStatus,
  to: RegistrationStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export type RegistrationWindowState =
  | "open"
  | "not_started"
  | "closed"
  | "ended"
  | "disabled";

/** Pure deadline logic shared by the server check and the public page UI. */
export function registrationWindow(
  event: {
    registrationEnabled: boolean;
    registrationOpensAt: Date | null;
    registrationClosesAt: Date | null;
    endsAt: Date;
  },
  now = new Date(),
): RegistrationWindowState {
  if (!event.registrationEnabled) return "disabled";
  if (event.endsAt.getTime() <= now.getTime()) return "ended";
  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    return "not_started";
  }
  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    return "closed";
  }
  return "open";
}
