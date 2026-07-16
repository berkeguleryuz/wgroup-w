import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serverModules = [
  "lib/auth.ts",
  "lib/prisma.ts",
  "lib/email.ts",
  "lib/stripe.ts",
  "lib/supabase-storage.ts",
  "lib/storage.ts",
];

test("secret-bearing core modules are marked server-only", () => {
  for (const path of serverModules) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /import ["']server-only["'];/, path);
  }
});
