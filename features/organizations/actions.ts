"use server";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  user as userTable,
} from "@/lib/db/schema";
import {
  ACTIVE_ORG_COOKIE,
  getMembership,
  getUserOrNull,
  resolveActiveOrg,
} from "@/lib/auth/session";
import { getOrgAccess } from "@/lib/permissions/access";
import { assignableRoles, canModifyMember } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { isUniqueViolation } from "@/features/registrations/service";
import { randomSuffix, slugify } from "@/lib/utils/slug";
import {
  fail,
  formDataToObject,
  succeed,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/utils/result";
import {
  addMemberSchema,
  memberRoleSchema,
  organizationSchema,
} from "@/lib/validation/misc";

async function setActiveOrgCookie(orgId: string) {
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createOrganizationAction(
  fd: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");

  const parsed = organizationSchema.safeParse({
    description: "",
    website: "",
    ...formDataToObject(fd),
  });
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const org = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(organizations)
          .values({
            name: parsed.data.name,
            slug: `${slugify(parsed.data.name) || "org"}-${randomSuffix()}`,
            description: parsed.data.description || null,
            website: parsed.data.website || null,
            ownerId: user.id,
          })
          .returning({ id: organizations.id });
        if (!created) throw new Error("insert failed");
        await tx.insert(organizationMembers).values({
          organizationId: created.id,
          userId: user.id,
          role: "owner",
        });
        return created;
      });
      await setActiveOrgCookie(org.id);
      await logActivity({
        organizationId: org.id,
        actorId: user.id,
        action: "organization.create",
        entityType: "organization",
        entityId: org.id,
        summary: `Created organization “${parsed.data.name}”`,
      });
      return succeed({
        message: "Organization created.",
        data: { id: org.id },
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (!isUniqueViolation(err)) {
        console.error("createOrganization failed", err);
        return fail("Couldn't create the organization. Please try again.");
      }
    }
  }
  return fail("Couldn't create the organization. Please try again.");
}

export async function switchOrganizationAction(orgId: string): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const role = await getMembership(user.id, orgId);
  if (!role) return fail("You're not a member of that organization.");
  await setActiveOrgCookie(orgId);
  return succeed({ redirectTo: "/dashboard" });
}

export async function updateOrganizationAction(
  orgId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getOrgAccess(orgId, user.id, "org.update");
  if (!access) return fail("You don't have permission to edit this organization.");

  const parsed = organizationSchema.safeParse({
    description: "",
    website: "",
    ...formDataToObject(fd),
  });
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }
  await db
    .update(organizations)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    action: "organization.update",
    entityType: "organization",
    entityId: orgId,
    summary: "Updated organization details",
  });
  return succeed({ message: "Organization updated." });
}

/** Adds an EXISTING Festora account (by email) to the organization. */
export async function addMemberAction(
  orgId: string,
  fd: FormData,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getOrgAccess(orgId, user.id, "members.manage");
  if (!access) return fail("You don't have permission to manage members.");

  const parsed = addMemberSchema.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  }
  if (!assignableRoles(access.role).includes(parsed.data.role)) {
    return fail("You can't assign that role.", { role: "You can't assign that role." });
  }

  const [target] = await db
    .select({ id: userTable.id, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.email, parsed.data.email))
    .limit(1);
  if (!target) {
    return fail("No Festora account uses that email yet.", {
      email: "Ask them to sign up first, then add them here.",
    });
  }
  try {
    await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId: target.id,
      role: parsed.data.role,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return fail("They're already a member.", { email: "Already a member." });
    }
    throw err;
  }
  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    action: "member.add",
    entityType: "member",
    entityId: target.id,
    summary: `Added ${target.name} as ${parsed.data.role}`,
  });
  return succeed({ message: `${target.name} was added as ${parsed.data.role}.` });
}

export async function updateMemberRoleAction(
  orgId: string,
  memberUserId: string,
  role: string,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getOrgAccess(orgId, user.id, "members.manage");
  if (!access) return fail("You don't have permission to manage members.");

  const parsedRole = memberRoleSchema.safeParse(role);
  if (!parsedRole.success) return fail("Choose a valid role.");
  if (!assignableRoles(access.role).includes(parsedRole.data)) {
    return fail("You can't assign that role.");
  }
  const current = await getMembership(memberUserId, orgId);
  if (!current) return fail("Member not found.");
  if (!canModifyMember(access.role, current)) {
    return fail("You can't change this member's role.");
  }
  await db
    .update(organizationMembers)
    .set({ role: parsedRole.data })
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, memberUserId),
      ),
    );
  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    action: "member.role",
    entityType: "member",
    entityId: memberUserId,
    summary: `Changed a member's role to ${parsedRole.data}`,
  });
  return succeed({ message: "Role updated." });
}

export async function removeMemberAction(
  orgId: string,
  memberUserId: string,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");

  // Anyone may leave an organization they don't own.
  if (memberUserId === user.id) {
    const role = await getMembership(user.id, orgId);
    if (!role) return fail("Member not found.");
    if (role === "owner") {
      return fail("Owners can't leave. Delete the organization instead.");
    }
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, user.id),
        ),
      );
    return succeed({ message: "You left the organization.", redirectTo: "/dashboard" });
  }

  const access = await getOrgAccess(orgId, user.id, "members.manage");
  if (!access) return fail("You don't have permission to manage members.");
  const current = await getMembership(memberUserId, orgId);
  if (!current) return fail("Member not found.");
  if (!canModifyMember(access.role, current)) {
    return fail("You can't remove this member.");
  }
  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, memberUserId),
      ),
    );
  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    action: "member.remove",
    entityType: "member",
    entityId: memberUserId,
    summary: "Removed a member",
  });
  return succeed({ message: "Member removed." });
}

/** Owner only. Cascades to the organization's events and registrations. */
export async function deleteOrganizationAction(
  orgId: string,
  confirmName: string,
): Promise<ActionResult> {
  const user = await getUserOrNull();
  if (!user) return fail("Please sign in again.");
  const access = await getOrgAccess(orgId, user.id, "org.delete");
  if (!access) return fail("Only the owner can delete an organization.");
  if (confirmName.trim() !== access.org.name) {
    return fail("The name you typed doesn't match.");
  }
  await db.delete(organizations).where(eq(organizations.id, orgId));
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  const remaining = await resolveActiveOrg(user.id);
  return succeed({
    message: "Organization deleted.",
    redirectTo: remaining ? "/dashboard" : "/onboarding",
  });
}
