#!/usr/bin/env node
/**
 * scripts/ingest-video.mjs
 *
 * Self-contained ops tool. Does NOT import anything from the app's lib/.
 *
 * Downloads a source video (YouTube / ytsearch / direct mp4 / local file),
 * transcodes it into an HLS ladder under public/hls/<slug>/, extracts a
 * poster frame, optionally uploads the tree to Cloudflare R2, and merges an
 * entry into content/hls-manifest.json.
 *
 * Usage:
 *   node scripts/ingest-video.mjs \
 *     --slug <title-slug> \
 *     --source <url|ytsearchN:query|file-path> \
 *     [--minutes N] \
 *     [--fallback <direct-mp4-url>] \
 *     [--title "..."] \
 *     [--license "..."]
 *
 * STDOUT: a single line of parseable JSON (the manifest entry for <slug>).
 * STDERR: all logs / progress / errors.
 *
 * Requires (on PATH): yt-dlp, ffmpeg, ffprobe. curl is used as a fallback.
 * R2 upload requires @aws-sdk/client-s3 (already installed) + R2_* env vars.
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Logging helpers (everything except the final JSON goes to stderr)
// ---------------------------------------------------------------------------
const log = (...args) => process.stderr.write(`${args.join(" ")}\n`);
const die = (msg, code = 1) => {
  process.stderr.write(`\n[ingest] ERROR: ${msg}\n`);
  process.exit(code);
};

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// child_process runner -> resolves with { code, stdout, stderr }
// stdio: pipe so we can capture, but ffmpeg/yt-dlp progress is forwarded.
// ---------------------------------------------------------------------------
function run(cmd, args, { capture = false, forward = true } = {}) {
  return new Promise((resolve, reject) => {
    log(`[run] ${cmd} ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      if (capture) stdout += d.toString();
      else if (forward) process.stderr.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (forward) process.stderr.write(d);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function which(cmd) {
  const res = await run("/bin/sh", ["-c", `command -v ${cmd} || true`], {
    capture: true,
    forward: false,
  });
  return res.stdout.trim() || null;
}

// ---------------------------------------------------------------------------
// ffprobe helpers
// ---------------------------------------------------------------------------
async function ffprobeJson(input) {
  const res = await run(
    "ffprobe",
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      input,
    ],
    { capture: true, forward: false },
  );
  if (res.code !== 0) {
    die(`ffprobe failed for ${input}: ${res.stderr}`);
  }
  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    die(`could not parse ffprobe output: ${e.message}`);
  }
}

function pickVideoStream(probe) {
  return (probe.streams || []).find((s) => s.codec_type === "video") || null;
}
function hasAudioStream(probe) {
  return (probe.streams || []).some((s) => s.codec_type === "audio");
}
function durationSeconds(probe) {
  const fromFormat = probe.format && probe.format.duration;
  if (fromFormat && !Number.isNaN(Number(fromFormat))) {
    return Math.round(Number(fromFormat));
  }
  const v = pickVideoStream(probe);
  if (v && v.duration && !Number.isNaN(Number(v.duration))) {
    return Math.round(Number(v.duration));
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------
function isDirectMp4(source) {
  return /^https?:\/\/.+\.(mp4|mov|m4v|webm|mkv)(\?.*)?$/i.test(source);
}
function isYouTubeOrSearch(source) {
  return (
    /^ytsearch\d*:/i.test(source) ||
    /youtube\.com|youtu\.be/i.test(source) ||
    // generic: anything that isn't a direct media URL or a local file, let yt-dlp try
    /^https?:\/\//i.test(source)
  );
}

async function downloadWithYtDlp(source, tmpDir, minutes) {
  const outTpl = path.join(tmpDir, "in.%(ext)s");
  const args = [];

  const isSearch = /^ytsearch\d*:/i.test(source);
  const looksYouTube = isSearch || /youtube\.com|youtu\.be/i.test(source);

  if (looksYouTube) {
    args.push("-f", "bv*[height<=1080]+ba/b[height<=1080]");
  } else {
    // generic http(s) source — let yt-dlp pick best, capped if possible
    args.push("-f", "bv*[height<=1080]+ba/b[height<=1080]/b");
  }

  if (minutes && Number(minutes) > 0) {
    const secs = Math.round(Number(minutes) * 60);
    args.push(
      "--download-sections",
      `*0-${secs}`,
      "--force-keyframes-at-cuts",
    );
  }

  args.push("--no-playlist", "-o", outTpl, source);

  const res = await run("yt-dlp", args);
  return res.code === 0;
}

async function downloadDirect(url, tmpDir) {
  // Prefer yt-dlp (handles redirects/headers), fall back to curl.
  const outTpl = path.join(tmpDir, "in.%(ext)s");
  const ytdlp = await which("yt-dlp");
  if (ytdlp) {
    const res = await run("yt-dlp", ["--no-playlist", "-o", outTpl, url]);
    if (res.code === 0 && (await findInput(tmpDir))) return true;
  }
  const curl = await which("curl");
  if (curl) {
    const dest = path.join(tmpDir, "in.mp4");
    const res = await run("curl", [
      "-fSL",
      "--retry",
      "3",
      "-o",
      dest,
      url,
    ]);
    if (res.code === 0) return true;
  }
  return false;
}

async function findInput(tmpDir) {
  const entries = await fs.readdir(tmpDir);
  const candidate = entries
    .filter((f) => f.startsWith("in."))
    // prefer container formats ffmpeg likes; sort by extension priority
    .sort((a, b) => extPriority(a) - extPriority(b))[0];
  return candidate ? path.join(tmpDir, candidate) : null;
}
function extPriority(name) {
  const ext = path.extname(name).toLowerCase();
  const order = [".mp4", ".mkv", ".webm", ".mov", ".m4v", ".ts"];
  const idx = order.indexOf(ext);
  return idx === -1 ? 99 : idx;
}

// ---------------------------------------------------------------------------
// HLS ladder
// ---------------------------------------------------------------------------
/**
 * Rendition ladder. Capped to source height (never upscale).
 * Each: { name, height, vBitrate, maxrate, bufsize }
 */
