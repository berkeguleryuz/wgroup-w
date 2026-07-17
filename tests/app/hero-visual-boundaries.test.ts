import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("keeps the WebGL light layer inside the rounded hero boundary", () => {
  const source = readFileSync("components/marketing/HeroSlider.tsx", "utf8");

  assert.match(
    source,
    /className="pointer-events-none absolute inset-px z-0 overflow-hidden rounded-11"[\s\S]*?<LightRays/,
  );
  assert.doesNotMatch(
    source,
    /className="pointer-events-none absolute inset-0 z-0"[\s\S]{0,120}<LightRays/,
  );
});
