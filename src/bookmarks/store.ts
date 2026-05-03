/**
 * JSON persistence for bookmark slots.
 *
 * Production file:
 * /Users/carlosanderssohn/.streamdeck-bookmarks/bookmarks.json
 *
 * This module serializes write operations to avoid losing data when two
 * Stream Deck keys save/delete/update close together. Corrupt top-level JSON
 * files are backed up before the store starts from an empty state.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type BrowserId = "chrome" | "safari" | "firefox";
export type FaviconSource = "google" | "chrome";

export type BookmarkSlot = {
  slot: number;
  url: string;
  title: string;
  titleOverride?: string;
  browser: BrowserId;
  faviconDataUrl: string;
  faviconSource: FaviconSource;
  createdAt: string;
  updatedAt: string;
};

export type BookmarkFile = {
  version: 1;
  slots: Record<string, BookmarkSlot>;
};

export type BookmarkStoreOptions = {
  dataDir: string;
  exportDir?: string;
  now?: () => string;
  log?: (message: string) => void | Promise<void>;
};

export type BookmarkBackupResult = {
  filePath: string;
  fileName: string;
};

export type BookmarkExportResult = {
  filePath: string;
  fileName: string;
};

export type BookmarkStore = ReturnType<typeof createBookmarkStore>;

const EMPTY_STORE: BookmarkFile = {
  version: 1,
  slots: {}
};

export function createBookmarkStore(options: BookmarkStoreOptions) {
  const now = options.now ?? (() => new Date().toISOString());
  const log = options.log ?? (() => undefined);
  const filePath = path.join(options.dataDir, "bookmarks.json");
  const exportDir = options.exportDir ?? options.dataDir;
  let writeQueue = Promise.resolve();

  async function ensureDataDir(): Promise<void> {
    await mkdir(options.dataDir, { recursive: true });
  }

  async function load(): Promise<BookmarkFile> {
    await ensureDataDir();

    try {
      const content = await readFile(filePath, "utf8");
      const normalized = normalizeBookmarkFile(JSON.parse(content));
      if (!normalized.valid) {
        await backupCorruptFile();
        await log("Corrupt bookmarks JSON: recognized JSON with unsupported structure");
      }

      return normalized.store;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return emptyStore();
      }

      await backupCorruptFile();
      await log(`Corrupt bookmarks JSON: ${error instanceof Error ? error.message : String(error)}`);
      return emptyStore();
    }
  }

  async function save(store: BookmarkFile): Promise<void> {
    await ensureDataDir();
    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, formatStore(store), "utf8");
    await rename(tempPath, filePath);
  }

  async function backup(): Promise<BookmarkBackupResult> {
    return withWriteLock(async () => backupCurrentStore());
  }

  async function exportJson(): Promise<string> {
    return withWriteLock(async () => formatStore(await load()));
  }

  async function exportFile(): Promise<BookmarkExportResult> {
    return withWriteLock(async () => {
      const store = await load();
      const baseName = `bookmarks.export-${safeTimestamp(now())}`;
      await mkdir(exportDir, { recursive: true });
      return writeUniqueStoreFile(exportDir, baseName, store);
    });
  }

  async function importJson(jsonText: string): Promise<BookmarkBackupResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Invalid bookmark import JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    const normalized = normalizeBookmarkFileForImport(parsed);
    if (!normalized) {
      throw new Error("Unsupported bookmark import structure");
    }

    return withWriteLock(async () => {
      const backupResult = await backupCurrentStore();
      await save(normalized.store);
      return backupResult;
    });
  }

  async function getBookmark(slot: number): Promise<BookmarkSlot | undefined> {
    const store = await load();
    return store.slots[String(slot)];
  }

  async function setBookmark(bookmark: BookmarkSlot): Promise<void> {
    await withWriteLock(async () => {
      const store = await load();
      store.slots[String(bookmark.slot)] = bookmark;
      await save(store);
    });
  }

  async function updateBookmark(slot: number, update: (bookmark: BookmarkSlot) => BookmarkSlot | undefined): Promise<BookmarkSlot | undefined> {
    return withWriteLock(async () => {
      const store = await load();
      const existing = store.slots[String(slot)];
      if (!existing) {
        return undefined;
      }

      const updated = update(existing);
      if (!updated) {
        delete store.slots[String(slot)];
        await save(store);
        return undefined;
      }

      store.slots[String(slot)] = updated;
      await save(store);
      return updated;
    });
  }

  async function deleteBookmark(slot: number): Promise<void> {
    await withWriteLock(async () => {
      const store = await load();
      delete store.slots[String(slot)];
      await save(store);
    });
  }

  async function backupCurrentStore(): Promise<BookmarkBackupResult> {
    return writeUniqueStoreFile(options.dataDir, `bookmarks.backup-${safeTimestamp(now())}`, await load());
  }

  async function writeUniqueStoreFile(outputDir: string, baseName: string, store: BookmarkFile): Promise<BookmarkBackupResult> {
    for (let attempt = 1; attempt < 1000; attempt += 1) {
      const fileName = attempt === 1 ? `${baseName}.json` : `${baseName}-${attempt}.json`;
      const outputPath = path.join(outputDir, fileName);
      try {
        await writeFile(outputPath, formatStore(store), { encoding: "utf8", flag: "wx" });
        return {
          filePath: outputPath,
          fileName
        };
      } catch (error) {
        if (!isNodeError(error) || error.code !== "EEXIST") {
          throw error;
        }
      }
    }

    throw new Error("Could not create unique bookmark file");
  }

  async function backupCorruptFile(): Promise<void> {
    const backupPath = path.join(options.dataDir, `bookmarks.corrupt-${safeTimestamp(now())}.json`);
    try {
      await rename(filePath, backupPath);
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") {
        await log(`Failed to back up corrupt bookmarks JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = writeQueue.then(operation, operation);
    writeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  return {
    ensureDataDir,
    load,
    save,
    backup,
    exportJson,
    exportFile,
    importJson,
    getBookmark,
    setBookmark,
    updateBookmark,
    deleteBookmark
  };
}

function formatStore(store: BookmarkFile): string {
  return `${JSON.stringify(store, null, 2)}\n`;
}

export function emptyStore(): BookmarkFile {
  return {
    version: EMPTY_STORE.version,
    slots: {}
  };
}

function normalizeBookmarkFile(value: unknown): { valid: boolean; store: BookmarkFile } {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.slots)) {
    return { valid: false, store: emptyStore() };
  }

  const slots: Record<string, BookmarkSlot> = {};
  for (const [slotKey, slotValue] of Object.entries(value.slots)) {
    const bookmark = normalizeBookmarkSlot(slotValue);
    if (bookmark) {
      slots[slotKey] = bookmark;
    }
  }

  return { valid: true, store: { version: 1, slots } };
}

function normalizeBookmarkFileForImport(value: unknown): { store: BookmarkFile } | undefined {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.slots)) {
    return undefined;
  }

  const slots: Record<string, BookmarkSlot> = {};
  for (const [slotKey, slotValue] of Object.entries(value.slots)) {
    const bookmark = normalizeBookmarkSlot(slotValue);
    if (!bookmark || slotKey !== String(bookmark.slot)) {
      return undefined;
    }

    slots[slotKey] = bookmark;
  }

  return { store: { version: 1, slots } };
}

function normalizeBookmarkSlot(value: unknown): BookmarkSlot | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.slot !== "number" ||
    !Number.isInteger(value.slot) ||
    value.slot <= 0 ||
    typeof value.url !== "string" ||
    typeof value.title !== "string" ||
    typeof value.browser !== "string" ||
    typeof value.faviconDataUrl !== "string" ||
    typeof value.faviconSource !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return undefined;
  }

  const browser =
    value.browser === "safari" ? "safari" : value.browser === "chrome" ? "chrome" : value.browser === "firefox" ? "firefox" : undefined;
  const faviconSource = value.faviconSource === "google" ? "google" : value.faviconSource === "chrome" ? "chrome" : undefined;
  if (!browser || !faviconSource) {
    return undefined;
  }

  const bookmark: BookmarkSlot = {
    slot: value.slot,
    url: value.url,
    title: value.title,
    browser,
    faviconDataUrl: value.faviconDataUrl,
    faviconSource,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };

  if (typeof value.titleOverride === "string") {
    bookmark.titleOverride = value.titleOverride;
  }

  return bookmark;
}

function safeTimestamp(timestamp: string): string {
  return timestamp.replaceAll(":", "-").replaceAll(".", "-");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
