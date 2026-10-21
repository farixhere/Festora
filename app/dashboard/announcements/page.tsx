import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { AnnouncementManager } from "@/features/announcements/announcement-manager";
import { listOrgAnnouncements, listOrgEventOptions } from "@/features/events/queries";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const { org, role } = await requireOrgContext("/dashboard/announcements");
  const [items, eventOptions] = await Promise.all([
    listOrgAnnouncements(org.id),
    listOrgEventOptions(org.id),
  ]);

  return (
    <div>
      <PageHeader title="Announcements" description="Updates for the people following your events." />
      <AnnouncementManager
        canManage={can(role, "announcement.manage")}
        eventOptions={eventOptions}
        announcements={items.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          status: a.status,
          publishedAtIso: a.publishedAt ? a.publishedAt.toISOString() : null,
          createdAtIso: a.createdAt.toISOString(),
          eventTitle: a.eventTitle,
        }))}
      />
    </div>
  );
}
