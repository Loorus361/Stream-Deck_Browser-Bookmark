import assert from "node:assert/strict";
import { test } from "node:test";

import { chooseNextFreeSlot, normalizeSettings } from "./settings.js";

test("normalizeSettings keeps positive integer slot numbers", () => {
  assert.deepEqual(normalizeSettings({ slot: 3 }), { slot: 3 });
});

test("normalizeSettings drops invalid slot numbers", () => {
  assert.deepEqual(normalizeSettings({ slot: 0 }), {});
  assert.deepEqual(normalizeSettings({ slot: -2 }), {});
  assert.deepEqual(normalizeSettings({ slot: 1.5 }), {});
  assert.deepEqual(normalizeSettings({ slot: "2" }), {});
});

test("chooseNextFreeSlot uses visible slots only", () => {
  assert.equal(chooseNextFreeSlot([1, 2, 4]), 3);
});

test("chooseNextFreeSlot allows duplicate existing slots by returning first missing positive integer", () => {
  assert.equal(chooseNextFreeSlot([1, 1, 2]), 3);
});
