import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createBookmarkStore, type BookmarkSlot } from "./store.js";

const exampleBookmark = (slot: number): BookmarkSlot => ({
  slot,
  url: `https://example.com/${slot}`,
  title: `Example ${slot}`,
  browser: "chrome",
  faviconDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
  faviconSource: "google",
  createdAt: "2026-05-02T12:00:00.000Z",
  updatedAt: "2026-05-02T12:00:00.000Z"
});

test("missing bookmark file loads an empty store", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });

  assert.deepEqual(await store.load(), { version: 1, slots: {} });
});

test("setBookmark writes a slot and deleteBookmark removes only that slot", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });

  await store.setBookmark(exampleBookmark(1));
  await store.setBookmark(exampleBookmark(2));
  await store.deleteBookmark(1);

  assert.equal(await store.getBookmark(1), undefined);
  assert.equal((await store.getBookmark(2))?.url, "https://example.com/2");
});

test("corrupt JSON is backed up and replaced with an empty store", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const logs: string[] = [];
  const store = createBookmarkStore({
    dataDir,
    now: () => "2026-05-02T12:00:00.000Z",
    log: (message) => {
      logs.push(message);
    }
  });

  await writeFile(path.join(dataDir, "bookmarks.json"), "{not json", "utf8");

  assert.deepEqual(await store.load(), { version: 1, slots: {} });

  const backup = await readFile(path.join(dataDir, "bookmarks.corrupt-2026-05-02T12-00-00-000Z.json"), "utf8");
  assert.equal(backup, "{not json");
  assert.equal(logs.some((line) => line.includes("Corrupt bookmarks JSON")), true);
});

test("valid JSON with unsupported structure is backed up", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const logs: string[] = [];
  const store = createBookmarkStore({
    dataDir,
    now: () => "2026-05-02T12:00:00.000Z",
    log: (message) => {
      logs.push(message);
    }
  });

  await writeFile(path.join(dataDir, "bookmarks.json"), "{\"version\":2,\"slots\":{}}", "utf8");

  assert.deepEqual(await store.load(), { version: 1, slots: {} });
  assert.equal(logs.some((line) => line.includes("unsupported structure")), true);
});
