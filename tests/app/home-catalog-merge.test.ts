import assert from "node:assert/strict";
import test from "node:test";

import { mergeCatalogTitles } from "../../lib/home-catalog-merge";

type Item = {
  id: string;
  publishedAt: Date | null;
  createdAt: Date;
  visible: boolean;
};

const item = (id: string, day: number, visible = true): Item => ({
  id,
  publishedAt: new Date(
    `2026-07-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  ),
  createdAt: new Date(
    `2026-07-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  ),
  visible,
});

test("merges cached and supplemental titles newest-first without duplicates", () => {
  const result = mergeCatalogTitles(
    [
      [item("public-old", 10), item("shared", 15)],
      [item("org-new", 20), item("shared", 15)],
    ],
    (title) => title.visible,
    12,
  );

  assert.deepEqual(result.map((title) => title.id), [
    "org-new",
    "shared",
    "public-old",
  ]);
});

test("applies the visibility guard before limiting", () => {
  const result = mergeCatalogTitles(
    [[item("hidden", 21, false), item("visible", 20, true)]],
    (title) => title.visible,
    1,
  );

  assert.deepEqual(result.map((title) => title.id), ["visible"]);
});

test("uses createdAt when publishedAt is absent", () => {
  const fallback = { ...item("fallback", 19), publishedAt: null };
  const result = mergeCatalogTitles(
    [[item("published", 18), fallback]],
    () => true,
    12,
  );

  assert.deepEqual(result.map((title) => title.id), [
    "fallback",
    "published",
  ]);
});
