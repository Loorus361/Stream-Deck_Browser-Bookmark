# Firefox Source and YouTube Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firefox can be used as a limited bookmark source, and YouTube links can optionally open in Firefox.

**Architecture:** Keep Stream Deck key behavior unchanged and put browser decisions in the browser layer. Firefox v1 captures the active Firefox URL by briefly selecting the address bar with `Command-L`, copying it with `Command-C`, validating the copied URL, and restoring the previous clipboard content. YouTube routing is a global option saved in Stream Deck global settings and applied centrally when opening bookmarks.

**Tech Stack:** TypeScript, Node 20, Stream Deck SDK v3, macOS `osascript`, Node test runner.

---

## Product Decisions Before Implementation

- Firefox speichern v1: Firefox muss vorne sein. Das Plugin kopiert die aktuelle Firefox-Adresszeile automatisch per `Command-L` und `Command-C`.
- Die bisherige Zwischenablage wird vor dem Kopieren gesichert und danach wiederhergestellt.
- Es werden nur `http`- und `https`-URLs gespeichert.
- Firefox-Bookmarks bekommen als Titel erstmal die URL.
- Firefox-Bookmarks werden in Firefox geöffnet, aber vorhandene Firefox-Tabs werden nicht gesucht oder fokussiert.
- Doppelklick "speichern und Tab schließen" bleibt für Firefox deaktiviert, weil Firefox-Tab-Schließen nicht zuverlässig genug ist.
- YouTube-in-Firefox ist eine globale Option im Einstellungsbereich, Standard: aus.
- Wenn das automatische Kopieren keine gültige Web-URL liefert, wird nichts gespeichert und Stream Deck zeigt einen Fehler.
- macOS muss dem Plugin/Stream Deck Bedienungshilfen-Rechte erlauben, weil `Command-L` und `Command-C` an Firefox gesendet werden.
- Restrisiko: Text-Zwischenablage kann gut wiederhergestellt werden. Bilder, Dateien oder formatierte Zwischenablage-Inhalte sind per reinem AppleScript nicht garantiert vollständig wiederherstellbar.

## File Map

- Modify: `src/browser/frontmost.ts`
  - Add Firefox detection via bundle id `org.mozilla.firefox`.
  - If local testing shows a different Firefox bundle id, add that exact id with a test before implementation.
- Create: `src/browser/firefox.ts`
  - Capture the active Firefox address with `Command-L` and `Command-C`.
  - Preserve and restore the previous clipboard content.
  - Validate `http`/`https`.
  - Open URL in Firefox.
  - Parse and test helpers.
- Modify: `src/browser/browser-router.ts`
  - Add Firefox as active tab source.
  - Add Firefox open routing.
  - Add optional YouTube override.
  - Keep close behavior unsupported for Firefox.
- Modify: `src/bookmarks/store.ts`
  - Allow `browser: "firefox"` in saved JSON and imports.
- Modify: `src/actions/bookmark-slot.ts`
  - Prevent close-after-save for Firefox double-click.
  - Pass global routing option into open flow.
- Modify: `src/plugin.ts`
  - Load/persist global setting `openYouTubeInFirefox`.
  - Pass setting getter into `BookmarkSlotAction`.
- Modify: `src/property-inspector/messages.ts`
  - Add typed messages for reading/updating global browser option if needed.
- Modify: `com.carlosanderssohn.bookmark-slots.sdPlugin/ui/bookmark-slot.html`
  - Add one checkbox: "YouTube in Firefox öffnen".
- Modify: `docs/future-ideas.md`
  - Mark YouTube-in-Firefox and Firefox clipboard source as implemented/partially implemented.
- Tests:
  - Modify: `src/browser/frontmost.test.ts`
  - Create: `src/browser/firefox.test.ts`
  - Modify: `src/browser/browser-router.test.ts`
  - Modify: `src/bookmarks/store.test.ts`
  - Modify or create focused action/settings tests only if needed.

---

### Task 1: Add Firefox as a valid saved browser

