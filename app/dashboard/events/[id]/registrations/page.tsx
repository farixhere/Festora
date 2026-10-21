import type { Metadata } from "next";
import { StatCard } from "@/components/ui/primitives";
import { Ticket, Users } from "lucide-react";
import { ParticipantsView } from "@/features/participants/participants-view";
import { loadEventOr404 } from "@/features/events/load";
import { getStatusCounts } from "@/features/registrations/queries";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Registrations" };

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/events/${id}/registrations`);
  const { event, role } = await loadEventOr404(id, user.id);
  if (!can(role, "registration.view")) {
    return <p className="text-muted-foreground">Your role can&apos;t view registrations.</p>;
  }
  const counts = await getStatusCounts(event.id);
  const held = counts.pending + counts.confirmed;

  return (
    <div>
      <section aria-label="Registration totals" className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Confirmed" value={counts.confirmed} icon={<Ticket />} />
        <StatCard label="Pending" value={counts.pending} icon={<Users />} />
        <StatCard
          label="Capacity"
          value={event.capacity ? `${held} / ${event.capacity}` : "Unlimited"}
          hint="Pending and confirmed registrations hold a seat; cancelled and rejected ones release it."
        />
      </section>
      <ParticipantsView
        orgId={event.organizationId}
        eventId={event.id}
        basePath={`/dashboard/events/${event.id}/registrations`}
        searchParams={sp}
        canManage={can(role, "registration.manage")}
        canExport={can(role, "participants.export")}
      />
    </div>
  );
}
