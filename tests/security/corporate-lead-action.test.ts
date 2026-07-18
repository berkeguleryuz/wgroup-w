import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/[locale]/(marketing)/business/page.tsx",
  "utf8",
);

test("lead notification runs in a response-lifetime aware after callback", () => {
  assert.match(source, /import\s+\{\s*after\s*\}\s+from\s+["']next\/server["']/);
  assert.match(source, /after\(async\s*\(\)\s*=>/);
  assert.doesNotMatch(source, /void\s+sendCorporateLeadNotification/);
});

test("seat target accepts only positive safe integers", () => {
  assert.match(source, /Number\.isSafeInteger\(seatTarget\)/);
  assert.match(source, /seatTarget\s*<\s*1/);
});
