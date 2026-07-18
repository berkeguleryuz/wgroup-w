import type { MetadataRoute } from "next";

import { resolvePublicAppUrl } from "@/lib/app-url";

const APP_URL = resolvePublicAppUrl();

// Public marketing routes only — /app/* and /api/* are private/non-indexable.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/pricing", "/business"];
  return paths.map((p) => ({
    url: `${APP_URL}${p || "/"}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.8,
  }));
}
