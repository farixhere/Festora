import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus, MapPin, Search, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Card, EmptyState, EventStatusBadge, PageHeader, Pagination } from "@/components/ui/primitives";
import { EventCover } from "@/components/events/event-cover";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { listOrgEvents } from "@/features/events/queries";
import { formatDateTime } from "@/lib/utils/dates";
import { buildQuery, firstParam, pageParam } from "@/lib/utils/query";
import type { EventStatus } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Events" };

const STATUSES = ["all", "draft", "published", "archived"] as const;

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { org, role } = await requireOrgContext("/dashboard/events");
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim().slice(0, 100);
  const statusRaw = firstParam(sp.status) ?? "all";
  const status = (STATUSES as readonly string[]).includes(statusRaw) ? (statusRaw as EventStatus | "all") : "all";
  const page = pageParam(sp.page);

  const res = await listOrgEvents({ orgId: org.id, q, status, page });
  const canCreate = can(role, "event.create");

  return (
    <div>
      <PageHeader
        title="Events"
        description={`Everything ${org.name} is running.`}
        actions={
          canCreate && (
            <Link href="/dashboard/events/new" className={buttonVariants()}>
              <CalendarPlus aria-hidden /> New event
            </Link>
          )
        }
      />

      <form method="get" role="search" className="mb-6 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <label htmlFor="q" className="sr-only">Search events</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="q" name="q" defaultValue={q} placeholder="Search by title" className="pl-10" maxLength={100} />
        </div>
        <div>
          <label htmlFor="status" className="sr-only">Status</label>
          <Select id="status" name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {res.items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={q || status !== "all" ? "No events match your filters" : "No events yet"}
          description={q || status !== "all" ? "Try clearing the search or status filter." : "Create your first event to get started."}
          action={
            q || status !== "all" ? (
              <Link href="/dashboard/events" className={buttonVariants({ variant: "outline" })}>Clear filters</Link>
            ) : canCreate ? (
              <Link href="/dashboard/events/new" className={buttonVariants()}>Create an event</Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {res.items.map(({ event, seatsTaken }) => (
            <li key={event.id}>
              <Link href={`/dashboard/events/${event.id}`} className="block">
                <Card className="flex flex-col gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center">
                  <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-36">
                    <EventCover value={event.coverImage} seed={event.slug} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventStatusBadge status={event.status} />
                      {event.hiddenByAdmin && <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">Hidden by platform admin</span>}
                      {event.visibility === "unlisted" && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">Private link</span>}
                    </div>
                    <h2 className="mt-1.5 truncate text-lg font-extrabold">{event.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden />{formatDateTime(event.startsAt, event.timezone)}</span>
                      {(event.venue || event.city) && (
                        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{[event.venue, event.city].filter(Boolean).join(", ")}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground sm:flex-col sm:items-end sm:gap-0">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />{seatsTaken}{event.capacity ? ` / ${event.capacity}` : ""}</span>
                    <span className="text-xs font-medium">registered</span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={res.page}
        pageCount={res.pageCount}
        hrefFor={(p) => `/dashboard/events${buildQuery({ q, status: status === "all" ? undefined : status, page: p > 1 ? p : undefined })}`}
      />
    </div>
  );
}
