# Stream Deck Bookmark Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Stream Deck plugin that turns each key into a configurable Chrome bookmark slot with dynamic title and favicon image.

**Architecture:** The plugin is a TypeScript/Node Stream Deck SDK project. Runtime code keeps bookmark data in `~/.streamdeck-bookmarks/bookmarks.json`, tracks visible action instances by slot number, talks to Chrome through AppleScript, and renders each key as a generated SVG data URL. A small property inspector edits the action slot number and sends explicit messages to the plugin to read/update the shared slot title override and stored URL.

**Tech Stack:** Stream Deck SDK v2, Node.js 20 runtime, TypeScript, Rollup build, macOS AppleScript via `osascript`, local JSON storage, SVG data URLs for button images.

---

## File Structure

- Create `package.json`: project scripts and dependencies.
- Create `tsconfig.json`: TypeScript compiler settings.
- Create `rollup.config.mjs`: bundle plugin runtime into the `.sdPlugin/bin` folder.
- Create `install-local.sh`: build and copy plugin into Stream Deck's local plugin folder.
- Create `README.md`: very short local usage notes.
- Create `com.carlosanderssohn.bookmark-slots.sdPlugin/manifest.json`: Stream Deck plugin/action metadata.
- Create `com.carlosanderssohn.bookmark-slots.sdPlugin/ui/bookmark-slot.html`: property inspector UI.
- Create `com.carlosanderssohn.bookmark-slots.sdPlugin/assets/`: default plugin/action images.
- Create `src/plugin.ts`: register Stream Deck action and connect.
- Create `src/actions/bookmark-slot.ts`: key event behavior, long press, settings handling, visible-action registry.
- Create `src/bookmarks/store.ts`: JSON load/save/delete bookmark slots.
- Create `src/browser/chrome.ts`: read active Chrome tab and open/focus stored URL.
- Create `src/render/button-image.ts`: generate 144x144 SVG data URL for filled/empty/error states.
- Create `src/favicon/favicon.ts`: fetch Google favicon by domain and fall back to Chrome icon.
- Create `src/settings/settings.ts`: validate/default action settings and choose next visible free slot.
- Create `src/property-inspector/messages.ts`: validate messages between UI and plugin.
- Create `src/logging/log.ts`: append sparse debug logs to `~/.streamdeck-bookmarks/plugin.log`.
- Create focused unit tests under `src/**/*.test.ts` for pure code: settings, title split, storage, favicon URL/domain handling.

## Task 1: Project Scaffold

- [ ] Create `package.json` with scripts:
  - `build`: run Rollup.
  - `typecheck`: run `tsc --noEmit`.
  - `test`: run Node's built-in test runner against compiled/pure test files.
  - `verify`: run typecheck, tests, and build.
- [ ] Install project dependencies:
  - runtime: `@elgato/streamdeck`
  - dev: `typescript`, `rollup`, `@rollup/plugin-typescript`, `@rollup/plugin-node-resolve`, `@rollup/plugin-commonjs`, `@types/node`
- [ ] Create `tsconfig.json` for Node 20, strict mode, decorators enabled, source maps enabled.
- [ ] Create `rollup.config.mjs` so `src/plugin.ts` builds to `com.carlosanderssohn.bookmark-slots.sdPlugin/bin/plugin.js`.
- [ ] Configure Rollup to bundle npm dependencies into `bin/plugin.js`; the installed `.sdPlugin` folder must not require a sibling `node_modules` folder.
- [ ] Add a build check that fails if `bin/plugin.js` still contains unresolved imports from `@elgato/streamdeck`.
- [ ] Verify with `npm run typecheck`; expected initial failures only until source files exist.

## Task 2: Manifest, Assets, README, Installer

- [ ] Create `manifest.json` with:
  - UUID `com.carlosanderssohn.bookmark-slots`
  - one action UUID `com.carlosanderssohn.bookmark-slots.bookmark-slot`
  - action name `Bookmark Slot`
  - `CodePath` `bin/plugin.js`
  - `PropertyInspectorPath` `ui/bookmark-slot.html`
  - `Nodejs.Version` `20`
  - macOS-only support
  - Stream Deck minimum version `7.1`
  - `SDKVersion` `3` unless local testing proves Stream Deck 7.4 rejects it; then fall back to `2`.
- [ ] Add simple default assets:
  - plugin icon
  - action icon
  - empty-slot plus/bookmark icon
  - Chrome fallback icon
