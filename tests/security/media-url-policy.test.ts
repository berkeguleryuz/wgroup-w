import assert from "node:assert/strict";
import test from "node:test";

import {
  configuredMediaOrigins,
  validateMediaReference,
} from "../../lib/security/media-url-policy";

const allowedOrigins = [
  "https://cdn.example.com",
  "https://project.supabase.co",
];

test("accepts managed storage keys, local assets, and allowlisted HTTPS URLs", () => {
  for (const value of [
    "uploads/org/acme/video.mp4",
    "hls/uploads/course/master.m3u8",
    "images/org/acme/cover.webp",
    "/hls/demo/master.m3u8",
    "https://cdn.example.com/media/video.mp4",
  ]) {
    assert.equal(validateMediaReference(value, allowedOrigins).ok, true, value);
  }
});

test("rejects untrusted schemes, origins, credentials, and protocol-relative URLs", () => {
  for (const value of [
    "http://cdn.example.com/video.mp4",
    "https://evil.example/video.mp4",
    "https://user:pass@cdn.example.com/video.mp4",
    "//cdn.example.com/video.mp4",
    "javascript:alert(1)",
  ]) {
    assert.equal(validateMediaReference(value, allowedOrigins).ok, false, value);
  }
});

test("rejects loopback, private, and link-local IP literals", () => {
  for (const value of [
    "https://localhost/video.mp4",
    "https://127.0.0.1/video.mp4",
    "https://10.0.0.4/video.mp4",
    "https://172.16.0.4/video.mp4",
    "https://192.168.1.4/video.mp4",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/video.mp4",
    "https://[fc00::1]/video.mp4",
    "https://[fe80::1]/video.mp4",
  ]) {
    assert.equal(
      validateMediaReference(value, [...allowedOrigins, new URL(value).origin]).ok,
      false,
      value,
    );
  }
});

test("rejects traversal and unknown bare storage keys", () => {
  for (const value of [
    "uploads/../secret.mp4",
    "images/%2e%2e/secret.webp",
    "other/video.mp4",
    "/../server-file",
  ]) {
    assert.equal(validateMediaReference(value, allowedOrigins).ok, false, value);
  }
});

test("keeps seeded sample media origins explicitly allowlisted", () => {
  const origins = configuredMediaOrigins({} as NodeJS.ProcessEnv);
  assert.ok(origins.includes("https://commondatastorage.googleapis.com"));
  assert.ok(origins.includes("https://images.unsplash.com"));
});
