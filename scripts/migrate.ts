/**
 * Applies pending SQL migrations from ./drizzle. Safe to run repeatedly:
 * already-applied migrations are skipped and nothing is ever dropped.
 *
 *   npm run db:migrate
 *
 * Prefers DATABASE_URL_UNPOOLED (direct Neon connection) for DDL.
 */
import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) first.");
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
