import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/**
 * Platform administrators are provisioned ONLY through the server-side
 * PLATFORM_ADMIN_USER_IDS environment variable (comma-separated user IDs).
 * There is no signup field, API or database column that can grant this.
 */
export function isPlatformAdmin(userId: string): boolean {
  const ids = (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

/** Returns the admin user, or renders 404 so the route's existence isn't revealed. */
export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session || !isPlatformAdmin(session.user.id)) notFound();
  return session.user;
}