**Files:**
- Modify: `src/bookmarks/store.ts`
- Modify: `src/bookmarks/store.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests mirroring the existing Safari tests:

```ts
test("load keeps Firefox bookmarks as valid slots", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-03T12:00:00.000Z" });
  const firefoxBookmark: BookmarkSlot = {
    ...exampleBookmark(5),
    browser: "firefox"
  };

  await writeFile(path.join(dataDir, "bookmarks.json"), JSON.stringify({
    version: 1,
    slots: {
      "5": firefoxBookmark
    }
  }), "utf8");

  assert.deepEqual(await store.load(), {
    version: 1,
    slots: {
      "5": firefoxBookmark
    }
  });
});

test("import accepts Firefox bookmarks", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-03T12:00:00.000Z" });
  const firefoxBookmark: BookmarkSlot = {
    ...exampleBookmark(6),
    browser: "firefox"
  };

  await store.importJson(JSON.stringify({
    version: 1,
    slots: {
      "6": firefoxBookmark
    }
  }));

  assert.deepEqual(await store.load(), {
    version: 1,
    slots: {
      "6": firefoxBookmark
    }
  });
});
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
npm test -- src/bookmarks/store.test.ts
```

Expected: TypeScript/test failure because `firefox` is not assignable or not accepted by normalization.

- [ ] **Step 3: Implement minimal store support**

Change:

```ts
export type BrowserId = "chrome" | "safari" | "firefox";
```

Update browser normalization to accept exactly `chrome`, `safari`, or `firefox`.

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
npm test -- src/bookmarks/store.test.ts
```

Expected: PASS.

---

### Task 2: Detect Firefox as frontmost browser

**Files:**
- Modify: `src/browser/frontmost.ts`
- Modify: `src/browser/frontmost.test.ts`

- [ ] **Step 1: Write failing test**

Add:

```ts
test("parseFrontmostProcessOutput maps Firefox bundle identifier to firefox", () => {
  assert.equal(parseFrontmostProcessOutput("org.mozilla.firefox\u001fFirefox"), "firefox");
});
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
npm test -- src/browser/frontmost.test.ts
```

Expected: FAIL because Firefox currently returns `undefined`.

- [ ] **Step 3: Implement minimal detection**

Change `BrowserId` to include `firefox` and return it for bundle id `org.mozilla.firefox`.

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
npm test -- src/browser/frontmost.test.ts
```

Expected: PASS.

---

### Task 3: Add Firefox adapter with automatic URL capture

**Files:**
- Create: `src/browser/firefox.ts`
- Create: `src/browser/firefox.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests for URL parsing, script safety, and Firefox opening:

```ts
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
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
npm test -- src/browser/firefox.test.ts
```

Expected: FAIL because the module does not exist yet.

- [ ] **Step 3: Implement Firefox adapter**

Create:

```ts
export type FirefoxTab = {
  url: string;
  title: string;
};

export type FirefoxRunner = (script: string, args?: string[]) => Promise<string>;

export function parseFirefoxAddressBarUrl(output: string): string {
  const raw = output.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Keine gueltige Firefox-URL in der Zwischenablage gefunden.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Keine gueltige Firefox-URL in der Zwischenablage gefunden.");
  }

  return raw;
}
```

Implement `getActiveFirefoxTab()` with AppleScript:

```applescript
set previousClipboard to the clipboard

try
  tell application "Firefox" to activate
  delay 0.1
  tell application "System Events"
    keystroke "l" using command down
    delay 0.05
    keystroke "c" using command down
  end tell
  delay 0.1
  set copiedUrl to the clipboard as text
  set the clipboard to previousClipboard
  return copiedUrl
on error errorMessage
  try
    set the clipboard to previousClipboard
  end try
  error errorMessage
end try
```

Then parse the returned value with `parseFirefoxAddressBarUrl()` and return `{ url, title: url }`.

Important implementation detail: do not interpolate URLs or clipboard values into shell strings. Keep using `execFile("osascript", ["-e", script, ...args])`.

Clipboard limitation: this AppleScript approach is acceptable for text clipboard restoration. Do not claim it perfectly preserves image/file/rich clipboard content.

Implement `openFirefoxUrl(url)` with AppleScript:

```applescript
on run argv
  set targetUrl to item 1 of argv
  tell application "Firefox"
    activate
    open location targetUrl
  end tell
end run
```

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
npm test -- src/browser/firefox.test.ts
```

Expected: PASS.

---

### Task 4: Route Firefox save/open and YouTube override

**Files:**
- Modify: `src/browser/browser-router.ts`
- Modify: `src/browser/browser-router.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:

