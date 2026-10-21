import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Best-effort client IP behind Vercel's proxy. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window limiter backed by Postgres (shared across serverless
 * instances). One atomic upsert per call; returns whether the request is
 * allowed. Fails OPEN if the database is unreachable so a limiter outage never
 * blocks legitimate users (the underlying action will surface DB errors).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const fullKey = `festora:${key}`;
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limit (id, key, count, last_request)
      VALUES (gen_random_uuid()::text, ${fullKey}, 1, ${now})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit.last_request < ${now - windowMs}
                     THEN 1 ELSE rate_limit.count + 1 END,
        last_request = CASE WHEN rate_limit.last_request < ${now - windowMs}
                            THEN ${now} ELSE rate_limit.last_request END
      RETURNING count, last_request
    `);
    const row = result.rows[0] as
      | { count: number | string; last_request: number | string }
      | undefined;
    const count = Number(row?.count ?? 1);
    const windowStart = Number(row?.last_request ?? now);
    return {
      allowed: count <= max,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowStart + windowMs - now) / 1000),
      ),
    };
  } catch {
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
