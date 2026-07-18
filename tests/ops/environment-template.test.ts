import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const requiredProductionKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
];

test("a commit-compatible environment template documents production keys", () => {
  assert.equal(existsSync(".env.example"), true);
  const ignore = readFileSync(".gitignore", "utf8");
  const template = readFileSync(".env.example", "utf8");

  assert.match(ignore, /^!\.env\.example$/m);
  for (const key of requiredProductionKeys) {
    assert.match(template, new RegExp(`^${key}=`, "m"), key);
  }
});