```ts
test("getActiveBrowserTab returns the active Firefox clipboard URL when Firefox is frontmost", async () => {
  const tab = await getActiveBrowserTab({
    getFrontmostBrowser: async () => "firefox",
    getActiveChromeTab: async () => { throw new Error("Chrome should not be queried"); },
    getActiveSafariTab: async () => { throw new Error("Safari should not be queried"); },
    getActiveFirefoxTab: async () => ({ url: "https://example.com", title: "https://example.com" })
  });

  assert.deepEqual(tab, { browser: "firefox", url: "https://example.com", title: "https://example.com" });
});

test("openOrFocusBookmarkUrl routes Firefox bookmarks to Firefox", async () => {
  const calls: string[] = [];

  await openOrFocusBookmarkUrl(
    { browser: "firefox", url: "https://example.com" },
    {
      openFirefoxUrl: async (url) => { calls.push(`firefox:${url}`); }
    }
  );

  assert.deepEqual(calls, ["firefox:https://example.com"]);
});

test("openOrFocusBookmarkUrl optionally routes YouTube URLs to Firefox", async () => {
  const calls: string[] = [];

  await openOrFocusBookmarkUrl(
    { browser: "chrome", url: "https://www.youtube.com/watch?v=1" },
    {
      openOrFocusChromeUrl: async (url) => { calls.push(`chrome:${url}`); },
      openFirefoxUrl: async (url) => { calls.push(`firefox:${url}`); },
      openYouTubeInFirefox: true
    }
  );

  assert.deepEqual(calls, ["firefox:https://www.youtube.com/watch?v=1"]);
});

test("openOrFocusBookmarkUrl does not route fake YouTube domains to Firefox", async () => {
  const calls: string[] = [];

  await openOrFocusBookmarkUrl(
    { browser: "chrome", url: "https://youtube.com.example/watch" },
    {
      openOrFocusChromeUrl: async (url) => { calls.push(`chrome:${url}`); },
      openFirefoxUrl: async (url) => { calls.push(`firefox:${url}`); },
      openYouTubeInFirefox: true
    }
  );

  assert.deepEqual(calls, ["chrome:https://youtube.com.example/watch"]);
});
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
npm test -- src/browser/browser-router.test.ts
```

Expected: FAIL because Firefox dependencies and YouTube routing do not exist yet.

- [ ] **Step 3: Implement router support**

Add Firefox dependencies:

```ts
getActiveFirefoxTab?: () => Promise<FirefoxTab>;
openFirefoxUrl?: (url: string) => Promise<void>;
openYouTubeInFirefox?: boolean;
```

Add `isYouTubeUrl(url)` with `URL.hostname.toLowerCase()`:

- exact `youtu.be`
- exact `youtube.com`
- suffix `.youtube.com`

Return false for invalid URLs and fake suffixes like `youtube.com.example`.

Route order:

1. If option enabled and URL is YouTube: open Firefox.
2. Else if saved browser is Firefox: open Firefox.
3. Else existing Chrome/Safari behavior.

- [ ] **Step 4: Run tests and verify green**

Run:

```bash
npm test -- src/browser/browser-router.test.ts
```

Expected: PASS.

---

### Task 5: Wire global option through plugin and Property Inspector

**Files:**
- Modify: `src/plugin.ts`
- Modify: `src/actions/bookmark-slot.ts`
- Modify: `com.carlosanderssohn.bookmark-slots.sdPlugin/ui/bookmark-slot.html`
- Modify: `src/property-inspector/messages.ts` only if runtime messages are needed.

- [ ] **Step 1: Define global setting shape**

Use:

```ts
type BookmarkGlobalSettings = {
  bookmarkSlotsCommand?: BookmarkGlobalCommand;
  bookmarkSlotsPreferences?: {
    openYouTubeInFirefox?: boolean;
  };
};
```

Default is `false`.

- [ ] **Step 2: Add action option**

Change `BookmarkSlotActionOptions`:

```ts
type BookmarkSlotActionOptions = {
  store: BookmarkStore;
  getOpenYouTubeInFirefox?: () => boolean;
};
```

