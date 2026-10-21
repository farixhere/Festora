import Link from "next/link";
import { Download, Search, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, Pagination } from "@/components/ui/primitives";
import { RegistrationRow, type RegRowView } from "@/features/participants/registration-row";
import { listRegistrations } from "@/features/registrations/queries";
import { isUuid } from "@/lib/permissions/access";
import { buildQuery, firstParam, pageParam } from "@/lib/utils/query";
import type { RegistrationStatus } from "@/lib/db/schema";

const STATUSES = ["all", "pending", "confirmed", "rejected", "cancelled"] as const;

type Props = {
  orgId: string;
  /** When set, the list is limited to one event (event tab). */
  eventId?: string;
  /** Events offered in the filter (organization-wide view only). */
  eventOptions?: { id: string; title: string }[];
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  canManage: boolean;
  canExport: boolean;
};

/** Server component: filters + list + pagination, always scoped to `orgId`. */
export async function ParticipantsView({
  orgId,
  eventId,
  eventOptions,
  basePath,
  searchParams,
  canManage,
  canExport,
}: Props) {
  const q = (firstParam(searchParams.q) ?? "").trim().slice(0, 100);
  const statusRaw = firstParam(searchParams.status) ?? "all";
  const status = (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as RegistrationStatus | "all")
    : "all";
  const eventQuery = firstParam(searchParams.event) ?? "";
  // Untrusted query value: must be a UUID. Results are still org-scoped by the query.
  const eventParam = eventId ?? (isUuid(eventQuery) ? eventQuery : "");
  const page = pageParam(searchParams.page);

  const res = await listRegistrations({
    orgId,
    eventId: eventParam || undefined,
    status,
    q,
    page,
  });

  const rows: RegRowView[] = res.items.map((r) => ({
    id: r.id,
    eventTitle: r.eventTitle,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    institution: r.institution,
    notes: r.notes,
    status: r.status,
    code: r.code,
    createdAtIso: r.createdAt.toISOString(),
  }));

  const filtered = Boolean(q || status !== "all" || (!eventId && eventParam));
  const exportHref = `/api/participants/export${buildQuery({
    event: eventParam || undefined,
    status: status === "all" ? undefined : status,
    q,
  })}`;

  return (
    <div>
      <form method="get" role="search" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="q" className="sr-only">Search by name or email</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="q" name="q" defaultValue={q} placeholder="Search name or email" className="pl-10" maxLength={100} />
        </div>
        {eventOptions ? (
          <div>
            <label htmlFor="event" className="sr-only">Event</label>
            <Select id="event" name="event" defaultValue={eventParam}>
              <option value="">All events</option>
              {eventOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
        <div>
          <label htmlFor="status" className="sr-only">Status</label>
          <Select id="status" name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">Filter</Button>
        {canExport ? (
          <a href={exportHref} className={buttonVariants({ variant: "outline" })} download>
            <Download aria-hidden /> Export CSV
          </a>
        ) : (
          <span />
        )}
      </form>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {res.total} registration{res.total === 1 ? "" : "s"}
        {filtered ? " match your filters" : ""}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={filtered ? "No registrations match" : "No registrations yet"}
          description={
            filtered
              ? "Try a different search or clear the filters."
              : "Registrations appear here as soon as people sign up."
          }
          action={
            filtered ? (
              <Link href={basePath} className={buttonVariants({ variant: "outline" })}>Clear filters</Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <RegistrationRow row={r} canManage={canManage} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={res.page}
        pageCount={res.pageCount}
        hrefFor={(p) =>
          `${basePath}${buildQuery({
            q,
            status: status === "all" ? undefined : status,
            event: eventId ? undefined : eventParam || undefined,
            page: p > 1 ? p : undefined,
          })}`
        }
      />
    </div>
  );
}
