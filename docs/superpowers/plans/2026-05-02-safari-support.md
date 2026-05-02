# Safari Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Safari support so an empty Stream Deck bookmark slot saves the frontmost supported browser tab, and a filled slot reopens or focuses the browser it was saved from.

**Architecture:** Keep Chrome behavior isolated in `src/browser/chrome.ts` and add a parallel Safari adapter. Add a small browser-router module that detects the frontmost supported browser, reads the active tab from that browser, and dispatches stored bookmarks back to their saved browser. The existing JSON schema already allows `browser: "safari"`, so no data migration is needed.

**Tech Stack:** TypeScript, Node.js `execFile`, macOS AppleScript via `osascript`, Stream Deck SDK, Node test runner through `tsx --test`.

---

## Product Decisions

- Saving an empty slot uses only the browser currently in front.
- If Google Chrome is frontmost, save Chrome.
- If Safari is frontmost, save Safari.
- If neither Chrome nor Safari is frontmost, save nothing and show the existing Stream Deck alert.
- Filled Chrome slots stay Chrome slots.
- Filled Safari slots open or focus Safari.
- Existing `version: 1` bookmark data remains valid.

## Files

- Create: `src/browser/safari.ts`
  - Safari AppleScript adapter with `getActiveSafariTab()`, `openOrFocusSafariUrl()`, and output parsing.
- Create: `src/browser/frontmost.ts`
  - Detects the frontmost macOS application bundle id or app name.
- Create: `src/browser/browser-router.ts`
  - Chooses Chrome/Safari when saving and routes existing bookmarks when opening.
- Modify: `src/actions/bookmark-slot.ts`
  - Use the browser-router instead of calling Chrome directly.
- Modify: `src/favicon/favicon.ts`
  - Neutralize Chrome-only fallback wording in code/comments.
- Modify: `src/assets.ts`
  - Replace the Chrome-shaped fallback icon with a generic bookmark/browser fallback icon while keeping the existing `faviconSource: "chrome"` value for migration-free compatibility.
- Modify: `docs/architecture.md`
  - Update Chrome-only wording to supported-browser wording.
- Modify: `docs/future-ideas.md`
  - Mark Safari support as implemented after verification.
- Test: `src/browser/safari.test.ts`
- Test: `src/browser/frontmost.test.ts`
- Test: `src/browser/browser-router.test.ts`
- Test: `src/actions/bookmark-slot.test.ts`
  - Inject a fake browser-router into the action and verify saved browser routing.
- Test: `src/bookmarks/store.test.ts`
  - Explicitly verify Safari bookmarks load/import without migration.
- Existing tests: `src/browser/chrome.test.ts`, `src/bookmarks/store.test.ts`

## Subagent Split

- Explorer: check Safari AppleScript shape and frontmost-app permission risks. No file edits.
- Implementer A: own `src/browser/safari.ts`, `src/browser/frontmost.ts`, `src/browser/browser-router.ts`, and their tests.
- Implementer B: own `src/actions/bookmark-slot.ts`, fallback icon wording/assets, docs/copy, and related tests.
- Reviewer: final requirements review across the whole diff.

Implementers are not alone in the codebase. They must not revert or overwrite changes made by other workers and must adapt to the existing files.

## Task 1: Add Safari Adapter

- [ ] Write `src/browser/safari.test.ts` with parser tests mirroring Chrome:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSafariTabOutput } from "./safari.js";

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
```

- [ ] Run `npm test -- src/browser/safari.test.ts` and confirm it fails because `src/browser/safari.ts` does not exist.
- [ ] Use this Safari behavior in the implementation:
  - Reading: Safari must be running, have at least one window, and expose a non-empty URL from the current tab/document.
  - Opening/focusing: activate Safari, create a window if none exists, scan every window's tabs for an exact URL match, focus the first match, otherwise open a new tab or document with the target URL.
  - Empty Safari start pages or missing URL must reject instead of saving an invalid bookmark.
- [ ] Create `src/browser/safari.ts`:
  - Export type `SafariTab = { url: string; title: string }`.
  - Export type `SafariRunner = (script: string, args?: string[]) => Promise<string>`.
  - Implement `getActiveSafariTab(runAppleScript = runAppleScriptWithOsascript)`.
  - Implement `openOrFocusSafariUrl(url, runAppleScript = runAppleScriptWithOsascript)`.
  - Implement `parseSafariTabOutput(output)`.
  - Use the same unit-separator approach as Chrome.
  - Use `execFile("osascript", ["-e", script, ...args])` with timeout.
- [ ] Run `npm test -- src/browser/safari.test.ts` and confirm it passes.
- [ ] Use `npx tsx --test src/browser/safari.test.ts` for focused local runs if needed, because `npm test -- <file>` is not a reliable filter with the current script.

## Task 2: Detect Frontmost Browser

- [ ] Write `src/browser/frontmost.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseFrontmostBrowserOutput } from "./frontmost.js";

