/**
 * Main Stream Deck action for one bookmark key.
 *
 * Responsibilities:
 * - assign and remember the key's slot number
 * - distinguish short press from 1-second long press
 * - save an active browser tab into an empty slot
 * - open/focus a stored URL from a filled slot
 * - delete a slot on long press
 * - refresh every visible key that points at the same slot
 * - answer Property Inspector requests for URL/title data
 */
import streamDeck, {
  action,
  SingletonAction,
  type Action,
  type DidReceiveSettingsEvent,
  type KeyAction,
  type KeyDownEvent,
  type KeyUpEvent,
  type SendToPluginEvent,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";

import { GENERIC_FALLBACK_ICON } from "../assets.js";
import type { BookmarkStore, BookmarkSlot } from "../bookmarks/store.js";
import { closeActiveBookmarkTab, getActiveBrowserTab, openOrFocusBookmarkUrl } from "../browser/browser-router.js";
import { createFaviconService } from "../favicon/favicon.js";
import { logMessage } from "../logging/log.js";
import {
  createBackupCreatedResponse,
  createBookmarkOperationFailedResponse,
  createExportBookmarksResponse,
  createImportCompletedResponse,
  createSlotDetailsResponse,
  parsePropertyInspectorRequest,
  type PropertyInspectorResponse
} from "../property-inspector/messages.js";
import { renderEmptyButtonImage, renderFilledButtonImage } from "../render/button-image.js";
import { chooseNextFreeSlot, normalizeSettings, type BookmarkSlotSettings } from "../settings/settings.js";
import { EmptySlotClickTracker } from "./empty-slot-clicks.js";

const ACTION_UUID = "com.carlosanderssohn.bookmark-slots.bookmark-slot";
const LONG_PRESS_MS = 1000;
const EMPTY_SLOT_DOUBLE_CLICK_MS = 300;

type VisibleAction = {
  slot: number;
  action: KeyAction<BookmarkSlotSettings>;
};

type BookmarkSlotActionOptions = {
  store: BookmarkStore;
};

@action({ UUID: ACTION_UUID })
export class BookmarkSlotAction extends SingletonAction<BookmarkSlotSettings> {
  private readonly visibleActions = new Map<string, VisibleAction>();
  private readonly pressedAt = new Map<string, number>();
  private readonly emptySlotClicks = new EmptySlotClickTracker(EMPTY_SLOT_DOUBLE_CLICK_MS);
  private readonly store: BookmarkStore;
  private readonly faviconService = createFaviconService({
    fallbackDataUrl: GENERIC_FALLBACK_ICON,
    log: (message) => logMessage(message, "error")
  });

  constructor(options: BookmarkSlotActionOptions) {
    super();
    this.store = options.store;
  }

  override async onWillAppear(ev: WillAppearEvent<BookmarkSlotSettings>): Promise<void> {
    if (!ev.action.isKey()) {
      return;
    }

    const slot = await this.ensureSlot(ev.action, ev.payload.settings);
    this.visibleActions.set(ev.action.id, { slot, action: ev.action });
    await this.refreshSlot(slot);
  }

  override onWillDisappear(ev: WillDisappearEvent<BookmarkSlotSettings>): void {
    const existing = this.visibleActions.get(ev.action.id);
    this.visibleActions.delete(ev.action.id);
    this.pressedAt.delete(ev.action.id);
    this.emptySlotClicks.cancel(ev.action.id);

    if (existing) {
      void this.refreshSlot(existing.slot);
    }
  }

  override onKeyDown(ev: KeyDownEvent<BookmarkSlotSettings>): void {
    this.emptySlotClicks.beginPress(ev.action.id);
    this.pressedAt.set(ev.action.id, Date.now());
  }

  override async onKeyUp(ev: KeyUpEvent<BookmarkSlotSettings>): Promise<void> {
    const slot = this.getSlotForAction(ev.action.id, ev.payload.settings);
    if (!slot) {
      await ev.action.showAlert();
      return;
    }

    const startedAt = this.pressedAt.get(ev.action.id) ?? Date.now();
    this.pressedAt.delete(ev.action.id);

    try {
      if (Date.now() - startedAt >= LONG_PRESS_MS) {
        this.emptySlotClicks.cancel(ev.action.id);
        await this.store.deleteBookmark(slot);
        await logMessage(`Slot ${slot} deleted`);
        await this.refreshSlot(slot);
        return;
      }

      const bookmark = await this.store.getBookmark(slot);
      if (bookmark) {
        this.emptySlotClicks.cancel(ev.action.id);
        await openOrFocusBookmarkUrl({ browser: bookmark.browser, url: bookmark.url });
        return;
      }

      const clickResult = this.emptySlotClicks.click(ev.action.id, () => {
        void this.handleSingleEmptySlotClick(ev.action, slot);
      });

      if (clickResult === "doubleClick") {
        await this.saveActiveBrowserTab(slot, { closeAfterSave: true });
      }
    } catch (error) {
      await logMessage(`Slot ${slot} action failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      await ev.action.showAlert();
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<BookmarkSlotSettings>): Promise<void> {
    if (!ev.action.isKey()) {
      return;
    }

    const previous = this.visibleActions.get(ev.action.id);
    const slot = await this.ensureSlot(ev.action, ev.payload.settings);
    this.visibleActions.set(ev.action.id, { slot, action: ev.action });

    if (previous && previous.slot !== slot) {
      await this.refreshSlot(previous.slot);
    }

    await this.refreshSlot(slot);
    await this.sendSlotDetails(slot, ev.action.id);
  }

  override async onSendToPlugin(ev: SendToPluginEvent<any, BookmarkSlotSettings>): Promise<void> {
    const request = parsePropertyInspectorRequest(ev.payload);
    if (!request) {
      return;
    }

    await logMessage(`Property inspector request: ${request.type}`);

    if (request.type === "createBackup") {
      try {
        const backup = await this.store.backup();
        await logMessage(`Backup created: ${backup.fileName}`);
        await this.sendPropertyInspectorResponse(ev.action.id, createBackupCreatedResponse(backup.fileName));
      } catch (error) {
        await this.handleBookmarkOperationError(ev.action, error, "Backup failed");
      }
      return;
    }

    if (request.type === "exportBookmarks") {
      try {
        const exported = await this.store.exportFile();
        await logMessage(`Bookmarks exported: ${exported.fileName}`);
        await this.sendPropertyInspectorResponse(ev.action.id, createExportBookmarksResponse(exported.fileName));
      } catch (error) {
        await this.handleBookmarkOperationError(ev.action, error, "Export failed");
      }
      return;
    }

    if (request.type === "importBookmarks") {
      try {
        const backup = await this.store.importJson(request.json);
        await this.refreshAllVisibleSlots();
        await logMessage(`Bookmarks imported; previous data backed up as ${backup.fileName}`);
        await this.sendPropertyInspectorResponse(ev.action.id, createImportCompletedResponse(backup.fileName));
      } catch (error) {
        await this.handleBookmarkOperationError(ev.action, error, "Import failed");
      }
      return;
    }

    const settings = normalizeSettings(await ev.action.getSettings<BookmarkSlotSettings>());
    const slot = settings.slot;
    if (!slot) {
      return;
    }

    if (request.type === "getSlotDetails") {
      await this.sendSlotDetails(slot, ev.action.id);
      return;
    }

    const titleOverride = request.titleOverride.trim();
    await this.store.updateBookmark(slot, (bookmark) => {
      const updated: BookmarkSlot = {
        ...bookmark,
        updatedAt: new Date().toISOString()
      };

      if (titleOverride) {
        updated.titleOverride = titleOverride;
      } else {
        delete updated.titleOverride;
      }

      return updated;
    });

    await this.refreshSlot(slot);
    await this.sendSlotDetails(slot, ev.action.id);
  }

  private async ensureSlot(actionInstance: KeyAction<BookmarkSlotSettings>, rawSettings: unknown): Promise<number> {
    const settings = normalizeSettings(rawSettings);
    if (settings.slot) {
      return settings.slot;
    }

    const slot = chooseNextFreeSlot([...this.visibleActions.values()].map((entry) => entry.slot));
    await actionInstance.setSettings({ slot });
    return slot;
  }

  private getSlotForAction(actionId: string, rawSettings: unknown): number | undefined {
    return this.visibleActions.get(actionId)?.slot ?? normalizeSettings(rawSettings).slot;
  }

  private async handleSingleEmptySlotClick(actionInstance: KeyAction<BookmarkSlotSettings>, slot: number): Promise<void> {
    try {
      const bookmark = await this.store.getBookmark(slot);
      if (bookmark) {
        return;
      }

      await this.saveActiveBrowserTab(slot);
    } catch (error) {
      await logMessage(`Slot ${slot} delayed save failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      await actionInstance.showAlert();
    }
  }

  private async saveActiveBrowserTab(slot: number, options: { closeAfterSave?: boolean } = {}): Promise<void> {
    const tab = await getActiveBrowserTab();
    const now = new Date().toISOString();

    if (options.closeAfterSave) {
      const bookmark: BookmarkSlot = {
        slot,
        url: tab.url,
        title: tab.title || tab.url,
        browser: tab.browser,
        faviconDataUrl: GENERIC_FALLBACK_ICON,
        faviconSource: "chrome",
        createdAt: now,
        updatedAt: now
      };

      await this.store.setBookmark(bookmark);
      await logMessage(`Slot ${slot} saved`);
      await this.refreshSlot(slot);

      try {
        await closeActiveBookmarkTab({ browser: tab.browser, url: tab.url });
        await logMessage(`Slot ${slot} source tab closed`);
      } finally {
        await this.updateSavedBookmarkFavicon(slot, tab.url);
      }
      return;
    }

    const favicon = await this.faviconService.fetchFavicon(tab.url);

    const bookmark: BookmarkSlot = {
      slot,
      url: tab.url,
      title: tab.title || tab.url,
      browser: tab.browser,
      faviconDataUrl: favicon.dataUrl,
      faviconSource: favicon.source,
      createdAt: now,
      updatedAt: now
    };

    await this.store.setBookmark(bookmark);
    await logMessage(`Slot ${slot} saved`);
    await this.refreshSlot(slot);
  }

  private async updateSavedBookmarkFavicon(slot: number, url: string): Promise<void> {
    const favicon = await this.faviconService.fetchFavicon(url);
    const updated = await this.store.updateBookmark(slot, (bookmark) => {
      if (bookmark.url !== url) {
        return bookmark;
      }

      return {
        ...bookmark,
        faviconDataUrl: favicon.dataUrl,
        faviconSource: favicon.source,
        updatedAt: new Date().toISOString()
      };
    });

    if (updated?.url === url) {
      await this.refreshSlot(slot);
    }
  }

  private async refreshSlot(slot: number): Promise<void> {
    const bookmark = await this.store.getBookmark(slot);
    const image = bookmark
      ? renderFilledButtonImage({
          title: bookmark.title,
          titleOverride: bookmark.titleOverride,
          faviconDataUrl: bookmark.faviconDataUrl
        })
      : renderEmptyButtonImage(slot);

    await Promise.all(
      [...this.visibleActions.values()]
        .filter((entry) => entry.slot === slot)
        .map(async (entry) => {
          await entry.action.setTitle("");
          await entry.action.setImage(image);
        })
    );
  }

  async refreshAllVisibleSlots(): Promise<void> {
    const slots = new Set([...this.visibleActions.values()].map((entry) => entry.slot));
    await Promise.all([...slots].map((slot) => this.refreshSlot(slot)));
  }

  private async sendSlotDetails(slot: number, actionId?: string): Promise<void> {
    if (actionId && streamDeck.ui.action?.id !== actionId) {
      return;
    }

    const bookmark = await this.store.getBookmark(slot);
    await streamDeck.ui.sendToPropertyInspector(createSlotDetailsResponse(slot, bookmark));
  }

  private async sendPropertyInspectorResponse(actionId: string, payload: PropertyInspectorResponse): Promise<void> {
    if (streamDeck.ui.action?.id !== actionId) {
      return;
    }

    await streamDeck.ui.sendToPropertyInspector(payload);
  }

  private async handleBookmarkOperationError(actionInstance: Action<BookmarkSlotSettings>, error: unknown, fallback: string): Promise<void> {
    const message = error instanceof Error ? error.message : fallback;
    await logMessage(`${fallback}: ${message}`, "error");
    await this.sendPropertyInspectorResponse(actionInstance.id, createBookmarkOperationFailedResponse(message));
    await actionInstance.showAlert();
  }
}
