import type { MetadataRoute } from "next";
import { listPublishedSlugs } from "@/features/events/queries";
import { isDatabaseConfigured } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
  ];
  if (!isDatabaseConfigured) return entries;
  try {
    const slugs = await listPublishedSlugs();
    for (const s of slugs) {
      entries.push({ url: `${base}/events/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "daily", priority: 0.7 });
    }
  } catch {
    // Serve the static entries rather than failing the sitemap.
  }
  return entries;
}