const LADDER = [
  { name: "360p", height: 360, vBitrate: "800k", maxrate: "856k", bufsize: "1200k" },
  { name: "720p", height: 720, vBitrate: "2800k", maxrate: "2996k", bufsize: "4200k" },
  { name: "1080p", height: 1080, vBitrate: "5000k", maxrate: "5350k", bufsize: "7500k" },
];

async function buildHls(input, outDir, probe) {
  const vStream = pickVideoStream(probe);
  if (!vStream) die("source has no video stream");
  const srcHeight = Number(vStream.height) || 1080;
  const audio = hasAudioStream(probe);

  // Select renditions <= source height; always keep at least the lowest.
  let renditions = LADDER.filter((r) => r.height <= srcHeight);
  if (renditions.length === 0) renditions = [LADDER[0]];

  log(
    `[hls] source height=${srcHeight} audio=${audio} renditions=${renditions
      .map((r) => r.name)
      .join(",")}`,
  );

  await fs.mkdir(outDir, { recursive: true });

  const args = ["-y", "-i", input];

  // Build per-rendition video maps + scale/encode args.
  // Each rendition reuses the single video input stream (mapped N times).
  const filterParts = [];
  const splitOutputs = renditions.map((_, i) => `[v${i}]`).join("");
  filterParts.push(`[0:v]split=${renditions.length}${splitOutputs}`);
  renditions.forEach((r, i) => {
    // -2 keeps aspect ratio and ensures even width for libx264.
    filterParts.push(`[v${i}]scale=-2:${r.height}[vout${i}]`);
  });
  args.push("-filter_complex", filterParts.join(";"));

  renditions.forEach((r, i) => {
    args.push(
      "-map",
      `[vout${i}]`,
      `-c:v:${i}`,
      "libx264",
      `-profile:v:${i}`,
      "main",
      `-preset`,
      "veryfast",
      `-crf`,
      "21",
      `-b:v:${i}`,
      r.vBitrate,
      `-maxrate:v:${i}`,
      r.maxrate,
      `-bufsize:v:${i}`,
      r.bufsize,
      `-g`,
      "48",
      `-keyint_min`,
      "48",
      `-sc_threshold`,
      "0",
    );
  });

  // Audio: one shared AAC track mapped per rendition if present.
  if (audio) {
    renditions.forEach((_, i) => {
      args.push("-map", "a:0", `-c:a:${i}`, "aac", `-b:a:${i}`, "128k", "-ac", "2");
    });
  }

  // var_stream_map: pair each video (and audio) into a variant.
  const varStreamMap = renditions
    .map((r, i) => (audio ? `v:${i},a:${i},name:${r.name}` : `v:${i},name:${r.name}`))
    .join(" ");

  args.push(
    "-f",
    "hls",
    "-hls_time",
    "6",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    path.join(outDir, "stream_%v_%03d.ts"),
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    varStreamMap,
    path.join(outDir, "stream_%v.m3u8"),
  );

  const res = await run("ffmpeg", args);
  if (res.code !== 0) die(`ffmpeg HLS transcode failed (exit ${res.code})`);

  // Verify master playlist exists.
  const masterPath = path.join(outDir, "master.m3u8");
  try {
    await fs.access(masterPath);
  } catch {
    die("ffmpeg finished but master.m3u8 was not produced");
  }
  return { renditions: renditions.map((r) => r.name), audio };
}

