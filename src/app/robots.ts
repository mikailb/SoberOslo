import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The editor interface has nothing useful for search engines.
      disallow: "/studio",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
