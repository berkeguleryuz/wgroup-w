import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Public marketing routes only — /app/* and /api/* are private/non-indexable.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/pricing", "/business"];
  return paths.map((p) => ({
    url: `${APP_URL}${p || "/"}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.8,
  }));
}
