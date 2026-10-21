/**
 * Role → permission model (pure functions, unit-tested, no I/O).
 *
 * Roles within an organization:
 *   owner     – everything, including deleting the organization.
 *   admin     – everything except deleting the org / changing the owner.
 *   organizer – runs events: create/edit/publish, programs, schedule,
 *               registrations, announcements, participant export.
 *   viewer    – read-only access to events, schedule and registrations.
 *
 * Platform administration is separate (see lib/auth/admin.ts) and is never
 * derived from an organization role.
 */
import type { MemberRole } from "@/lib/db/schema";

export const PERMISSIONS = [
  "org.update",
  "org.delete",
  "members.manage",
  "event.view",
  "event.create",
  "event.edit",
  "event.publish",
  "event.delete",
  "program.manage",
  "schedule.manage",
  "registration.view",
  "registration.manage",
  "participants.export",
  "announcement.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ORGANIZER_PERMISSIONS: Permission[] = [
  "event.view",
  "event.create",
  "event.edit",
  "event.publish",
  "program.manage",
  "schedule.manage",
  "registration.view",
  "registration.manage",
  "participants.export",
  "announcement.manage",
];

const ROLE_PERMISSIONS: Record<MemberRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>(PERMISSIONS),
  admin: new Set<Permission>(
    PERMISSIONS.filter((p) => p !== "org.delete"),
  ),
  organizer: new Set<Permission>(ORGANIZER_PERMISSIONS),
  viewer: new Set<Permission>(["event.view", "registration.view"]),
};

export function can(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  organizer: "Organizer",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Full control, including deleting the organization.",
  admin: "Manage events, members and settings.",
  organizer: "Create and run events, registrations and announcements.",
  viewer: "Read-only access to events and registrations.",
};

/** Roles a given role may assign to other members. Owners are never assigned here. */
export function assignableRoles(actor: MemberRole): MemberRole[] {
  if (actor === "owner") return ["admin", "organizer", "viewer"];
  if (actor === "admin") return ["organizer", "viewer"];
  return [];
}

/**
 * Whether `actor` may change or remove a member currently holding `target`.
 * Nobody can modify an owner here; ownership is fixed to the organization's
 * owner_id and admins cannot modify other admins.
 */
export function canModifyMember(actor: MemberRole, target: MemberRole): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "admin") return target === "organizer" || target === "viewer";
  return false;
}
