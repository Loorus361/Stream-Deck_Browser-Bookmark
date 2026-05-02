import assert from "node:assert/strict";
import { test } from "node:test";

import { parseChromeTabOutput } from "./chrome.js";

test("parseChromeTabOutput separates URL and title with unit separator", () => {
  assert.deepEqual(parseChromeTabOutput("https://example.com/path\u001fExample title"), {
    url: "https://example.com/path",
    title: "Example title"
  });
});

test("parseChromeTabOutput preserves newlines in title", () => {
  assert.deepEqual(parseChromeTabOutput("https://example.com\u001fLine 1\nLine 2"), {
    url: "https://example.com",
    title: "Line 1\nLine 2"
  });
});

test("parseChromeTabOutput rejects missing delimiter", () => {
  assert.throws(() => parseChromeTabOutput("https://example.com"), /Unexpected Chrome tab output/);
});
