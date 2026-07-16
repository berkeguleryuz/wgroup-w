import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/auth.ts", "utf8");

test("Better Auth uses shared database rate-limit storage in production", () => {
  assert.match(source, /rateLimit:\s*\{/);
  assert.match(source, /storage:\s*["']database["']/);
  assert.match(source, /enabled:\s*process\.env\.NODE_ENV\s*===\s*["']production["']/);
});

test("Better Auth trusts only Vercel's protected client IP header", () => {
  assert.match(source, /ipAddressHeaders:\s*\[["']x-vercel-forwarded-for["']\]/);
});
