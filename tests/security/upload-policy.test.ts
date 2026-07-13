import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_AVATAR_BYTES,
  MAX_HLS_FILES,
  MAX_HLS_TOTAL_BYTES,
  MAX_IMAGE_BYTES,
  MAX_SUBTITLE_BYTES,
  MAX_VIDEO_BYTES,
  parseUploadRequest,
  validateHlsManifest,
} from "../../lib/security/upload-policy";

test("accepts valid image and video MIME-extension pairs", () => {
  assert.equal(
    parseUploadRequest("avatar", {
      filename: "avatar.webp",
      contentType: "image/webp",
      size: MAX_AVATAR_BYTES,
    }).success,
    true,
  );
  assert.equal(
    parseUploadRequest("image", {
      filename: "cover.avif",
      contentType: "image/avif",
      size: MAX_IMAGE_BYTES,
    }).success,
    true,
  );
  assert.equal(
    parseUploadRequest("video", {
      filename: "lesson.mp4",
      contentType: "video/mp4",
      size: MAX_VIDEO_BYTES,
    }).success,
    true,
  );
  assert.equal(
    parseUploadRequest("subtitle", {
      filename: "lesson-tr.vtt",
      contentType: "text/vtt",
      size: MAX_SUBTITLE_BYTES,
    }).success,
    true,
  );
});

test("rejects mismatched MIME, unsafe names, empty files, and oversized files", () => {
  for (const [kind, payload] of [
    ["image", { filename: "cover.html", contentType: "image/webp", size: 100 }],
    ["image", { filename: "cover.jpg", contentType: "image/png", size: 100 }],
    ["video", { filename: "lesson.mp4", contentType: "text/html", size: 100 }],
    ["subtitle", { filename: "lesson.vtt", contentType: "text/html", size: 100 }],
    ["subtitle", { filename: "lesson.txt", contentType: "text/vtt", size: 100 }],
    ["video", { filename: "../lesson.mp4", contentType: "video/mp4", size: 100 }],
    ["avatar", { filename: "avatar.png", contentType: "image/png", size: 0 }],
    [
      "video",
      { filename: "lesson.mp4", contentType: "video/mp4", size: MAX_VIDEO_BYTES + 1 },
    ],
  ] as const) {
    assert.equal(parseUploadRequest(kind, payload).success, false);
  }
});

test("enforces HLS file count, file types, and aggregate size", () => {
  assert.equal(
    validateHlsManifest({
      folderName: "course",
      files: [
        { name: "master.m3u8", size: 1200 },
        { name: "stream_0.m3u8", size: 1200 },
        { name: "stream_0_000.ts", size: 500_000 },
      ],
    }).success,
    true,
  );
  assert.equal(
    validateHlsManifest({
      folderName: "course",
      files: Array.from({ length: MAX_HLS_FILES + 1 }, (_, index) => ({
        name: index === 0 ? "master.m3u8" : `seg_${index}.ts`,
        size: 1,
      })),
    }).success,
    false,
  );
  assert.equal(
    validateHlsManifest({
      folderName: "course",
      files: [
        { name: "master.m3u8", size: 1 },
        { name: "segment.ts", size: MAX_HLS_TOTAL_BYTES },
      ],
    }).success,
    false,
  );
});
