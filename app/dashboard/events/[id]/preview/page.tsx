import type { Metadata } from "next";
import { PublicEventView } from "@/features/events/public-event-view";
import { loadEventOr404 } from "@/features/events/load";
import { getEventPreview } from "@/features/events/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

export default async function EventPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/events/${id}/preview`);
  const { event } = await loadEventOr404(id, user.id);
  const data = await getEventPreview(event);
  return <PublicEventView data={data} user={{ name: user.name, email: user.email }} preview />;
}
