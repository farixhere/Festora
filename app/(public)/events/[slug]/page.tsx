import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicEventView } from "@/features/events/public-event-view";
import { getPublicEventBySlug } from "@/features/events/queries";
import { getUserOrNull } from "@/lib/auth/session";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const load = cache(async (slug: string) => getPublicEventBySlug(slug));

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug).catch(() => null);
  if (!data) return { title: "Event not found" };
  const { event } = data;
  const url = `${siteUrl()}/events/${event.slug}`;
  const image =
    event.coverImage && !event.coverImage.startsWith("art:") ? [event.coverImage] : undefined;
  return {
    title: event.title,
    description: event.shortDescription,
    alternates: { canonical: url },
    // Link-only events stay shareable but out of search engines.
    robots: event.visibility === "unlisted" ? { index: false, follow: false } : undefined,
    openGraph: { type: "website", url, title: event.title, description: event.shortDescription, images: image },
    twitter: { card: image ? "summary_large_image" : "summary", title: event.title, description: event.shortDescription },
  };
}

export default async function PublicEventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const user = await getUserOrNull();
  return <PublicEventView data={data} user={user ? { name: user.name, email: user.email } : null} />;
}
