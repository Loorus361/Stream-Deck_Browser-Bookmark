import assert from "node:assert/strict";
import { test } from "node:test";

import { getActiveSafariTab, openOrFocusSafariUrl, parseSafariTabOutput } from "./safari.js";

test("parseSafariTabOutput separates URL and title with unit separator", () => {
  assert.deepEqual(parseSafariTabOutput("https://example.com/path\u001fExample title"), {
    url: "https://example.com/path",
    title: "Example title"
  });
});

test("parseSafariTabOutput preserves newlines in title", () => {
  assert.deepEqual(parseSafariTabOutput("https://example.com\u001fLine 1\nLine 2"), {
    url: "https://example.com",
    title: "Line 1\nLine 2"
  });
});

test("parseSafariTabOutput rejects missing delimiter", () => {
  assert.throws(() => parseSafariTabOutput("https://example.com"), /Unexpected Safari tab output/);
});

test("getActiveSafariTab asks Safari for a running app, a window, and a non-empty active tab URL", async () => {
  let capturedScript = "";

  const tab = await getActiveSafariTab(async (script) => {
    capturedScript = script;
    return "https://example.com\u001fExample";
  });

  assert.deepEqual(tab, { url: "https://example.com", title: "Example" });
  assert.match(capturedScript, /application "Safari" is not running/);
  assert.match(capturedScript, /count of windows/);
  assert.match(capturedScript, /activeUrl is missing value or activeUrl is ""/);
});

test("openOrFocusSafariUrl activates Safari, searches exact URLs, and receives the URL as an argument", async () => {
  let capturedScript = "";
  let capturedArgs: string[] | undefined;

  await openOrFocusSafariUrl("https://example.com/path?x=1", async (script, args) => {
    capturedScript = script;
    capturedArgs = args;
    return "";
  });

  assert.deepEqual(capturedArgs, ["https://example.com/path?x=1"]);
  assert.match(capturedScript, /activate/);
  assert.match(capturedScript, /if \(count of windows\) is 0 then/);
  assert.match(capturedScript, /make new document with properties \{URL:targetUrl\}/);
  assert.match(capturedScript, /if \(URL of tab tabIndex of window windowIndex\) is targetUrl then/);
  assert.match(capturedScript, /set current tab of window windowIndex to tab tabIndex of window windowIndex/);
  assert.match(capturedScript, /make new tab with properties \{URL:targetUrl\}/);
});
