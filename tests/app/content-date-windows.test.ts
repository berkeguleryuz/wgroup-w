import assert from "node:assert/strict";
import test from "node:test";

import {
  getContentDateWindows,
  isPublishedInWindow,
  publishedAtWhere,
} from "../../lib/content-date-windows";

test("uses Monday through the next Monday for a Berlin calendar week", () => {
  const windows = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));

  assert.equal(windows.week.start.toISOString(), "2026-07-12T22:00:00.000Z");
  assert.equal(windows.week.end.toISOString(), "2026-07-19T22:00:00.000Z");
});

test("uses the current Berlin calendar month", () => {
  const windows = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));

  assert.equal(windows.month.start.toISOString(), "2026-06-30T22:00:00.000Z");
  assert.equal(windows.month.end.toISOString(), "2026-07-31T22:00:00.000Z");
});

test("keeps March daylight saving boundaries DST-aware", () => {
  const windows = getContentDateWindows(new Date("2026-03-30T10:00:00.000Z"));

  assert.equal(windows.week.start.toISOString(), "2026-03-29T22:00:00.000Z");
  assert.equal(windows.month.start.toISOString(), "2026-02-28T23:00:00.000Z");
  assert.equal(windows.month.end.toISOString(), "2026-03-31T22:00:00.000Z");
});

test("keeps October daylight saving boundaries DST-aware", () => {
  const windows = getContentDateWindows(new Date("2026-10-26T10:00:00.000Z"));

  assert.equal(windows.week.start.toISOString(), "2026-10-25T23:00:00.000Z");
  assert.equal(windows.month.start.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(windows.month.end.toISOString(), "2026-10-31T23:00:00.000Z");
});

test("uses an exclusive upper boundary and permits week-month overlap", () => {
  const windows = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));
  const inBoth = new Date("2026-07-15T12:00:00.000Z");

  assert.equal(isPublishedInWindow(inBoth, windows.week), true);
  assert.equal(isPublishedInWindow(inBoth, windows.month), true);
  assert.equal(isPublishedInWindow(windows.week.end, windows.week), false);
  assert.equal(isPublishedInWindow(null, windows.month), false);
});

test("builds the Prisma publishedAt range from the same boundaries", () => {
  const { week } = getContentDateWindows(new Date("2026-07-13T10:00:00.000Z"));

  assert.deepEqual(publishedAtWhere(week), {
    publishedAt: { gte: week.start, lt: week.end },
  });
});
