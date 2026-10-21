import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, user } from "@/lib/db/schema";
import type { MemberRole } from "@/lib/db/schema";

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: Date;
};

/** Callers must already have verified the viewer belongs to `orgId`. */
export async function listMembers(orgId: string): Promise<MemberRow[]> {
  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(user, eq(user.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, orgId))
    .orderBy(asc(organizationMembers.createdAt));
}
