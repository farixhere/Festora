import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AdminHideButton } from "@/components/dashboard/admin-hide-button";
import { Badge, Card, EventStatusBadge, PageHeader, StatCard } from "@/components/ui/primitives";
import { getPlatformStats } from "@/features/dashboard/queries";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { activityLogs, events, organizations } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Platform admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePlatformAdmin();
  const [stats, recent, logs] = await Promise.all([
    getPlatformStats(),
    db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        status: events.status,
        hidden: events.hiddenByAdmin,
        org: organizations.name,
      })
      .from(events)
      .innerJoin(organizations, eq(organizations.id, events.organizationId))
      .orderBy(desc(events.createdAt))
      .limit(30),
    db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(30),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        title="Platform admin"
        description="Cross-organization overview. Every action here is written to the audit log."
        actions={<Link href="/dashboard" className="text-sm font-semibold text-primary">← Dashboard</Link>}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Organizations" value={stats.organizations} />
        <StatCard label="Events" value={stats.events} />
        <StatCard label="Published" value={stats.publishedEvents} />
        <StatCard label="Registrations" value={stats.registrations} />
      </div>

      <section aria-labelledby="ev">
        <h2 id="ev" className="mb-3 font-display text-lg font-bold">Latest events</h2>
        <Card className="divide-y">
          {recent.length === 0 && <p className="p-4 text-sm text-muted-foreground">No events yet.</p>}
          {recent.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-bold">{e.title}</p>
                <p className="truncate text-sm text-muted-foreground">{e.org}</p>
              </div>
              <div className="flex items-center gap-2">
                <EventStatusBadge status={e.status} />
                {e.hidden && <Badge tone="warning">Hidden</Badge>}
                <AdminHideButton eventId={e.id} hidden={e.hidden} />
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="log">
        <h2 id="log" className="mb-3 font-display text-lg font-bold">Audit log</h2>
        <Card className="divide-y">
          {logs.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing recorded yet.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
              <span>{l.summary}</span>
              <span className="text-muted-foreground">{formatDateTime(l.createdAt, "UTC")} UTC · {l.action}</span>
            </div>
          ))}
        </Card>
      </section>
    </main>
  );
}
