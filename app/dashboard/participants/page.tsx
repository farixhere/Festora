import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { ParticipantsView } from "@/features/participants/participants-view";
import { listOrgEventOptions } from "@/features/events/queries";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Participants" };

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { org, role } = await requireOrgContext("/dashboard/participants");
  const sp = await searchParams;
  if (!can(role, "registration.view")) {
    return <p className="text-muted-foreground">Your role can&apos;t view participants.</p>;
  }
  const eventOptions = await listOrgEventOptions(org.id);

  return (
    <div>
      <PageHeader
        title="Participants"
        description="Everyone registered across your events. Participant details are visible only to your team."
      />
      <ParticipantsView
        orgId={org.id}
        eventOptions={eventOptions}
        basePath="/dashboard/participants"
        searchParams={sp}
        canManage={can(role, "registration.manage")}
        canExport={can(role, "participants.export")}
      />
    </div>
  );
}
