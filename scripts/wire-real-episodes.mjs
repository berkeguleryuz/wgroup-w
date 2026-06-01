#!/usr/bin/env node
/**
 * scripts/wire-real-episodes.mjs
 *
 * Reads content/hls-manifest.json (produced by scripts/ingest-video.mjs) and
 * wires the real HLS videoPath / durationSec / poster into the database.
 *
 * For each slug in the manifest:
 *   - find the Title by slug
 *   - find its FIRST episode (seasonNumber asc, episodeNumber asc)
 *   - update episode.videoPath + episode.durationSec
 *   - update title.heroImageUrl with posterUrl (only when a poster exists)
 *
 * Idempotent: re-running writes the same values. Prints how many episodes were
 * updated to STDOUT.
 *
 * Prisma client is constructed exactly like prisma/seed.ts (PrismaPg adapter +
 * DATABASE_URL), and env is loaded via "dotenv/config".
 *
 * Usage:
 *   node scripts/wire-real-episodes.mjs
 */

import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const log = (...args) => process.stderr.write(`${args.join(" ")}\n`);

async function loadManifest(manifestPath) {
  let raw;
  try {
    raw = await fs.readFile(manifestPath, "utf8");
  } catch {
    log(`[wire] no manifest at ${manifestPath} — nothing to wire`);
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch (e) {
    throw new Error(`could not parse manifest: ${e.message}`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const manifestPath = path.join(process.cwd(), "content", "hls-manifest.json");
  const manifest = await loadManifest(manifestPath);
  const slugs = Object.keys(manifest);

  let updatedEpisodes = 0;
  let updatedPosters = 0;
  let skipped = 0;

  try {
    for (const slug of slugs) {
      const entry = manifest[slug] || {};
      const { videoPath, durationSec, posterUrl } = entry;

      if (!videoPath) {
        log(`[wire] ${slug}: manifest entry has no videoPath — skipping`);
        skipped++;
        continue;
      }

      const title = await prisma.title.findUnique({ where: { slug } });
      if (!title) {
        log(`[wire] ${slug}: no Title with this slug — skipping`);
        skipped++;
        continue;
      }

      const firstEpisode = await prisma.episode.findFirst({
        where: { titleId: title.id },
        orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
      });

      if (!firstEpisode) {
        log(`[wire] ${slug}: Title has no episodes — skipping`);
        skipped++;
        continue;
      }

      await prisma.episode.update({
        where: { id: firstEpisode.id },
        data: {
          videoPath,
          durationSec:
            typeof durationSec === "number" ? durationSec : firstEpisode.durationSec,
        },
      });
      updatedEpisodes++;
      log(
        `[wire] ${slug}: episode ${firstEpisode.id} -> videoPath=${videoPath} durationSec=${durationSec ?? firstEpisode.durationSec}`,
      );

      if (posterUrl) {
        await prisma.title.update({
          where: { id: title.id },
          data: { heroImageUrl: posterUrl },
        });
        updatedPosters++;
        log(`[wire] ${slug}: title heroImageUrl -> ${posterUrl}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  process.stdout.write(
    `Wired ${updatedEpisodes} episode(s), ${updatedPosters} poster(s), skipped ${skipped} of ${slugs.length} manifest entr${slugs.length === 1 ? "y" : "ies"}.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`\n[wire] ERROR: ${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(1);
});
