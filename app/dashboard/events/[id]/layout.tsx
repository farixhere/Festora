import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EventStatusBadge } from "@/components/ui/primitives";
import { EventTabs } from "@/components/dashboard/event-tabs";
import { EventActionsBar } from "@/features/events/event-actions-bar";
import { loadEventOr404 } from "@/features/events/load";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatEventRange } from "@/lib/utils/dates";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}`);
  const { event, role } = await loadEventOr404(id, user.id);

  return (
    <div>
      <Link
        href="/dashboard/events"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> All events
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            {event.hiddenByAdmin && (
              <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                Hidden by platform admin
              </span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
          </p>
        </div>
        <EventActionsBar
          eventId={event.id}
          title={event.title}
          slug={event.slug}
          status={event.status}
          canPublish={can(role, "event.publish")}
          canCreate={can(role, "event.create")}
          canDelete={can(role, "event.delete")}
        />
      </div>
      <EventTabs eventId={event.id} />
      {children}
    </div>
  );
}
