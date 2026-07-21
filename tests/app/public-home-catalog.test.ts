import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const catalogPath = "lib/public-home-catalog.ts";

function readCatalogSource(): string {
  assert.equal(
    existsSync(catalogPath),
    true,
    "public home catalog module must exist",
  );
  return readFileSync(catalogPath, "utf8");
}

test("public home catalog uses Vercel remote cache with explicit freshness and tags", () => {
  const source = readCatalogSource();

  assert.match(source, /["']use cache: remote["']/);
  assert.match(source, /stale:\s*300/);
  assert.match(source, /revalidate:\s*900/);
  assert.match(source, /expire:\s*3600/);
  assert.match(
    source,
    /cacheTag\([\s\S]*PUBLIC_CATALOG_TAG,[\s\S]*FEATURED_TITLES_TAG/,
  );
  assert.match(source, /\.\.\.\[\.\.\.new Set\(titleTags\)\]\.slice\(0,\s*126\)/);
  assert.match(source, /export function publicTitleCatalogTag/);
});

test("shared catalog query is restricted to published public titles", () => {
  const source = readCatalogSource();

  assert.match(source, /published:\s*true/);
  assert.match(source, /visibility:\s*["']PUBLIC["']/);
  assert.doesNotMatch(
    source.slice(
      source.indexOf("getPublicHomeCatalog"),
      source.indexOf("getSupplementalHomeCatalog"),
    ),
    /ORG_ONLY/,
  );
});

test("organization-only catalog remains outside the remote cache scope", () => {
  const source = readCatalogSource();
  const supplemental = source.slice(
    source.indexOf("getSupplementalHomeCatalog"),
  );

  assert.match(supplemental, /visibility:\s*["']ORG_ONLY["']/);
  assert.doesNotMatch(supplemental, /use cache: remote/);
});

test("editor mutations and scheduled publishing invalidate the public catalog", () => {
  const editor = readFileSync(
    "app/[locale]/app/editor/titles/[id]/page.tsx",
    "utf8",
  );
  const create = readFileSync(
    "app/[locale]/app/editor/titles/new/page.tsx",
    "utf8",
  );
  const cron = readFileSync(
    "app/api/cron/publish-scheduled/route.ts",
    "utf8",
  );

  assert.match(editor, /updateTag\(PUBLIC_CATALOG_TAG\)/);
  assert.match(editor, /updateTag\(publicTitleCatalogTag\(titleId\)\)/);
  assert.match(create, /updateTag\(PUBLIC_CATALOG_TAG\)/);
  assert.match(
    cron,
    /revalidateTag\(PUBLIC_CATALOG_TAG,\s*["']max["']\)/,
  );
  assert.doesNotMatch(cron, /updateTag\(/);
  assert.match(editor, /catalog cache invalidation failed/);
  assert.match(cron, /catalog cache invalidation failed/);
});
