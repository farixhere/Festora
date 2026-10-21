/**
 * LOCAL DEVELOPMENT ONLY. Creates a demo organization with sample events,
 * attached to an existing user. Refuses to run in production.
 *
 *   npm run db:seed -- you@example.com
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed in production.");
  }
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run db:seed -- <email of an existing user>");
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email.toLowerCase()));
  if (!u) throw new Error(`No user with email ${email}. Sign up in the app first.`);

  const [org] = await db
    .insert(schema.organizations)
    .values({ name: "Demo Cultural Club", slug: `demo-club-${Date.now().toString(36)}`, ownerId: u.id })
    .returning();
  await db.insert(schema.organizationMembers).values({ organizationId: org!.id, userId: u.id, role: "owner" });

  const day = 86_400_000;
  const mk = (i: number, title: string, category: string) => ({
    organizationId: org!.id,
    createdBy: u.id,
    slug: `demo-${i}-${Date.now().toString(36)}`,
    title,
    shortDescription: `${title} — a demo event.`,
    description: "Seeded sample data for local development.",
    category,
    status: "published" as const,
    visibility: "public" as const,
    mode: "in_person" as const,
    timezone: "Asia/Kolkata",
    startsAt: new Date(Date.now() + (i + 3) * day),
    endsAt: new Date(Date.now() + (i + 3) * day + 4 * 3_600_000),
    venue: "Main Auditorium",
    city: "Puducherry",
    capacity: 50 + i * 10,
    organizerName: org!.name,
  });
  await db.insert(schema.events).values([
    mk(1, "Annual Tech Symposium", "Technology"),
    mk(2, "Open Mic Night", "Cultural"),
  ] );
  console.log(`Seeded organization "${org!.name}" for ${email}.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
