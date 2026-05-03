import assert from "node:assert/strict";
import { test } from "node:test";

import { getActiveFirefoxTab, openFirefoxUrl, parseFirefoxAddressBarUrl } from "./firefox.js";

test("parseFirefoxAddressBarUrl accepts http and https URLs", () => {
  assert.equal(parseFirefoxAddressBarUrl("https://example.com/path\n"), "https://example.com/path");
  assert.equal(parseFirefoxAddressBarUrl("http://example.com"), "http://example.com");
});

test("parseFirefoxAddressBarUrl rejects non-web values", () => {
  assert.throws(() => parseFirefoxAddressBarUrl("not a url"), /Keine gueltige Firefox-URL/);
  assert.throws(() => parseFirefoxAddressBarUrl("file:///tmp/test"), /Keine gueltige Firefox-URL/);
});

test("getActiveFirefoxTab captures the address bar and restores the clipboard", async () => {
  let capturedScript = "";

  const tab = await getActiveFirefoxTab(async (script) => {
    capturedScript = script;
    return "https://example.com/from-firefox";
  });

  assert.deepEqual(tab, {
    url: "https://example.com/from-firefox",
    title: "https://example.com/from-firefox"
  });
  assert.match(capturedScript, /keystroke "l" using command down/);
  assert.match(capturedScript, /keystroke "c" using command down/);
  assert.match(capturedScript, /set previousClipboard to the clipboard/);
  assert.match(capturedScript, /set the clipboard to previousClipboard/);
});

test("getActiveFirefoxTab restores the clipboard in the error path", async () => {
  let capturedScript = "";

  await assert.rejects(
    () =>
      getActiveFirefoxTab(async (script) => {
        capturedScript = script;
        throw new Error("copy failed");
      }),
    /copy failed/
  );

  assert.match(capturedScript, /on error errorMessage/);
  assert.match(capturedScript, /set the clipboard to previousClipboard/);
});

test("openFirefoxUrl passes URL as osascript argument", async () => {
  let capturedArgs: string[] | undefined;

  await openFirefoxUrl("https://youtube.com/watch?v=1", async (_script, args) => {
    capturedArgs = args;
    return "";
  });

  assert.deepEqual(capturedArgs, ["https://youtube.com/watch?v=1"]);
});
