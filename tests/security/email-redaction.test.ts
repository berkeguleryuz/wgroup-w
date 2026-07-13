import assert from "node:assert/strict";
import test from "node:test";

import { maskEmail, safeErrorMessage } from "../../lib/security/log-redaction";

test("masks email local parts without exposing the address", () => {
  assert.equal(maskEmail("alice@example.com"), "a***@example.com");
  assert.equal(maskEmail("x@example.com"), "***@example.com");
  assert.equal(maskEmail("invalid"), "***");
});

test("removes URLs, bearer values, and token-like query parameters from errors", () => {
  const result = safeErrorMessage(
    new Error(
      "failed https://app.example/reset?token=super-secret Authorization: Bearer abc.def.ghi",
    ),
  );
  assert.equal(result.includes("super-secret"), false);
  assert.equal(result.includes("abc.def.ghi"), false);
  assert.equal(result.includes("https://"), false);
  assert.ok(result.length <= 200);
});