async function buildPoster(input, outDir, durationSec) {
  const posterPath = path.join(outDir, "poster.jpg");
  const mid = durationSec > 0 ? Math.floor(durationSec / 2) : 1;
  const res = await run("ffmpeg", [
    "-y",
    "-ss",
    String(mid),
    "-i",
    input,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    posterPath,
  ]);
  if (res.code !== 0) {
    log("[poster] WARNING: poster extraction failed, continuing without poster");
    return null;
  }
  try {
    await fs.access(posterPath);
    return posterPath;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// R2 upload (optional)
// ---------------------------------------------------------------------------
function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".m3u8") return "application/vnd.apple.mpegurl";
  if (ext === ".ts") return "video/mp2t";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

async function walkFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkFiles(full)));
    else out.push(full);
  }
  return out;
}

async function uploadToR2(localDir, slug) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const bucket = process.env.R2_BUCKET;
  const files = await walkFiles(localDir);
  log(`[r2] uploading ${files.length} files to bucket=${bucket} prefix=hls/${slug}/`);

  for (const file of files) {
    const rel = path.relative(localDir, file).split(path.sep).join("/");
    const key = `hls/${slug}/${rel}`;
    const body = createReadStream(file);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentTypeFor(file),
      }),
    );
    log(`[r2] put ${key}`);
  }
}

