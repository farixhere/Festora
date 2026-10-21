import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/primitives";
import { ScheduleTimeline } from "@/components/events/schedule-timeline";
import { ScheduleManager, type ScheduleView } from "@/features/schedules/schedule-manager";
import { loadEventOr404 } from "@/features/events/load";
import { listPrograms, listScheduleItems } from "@/features/events/queries";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDate, formatTime, shortTimeZone, utcToZonedLocal } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}/schedule`);
  const { event, role } = await loadEventOr404(id, user.id);
  const [items, programs] = await Promise.all([listScheduleItems(event.id), listPrograms(event.id)]);
  const tz = event.timezone;
  const canManage = can(role, "schedule.manage");

  const views: ScheduleView[] = items.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    speaker: i.speaker,
    stage: i.stage,
    programId: i.programId,
    startsLocal: utcToZonedLocal(i.startsAt, tz),
    endsLocal: utcToZonedLocal(i.endsAt, tz),
    dayText: formatDate(i.startsAt, tz, { weekday: "short", day: "numeric", month: "short" }),
    whenText: `${formatTime(i.startsAt, tz)} – ${formatTime(i.endsAt, tz)}`,
  }));

  const timeline =
    items.length === 0 ? (
      <EmptyState
        icon={<Clock />}
        title="No sessions yet"
        description={canManage ? "Add sessions to build the schedule participants will see." : "Sessions added by the team appear here."}
      />
    ) : (
      <ScheduleTimeline items={items} programs={programs} timezone={tz} />
    );

  return (
    <ScheduleManager
      eventId={event.id}
      items={views}
      programs={programs.map((p) => ({ id: p.id, title: p.title }))}
      defaults={{ startsLocal: utcToZonedLocal(event.startsAt, tz), endsLocal: utcToZonedLocal(event.endsAt, tz) }}
      canManage={canManage}
      published={event.schedulePublished}
      timezoneLabel={`${tz} (${shortTimeZone(event.startsAt, tz)})`}
      timeline={timeline}
    />
  );
}
