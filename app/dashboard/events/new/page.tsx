import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { EventForm } from "@/features/events/event-form";
import { blankEventDefaults } from "@/features/events/form-defaults";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const { user, role } = await requireOrgContext("/dashboard/events/new");
  if (!can(role, "event.create")) redirect("/dashboard/events");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Create an event"
        description="Save it as a draft first — nothing is public until you publish."
      />
      <EventForm
        mode="create"
        defaults={blankEventDefaults(user.name, user.email)}
        canUpload={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
      />
    </div>
  );
}
