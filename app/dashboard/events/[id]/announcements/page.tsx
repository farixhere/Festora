import type { Metadata } from "next";
import { AnnouncementManager } from "@/features/announcements/announcement-manager";
import { loadEventOr404 } from "@/features/events/load";
import { listEventAnnouncements } from "@/features/events/queries";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Announcements" };

export default async function EventAnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}/announcements`);
  const { event, role } = await loadEventOr404(id, user.id);
  const items = await listEventAnnouncements(event.id);

  return (
    <AnnouncementManager
      eventId={event.id}
      canManage={can(role, "announcement.manage")}
      announcements={items.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        status: a.status,
        publishedAtIso: a.publishedAt ? a.publishedAt.toISOString() : null,
        createdAtIso: a.createdAt.toISOString(),
      }))}
    />
  );
}
