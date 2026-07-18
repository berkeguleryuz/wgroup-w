import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BUSYFLIX_BOOT_SEEN_KEY,
  BUSYFLIX_LOCALE_PENDING_KEY,
  BUSYFLIX_MINIMUM_VISIBLE_MS,
  markBusyflixLocalePending,
  remainingBusyflixLoadingTime,
  reloadAfterBusyflixLoadingPaint,
  resolveBusyflixInitialReason,
} from "../../lib/busyflix-loading";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

test("shows boot loading only on the first document load in a tab", () => {
  const session = memoryStorage();

  assert.equal(resolveBusyflixInitialReason(session), "boot");
  assert.equal(session.getItem(BUSYFLIX_BOOT_SEEN_KEY), "1");
  assert.equal(resolveBusyflixInitialReason(session), null);
});

test("locale loading takes precedence and consumes its one-shot marker", () => {
  const session = memoryStorage();

  markBusyflixLocalePending(session);
  assert.equal(session.getItem(BUSYFLIX_LOCALE_PENDING_KEY), "1");
  assert.equal(resolveBusyflixInitialReason(session), "locale");
  assert.equal(session.getItem(BUSYFLIX_LOCALE_PENDING_KEY), null);
});

test("keeps the loader visible for the approved minimum duration", () => {
  assert.equal(remainingBusyflixLoadingTime(1000, 1200), 250);
  assert.equal(
    remainingBusyflixLoadingTime(
      1000,
      1000 + BUSYFLIX_MINIMUM_VISIBLE_MS,
    ),
    0,
  );
});

test("reloads only after two animation frames", () => {
  const frames: FrameRequestCallback[] = [];
  let reloads = 0;

  reloadAfterBusyflixLoadingPaint(
    () => {
      reloads += 1;
    },
    (callback) => {
      frames.push(callback);
      return frames.length;
    },
  );

  assert.equal(reloads, 0);
  frames.shift()?.(0);
  assert.equal(reloads, 0);
  frames.shift()?.(16);
  assert.equal(reloads, 1);
});

test("wires the global overlay, pre-paint script, and reduced motion policy", () => {
  const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
  const initScript = readFileSync(
    "components/providers/ThemeInitScript.tsx",
    "utf8",
  );
  const component = readFileSync(
    "components/providers/BusyflixLoadingScreen.tsx",
    "utf8",
  );
  const css = readFileSync("app/globals.css", "utf8");

  assert.match(layout, /<BusyflixLoadingScreen\s*\/>/);
  assert.match(initScript, /busyflixLoadingInitScript/);
  assert.match(component, /logo-transparent\.webp/);
  assert.match(component, /remainingBusyflixLoadingTime/);
  assert.match(css, /html\[data-busyflix-loading\]/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(component, /setInterval/);
});

test("activates the Busyflix overlay before locale reload", () => {
  const source = readFileSync("components/LocaleSwitcher.tsx", "utf8");

  assert.match(source, /activateBusyflixLoading\("locale"\)/);
  assert.match(source, /reloadAfterBusyflixLoadingPaint\(\)/);
  assert.doesNotMatch(source, /window\.location\.reload\(\)/);
});
