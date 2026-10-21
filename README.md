# Festora

Event management for college fests, clubs and communities — publish events, run registrations with safe capacity handling, manage programs and schedules, and keep participants informed. Successor to Eventra.

**Stack:** Next.js 15 (App Router) · strict TypeScript · Tailwind · Radix/shadcn-style UI · Lucide · Neon Postgres · Drizzle ORM (migrations) · Zod · Better Auth · React Hook Form · Recharts · Vitest · Playwright.

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in values (see below)
npm run db:migrate                # applies drizzle/0000_init.sql
npm run dev
```

Sign up in the app, then (optional, local only) `npm run db:seed -- you@example.com` adds a demo organization with two events. The seed script refuses to run in production and is never run automatically.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (used at runtime). |
| `DATABASE_URL_UNPOOLED` | recommended | Neon **direct** string, used by `db:migrate`. Falls back to `DATABASE_URL`. |
| `BETTER_AUTH_SECRET` | yes | 32+ random chars: `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | yes | Public origin, e.g. `https://festora.vercel.app`. |
| `PLATFORM_ADMIN_USER_IDS` | no | Comma-separated user IDs allowed into `/admin`. See below. |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Enables password-reset emails. Without them, reset links are **not** delivered (see Limitations). |
| `BLOB_READ_WRITE_TOKEN` | no | Enables cover-image upload. Without it, built-in cover designs or an https image URL are used. |

No secrets are committed. `.env*` files are git-ignored.

## Database & migrations

Schema lives in `lib/db/schema.ts`; the migration is `drizzle/0000_init.sql`, run by `npm run db:migrate` (Drizzle migrator, idempotent via its journal).

> **Note:** the initial migration was written by hand and ships without a Drizzle snapshot. To evolve the schema, run `npx drizzle-kit generate` once locally, review the output (it will regenerate the whole schema as a new migration — keep only the *diff* against 0000 by deleting statements for objects that already exist), and commit. Production tables are never dropped automatically.

**Recovery:** Neon keeps point-in-time history; to roll back a bad migration, restore a branch from before the change (Neon console → Branches → Restore) rather than hand-editing production. Take a branch before applying risky migrations.

## Architecture notes

- **Auth:** Better Auth, DB-backed sessions, `middleware.ts` does an optimistic cookie redirect; real checks happen in layouts, pages and every server action.
- **Authorization:** role → permission map (`lib/permissions`), plus resource-level checks (`lib/permissions/access.ts`) that join membership on the *resource's own organization*, so guessing IDs (IDOR) returns "not found". Active organization (`festora_org` cookie) is only a hint and is revalidated against membership rows.
- **Roles:** owner (everything, incl. delete org) · admin (manage events, members, settings) · organizer (run events, registrations, announcements) · viewer (read-only).
- **Platform admin:** provisioned only via `PLATFORM_ADMIN_USER_IDS` (your user ID is shown at Settings → Danger zone). `/admin` returns 404 to everyone else. Admin actions are audit-logged.
- **Seat policy:** `pending` and `confirmed` hold a seat; `cancelled` and `rejected` free it; those two are terminal (register again to rejoin, subject to capacity). Registration runs in a transaction with `SELECT … FOR UPDATE` on the event row; a partial unique index on `(event_id, email)` for active statuses is the backstop against duplicates.
- **Registration codes:** `FST-` + 72 random bits; used for the public confirmation page.
- **Time:** stored as UTC; entered/displayed in each event's timezone (Intl only, no date library).
- **Security:** CSP and security headers (`next.config.ts`), Postgres-backed rate limiting (auth + public registration + upload), Zod validation on every action, CSV export protects against formula injection, uploads are magic-byte sniffed.
- **Audit log:** `activity_logs` records organization and admin actions.

## Scripts

`dev` · `build` · `start` · `typecheck` · `test` (Vitest) · `test:e2e` (Playwright; needs a migrated DB) · `db:migrate` · `db:seed`.

## Deploying to Vercel

1. Import the repo in Vercel (framework: Next.js).
2. Add the env vars above (Neon's Vercel integration can supply `DATABASE_URL`).
3. Run `npm run db:migrate` once against the production database (locally with the production `DATABASE_URL_UNPOOLED`, or via the Neon console SQL editor).
4. Deploy. Check `/api/health`.

## Known limitations (deliberate, documented)

- **Announcements are in-app only.** No email or push delivery to participants.
- **Password-reset email** needs Resend configured; otherwise it can't be delivered.
- **Members must already have an account** to be added to an organization (no email invitations yet).
- Ticketing/payments, QR check-in and waitlists are out of scope for this version.
