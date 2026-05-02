import assert from "node:assert/strict";
import { test } from "node:test";

import { createFaviconService, getFaviconServiceUrl } from "./favicon.js";

const chromeFallback = "data:image/svg+xml;base64,chrome";

test("getFaviconServiceUrl builds Google favicon URL for normal hostnames", () => {
  assert.equal(
    getFaviconServiceUrl("https://chatgpt.com/c/abc"),
    "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128"
  );
});

test("getFaviconServiceUrl returns undefined for internal URLs", () => {
  assert.equal(getFaviconServiceUrl("chrome://settings"), undefined);
  assert.equal(getFaviconServiceUrl("file:///tmp/example.html"), undefined);
});

test("favicon service returns Chrome fallback when fetch fails", async () => {
  const service = createFaviconService({
    chromeFallbackDataUrl: chromeFallback,
    fetch: async () => {
      throw new Error("network down");
    }
  });

  assert.deepEqual(await service.fetchFavicon("https://example.com"), {
    dataUrl: chromeFallback,
    source: "chrome"
  });
});
