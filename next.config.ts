import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Cloudflare R2 public host (HLS posterleri vb.). r2.dev gelistirme
      // alt alan adi icin. Ozel domain kullanirsan onu da buraya ekle, orn:
      // { protocol: "https", hostname: "cdn.busyflix.app" }
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};

export default withNextIntl(nextConfig);
