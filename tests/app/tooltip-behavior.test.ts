import assert from "node:assert/strict";
import test from "node:test";

import {
  getTooltipDelay,
  getTooltipPosition,
} from "../../lib/tooltip-behavior";

test("uses the approved pointer, focus, and close delays", () => {
  assert.equal(getTooltipDelay("pointer-open"), 250);
  assert.equal(getTooltipDelay("focus-open"), 0);
  assert.equal(getTooltipDelay("close"), 100);
  assert.equal(getTooltipDelay("escape"), 0);
});

test("positions a tooltip above a centered trigger", () => {
  assert.deepEqual(
    getTooltipPosition(
      { left: 500, top: 200, bottom: 240, width: 40 },
      { width: 120, height: 32 },
      { width: 1200, height: 800 },
    ),
    { left: 460, top: 158, side: "top", arrowLeft: 60 },
  );
});

test("clamps tooltips at the left and right viewport gutters", () => {
  const left = getTooltipPosition(
    { left: 0, top: 200, bottom: 240, width: 40 },
    { width: 120, height: 32 },
    { width: 320, height: 640 },
  );
  const right = getTooltipPosition(
    { left: 290, top: 200, bottom: 240, width: 30 },
    { width: 120, height: 32 },
    { width: 320, height: 640 },
  );

  assert.equal(left.left, 12);
  assert.equal(left.arrowLeft, 12);
  assert.equal(right.left, 188);
  assert.equal(right.arrowLeft, 108);
});

test("moves the tooltip below when there is no room above", () => {
  assert.deepEqual(
    getTooltipPosition(
      { left: 100, top: 10, bottom: 50, width: 40 },
      { width: 120, height: 32 },
      { width: 320, height: 640 },
    ),
    { left: 60, top: 60, side: "bottom", arrowLeft: 60 },
  );
});
