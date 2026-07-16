import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("owner demotion and removal share an organization transaction lock", () => {
  const corporate = readFileSync("lib/corporate.ts", "utf8");
  const actions = readFileSync(
    "app/[locale]/app/organization/members/actions.ts",
    "utf8",
  );

  assert.match(corporate, /export async function withOrganizationMutationLock/);
  assert.match(corporate, /pg_advisory_xact_lock/);
  assert.match(corporate, /prisma\.\$transaction/);
  assert.equal(
    actions.match(/withOrganizationMutationLock\(/g)?.length,
    2,
  );
});
