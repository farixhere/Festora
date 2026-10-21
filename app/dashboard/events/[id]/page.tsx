import type { Metadata } from "next";
import { Globe, Lock, Ticket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/copy-button";
import { EventForm } from "@/features/events/event-form";
import { eventToFormDefaults } from "@/features/events/form-defaults";
import { loadEventOr404 } from "@/features/events/load";
import { getStatusCounts } from "@/features/registrations/queries";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Event overview" };

export default async function EventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}`);
  const { event, role } = await loadEventOr404(id, user.id);
  const counts = await getStatusCounts(event.id);
  const held = counts.pending + counts.confirmed;
  const publicPath = `/events/${event.slug}`;

  return (
    <div className="space-y-6">
      <section aria-label="Registration summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Confirmed" value={counts.confirmed} icon={<Ticket />} />
        <StatCard label="Pending review" value={counts.pending} hint={event.requiresApproval ? "Approval required" : "Approval is off"} />
        <StatCard
          label="Seats used"
          value={event.capacity ? `${held} / ${event.capacity}` : held}
          hint={event.capacity ? `${Math.max(0, event.capacity - held)} left` : "Unlimited capacity"}
        />
        <StatCard label="Cancelled / rejected" value={counts.cancelled + counts.rejected} hint="Seats are released" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {event.visibility === "public" ? <Globe className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
            Shareable link
          </CardTitle>
          <CardDescription>
            {event.status === "published"
              ? event.visibility === "public"
                ? "Live and listed on Explore."
                : "Live, but only people with the link can find it."
              : "This link works once you publish the event. Use Preview to check how it will look."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm">{publicPath}</code>
          <CopyButton value={publicPath} />
        </CardContent>
      </Card>

      <EventForm
        mode="edit"
        eventId={event.id}
        defaults={eventToFormDefaults(event)}
        canUpload={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        readOnly={!can(role, "event.edit")}
      />
    </div>
  );
}