- [ ] Create short `README.md`:
  - install with `./install-local.sh`
  - restart Stream Deck manually
  - drag `Bookmark Slot` onto keys
  - short press saves/opens, 1-second press deletes
- [ ] Create `install-local.sh`:
  - run `npm run verify`
  - remove old local `com.carlosanderssohn.bookmark-slots.sdPlugin` only after checking the target path ends with exactly that plugin folder name
  - copy the built `.sdPlugin` folder to `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
  - print a short instruction to restart Stream Deck manually
- [ ] Verify `zsh -n install-local.sh`.

## Task 2.5: Minimal SDK Smoke Test

- [ ] Before building full bookmark behavior, create a minimal action implementation that:
  - sets a hard-coded SVG data URL image on `onWillAppear`.
  - clears the runtime title with `setTitle("")`.
  - saves a default slot number to action settings.
  - calls `showAlert()` on a temporary test branch, then removes that branch after confirming the command works.
- [ ] Install locally with `./install-local.sh`.
- [ ] Restart Stream Deck manually.
- [ ] Confirm `Bookmark Slot` appears in Stream Deck and a key can show the hard-coded image.
- [ ] Confirm the property inspector can read/write the slot number setting.
- [ ] Only after this smoke test passes, continue to storage, Chrome, favicon, and final key behavior.

## Task 3: Core Data Model and Storage

- [ ] Define bookmark JSON shape:
  - `version: 1`
  - `slots: { [slotNumber: string]: BookmarkSlot }`
  - each slot stores `slot`, `url`, `title`, `titleOverride`, `browser`, `faviconDataUrl`, `faviconSource`, `createdAt`, `updatedAt`
- [ ] Implement `ensureDataDir()`, `loadStore()`, `saveStore()`, `getBookmark(slot)`, `setBookmark(bookmark)`, `deleteBookmark(slot)`.
- [ ] Use atomic-ish writes: write temp file in same folder, then rename to `bookmarks.json`.
- [ ] Treat missing JSON as empty store.
- [ ] Treat corrupt JSON as empty store, but first rename the corrupt file to `bookmarks.corrupt-<timestamp>.json`, log the parse error, and do not crash the plugin.
- [ ] Keep storage testable by allowing data directory, clock, and logger to be injected in tests.
- [ ] Unit-test:
  - missing file loads empty.
  - setting slot writes data.
  - deleting one slot leaves others intact.
  - corrupt JSON is backed up, logs, and returns empty.

## Task 4: Settings and Visible Slot Registry

- [ ] Define action settings:
  - `slot?: number`
- [ ] Store `titleOverride` only in the JSON bookmark slot, not in action settings, so all visible keys using the same slot stay identical.
- [ ] On `onWillAppear`, if no valid slot is set, choose the next free positive integer among currently visible action instances and save it to action settings.
- [ ] Register each visible action instance by context and slot number.
- [ ] On `onWillDisappear`, unregister the action context, clear its press timestamp, and remove it from the visible slot registry.
- [ ] If settings change, move the action instance to the new slot group and refresh affected buttons.
- [ ] If multiple visible actions share a slot, every refresh/update applies to all of them.
- [ ] Unit-test:
  - invalid slot defaults to next free.
  - duplicate slot is allowed.
  - next free uses visible/configured actions only, not old JSON entries.

## Task 5: Chrome Adapter

- [ ] Implement `getActiveChromeTab()` with AppleScript:
  - read URL and tab title from active tab of front Chrome window.
  - fail if Chrome is not running or has no window.
- [ ] Implement `openOrFocusChromeUrl(url)` with AppleScript:
  - start/activate Chrome if needed.
  - search windows/tabs for exact URL match.
  - if found, activate first matching window/tab.
  - if not found, open URL in a new tab.
- [ ] Keep Chrome in front after opening/focusing.
- [ ] Use `execFile` rather than shell interpolation for `osascript`.
- [ ] Add a short timeout for AppleScript execution.
- [ ] Return URL/title from AppleScript with a robust delimiter or JSON-safe format so titles with spaces, quotes, or newlines do not break parsing.
- [ ] Keep Chrome runner injectable so tests do not launch real Chrome.
- [ ] Unit-test helper string/escaping/parsing logic; manually test AppleScript through the plugin because it depends on Chrome.

## Task 6: Button Image Rendering

- [ ] Implement title formatting:
  - use `titleOverride` when present, otherwise bookmark `title`.
  - take first 14 characters.
  - line 1 is characters 1-7.
  - line 2 is characters 8-14.
  - if shorter than 8, bottom line is empty.
- [ ] Generate SVG data URL:
  - 144x144 viewbox.
  - black background.
  - white text.
  - top text near upper edge.
  - 64x64 centered favicon with rounded corners.
  - bottom text near lower edge.
- [ ] Generate empty slot image:
  - black background.
  - centered plus/bookmark icon.
  - title `Slot N`.
- [ ] Unit-test title splitting and SVG escaping.

## Task 7: Favicon Handling

- [ ] Extract hostname from URL where possible.
- [ ] For hostnames, fetch Google favicon service URL and store result as data URL.
- [ ] For `chrome://`, `file://`, invalid/no-host URLs, or failed fetch, use Chrome fallback icon.
- [ ] Store favicon data in JSON so the button can restore without network access.
- [ ] On plugin start/button appearance, retry once for slots whose favicon source is Chrome fallback and whose URL has a hostname.
- [ ] Keep `fetch` injectable so unit tests do not perform real network requests.
- [ ] Unit-test:
  - normal domain builds a Google favicon request.
  - internal URL chooses Chrome fallback.
  - failed fetch chooses Chrome fallback.
  - `localhost` uses fallback if Google favicon returns no usable icon.

