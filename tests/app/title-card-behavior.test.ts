import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canAutoplayTitlePreview,
  isCompactTitleCard,
  shouldOpenTitlePreviewFromFocus,
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

test("opens the expanded preview only for keyboard-visible focus", () => {
  assert.equal(shouldOpenTitlePreviewFromFocus(true), true);
  assert.equal(shouldOpenTitlePreviewFromFocus(false), false);
});

test("links the expanded preview media to the playback destination", () => {
  const source = readFileSync(
    "components/app/ExpandedTitlePreview.tsx",
    "utf8",
  );
  const previewMedia = source.slice(
    source.indexOf("function PreviewMedia"),
    source.indexOf("function ProgressBar"),
  );

  assert.match(previewMedia, /playHref:\s*string/);
  assert.match(previewMedia, /playLabel:\s*string/);
  assert.match(previewMedia, /<Link[\s\S]*?href=\{playHref\}/);
  assert.match(
    previewMedia,
    /aria-label=\{`\$\{playLabel\}: \$\{title\.title\}`\}/,
  );
});

test("gives the expanded preview a visible entrance motion", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const keyframes = css.slice(
    css.indexOf("@keyframes bf-title-preview-in"),
    css.indexOf(".bf-title-preview > article"),
  );

  assert.match(keyframes, /opacity:\s*0/);
  assert.match(keyframes, /translateY\(12px\) scale\(0\.94\)/);
  assert.match(
    css,
    /animation:\s*bf-title-preview-in 220ms cubic-bezier\(0\.22, 1, 0\.36, 1\) both/,
  );
  assert.match(css, /will-change:\s*transform, opacity/);
});