When opening a bookmark, call:

```ts
await openOrFocusBookmarkUrl(
  { browser: bookmark.browser, url: bookmark.url },
  { openYouTubeInFirefox: this.getOpenYouTubeInFirefox() }
);
```

- [ ] **Step 3: Persist global preference in plugin**

In `src/plugin.ts`, keep an in-memory boolean initialized from global settings events:

```ts
let openYouTubeInFirefox = false;
```

When global settings arrive, update it from `bookmarkSlotsPreferences.openYouTubeInFirefox === true`.

Pass getter to action:

```ts
const bookmarkAction = new BookmarkSlotAction({
  store,
  getOpenYouTubeInFirefox: () => openYouTubeInFirefox
});
```

- [ ] **Step 4: Add checkbox to Property Inspector**

Add a checkbox under the global section:

```html
<label class="checkbox">
  <input id="openYouTubeInFirefox" type="checkbox" />
  <span>YouTube in Firefox öffnen</span>
</label>
```

On connect, request global settings. On checkbox change, send global settings preserving command behavior:

```js
sendRawMessage("getGlobalSettings", uuid);
sendRawMessage("setGlobalSettings", pluginUuid, {
  bookmarkSlotsPreferences: {
    openYouTubeInFirefox: openYouTubeInFirefoxInput.checked
  }
});
```

When `didReceiveGlobalSettings` arrives, sync checkbox from `bookmarkSlotsPreferences`.

- [ ] **Step 5: Run focused verification**

Run:

```bash
npm run typecheck
npm test
```

Expected: PASS.

---

### Task 6: Handle Firefox double-click safely

**Files:**
- Modify: `src/actions/bookmark-slot.ts`
- Add tests only if the action is already practical to test without Stream Deck SDK friction.

- [ ] **Step 1: Implement minimal guard**

In `saveActiveBrowserTab`, after reading `tab`, if `closeAfterSave` and `tab.browser === "firefox"`, save normally and skip `closeActiveBookmarkTab`.

Expected behavior:

- Single click on empty slot while Firefox is frontmost: copy active Firefox address automatically, save it, then restore the old clipboard.
- Double click on empty slot while Firefox is frontmost: copy active Firefox address automatically, save it, restore the old clipboard, and do not close Firefox tab.
- Chrome/Safari double-click behavior stays unchanged.

- [ ] **Step 2: Run focused verification**

Run:

```bash
npm run typecheck
npm test
```

Expected: PASS.

---

### Task 7: Update docs and verify full plugin

**Files:**
- Modify: `docs/future-ideas.md`
- Optional modify: `docs/architecture.md`
- Optional modify: `docs/operation-and-debugging.md`

- [ ] **Step 1: Update docs**

Record:

- YouTube-in-Firefox implemented as optional global setting.
- Firefox source implemented as automatic `Command-L`/`Command-C` v1.
- Previous clipboard content is restored after capture.
- Document that restoration is best-effort for non-text clipboard contents.
- Document that macOS Bedienungshilfen permission may be required.
- Firefox does not support existing-tab focus.
- Firefox does not support automatic tab close.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 3: Install locally for manual test**

Run:

```bash
./install-local.sh
```

Expected: build succeeds and plugin installs.

Manual test:

1. Restart Stream Deck.
2. Put recognizable text in the clipboard.
3. Open a Firefox tab and keep Firefox frontmost.
4. Press empty slot once.
5. Confirm slot stores the active Firefox URL.
6. Confirm the old clipboard text is still available.
7. Press saved Firefox slot.
8. Confirm Firefox opens that URL.
9. Enable "YouTube in Firefox öffnen".
10. Open a saved YouTube bookmark that was originally Chrome/Safari.
11. Confirm Firefox opens it.
12. Open a non-YouTube Chrome/Safari bookmark.
13. Confirm existing Chrome/Safari behavior is unchanged.

---

## Final Review Requirements

- Use at least one sub-agent for implementation review.
- Fix P1/P2 findings before completion.
- Run `npm run verify` again after review fixes.
- If plugin behavior changed, run `./install-local.sh` and ask Carlos to manually restart Stream Deck and test the checklist.
