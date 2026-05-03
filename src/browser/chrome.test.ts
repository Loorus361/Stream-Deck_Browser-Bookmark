import assert from "node:assert/strict";
import { test } from "node:test";

import { closeActiveChromeTab, parseChromeTabOutput } from "./chrome.js";

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

test("closeActiveChromeTab closes the active tab only when its URL still matches", async () => {
  let capturedScript = "";
  let capturedArgs: string[] | undefined;

  await closeActiveChromeTab("https://example.com/path?x=1", async (script, args) => {
    capturedScript = script;
    capturedArgs = args;
    return "";
  });

  assert.deepEqual(capturedArgs, ["https://example.com/path?x=1"]);
  assert.match(capturedScript, /set targetUrl to item 1 of argv/);
  assert.match(capturedScript, /set activeUrl to URL of active tab of front window/);
  assert.match(capturedScript, /if activeUrl is not targetUrl then error/);
  assert.match(capturedScript, /close active tab of front window/);
});
