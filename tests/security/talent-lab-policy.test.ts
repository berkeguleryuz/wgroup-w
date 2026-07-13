import assert from "node:assert/strict";
import test from "node:test";

import {
  TALENT_MAX_ACTIVE,
  TALENT_MAX_OUTPUT_TOKENS,
  TALENT_MESSAGE_MAX_CHARS,
  talentRequestSchema,
} from "../../lib/security/talent-lab-policy";

test("accepts a bounded Talent Lab message", () => {
  assert.equal(
    talentRequestSchema.safeParse({ conversationId: "conv-1", message: "Help me lead" })
      .success,
    true,
  );
});

test("rejects empty and oversized Talent Lab messages", () => {
  assert.equal(talentRequestSchema.safeParse({ message: "   " }).success, false);
  assert.equal(
    talentRequestSchema.safeParse({ message: "x".repeat(TALENT_MESSAGE_MAX_CHARS + 1) })
      .success,
    false,
  );
});

test("keeps output and concurrency limits bounded", () => {
  assert.ok(TALENT_MAX_OUTPUT_TOKENS <= 4096);
  assert.ok(TALENT_MAX_ACTIVE <= 2);
});
