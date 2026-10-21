import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import type { MemberRole, Organization } from "@/lib/db/schema";
import { safeNext } from "@/lib/utils/redirect";

export const ACTIVE_ORG_COOKIE = "festora_org";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>["user"];

/** Server-side guard for pages: redirects to sign-in when unauthenticated. */
export async function requireUser(nextPath = "/dashboard"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(safeNext(nextPath))}`);
  }
  return session.user;
}

/** Guard for server actions / route handlers: returns null instead of redirecting. */
export async function getUserOrNull(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export type Membership = { org: Organization; role: MemberRole };

export const getMemberships = cache(
  async (userId: string): Promise<Membership[]> => {
    const rows = await db
      .select({ org: organizations, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id),
      )
      .where(eq(organizationMembers.userId, userId))
      .orderBy(asc(organizations.name));
    return rows;
  },
);

export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<MemberRole | null> {
  const [row] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row?.role ?? null;
}

export type OrgContext = {
  user: SessionUser;
  org: Organization;
  role: MemberRole;
  memberships: Membership[];
};

/**
 * Resolves a user's active organization without redirecting (safe inside
 * server actions). The cookie is only a hint: it is always validated against
 * real membership rows, so editing it cannot grant access to another
 * organization.
 */
export async function resolveActiveOrg(
  userId: string,
): Promise<{ org: Organization; role: MemberRole; memberships: Membership[] } | null> {
  const memberships = await getMemberships(userId);
  if (memberships.length === 0) return null;
  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active =
    memberships.find((m) => m.org.id === wanted) ?? memberships[0]!;
  return { org: active.org, role: active.role, memberships };
}

/** Guard for dashboard pages. */
export async function requireOrgContext(nextPath = "/dashboard"): Promise<OrgContext> {
  const user = await requireUser(nextPath);
  const active = await resolveActiveOrg(user.id);
  if (!active) redirect("/onboarding");
  return { user, ...active };
}
