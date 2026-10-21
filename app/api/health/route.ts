import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database reachability. Returns no internal details. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "up" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { ok: false, database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
