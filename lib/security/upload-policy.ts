import { z } from "zod";

export const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
export const MAX_SUBTITLE_BYTES = 2 * 1024 * 1024;
export const MAX_HLS_FILES = 1000;
export const MAX_HLS_TOTAL_BYTES = 8 * 1024 * 1024 * 1024;

export type UploadKind = "avatar" | "image" | "video" | "subtitle";

const IMAGE_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
};
const VIDEO_EXTENSIONS: Record<string, readonly string[]> = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
  "video/x-m4v": [".m4v"],
};
const SUBTITLE_EXTENSIONS: Record<string, readonly string[]> = {
  "text/vtt": [".vtt"],
};

const baseUploadSchema = z.object({
  filename: z.string().trim().min(1).max(100),
  contentType: z.string().trim().min(1).max(100),
  size: z.number().int().positive(),
});

function isSafeFilename(filename: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(filename) && !filename.includes("..");
}

export function parseUploadRequest(kind: UploadKind, input: unknown) {
  const parsed = baseUploadSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const { filename, contentType, size } = parsed.data;
  const extensions =
    kind === "video"
      ? VIDEO_EXTENSIONS
      : kind === "subtitle"
        ? SUBTITLE_EXTENSIONS
        : IMAGE_EXTENSIONS;
  const maxBytes =
    kind === "avatar"
      ? MAX_AVATAR_BYTES
      : kind === "image"
        ? MAX_IMAGE_BYTES
        : kind === "video"
          ? MAX_VIDEO_BYTES
          : MAX_SUBTITLE_BYTES;
  const suffixes = extensions[contentType];
  if (
    !isSafeFilename(filename) ||
    !suffixes?.some((suffix) => filename.toLowerCase().endsWith(suffix)) ||
    size > maxBytes
  ) {
    return { success: false as const, error: new Error("invalid upload") };
  }
  return { success: true as const, data: parsed.data };
}

const hlsFileSchema = z.object({
  name: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.(m3u8|ts)$/),
  size: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
});
const hlsSchema = z.object({
  folderName: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  files: z.array(hlsFileSchema).min(1).max(MAX_HLS_FILES),
});

export function validateHlsManifest(input: unknown) {
  const parsed = hlsSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const names = parsed.data.files.map((file) => file.name);
  const total = parsed.data.files.reduce((sum, file) => sum + file.size, 0);
  if (
    !names.includes("master.m3u8") ||
    new Set(names).size !== names.length ||
    total > MAX_HLS_TOTAL_BYTES
  ) {
    return { success: false as const, error: new Error("invalid HLS manifest") };
  }
  return { success: true as const, data: parsed.data };
}
