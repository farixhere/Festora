import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/events"], disallow: ["/dashboard", "/admin", "/api", "/registrations", "/my-registrations", "/onboarding"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
