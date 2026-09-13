import type { MetadataRoute } from "next";

import { getActivitySlugs } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getActivitySlugs();
  const now = new Date();

  const pages = ["", "/activities", "/sober-kvinner", "/about", "/merch"].map(
    (path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    }),
  );

  const activities = slugs.map((slug) => ({
    url: `${siteConfig.url}/activities/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...pages, ...activities];
}