test("parseFrontmostBrowserOutput returns chrome for Google Chrome bundle id", () => {
  assert.equal(parseFrontmostBrowserOutput("com.google.Chrome\nGoogle Chrome\n"), "chrome");
});

test("parseFrontmostBrowserOutput returns safari for Safari bundle id", () => {
  assert.equal(parseFrontmostBrowserOutput("com.apple.Safari\nSafari\n"), "safari");
});

test("parseFrontmostBrowserOutput returns undefined for unsupported apps", () => {
  assert.equal(parseFrontmostBrowserOutput("com.apple.finder\nFinder\n"), undefined);
});
```

- [ ] Run `npm test -- src/browser/frontmost.test.ts` and confirm it fails because the module does not exist.
- [ ] Create `src/browser/frontmost.ts`:
  - Export type `SupportedBrowserId = "chrome" | "safari"`.
  - Implement `getFrontmostSupportedBrowser(runAppleScript = runAppleScriptWithOsascript)`.
  - AppleScript should ask `System Events` for the frontmost process bundle identifier and name.
  - Implement `parseFrontmostBrowserOutput(output)`.
  - Recognize `com.google.Chrome` as Chrome and `com.apple.Safari` as Safari.
- [ ] If `System Events` permission is denied, surface the error normally so the Stream Deck action shows the existing alert and logs the failure.
- [ ] Run `npm test -- src/browser/frontmost.test.ts` and confirm it passes.

## Task 3: Add Browser Router

- [ ] Write `src/browser/browser-router.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { createBrowserRouter } from "./browser-router.js";

test("getActiveBrowserTab reads Chrome when Chrome is frontmost", async () => {
  const router = createBrowserRouter({
    getFrontmostSupportedBrowser: async () => "chrome",
    getActiveChromeTab: async () => ({ url: "https://chrome.example", title: "Chrome" }),
    getActiveSafariTab: async () => ({ url: "https://safari.example", title: "Safari" }),
    openOrFocusChromeUrl: async () => undefined,
    openOrFocusSafariUrl: async () => undefined
  });

  assert.deepEqual(await router.getActiveBrowserTab(), {
    browser: "chrome",
    url: "https://chrome.example",
    title: "Chrome"
  });
});

test("getActiveBrowserTab reads Safari when Safari is frontmost", async () => {
  const router = createBrowserRouter({
    getFrontmostSupportedBrowser: async () => "safari",
    getActiveChromeTab: async () => ({ url: "https://chrome.example", title: "Chrome" }),
    getActiveSafariTab: async () => ({ url: "https://safari.example", title: "Safari" }),
    openOrFocusChromeUrl: async () => undefined,
    openOrFocusSafariUrl: async () => undefined
  });

  assert.deepEqual(await router.getActiveBrowserTab(), {
    browser: "safari",
    url: "https://safari.example",
    title: "Safari"
  });
});

test("getActiveBrowserTab rejects when no supported browser is frontmost", async () => {
  const router = createBrowserRouter({
    getFrontmostSupportedBrowser: async () => undefined,
    getActiveChromeTab: async () => ({ url: "https://chrome.example", title: "Chrome" }),
    getActiveSafariTab: async () => ({ url: "https://safari.example", title: "Safari" }),
    openOrFocusChromeUrl: async () => undefined,
    openOrFocusSafariUrl: async () => undefined
  });

  await assert.rejects(() => router.getActiveBrowserTab(), /No supported browser is frontmost/);
});

