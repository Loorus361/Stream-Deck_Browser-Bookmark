/**
 * Plugin entrypoint loaded by Stream Deck.
 *
 * It wires the shared bookmark store into the Bookmark Slot action, logs plugin
 * startup, registers the action, and connects to the Stream Deck runtime.
 */
import streamDeck from "@elgato/streamdeck";

import { BookmarkSlotAction } from "./actions/bookmark-slot.js";
import { createBookmarkStore } from "./bookmarks/store.js";
import { DEFAULT_DATA_DIR, logMessage } from "./logging/log.js";

const store = createBookmarkStore({
  dataDir: DEFAULT_DATA_DIR,
  log: (message) => logMessage(message, "error")
});

streamDeck.actions.registerAction(new BookmarkSlotAction({ store }));

await logMessage("Plugin started");
await streamDeck.connect();
