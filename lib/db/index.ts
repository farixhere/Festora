import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // Reuse one pool across hot reloads in development.
  // eslint-disable-next-line no-var
  var __festoraPool: Pool | undefined;
}

/**
 * Creating the pool never opens a connection, so importing this module is
 * safe during `next build` even when DATABASE_URL is not set. Queries made
 * without it fail with a clear message from `assertDatabaseConfigured`.
 */
function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless functions: keep the per-instance pool small. Neon's pooled
    // endpoint (PgBouncer) multiplexes the rest.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

const pool = globalThis.__festoraPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__festoraPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export { schema };

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