test("openOrFocusBookmarkUrl routes by saved browser", async () => {
  const opened: string[] = [];
  const router = createBrowserRouter({
    getFrontmostSupportedBrowser: async () => undefined,
    getActiveChromeTab: async () => ({ url: "", title: "" }),
    getActiveSafariTab: async () => ({ url: "", title: "" }),
    openOrFocusChromeUrl: async (url) => { opened.push(`chrome:${url}`); },
    openOrFocusSafariUrl: async (url) => { opened.push(`safari:${url}`); }
  });

  await router.openOrFocusBookmarkUrl({ browser: "chrome", url: "https://chrome.example" });
  await router.openOrFocusBookmarkUrl({ browser: "safari", url: "https://safari.example" });

  assert.deepEqual(opened, ["chrome:https://chrome.example", "safari:https://safari.example"]);
});
```

- [ ] Run `npm test -- src/browser/browser-router.test.ts` and confirm it fails because the module does not exist.
- [ ] Create `src/browser/browser-router.ts`:
  - Provide default dependencies from `frontmost.ts`, `chrome.ts`, and `safari.ts`.
  - `getActiveBrowserTab()` returns `{ browser, url, title }`.
  - `openOrFocusBookmarkUrl({ browser, url })` dispatches to Chrome or Safari.
- [ ] Run `npm test -- src/browser/browser-router.test.ts` and confirm it passes.

## Task 4: Wire Bookmark Slot Action

- [ ] Add focused action tests if practical without overbuilding:
  - Empty slot + fake frontmost Safari tab saves a bookmark with `browser: "safari"`.
  - Filled Safari bookmark calls Safari route, not Chrome route.
  - No supported frontmost browser rejects and leaves the slot empty.
- [ ] Modify `src/actions/bookmark-slot.ts` imports:
  - Remove direct imports of `getActiveChromeTab` and `openOrFocusChromeUrl`.
  - Import `createBrowserRouter`.
- [ ] Add `private readonly browserRouter = createBrowserRouter();`.
- [ ] In `onKeyUp`, replace opening a filled bookmark with `this.browserRouter.openOrFocusBookmarkUrl(bookmark)`.
- [ ] In `saveActiveChromeTab`, rename to `saveActiveBrowserTab`.
- [ ] In the renamed method:
  - Call `this.browserRouter.getActiveBrowserTab()`.
  - Save `browser: tab.browser`.
  - Keep title, URL, favicon and timestamps as before.
- [ ] Run `npm test -- src/browser/browser-router.test.ts src/browser/safari.test.ts src/browser/frontmost.test.ts`.
- [ ] Run `npm run typecheck`.

## Task 5: Storage and Fallback Compatibility

- [ ] Add `src/bookmarks/store.test.ts` coverage:
  - A stored bookmark with `browser: "safari"` loads as valid.
  - Import accepts a valid Safari bookmark.
- [ ] Keep `BrowserId = "chrome" | "safari"`.
- [ ] Keep `FaviconSource = "google" | "chrome"` for now to avoid JSON migration.
- [ ] Replace user-visible/code-comment wording so the fallback is not described as Chrome-only.
- [ ] Use a generic fallback icon in `src/assets.ts` so Safari internal/localhost URLs do not display a Chrome logo.
- [ ] Run `npx tsx --test src/bookmarks/store.test.ts src/favicon/favicon.test.ts`.

## Task 6: Documentation and Copy

- [ ] Modify `docs/architecture.md`:
  - Replace Chrome-only saving text with "frontmost supported browser".
  - Explain that saved Chrome slots reopen Chrome and saved Safari slots reopen Safari.
- [ ] Modify `docs/future-ideas.md`:
  - Change Safari support status from "Noch nicht gebaut" to "Umgesetzt" after the implementation verifies.
- [ ] Modify `com.carlosanderssohn.bookmark-slots.sdPlugin/manifest.json` copy:
  - Description should mention Chrome and Safari.
  - Tooltip should mention Chrome/Safari bookmarks.
- [ ] Optional: update `README.md` if it still says Chrome-only.

## Task 7: Verification

- [ ] Run `npm run verify`.
- [ ] Run `./install-local.sh`.
- [ ] Restart Stream Deck manually.
- [ ] Manual Safari test:
  - Put Safari in front with a normal website.
  - Press an empty bookmark slot.
  - Confirm the button updates.
  - Press again and confirm Safari focuses or opens the URL.
- [ ] Manual Safari closed test:
  - Save a Safari bookmark.
  - Quit Safari.
  - Press the filled slot.
  - Confirm Safari starts and opens the URL.
- [ ] Manual Chrome regression test:
  - Put Chrome in front with a normal website.
  - Press an empty bookmark slot.
  - Confirm it saves as Chrome.
  - Press again and confirm Chrome focuses or opens the URL.
- [ ] Manual unsupported-frontmost test:
  - Put Finder or another app in front.
  - Press an empty bookmark slot.
  - Confirm nothing is saved and Stream Deck shows an alert.
- [ ] Manual existing-bookmark test:
  - Existing Chrome bookmarks still open in Chrome.
  - New Safari bookmarks open in Safari.

## Risk Notes

- The main risk is AppleScript variation in Safari tab handling. This must be manually verified in the real app after automated tests pass.
- Frontmost app detection may require macOS Automation permission for Stream Deck/System Events. If permission blocks it, the plugin should fail with the existing alert and log the error.
- No JSON migration is planned because `browser: "safari"` is already accepted by the current store validator.
