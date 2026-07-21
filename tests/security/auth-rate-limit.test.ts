import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("lib/auth.ts", "utf8");

test("Better Auth keeps database rate limiting unless WAF cutover is explicit", () => {
  assert.match(source, /AUTH_DISABLE_DATABASE_RATE_LIMIT/);
  assert.match(source, /!==\s*["']true["']/);
  assert.match(source, /storage:\s*["']database["']/);
  assert.match(
    source,
    /enabled:\s*process\.env\.NODE_ENV\s*===\s*["']production["']/,
  );
});

test("Better Auth trusts only Vercel's protected client IP header", () => {
  assert.match(source, /ipAddressHeaders:\s*\[["']x-vercel-forwarded-for["']\]/);
});

test("Better Auth uses a short signed compact session cookie cache", () => {
  assert.match(source, /session:\s*\{/);
  assert.match(source, /cookieCache:\s*\{/);
  assert.match(source, /enabled:\s*true/);
  assert.match(source, /maxAge:\s*60/);
  assert.match(source, /strategy:\s*["']compact["']/);
});
