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

test("load keeps Safari bookmarks as valid slots", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });
  const safariBookmark: BookmarkSlot = {
    ...exampleBookmark(3),
    browser: "safari"
  };

  await writeFile(path.join(dataDir, "bookmarks.json"), JSON.stringify({
    version: 1,
    slots: {
      "3": safariBookmark
    }
  }), "utf8");

  assert.deepEqual(await store.load(), {
    version: 1,
    slots: {
      "3": safariBookmark
    }
  });
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

test("backup creates a complete bookmark file copy", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });

  await store.setBookmark(exampleBookmark(1));

  const backup = await store.backup();

  assert.equal(backup.fileName, "bookmarks.backup-2026-05-02T12-00-00-000Z.json");
  assert.equal(backup.filePath, path.join(dataDir, backup.fileName));
  assert.deepEqual(JSON.parse(await readFile(backup.filePath, "utf8")), {
    version: 1,
    slots: {
      "1": exampleBookmark(1)
    }
  });
});

test("backup writes an empty valid store when bookmark file is missing", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });

  const backup = await store.backup();

  assert.deepEqual(JSON.parse(await readFile(backup.filePath, "utf8")), { version: 1, slots: {} });
});

test("backup does not overwrite an existing backup with the same timestamp", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });

  const first = await store.backup();
  const second = await store.backup();

  assert.equal(first.fileName, "bookmarks.backup-2026-05-02T12-00-00-000Z.json");
  assert.equal(second.fileName, "bookmarks.backup-2026-05-02T12-00-00-000Z-2.json");
});

test("export returns normalized JSON without changing the bookmark file", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });
  const filePath = path.join(dataDir, "bookmarks.json");
  const original = JSON.stringify({
    version: 1,
    slots: {
      "1": exampleBookmark(1),
      bad: { slot: "bad" }
    }
  });
  await writeFile(filePath, original, "utf8");

  const exported = await store.exportJson();

  assert.equal(await readFile(filePath, "utf8"), original);
  assert.equal(exported, `${JSON.stringify({
    version: 1,
    slots: {
      "1": exampleBookmark(1)
    }
  }, null, 2)}\n`);
});

test("exportFile writes a complete export file without changing the bookmark file", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const exportDir = await mkdtemp(path.join(tmpdir(), "bookmark-export-"));
  const store = createBookmarkStore({ dataDir, exportDir, now: () => "2026-05-02T12:00:00.000Z" });
  await store.setBookmark(exampleBookmark(1));
  const filePath = path.join(dataDir, "bookmarks.json");
  const original = await readFile(filePath, "utf8");

  const exported = await store.exportFile();

  assert.equal(exported.fileName, "bookmarks.export-2026-05-02T12-00-00-000Z.json");
  assert.equal(exported.filePath, path.join(exportDir, exported.fileName));
  assert.equal(await readFile(filePath, "utf8"), original);
  assert.deepEqual(JSON.parse(await readFile(exported.filePath, "utf8")), {
    version: 1,
    slots: {
      "1": exampleBookmark(1)
    }
  });
});

test("import replaces the store after creating a backup", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });
  await store.setBookmark(exampleBookmark(1));

  const backup = await store.importJson(JSON.stringify({
    version: 1,
    slots: {
      "2": exampleBookmark(2)
    }
  }));

  assert.equal(backup.fileName, "bookmarks.backup-2026-05-02T12-00-00-000Z.json");
  assert.deepEqual(await store.load(), {
    version: 1,
    slots: {
      "2": exampleBookmark(2)
    }
  });
  assert.deepEqual(JSON.parse(await readFile(path.join(dataDir, "bookmarks.backup-2026-05-02T12-00-00-000Z.json"), "utf8")), {
    version: 1,
    slots: {
      "1": exampleBookmark(1)
    }
  });
});

test("import accepts Safari bookmarks", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });
  const safariBookmark: BookmarkSlot = {
    ...exampleBookmark(4),
    browser: "safari"
  };

  await store.importJson(JSON.stringify({
    version: 1,
    slots: {
      "4": safariBookmark
    }
  }));

  assert.deepEqual(await store.load(), {
    version: 1,
    slots: {
      "4": safariBookmark
    }
  });
});

test("invalid import keeps the existing bookmark file unchanged", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "bookmark-store-"));
  const store = createBookmarkStore({ dataDir, now: () => "2026-05-02T12:00:00.000Z" });
  await store.setBookmark(exampleBookmark(1));
  const filePath = path.join(dataDir, "bookmarks.json");
  const original = await readFile(filePath, "utf8");

  await assert.rejects(() => store.importJson("{not json"), /Invalid bookmark import JSON/);
  assert.equal(await readFile(filePath, "utf8"), original);

  await assert.rejects(() => store.importJson(JSON.stringify({ version: 2, slots: {} })), /Unsupported bookmark import structure/);
  assert.equal(await readFile(filePath, "utf8"), original);

  await assert.rejects(() => store.importJson(JSON.stringify({
    version: 1,
    slots: {
      invalid: { slot: "invalid" }
    }
  })), /Unsupported bookmark import structure/);
  assert.equal(await readFile(filePath, "utf8"), original);
});
