import type { Metadata } from "next";
import { ListTree } from "lucide-react";
import { EmptyState } from "@/components/ui/primitives";
import { ProgramManager, type ProgramView } from "@/features/programs/program-manager";
import { loadEventOr404 } from "@/features/events/load";
import { listPrograms } from "@/features/events/queries";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDate, formatTime, shortTimeZone, utcToZonedLocal } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Programs" };

export default async function ProgramsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}/programs`);
  const { event, role } = await loadEventOr404(id, user.id);
  const programs = await listPrograms(event.id);
  const canManage = can(role, "program.manage");
  const tz = event.timezone;

  const views: ProgramView[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    label: p.label,
    venue: p.venue,
    startsLocal: utcToZonedLocal(p.startsAt, tz),
    endsLocal: utcToZonedLocal(p.endsAt, tz),
    whenText: `${formatDate(p.startsAt, tz, { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(p.startsAt, tz)} – ${formatTime(p.endsAt, tz)}`,
  }));

  return (
    <div>
      {views.length === 0 && !canManage ? (
        <EmptyState icon={<ListTree />} title="No programs yet" description="Programs added by the organizing team appear here." />
      ) : views.length === 0 ? (
        <>
          <EmptyState
            icon={<ListTree />}
            title="No programs yet"
            description="Break your event into programs — competitions, workshops, performances — then schedule sessions under them."
          />
          <div className="mt-4 flex justify-center">
            <ProgramManager
              eventId={event.id}
              programs={[]}
              defaults={{ startsLocal: utcToZonedLocal(event.startsAt, tz), endsLocal: utcToZonedLocal(event.endsAt, tz) }}
              timezoneLabel={`${tz} (${shortTimeZone(event.startsAt, tz)})`}
              canManage={canManage}
            />
          </div>
        </>
      ) : (
        <ProgramManager
          eventId={event.id}
          programs={views}
          defaults={{ startsLocal: utcToZonedLocal(event.startsAt, tz), endsLocal: utcToZonedLocal(event.endsAt, tz) }}
          timezoneLabel={`${tz} (${shortTimeZone(event.startsAt, tz)})`}
          canManage={canManage}
        />
      )}
    </div>
  );
}
