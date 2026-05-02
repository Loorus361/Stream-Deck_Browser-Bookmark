/**
 * Main Stream Deck action for one bookmark key.
 *
 * Responsibilities:
 * - assign and remember the key's slot number
 * - distinguish short press from 1-second long press
 * - save an active Chrome tab into an empty slot
 * - open/focus a stored URL from a filled slot
 * - delete a slot on long press
 * - refresh every visible key that points at the same slot
 * - answer Property Inspector requests for URL/title data
 */
import streamDeck, {
  action,
  SingletonAction,
  type DidReceiveSettingsEvent,
  type KeyAction,
  type KeyDownEvent,
  type KeyUpEvent,
  type SendToPluginEvent,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";

import { CHROME_FALLBACK_ICON } from "../assets.js";
import type { BookmarkStore, BookmarkSlot } from "../bookmarks/store.js";
import { getActiveChromeTab, openOrFocusChromeUrl } from "../browser/chrome.js";
import { createFaviconService } from "../favicon/favicon.js";
import { logMessage } from "../logging/log.js";
import { createSlotDetailsResponse, parsePropertyInspectorRequest } from "../property-inspector/messages.js";
import { renderEmptyButtonImage, renderFilledButtonImage } from "../render/button-image.js";
import { chooseNextFreeSlot, normalizeSettings, type BookmarkSlotSettings } from "../settings/settings.js";

const ACTION_UUID = "com.carlosanderssohn.bookmark-slots.bookmark-slot";
const LONG_PRESS_MS = 1000;

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
  private readonly store: BookmarkStore;
  private readonly faviconService = createFaviconService({
    chromeFallbackDataUrl: CHROME_FALLBACK_ICON,
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

    if (existing) {
      void this.refreshSlot(existing.slot);
    }
  }

  override onKeyDown(ev: KeyDownEvent<BookmarkSlotSettings>): void {
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
        await this.store.deleteBookmark(slot);
        await logMessage(`Slot ${slot} deleted`);
        await this.refreshSlot(slot);
        return;
      }

      const bookmark = await this.store.getBookmark(slot);
      if (bookmark) {
        await openOrFocusChromeUrl(bookmark.url);
        return;
      }

      await this.saveActiveChromeTab(slot);
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

  private async saveActiveChromeTab(slot: number): Promise<void> {
    const tab = await getActiveChromeTab();
    const favicon = await this.faviconService.fetchFavicon(tab.url);
    const now = new Date().toISOString();

    const bookmark: BookmarkSlot = {
      slot,
      url: tab.url,
      title: tab.title || tab.url,
      browser: "chrome",
      faviconDataUrl: favicon.dataUrl,
      faviconSource: favicon.source,
      createdAt: now,
      updatedAt: now
    };

    await this.store.setBookmark(bookmark);
    await logMessage(`Slot ${slot} saved`);
    await this.refreshSlot(slot);
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

  private async sendSlotDetails(slot: number, actionId?: string): Promise<void> {
    if (actionId && streamDeck.ui.action?.id !== actionId) {
      return;
    }

    const bookmark = await this.store.getBookmark(slot);
    await streamDeck.ui.sendToPropertyInspector(createSlotDetailsResponse(slot, bookmark));
  }
}
