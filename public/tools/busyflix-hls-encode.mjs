#!/usr/bin/env node
/**
 * BusyFlix HLS Encoder
 * --------------------
 * Bir videoyu (MP4/MOV/WebM) BusyFlix'in çoklu-kalite (adaptive HLS)
 * formatına çevirir. Çıktı klasörünü panel üzerindeki "HLS klasörü yükle"
 * seçeneğiyle olduğu gibi yüklersin.
 *
 * Gereksinim: ffmpeg + ffprobe (https://ffmpeg.org)
 *   macOS:   brew install ffmpeg
 *   Windows: winget install ffmpeg
 *   Linux:   sudo apt install ffmpeg
 *
 * Kullanım:
 *   node busyflix-hls-encode.mjs <video-dosyası> [çıktı-klasörü]
 *
 * Örnek:
 *   node busyflix-hls-encode.mjs tanitim.mp4
 *   → ./tanitim-hls/ klasörü oluşur (master.m3u8 + kalite varyantları)
 *
 * Kalite merdiveni: 360p / 720p / 1080p — kaynak çözünürlüğün üzerine
 * çıkılmaz (ör. 720p kaynak → 360p + 720p üretilir).
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const LADDER = [
  { name: "360p", height: 360, vBitrate: "800k", maxrate: "856k", bufsize: "1200k" },
  { name: "720p", height: 720, vBitrate: "2800k", maxrate: "2996k", bufsize: "4200k" },
  { name: "1080p", height: 1080, vBitrate: "5000k", maxrate: "5350k", bufsize: "7500k" },
];

const log = (msg) => console.log(`[busyflix-hls] ${msg}`);
const die = (msg) => {
  console.error(`\n[busyflix-hls] HATA: ${msg}\n`);
  process.exit(1);
};

function run(cmd, args, { quiet = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (!quiet) process.stderr.write(d);
    });
    child.on("error", () => resolve({ code: -1, stdout, stderr }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function main() {
  const [input, outArg] = process.argv.slice(2);
  if (!input) {
    console.log("Kullanım: node busyflix-hls-encode.mjs <video-dosyası> [çıktı-klasörü]");
    process.exit(0);
  }

  try {
    await fs.access(input);
  } catch {
    die(`dosya bulunamadı: ${input}`);
  }

  for (const tool of ["ffmpeg", "ffprobe"]) {
    const res = await run(tool, ["-version"], { quiet: true });
    if (res.code !== 0) {
      die(`${tool} bulunamadı. Kurulum: macOS "brew install ffmpeg", Windows "winget install ffmpeg"`);
    }
  }

  // --- Probe ---------------------------------------------------------------
  const probeRes = await run(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", input],
    { quiet: true },
  );
  if (probeRes.code !== 0) die(`video okunamadı: ${probeRes.stderr.slice(0, 300)}`);
  const probe = JSON.parse(probeRes.stdout);
  const video = (probe.streams || []).find((s) => s.codec_type === "video");
  if (!video) die("dosyada video akışı yok");
  const hasAudio = (probe.streams || []).some((s) => s.codec_type === "audio");
  const srcHeight = Number(video.height) || 1080;
  const srcWidth = Number(video.width) || 1920;
  const durationSec = Math.round(Number(probe.format?.duration ?? video.duration)) || 0;

  // 16:9-equivalent height: ultrawide (cinemascope) sources are classed by
  // width, so a 1280x536 film still gets its 720p rendition.
  const effectiveHeight = Math.max(srcHeight, Math.round((srcWidth * 9) / 16));
  let renditions = LADDER.filter((r) => r.height <= effectiveHeight).map((r) => ({
    ...r,
    width: Math.round((r.height * 16) / 9),
  }));
  if (renditions.length === 0) renditions = [{ ...LADDER[0], width: 640 }];

  // Kaynağın kendi kalitesi her zaman en üst seçenek: en yüksek basamağı
  // aşıyorsa (900p, 1440p, 4K…) doğal çözünürlükte "orig" varyantı eklenir
  // (4K genişlikle sınırlı), bitrate 1080p basamağından ölçeklenir.
  if (effectiveHeight > renditions[renditions.length - 1].height) {
    const kbps = Math.min(
      16000,
      Math.max(6500, Math.round((5000 * srcWidth * srcHeight) / (1920 * 1080))),
    );
    renditions.push({
      name: "orig",
      height: effectiveHeight,
      width: Math.min(srcWidth, 3840),
      vBitrate: `${kbps}k`,
      maxrate: `${Math.round(kbps * 1.07)}k`,
      bufsize: `${Math.round(kbps * 1.5)}k`,
    });
  }

  const base = path.basename(input).replace(/\.[a-z0-9]+$/i, "");
  const outDir = outArg || path.join(path.dirname(input), `${base}-hls`);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  log(`kaynak: ${srcHeight}p, ${Math.floor(durationSec / 60)}dk ${durationSec % 60}sn, ses: ${hasAudio ? "var" : "yok"}`);
  log(`üretilecek kaliteler: ${renditions.map((r) => r.name).join(", ")}`);
  log(`çıktı klasörü: ${outDir}`);
  log("dönüştürme başlıyor — video uzunluğuna göre birkaç dakika sürebilir…");

  // --- Encode ----------------------------------------------------------------
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
  if (hasAudio) {
    renditions.forEach((_, i) => {
      args.push("-map", "a:0", `-c:a:${i}`, "aac", `-b:a:${i}`, "128k", "-ac", "2");
    });
  }
  const varStreamMap = renditions
    .map((r, i) => (hasAudio ? `v:${i},a:${i},name:${r.name}` : `v:${i},name:${r.name}`))
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
  if (res.code !== 0) die(`ffmpeg dönüştürme başarısız (çıkış kodu ${res.code})`);

  try {
    await fs.access(path.join(outDir, "master.m3u8"));
  } catch {
    die("dönüştürme bitti ama master.m3u8 üretilmedi");
  }

  const fileCount = (await fs.readdir(outDir)).length;
  log("");
  log(`✔ tamamlandı: ${outDir} (${fileCount} dosya)`);
  log("Şimdi panelde bölüm formundaki \"HLS klasörü yükle\" seçeneğiyle bu klasörü seç ve yükle.");
}

main().catch((e) => die(e?.stack || String(e)));
