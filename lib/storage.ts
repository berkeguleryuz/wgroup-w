/**
 * lib/storage.ts — video storage abstraction (server-only).
 *
 * Two concerns, one module:
 *
 *  1. UPLOAD (editor flow): `getStorage()` returns a provider whose
 *     `createSignedUploadUrl()` the API route hands to the browser for a direct
 *     PUT. Provider is **Cloudflare R2** when R2_* env is set, otherwise the
 *     existing **Supabase** signed-upload (backward compatible).
 *
 *  2. PLAYBACK (watch page): `resolveVideoUrl(videoPath)` turns an
 *     `Episode.videoPath` into a playable URL:
 *       - full `http(s)://…`           → passthrough (R2 public URL, sample MP4s)
 *       - site-absolute `/hls/…`       → passthrough (served from `public/` now;
 *                                         becomes an R2 public URL once ingested
 *                                         straight to R2)
 *       - bare storage key             → R2 public URL (if R2) or Supabase signed
 *
 * R2 is S3-compatible, so switching is a one-time env change — no code edits.
 * Cloudflare R2 env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET, R2_PUBLIC_BASE_URL (public bucket / custom domain base, no trailing /).
 */

import type { S3Client } from "@aws-sdk/client-s3";

import {
  createUploadSignedUrl,
  createVideoSignedUrl,
} from "@/lib/supabase-storage";

export interface SignedUpload {
  /** Pre-signed URL the client PUTs the file body to. */
  uploadUrl: string;
  /** Storage object key the upload lands at (persist this on the Episode). */
  key: string;
  /** Headers the client MUST send with the PUT (content-type signature, etc.). */
  headers: Record<string, string>;
}

export interface StoragePutResult {
  key: string;
  publicUrl: string;
}

export interface StorageProvider {
  name: "r2" | "supabase";
  putObject(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<StoragePutResult>;
  getPublicUrl(key: string): string;
  createSignedUploadUrl(
    key: string,
    contentType?: string,
  ): Promise<SignedUpload>;
  createSignedReadUrl(key: string, expiresInSec?: number): Promise<string>;
}

// ---------------------------------------------------------------------------
// R2 configuration
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

/** True once the R2 credentials + bucket are present in the environment. */
export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCOUNT_ID &&
      R2_ACCESS_KEY_ID &&
      R2_SECRET_ACCESS_KEY &&
      R2_BUCKET,
  );
}

const stripLeadingSlash = (s: string) => s.replace(/^\/+/, "");
const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");

// Lazily constructed S3 client — the aws-sdk is only loaded at runtime when R2
// is actually used (kept out of the hot path while we run on local `/hls/`).
let s3Client: S3Client | null = null;
async function getR2Client(): Promise<S3Client> {
  if (!s3Client) {
    const { S3Client: Ctor } = await import("@aws-sdk/client-s3");
    s3Client = new Ctor({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return s3Client;
}

const r2Provider: StorageProvider = {
  name: "r2",
  async putObject(key, body, contentType) {
    const client = await getR2Client();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: stripLeadingSlash(key),
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key: stripLeadingSlash(key), publicUrl: this.getPublicUrl(key) };
  },
  getPublicUrl(key) {
    const base = R2_PUBLIC_BASE_URL
      ? stripTrailingSlash(R2_PUBLIC_BASE_URL)
      : `https://${R2_BUCKET}.r2.dev`;
    return `${base}/${stripLeadingSlash(key)}`;
  },
  async createSignedUploadUrl(key, contentType = "video/mp4") {
    const client = await getR2Client();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: stripLeadingSlash(key),
        ContentType: contentType,
      }),
      { expiresIn: 60 * 60 },
    );
    return {
      uploadUrl,
      key: stripLeadingSlash(key),
      headers: { "content-type": contentType },
    };
  },
  async createSignedReadUrl(key, expiresInSec = 60 * 60) {
    const client = await getR2Client();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: stripLeadingSlash(key) }),
      { expiresIn: expiresInSec },
    );
  },
};

// Supabase fallback — keeps the editor upload + signed playback working until
// R2 credentials are added. Single source of truth stays lib/supabase-storage.
const supabaseProvider: StorageProvider = {
  name: "supabase",
  async putObject() {
    throw new Error(
      "putObject is not supported on the Supabase provider; use createSignedUploadUrl",
    );
  },
  getPublicUrl(key) {
    return key;
  },
  async createSignedUploadUrl(key, contentType = "video/mp4") {
    const { signedUrl, path } = await createUploadSignedUrl(key);
    return { uploadUrl: signedUrl, key: path, headers: { "content-type": contentType } };
  },
  async createSignedReadUrl(key, expiresInSec = 60 * 60) {
    return createVideoSignedUrl(key, expiresInSec);
  },
};

/** Active storage provider: R2 when configured, else Supabase. */
export function getStorage(): StorageProvider {
  return isR2Configured() ? r2Provider : supabaseProvider;
}

/**
 * Resolve an `Episode.videoPath` into a URL the player can load.
 * Returns null only when a bare Supabase key fails to sign.
 */
export async function resolveVideoUrl(
  videoPath: string,
): Promise<string | null> {
  if (!videoPath) return null;

  // Full URL (R2 public / CDN, or sample MP4s) — use as-is.
  if (/^https?:\/\//i.test(videoPath)) return videoPath;

  // Site-absolute path (e.g. /hls/<slug>/master.m3u8) — served from public/ now,
  // and identical in shape to an R2 public path once content is ingested there.
  if (videoPath.startsWith("/")) return videoPath;

  // Bare storage object key.
  if (isR2Configured()) return r2Provider.getPublicUrl(videoPath);
  try {
    return await createVideoSignedUrl(videoPath, 60 * 60);
  } catch {
    return null;
  }
}
