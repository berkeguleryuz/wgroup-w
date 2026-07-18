import type { MetadataRoute } from "next";

import { resolvePublicAppUrl } from "@/lib/app-url";

const APP_URL = resolvePublicAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app/", "/api/"] },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
