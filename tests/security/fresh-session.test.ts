import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const access = readFileSync("lib/access.ts", "utf8");

test("fresh session validation bypasses the Better Auth cookie cache", () => {
  assert.match(access, /export async function getFreshSession/);
  assert.match(access, /disableCookieCache:\s*true/);
});

test("fresh role validation is separate from ordinary cached page reads", () => {
  assert.match(access, /export async function requireFreshSession/);
  assert.match(access, /export async function requireFreshRole/);
  assert.match(access, /const session = await requireFreshSession\(\)/);
});

test("high-impact mutations require fresh authorization", () => {
  const files = [
    "app/[locale]/app/account/page.tsx",
    "app/[locale]/app/account/subscription/actions.ts",
    "app/[locale]/app/admin/billing/actions.ts",
    "app/[locale]/app/admin/companies/actions.ts",
    "app/[locale]/app/admin/storage/actions.ts",
    "app/[locale]/app/admin/users/actions.ts",
    "lib/corporate.ts",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /(?:get|require)Fresh(Session|Role)\(/,
      `${file} must force canonical session validation for mutations`,
    );
  }
});