// ---------------------------------------------------------------------------
// Manifest merge (idempotent)
// ---------------------------------------------------------------------------
async function mergeManifest(manifestPath, slug, entry) {
  let current = {};
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    current = JSON.parse(raw);
    if (typeof current !== "object" || current === null) current = {};
  } catch {
    current = {};
  }
  current[slug] = entry;
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  const source = args.source;
  const minutes = args.minutes;
  const fallback = args.fallback;
  const titleArg = typeof args.title === "string" ? args.title : null;
  const licenseArg = typeof args.license === "string" ? args.license : null;

  if (!slug || typeof slug !== "string") die("--slug is required");
  if (!source || typeof source !== "string") die("--source is required");
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    die(`--slug must be a url-safe slug (got "${slug}")`);
  }

  // Tool checks
  for (const tool of ["ffmpeg", "ffprobe"]) {
    if (!(await which(tool))) die(`${tool} not found on PATH`);
  }

  const projectRoot = process.cwd();
  const outDir = path.join(projectRoot, "public", "hls", slug);
  const manifestPath = path.join(projectRoot, "content", "hls-manifest.json");

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `ingest-${slug}-`));
  log(`[ingest] slug=${slug} tmp=${tmpDir}`);

  let status = "ok";

  try {
    // --- 1) Acquire input -------------------------------------------------
    let inputPath = null;

    if (isDirectMp4(source) && !isYouTubeOrSearch(source)) {
      // pure direct media url
      const ok = await downloadDirect(source, tmpDir);
      if (ok) inputPath = await findInput(tmpDir);
    } else if (/^https?:\/\//i.test(source) || /^ytsearch\d*:/i.test(source)) {
      // try yt-dlp first (covers youtube, ytsearch, generic http)
      let ytOk = false;
      if (await which("yt-dlp")) {
        ytOk = await downloadWithYtDlp(source, tmpDir, minutes);
      } else {
        log("[ingest] WARNING: yt-dlp not found on PATH");
      }
      if (ytOk) inputPath = await findInput(tmpDir);
      // if it was actually a direct media url that yt-dlp couldn't handle, try direct
      if (!inputPath && isDirectMp4(source)) {
        if (await downloadDirect(source, tmpDir)) inputPath = await findInput(tmpDir);
      }
    } else {
      // local file path
      const abs = path.isAbsolute(source) ? source : path.join(projectRoot, source);
      try {
        await fs.access(abs);
        inputPath = abs;
      } catch {
        die(`local source file not found: ${abs}`);
      }
    }

    // --- 2) Fallback ------------------------------------------------------
    if (!inputPath && fallback && typeof fallback === "string") {
      log(`[ingest] primary download failed, trying --fallback ${fallback}`);
      if (await downloadDirect(fallback, tmpDir)) {
        inputPath = await findInput(tmpDir);
        if (inputPath) status = "fallback-used";
      }
    }

    if (!inputPath) {
      die("could not obtain an input video from --source (and --fallback if given)");
    }

    log(`[ingest] input=${inputPath} status=${status}`);

    // --- 3) Probe ---------------------------------------------------------
    const probe = await ffprobeJson(inputPath);
    const durationSec = durationSeconds(probe);
    log(`[ingest] durationSec=${durationSec}`);

    // --- 4) HLS ladder ----------------------------------------------------
    // Clean previous output for idempotency.
    await fs.rm(outDir, { recursive: true, force: true });
    await buildHls(inputPath, outDir, probe);

    // --- 5) Poster --------------------------------------------------------
    const posterFile = await buildPoster(inputPath, outDir, durationSec);

    // --- 6) Resolve public paths / R2 upload -----------------------------
    let videoPath;
    let posterUrl;

    if (r2Configured()) {
      log("[ingest] R2 configured — uploading HLS tree to R2");
      await uploadToR2(outDir, slug);
      const base = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
      videoPath = `${base}/hls/${slug}/master.m3u8`;
      posterUrl = posterFile ? `${base}/hls/${slug}/poster.jpg` : null;
    } else {
      log("[ingest] R2 not configured — using local /hls/ paths");
      videoPath = `/hls/${slug}/master.m3u8`;
      posterUrl = posterFile ? `/hls/${slug}/poster.jpg` : null;
    }

    // --- 7) Merge manifest ------------------------------------------------
    const entry = {
      videoPath,
      durationSec,
      posterUrl,
      source,
      license: licenseArg,
      title: titleArg,
    };
    await mergeManifest(manifestPath, slug, entry);
    log(`[ingest] manifest updated: ${manifestPath}`);

    // --- 8) Emit single-line JSON to STDOUT ------------------------------
    const result = { [slug]: { ...entry, status } };
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    // Cleanup tmp dir (keep public/hls output).
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  die(err && err.stack ? err.stack : String(err));
});
