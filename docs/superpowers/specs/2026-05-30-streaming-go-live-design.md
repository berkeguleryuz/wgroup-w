# BusinessFlix — Streaming "Go-Live" Design

**Date:** 2026-05-30
**Status:** Approved (user: "Onayla, workflow'u kur ve çalıştır")

## Goal

Make the streaming feature production-real: genuine educational videos, a full
**HLS adaptive** pipeline, and a **Cloudflare R2-ready** storage layer. Until R2
credentials exist, the same HLS output is served locally from `public/hls/` so the
experience is genuinely "live" now; switching to R2 is a one-time env change.

## Decisions (from prior session + this brainstorm)

- **Storage: Cloudflare R2** (S3-compatible, **egress $0**). Cheapest at scale; R2
  advantage grows with resolution. Free tier: 10 GB storage, 1M Class A, 10M Class B
  ops/month; egress always free. Main cost lever with HLS is **Class B reads** (one per
  `.ts` segment) — kept low with 6 s segments + Cloudflare CDN caching.
- **Encoding: full HLS adaptive ladder** — 360p / 720p / 1080p + `master.m3u8`, via
  `ffmpeg`. Tooling present: `ffmpeg`, `ffprobe`, `yt-dlp`, `node`, `python3`.
- **Player: HLS.js** (native HLS on Safari), MP4 fallback. Preview-cap + progress logic
  preserved.
- **Content: 2–3 titles fully real** (CC-BY / public-domain only — incl. ≥1 real
  YouTube download via `yt-dlp`); rest of seed catalog unchanged.
- **R2 creds: not yet** — build full code + pipeline; serve HLS from `public/hls/`
  meanwhile; activate R2 when env is filled.

## Architecture

### 1. Storage abstraction — `lib/storage/`
- `index.ts` — picks provider: `R2_ACCOUNT_ID` set → R2, else `local`.
- `r2.ts` — `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`; endpoint from
  account id; `putObject`, `getPublicUrl`, `createSignedUploadUrl`, `createSignedReadUrl`.
- `local.ts` — writes under `public/hls/`, returns `/hls/...` URL.
- `resolve.ts` — `resolveVideoUrl(path)`: passthrough `http(s)`; passthrough `/hls/...`;
  R2 key → public/signed URL; Supabase key → existing signed URL (backward compat).
- Images stay on Supabase (already working). Video → R2/local.

### 2. HLS ingest pipeline — `scripts/ingest-video.mjs`
Input: `--source <url|file> --slug <name> [--minutes N]`.
Steps: `yt-dlp` download (cap section for demo) → `ffmpeg` HLS ladder (360/720/1080 +
`master.m3u8`, ~6 s segments) → poster via `ffmpeg` → upload to storage provider (R2 if
configured, else copy to `public/hls/<slug>/`) → print JSON `{ videoPath, durationSec,
poster }`.

### 3. DB wiring — `scripts/wire-real-episodes.mjs`
Idempotently updates 2–3 chosen episodes (by title slug) with the ingested
`videoPath` (`master.m3u8`), real `durationSec`, and poster `heroImageUrl`. Seed left
intact for the rest.

### 4. Player — HLS.js
- `components/video/HlsVideo.tsx` (client): attaches HLS.js for `.m3u8`, else sets `src`.
- `PlayerClient.tsx` uses it; preview-cap + progress unchanged.
- `AppHero` trailer detection extended to `.m3u8` (uses HlsVideo).

### 5. Editor upload — `lib/storage` aware
- `/api/editor/video-upload` + `VideoUpload.tsx` use the storage abstraction
  (R2 signed upload when configured; Supabase otherwise). Editor uploads a single MP4;
  HLS conversion via the ingest script (server-side ffmpeg is heavy — documented).

### 6. Env + docs
- `.env.local.example`: add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.
- `NOTES.md`: how to create R2 bucket + custom domain + token, fill env, run ingest.

### 7. Verification
`tsc` clean, dev server, HLS plays locally, preview-cap fires for non-subscribers,
progress saves.

## Legality

Only CC-BY / public-domain / royalty-free sources. No copyrighted downloads.

## Out of scope (now)

Server-side auto-encode queue, per-segment signed-URL DRM, Cloudflare Worker token gate,
trailer-specific assets. Storage layer leaves room for all of these.

## Workflow orchestration

- **Phase 1 (parallel):** storage lib · resolve+page · HlsVideo+PlayerClient+AppHero ·
  editor upload · ingest script + env/docs — partitioned files, no overlap.
- **Phase 2 (parallel):** ingest 2–3 real CC videos (incl. a YouTube download).
- **Phase 3 (sequential):** wire DB → `tsc` → verify.
Deps (`hls.js`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) installed before
the run to avoid `package.json` conflicts.
