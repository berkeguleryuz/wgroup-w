import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPublicRateLimitKey,
  isPublicRateLimitAllowed,
  trustedVercelClientIp,
} from "../../lib/security/public-rate-limit-policy";

test("creates deterministic scoped HMAC keys without retaining the raw IP", () => {
  const key = createPublicRateLimitKey(
    "corporate-lead",
    "203.0.113.7",
    "a-secure-test-secret-with-more-than-32-chars",
  );

  assert.equal(key, createPublicRateLimitKey(
    "corporate-lead",
    "203.0.113.7",
    "a-secure-test-secret-with-more-than-32-chars",
  ));
  assert.match(key, /^corporate-lead:[a-f0-9]{64}$/);
  assert.equal(key.includes("203.0.113.7"), false);
});

test("keeps different clients and scopes in different buckets", () => {
  const secret = "a-secure-test-secret-with-more-than-32-chars";
  assert.notEqual(
    createPublicRateLimitKey("corporate-lead", "203.0.113.7", secret),
    createPublicRateLimitKey("corporate-lead", "203.0.113.8", secret),
  );
  assert.notEqual(
    createPublicRateLimitKey("corporate-lead", "203.0.113.7", secret),
    createPublicRateLimitKey("other", "203.0.113.7", secret),
  );
});

test("allows five attempts and rejects the sixth", () => {
  for (let count = 1; count <= 5; count += 1) {
    assert.equal(isPublicRateLimitAllowed(count, 5), true);
  }
  assert.equal(isPublicRateLimitAllowed(6, 5), false);
});

test("reads only Vercel's protected forwarded IP header", () => {
  assert.equal(
    trustedVercelClientIp(new Headers({
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-forwarded-for": "198.51.100.2",
    })),
    "203.0.113.7",
  );
  assert.equal(
    trustedVercelClientIp(new Headers({ "x-forwarded-for": "198.51.100.2" })),
    "unknown",
  );
});

test("database consumption uses an atomic conflict update", () => {
  const source = readFileSync("lib/security/public-rate-limit.ts", "utf8");
  assert.match(source, /ON CONFLICT \("key"\) DO UPDATE/i);
  assert.match(source, /RETURNING count/i);
});
