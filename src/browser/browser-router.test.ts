import assert from "node:assert/strict";
import { test } from "node:test";

import { closeActiveBookmarkTab, getActiveBrowserTab, openOrFocusBookmarkUrl } from "./browser-router.js";

test("getActiveBrowserTab returns the active Chrome tab when Chrome is frontmost", async () => {
  const tab = await getActiveBrowserTab({
    getFrontmostBrowser: async () => "chrome",
    getActiveChromeTab: async () => ({ url: "https://chrome.example", title: "Chrome" }),
    getActiveSafariTab: async () => {
      throw new Error("Safari should not be queried");
    }
  });

  assert.deepEqual(tab, { browser: "chrome", url: "https://chrome.example", title: "Chrome" });
});

test("getActiveBrowserTab returns the active Safari tab when Safari is frontmost", async () => {
  const tab = await getActiveBrowserTab({
    getFrontmostBrowser: async () => "safari",
    getActiveChromeTab: async () => {
      throw new Error("Chrome should not be queried");
    },
    getActiveSafariTab: async () => ({ url: "https://safari.example", title: "Safari" })
  });

  assert.deepEqual(tab, { browser: "safari", url: "https://safari.example", title: "Safari" });
});

test("getActiveBrowserTab rejects unsupported frontmost apps", async () => {
  await assert.rejects(
    () =>
      getActiveBrowserTab({
        getFrontmostBrowser: async () => undefined,
        getActiveChromeTab: async () => ({ url: "https://chrome.example", title: "Chrome" }),
        getActiveSafariTab: async () => ({ url: "https://safari.example", title: "Safari" })
      }),
    /Kein unterstuetzter Browser ist im Vordergrund/
  );
});

test("openOrFocusBookmarkUrl routes Chrome bookmarks to Chrome", async () => {
  const calls: string[] = [];

  await openOrFocusBookmarkUrl(
    { browser: "chrome", url: "https://example.com" },
    {
      openOrFocusChromeUrl: async (url) => {
        calls.push(`chrome:${url}`);
      },
      openOrFocusSafariUrl: async (url) => {
        calls.push(`safari:${url}`);
      }
    }
  );

  assert.deepEqual(calls, ["chrome:https://example.com"]);
});

test("openOrFocusBookmarkUrl routes Safari bookmarks to Safari", async () => {
  const calls: string[] = [];

  await openOrFocusBookmarkUrl(
    { browser: "safari", url: "https://example.com" },
    {
      openOrFocusChromeUrl: async (url) => {
        calls.push(`chrome:${url}`);
      },
      openOrFocusSafariUrl: async (url) => {
        calls.push(`safari:${url}`);
      }
    }
  );

  assert.deepEqual(calls, ["safari:https://example.com"]);
});

test("closeActiveBookmarkTab routes Chrome URLs to Chrome", async () => {
  const calls: string[] = [];

  await closeActiveBookmarkTab(
    { browser: "chrome", url: "https://example.com" },
    {
      closeActiveChromeTab: async (url) => {
        calls.push(`chrome:${url}`);
      },
      closeActiveSafariTab: async (url) => {
        calls.push(`safari:${url}`);
      }
    }
  );

  assert.deepEqual(calls, ["chrome:https://example.com"]);
});

test("closeActiveBookmarkTab routes Safari URLs to Safari", async () => {
  const calls: string[] = [];

  await closeActiveBookmarkTab(
    { browser: "safari", url: "https://example.com" },
    {
      closeActiveChromeTab: async (url) => {
        calls.push(`chrome:${url}`);
      },
      closeActiveSafariTab: async (url) => {
        calls.push(`safari:${url}`);
      }
    }
  );

  assert.deepEqual(calls, ["safari:https://example.com"]);
});
