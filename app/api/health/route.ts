import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + configuration check. Reports only booleans — never values —
 * so it is safe to expose while still telling you what's missing.
 */
export async function GET() {
  const config = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    BETTER_AUTH_SECRET: Boolean(process.env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: Boolean(process.env.BETTER_AUTH_URL),
  };
  let database: "up" | "down" | "not_migrated" = "down";
  try {
    await db.execute(sql`select 1`);
    database = "up";
    try {
      await db.execute(sql`select 1 from "user" limit 1`);
    } catch {
      database = "not_migrated";
    }
  } catch {
    database = "down";
  }
  const ok = database === "up" && config.BETTER_AUTH_SECRET;
  return Response.json(
    { ok, database, config },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
