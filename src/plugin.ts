/**
 * Plugin entrypoint loaded by Stream Deck.
 *
 * It wires the shared bookmark store into the Bookmark Slot action, logs plugin
 * startup, registers the action, and connects to the Stream Deck runtime.
 */
import streamDeck from "@elgato/streamdeck";
import os from "node:os";
import path from "node:path";

import { BookmarkSlotAction } from "./actions/bookmark-slot.js";
import { createBookmarkStore } from "./bookmarks/store.js";
import { DEFAULT_DATA_DIR, logMessage } from "./logging/log.js";
import {
  createBackupCreatedResponse,
  createBookmarkOperationFailedResponse,
  createExportBookmarksResponse,
  createImportCompletedResponse
} from "./property-inspector/messages.js";

const store = createBookmarkStore({
  dataDir: DEFAULT_DATA_DIR,
  exportDir: path.join(os.homedir(), "Downloads"),
  log: (message) => logMessage(message, "error")
});
const bookmarkAction = new BookmarkSlotAction({ store });
const handledGlobalCommandIds = new Set<string>();

streamDeck.actions.registerAction(bookmarkAction);

streamDeck.settings.onDidReceiveGlobalSettings<BookmarkGlobalSettings>(async (ev) => {
  const command = parseBookmarkGlobalCommand(ev.settings.bookmarkSlotsCommand);
  if (!command || handledGlobalCommandIds.has(command.id)) {
    return;
  }

  handledGlobalCommandIds.add(command.id);
  if (handledGlobalCommandIds.size > 100) {
    handledGlobalCommandIds.clear();
  }

  await logMessage(`Global property inspector request: ${command.type}`);

  try {
    if (command.type === "createBackup") {
      const backup = await store.backup();
      await logMessage(`Backup created: ${backup.fileName}`);
      await streamDeck.ui.sendToPropertyInspector(createBackupCreatedResponse(backup.fileName));
      return;
    }

    if (command.type === "exportBookmarks") {
      const exported = await store.exportFile();
      await logMessage(`Bookmarks exported: ${exported.fileName}`);
      await streamDeck.ui.sendToPropertyInspector(createExportBookmarksResponse(exported.fileName));
      return;
    }

    const backup = await store.importJson(command.json);
    await bookmarkAction.refreshAllVisibleSlots();
    await logMessage(`Bookmarks imported; previous data backed up as ${backup.fileName}`);
    await streamDeck.ui.sendToPropertyInspector(createImportCompletedResponse(backup.fileName));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bookmark operation failed";
    await logMessage(`Global bookmark operation failed: ${message}`, "error");
    await streamDeck.ui.sendToPropertyInspector(createBookmarkOperationFailedResponse(message));
  }
});

await logMessage("Plugin started");
await streamDeck.connect();

type BookmarkGlobalSettings = {
  bookmarkSlotsCommand?: BookmarkGlobalCommand;
};

type BookmarkGlobalCommand =
  | { id: string; type: "createBackup" }
  | { id: string; type: "exportBookmarks" }
  | { id: string; type: "importBookmarks"; json: string };

function parseBookmarkGlobalCommand(value: unknown): BookmarkGlobalCommand | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.type !== "string") {
    return undefined;
  }

  if (value.type === "createBackup") {
    return { id: value.id, type: "createBackup" };
  }

  if (value.type === "exportBookmarks") {
    return { id: value.id, type: "exportBookmarks" };
  }

  if (value.type === "importBookmarks" && typeof value.json === "string") {
    return { id: value.id, type: "importBookmarks", json: value.json };
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
