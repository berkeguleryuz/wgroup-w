import assert from "node:assert/strict";
import test from "node:test";

import { safeMediaFetch } from "../../lib/security/safe-media-fetch";

const allowedOrigins = ["https://cdn.example.com"];

test("fetches an allowlisted HTTPS media URL without automatic redirects", async () => {
  const calls: string[] = [];
  const response = await safeMediaFetch("https://cdn.example.com/video.mp4", {
    allowedOrigins,
    fetchImpl: async (input, init) => {
      calls.push(String(input));
      assert.equal(init?.redirect, "manual");
      return new Response("video", { status: 200 });
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["https://cdn.example.com/video.mp4"]);
});

test("rejects a redirect to an untrusted or private destination before fetching it", async () => {
  for (const location of [
    "https://evil.example/video.mp4",
    "https://127.0.0.1/private",
    "http://cdn.example.com/insecure",
  ]) {
    let calls = 0;
    await assert.rejects(
      safeMediaFetch("https://cdn.example.com/video.mp4", {
        allowedOrigins,
        fetchImpl: async () => {
          calls += 1;
          return new Response(null, { status: 302, headers: { location } });
        },
      }),
      /unsafe media URL/,
    );
    assert.equal(calls, 1);
  }
});

test("follows a bounded relative redirect on the same allowlisted origin", async () => {
  const calls: string[] = [];
  const response = await safeMediaFetch("https://cdn.example.com/start", {
    allowedOrigins,
    fetchImpl: async (input) => {
      calls.push(String(input));
      return calls.length === 1
        ? new Response(null, { status: 307, headers: { location: "/final" } })
        : new Response("ok", { status: 200 });
    },
  });

  assert.equal(await response.text(), "ok");
  assert.deepEqual(calls, [
    "https://cdn.example.com/start",
    "https://cdn.example.com/final",
  ]);
});
