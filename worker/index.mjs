#!/usr/bin/env node
/**
 * BusyFlix transcode worker
 * -------------------------
 * Drains the `TranscodeJob` queue: downloads the raw upload from R2, encodes
 * the adaptive HLS ladder (360p/720p/1080p, capped at source height), uploads
 * the tree back to R2, flips the episode's videoPath to the master playlist
 * and deletes the raw source. Exits when the queue is empty.
 *
 * Designed for GitHub Actions (.github/workflows/transcode.yml) but runs on
 * any machine with node >= 20 and ffmpeg/ffprobe on PATH.
 *
 * Required env: DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL.
 *
 * Deliberately Prisma-free (raw SQL via `pg`) so a run needs only two small
 * npm packages — no prisma generate, no full app install. The ffmpeg ladder
 * mirrors public/tools/busyflix-hls-encode.mjs; keep the two in sync.
 */

import { spawn } from "node:child_process";
import { createWriteStream, createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import pg from "pg";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const MAX_ATTEMPTS = 3;
const STALE_LOCK_MINUTES = 45;

const LADDER = [
  { name: "360p", height: 360, vBitrate: "800k", maxrate: "856k", bufsize: "1200k" },
  { name: "720p", height: 720, vBitrate: "2800k", maxrate: "2996k", bufsize: "4200k" },
  { name: "1080p", height: 1080, vBitrate: "5000k", maxrate: "5350k", bufsize: "7500k" },
];

const log = (...a) => console.log("[worker]", ...a);

for (const key of [
  "DATABASE_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
]) {
  if (!process.env[key]) {
    console.error(`[worker] missing env: ${key}`);
    process.exit(1);
  }
}

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ---------------------------------------------------------------------------
// ffmpeg helpers
// ---------------------------------------------------------------------------

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => resolve({ code: -1, stdout, stderr }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function probe(input) {
  const res = await run("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    input,
  ]);
  if (res.code !== 0) throw new Error(`ffprobe failed: ${res.stderr.slice(0, 300)}`);
  const data = JSON.parse(res.stdout);
  const video = (data.streams || []).find((s) => s.codec_type === "video");
  if (!video) throw new Error("source has no video stream");
  return {
    durationSec: Math.round(Number(data.format?.duration ?? video.duration)) || 0,
    height: Number(video.height) || 1080,
    width: Number(video.width) || 1920,
    hasAudio: (data.streams || []).some((s) => s.codec_type === "audio"),
  };
}

async function buildLadder(input, outDir, info) {
  // Pick renditions by the source's 16:9-equivalent height so ultrawide
  // (cinemascope) sources still get their full ladder — a 1280x536 film is
  // 720p-class by width even though it is only 536px tall.
  const effectiveHeight = Math.max(info.height, Math.round((info.width * 9) / 16));
  let renditions = LADDER.filter((r) => r.height <= effectiveHeight).map((r) => ({
    ...r,
    width: Math.round((r.height * 16) / 9),
  }));
  if (renditions.length === 0) renditions = [{ ...LADDER[0], width: 640 }];

  // The source's native quality is always the top option: when it exceeds the
  // highest ladder rung (900p, 1440p, 4K…), add an "orig" rendition at native
  // resolution (capped at 4K width) with a bitrate scaled from the 1080p rung.
  if (effectiveHeight > renditions[renditions.length - 1].height) {
    const kbps = Math.min(
      16000,
      Math.max(6500, Math.round((5000 * info.width * info.height) / (1920 * 1080))),
    );
    renditions.push({
      name: "orig",
      height: effectiveHeight,
      width: Math.min(info.width, 3840),
      vBitrate: `${kbps}k`,
      maxrate: `${Math.round(kbps * 1.07)}k`,
      bufsize: `${Math.round(kbps * 1.5)}k`,
    });
  }

  const args = ["-y", "-i", input];
  const filter = [
    `[0:v]split=${renditions.length}${renditions.map((_, i) => `[v${i}]`).join("")}`,
    // Scale by width, never upscaling: min(iw, target).
    ...renditions.map(
      (r, i) => `[v${i}]scale=min(iw\\,${r.width}):-2[vout${i}]`,
    ),
  ];
  args.push("-filter_complex", filter.join(";"));
  renditions.forEach((r, i) => {
    args.push(
      "-map", `[vout${i}]`,
      `-c:v:${i}`, "libx264",
      `-profile:v:${i}`, "main",
      "-preset", "veryfast",
      "-crf", "21",
      `-b:v:${i}`, r.vBitrate,
      `-maxrate:v:${i}`, r.maxrate,
      `-bufsize:v:${i}`, r.bufsize,
      "-g", "48",
      "-keyint_min", "48",
      "-sc_threshold", "0",
    );
  });
  if (info.hasAudio) {
    renditions.forEach((_, i) => {
      args.push("-map", "a:0", `-c:a:${i}`, "aac", `-b:a:${i}`, "128k", "-ac", "2");
    });
  }
  const varStreamMap = renditions
    .map((r, i) => (info.hasAudio ? `v:${i},a:${i},name:${r.name}` : `v:${i},name:${r.name}`))
    .join(" ");
  args.push(
    "-f", "hls",
    "-hls_time", "6",
    "-hls_playlist_type", "vod",
    "-hls_flags", "independent_segments",
    "-hls_segment_filename", path.join(outDir, "stream_%v_%03d.ts"),
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", varStreamMap,
    path.join(outDir, "stream_%v.m3u8"),
  );

  const res = await run("ffmpeg", args);
  if (res.code !== 0) throw new Error(`ffmpeg failed: ${res.stderr.slice(-400)}`);
  await fs.access(path.join(outDir, "master.m3u8"));
}

const contentTypeFor = (f) =>
  f.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";

// ---------------------------------------------------------------------------
// Queue operations (raw SQL against Prisma's tables)
// ---------------------------------------------------------------------------

/** Atomically claim the oldest queued (or stale-locked) job. */
async function claimJob() {
  const res = await db.query(
    `UPDATE "TranscodeJob"
     SET status = 'PROCESSING', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
     WHERE id = (
       SELECT id FROM "TranscodeJob"
       WHERE status = 'QUEUED'
          OR (status = 'PROCESSING' AND "lockedAt" < now() - interval '${STALE_LOCK_MINUTES} minutes')
       ORDER BY "createdAt" ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING id, "episodeId", "sourceKey", attempts`,
  );
  return res.rows[0] ?? null;
}

async function finishJob(id, status, error = null) {
  await db.query(
    `UPDATE "TranscodeJob"
     SET status = $2, error = $3, "lockedAt" = NULL, "updatedAt" = now()
     WHERE id = $1`,
    [id, status, error],
  );
}

// ---------------------------------------------------------------------------
// Job processing
// ---------------------------------------------------------------------------

async function processJob(job) {
  // Skip stale jobs: the episode was deleted or re-pointed since enqueue.
  const epRes = await db.query(`SELECT "videoPath" FROM "Episode" WHERE id = $1`, [
    job.episodeId,
  ]);
  const episode = epRes.rows[0];
  if (!episode || episode.videoPath !== job.sourceKey) {
    await finishJob(job.id, "DONE", "stale: episode changed or deleted");
    log(`skip stale job ${job.id}`);
    return;
  }

  const treePrefix = `hls/${job.sourceKey.replace(/\.[a-z0-9]+$/i, "")}`;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "bfx-"));
  try {
    // 1) Download the raw source.
    const input = path.join(tmp, `in${path.extname(job.sourceKey) || ".mp4"}`);
    const res = await fetch(`${PUBLIC_BASE}/${job.sourceKey}`);
    if (!res.ok || !res.body) throw new Error(`source download failed (${res.status})`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(input));

    // 2) Encode the ladder.
    const info = await probe(input);
    log(`  ${info.durationSec}s ${info.height}p audio=${info.hasAudio}`);
    const outDir = path.join(tmp, "out");
    await fs.mkdir(outDir);
    await buildLadder(input, outDir, info);

    // 3) Upload the HLS tree.
    const files = await fs.readdir(outDir);
    log(`  uploading ${files.length} files -> ${treePrefix}/`);
    for (const file of files) {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `${treePrefix}/${file}`,
          Body: createReadStream(path.join(outDir, file)),
          ContentType: contentTypeFor(file),
        }),
      );
    }

    // 4) Flip the episode to HLS — guarded so a concurrent re-upload wins.
    const masterUrl = `${PUBLIC_BASE}/${treePrefix}/master.m3u8`;
    const upd = await db.query(
      `UPDATE "Episode"
       SET "videoPath" = $2, "durationSec" = CASE WHEN $3::int > 0 THEN $3::int ELSE "durationSec" END, "updatedAt" = now()
       WHERE id = $1 AND "videoPath" = $4`,
      [job.episodeId, masterUrl, info.durationSec, job.sourceKey],
    );
    if (upd.rowCount !== 1) {
      await finishJob(job.id, "DONE", "stale: episode changed during processing");
      log(`  episode changed mid-flight, leaving as-is`);
      return;
    }
    await finishJob(job.id, "DONE");

    // 5) The raw MP4 was only a transport artifact — drop it.
    await s3
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: job.sourceKey }))
      .catch((e) => log(`  source delete failed (non-fatal): ${e.message}`));

    log(`  DONE -> ${masterUrl}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main() {
  for (const tool of ["ffmpeg", "ffprobe"]) {
    const res = await run(tool, ["-version"]);
    if (res.code !== 0) throw new Error(`${tool} not found on PATH`);
  }
  await db.connect();

  let processed = 0;
  for (;;) {
    const job = await claimJob();
    if (!job) break;
    log(`job ${job.id} (attempt ${job.attempts}): ${job.sourceKey}`);
    try {
      await processJob(job);
      processed++;
    } catch (e) {
      const msg = (e?.message || String(e)).slice(0, 900);
      log(`  FAILED: ${msg}`);
      await finishJob(
        job.id,
        job.attempts >= MAX_ATTEMPTS ? "FAILED" : "QUEUED",
        msg,
      );
    }
  }
  log(`queue drained, processed ${processed} job(s)`);
  await db.end();
}

main().catch(async (e) => {
  console.error("[worker] fatal:", e);
  await db.end().catch(() => {});
  process.exit(1);
});
