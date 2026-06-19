/**
 * Demo extras (idempotent), run after db:seed + wire-real-episodes:
 *   npx tsx scripts/seed-demo-extras.ts
 *
 *  - Wires the spare HLS parts in public/hls/ to the 2nd+ episodes of the
 *    matching series, so a whole series plays real video.
 *  - Adds TR + EN demo subtitle tracks (public/subtitles/*.vtt) to the first
 *    episode of the real-HLS titles, so the captions UI is testable.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../lib/prisma";

const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), "content", "hls-manifest.json"), "utf8"),
) as Record<string, { videoPath: string; durationSec: number }>;

// base series slug → extra HLS part slugs (assigned to episodes 2, 3, ...)
const EXTRA_PARTS: Record<string, string[]> = {
  "lider-dogmaz-olusur": [
    "lider-dogmaz-olusur-2",
    "lider-dogmaz-olusur-3",
    "lider-dogmaz-olusur-4",
  ],
  "sifirdan-girisim": ["sifirdan-girisim-2", "sifirdan-girisim-3"],
};

const SUBTITLE_TITLES = [
  "lider-dogmaz-olusur",
  "sifirdan-girisim",
  "pazarlama-marka-sesi",
];

async function main() {
  // 1) Extra HLS parts → later episodes.
  let wired = 0;
  for (const [base, parts] of Object.entries(EXTRA_PARTS)) {
    const title = await prisma.title.findUnique({
      where: { slug: base },
      include: {
        episodes: { orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }] },
      },
    });
    if (!title) continue;
    for (let i = 0; i < parts.length; i++) {
      const ep = title.episodes[i + 1]; // episode 1 already wired to the base HLS
      const m = manifest[parts[i]];
      if (!ep || !m) continue;
      await prisma.episode.update({
        where: { id: ep.id },
        data: { videoPath: m.videoPath, durationSec: m.durationSec },
      });
      wired++;
    }
  }

  // 2) Demo subtitles (TR + EN) on the first episode of the real-HLS titles.
  let subs = 0;
  const tracks = [
    { lang: "tr", label: "Türkçe", vttPath: "/subtitles/demo-tr.vtt" },
    { lang: "en", label: "English", vttPath: "/subtitles/demo-en.vtt" },
  ];
  for (const slug of SUBTITLE_TITLES) {
    const title = await prisma.title.findUnique({
      where: { slug },
      include: {
        episodes: {
          orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
          take: 1,
        },
      },
    });
    const ep = title?.episodes[0];
    if (!ep) continue;
    for (const t of tracks) {
      await prisma.subtitle.upsert({
        where: { episodeId_lang: { episodeId: ep.id, lang: t.lang } },
        create: { episodeId: ep.id, lang: t.lang, label: t.label, vttPath: t.vttPath },
        update: { label: t.label, vttPath: t.vttPath },
      });
      subs++;
    }
  }

  console.log(`✓ ${wired} ek HLS bölümü bağlandı, ${subs} altyazı eklendi (TR+EN).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
