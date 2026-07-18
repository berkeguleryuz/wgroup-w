import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

function toRemotePattern(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return {
      protocol: "https" as const,
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const configuredImageOrigins = [
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.R2_PUBLIC_BASE_URL,
  process.env.R2_BUCKET ? `https://${process.env.R2_BUCKET}.r2.dev` : undefined,
  ...(process.env.MEDIA_ALLOWED_ORIGINS ?? "").split(","),
];
const storageRemotePatterns = [
  ...new Map(
    configuredImageOrigins
      .map((origin) => toRemotePattern(origin?.trim()))
      .filter((pattern): pattern is NonNullable<typeof pattern> => !!pattern)
      .map((pattern) => [
        `${pattern.hostname}:${pattern.port}`,
        pattern,
      ]),
  ).values(),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    maximumRedirects: 0,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      ...storageRemotePatterns,
    ],
  },
};

export default withNextIntl(nextConfig);
