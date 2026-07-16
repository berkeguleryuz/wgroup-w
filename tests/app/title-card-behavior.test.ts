import assert from "node:assert/strict";
import test from "node:test";

import {
  canAutoplayTitlePreview,
  isCompactTitleCard,
} from "../../lib/title-card-behavior";

test("keeps compact and expanded card behavior explicit", () => {
  assert.equal(isCompactTitleCard("compact"), true);
  assert.equal(isCompactTitleCard("expanded"), false);
});

test("autoplays only browser-playable trailers when motion is allowed", () => {
  assert.equal(
    canAutoplayTitlePreview("https://cdn.example.com/a.mp4", false, false),
    true,
  );
  assert.equal(
    canAutoplayTitlePreview("https://cdn.example.com/a.webm?x=1", false, false),
    true,
  );
  assert.equal(
    canAutoplayTitlePreview("https://cdn.example.com/a.m3u8", false, false),
    false,
  );
  assert.equal(canAutoplayTitlePreview(null, false, false), false);
  assert.equal(
    canAutoplayTitlePreview("https://cdn.example.com/a.mp4", true, false),
    false,
  );
  assert.equal(
    canAutoplayTitlePreview("https://cdn.example.com/a.mp4", false, true),
    false,
  );
});
