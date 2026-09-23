import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private surfaces and anything that would waste crawl budget.
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/settings",
          "/notifications",
          "/problems/new",
          "/*/edit",
          "/bookmarks",
          "/login",
          "/onboard",
          "/invite",
          "/invite/",
          "/invites",
          "/wait-list",
          "/unsubscribe",
          "/reputation",
        ],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  };
}
