import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("transcode worker uses a tracked-compatible lockfile and npm ci", () => {
  const ignore = readFileSync(".gitignore", "utf8");
  const workflow = readFileSync(".github/workflows/transcode.yml", "utf8");

  assert.equal(existsSync("worker/package-lock.json"), true);
  assert.doesNotMatch(ignore, /^worker\/package-lock\.json$/m);
  assert.match(workflow, /run:\s+npm ci --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /run:\s+npm install/);
});

test("transcode workflow pins third-party actions to reviewed commit SHAs", () => {
  const workflow = readFileSync(".github/workflows/transcode.yml", "utf8");

  assert.doesNotMatch(workflow, /uses:\s+actions\/(?:checkout|setup-node)@v\d+/);
  assert.match(
    workflow,
    /uses:\s+actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\s+# v4/,
  );
  assert.match(
    workflow,
    /uses:\s+actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020\s+# v4/,
  );
});