## Task 8: Stream Deck Action Behavior

- [ ] On `onWillAppear`:
  - assign/default slot.
  - load bookmark.
  - render empty or filled image.
  - clear Stream Deck's runtime title so the generated image owns all text.
- [ ] On `onWillDisappear`:
  - unregister visible action context.
  - clear press timestamp.
- [ ] On `onKeyDown`:
  - store press timestamp per action context.
- [ ] On `onKeyUp`:
  - if held at least 1000ms, delete slot and refresh all visible actions for that slot.
  - if short press and slot empty, read active Chrome tab, fetch favicon, save bookmark, refresh buttons.
  - if short press and slot filled, open/focus URL in Chrome.
- [ ] On errors:
  - log sparse error.
  - call `showAlert`.
  - do not write partial bookmark data.
- [ ] On `onSendToPlugin` from the property inspector:
  - handle `getSlotDetails` by replying with current slot, URL, title, and title override.
  - handle `setTitleOverride` by updating the JSON bookmark slot, refreshing all visible actions for that slot, and replying with updated details.
- [ ] Manual test in Stream Deck:
  - empty button shows `Slot 1`.
  - short press stores Chrome tab and updates title/icon.
  - second short press focuses/open URL.
  - 1-second hold deletes and returns to empty state.

## Task 9: Property Inspector

- [ ] Build `ui/bookmark-slot.html` with plain HTML/CSS/JS:
  - slot number input.
  - stored URL read-only display.
  - title override input.
  - no delete button.
- [ ] On inspector load:
  - read settings.
  - show current slot number/title override.
  - send `getSlotDetails` to the plugin and render the returned URL/title data.
- [ ] On slot/title change:
  - slot number change writes action settings.
  - title override change sends `setTitleOverride` to the plugin, because the override belongs to shared JSON slot data.
  - runtime refreshes every visible button for the affected slot.
- [ ] Listen for `sendToPropertyInspector` responses so the displayed URL/title updates after save/delete/settings changes.
- [ ] Keep UI short and functional, no marketing text.

## Task 10: Verification and Local Install

- [ ] Run `npm run verify`.
- [ ] Run `./install-local.sh`.
- [ ] Restart Stream Deck manually.
- [ ] Add `Bookmark Slot` to one key.
- [ ] Test Slot 1 save/open/delete.
- [ ] Add a second key with Slot 1 and confirm both update together.
- [ ] Change second key to Slot 2 and confirm separate behavior.
- [ ] Test Chrome closed:
  - filled slot opens Chrome and URL.
  - empty slot shows alert and stores nothing.
- [ ] Inspect `~/.streamdeck-bookmarks/bookmarks.json` and `plugin.log` only if behavior is wrong.

## Acceptance Criteria

- A local `Bookmark Slot` action appears in Stream Deck.
- Every key can auto-assign or manually set a slot number.
- Empty slots show `Slot N` with a plus/bookmark icon.
- Filled slots show black button image, white 7+7 title text, and favicon/Chrome fallback.
- Short press correctly switches between save and open/focus based on slot state.
- Long press deletes on key release after at least 1 second.
- JSON persistence survives Stream Deck restart.
- No macOS notifications are used.
- README stays short.
