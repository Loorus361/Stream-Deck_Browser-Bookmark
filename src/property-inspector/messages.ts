/**
 * Typed message shapes between the Property Inspector HTML and plugin runtime.
 *
 * The Property Inspector cannot read bookmarks.json directly. It asks the
 * plugin for slot details and sends title override updates back to the runtime.
 */
import type { BookmarkSlot } from "../bookmarks/store.js";

export type PropertyInspectorRequest =
  | { type: "getSlotDetails" }
  | { type: "setTitleOverride"; titleOverride: string };

export type SlotDetailsResponse = {
  type: "slotDetails";
  slot: number;
  url: string;
  title: string;
  titleOverride: string;
};

export function parsePropertyInspectorRequest(value: unknown): PropertyInspectorRequest | undefined {
  if (!isRecord(value) || typeof value.type !== "string") {
    return undefined;
  }

  if (value.type === "getSlotDetails") {
    return { type: "getSlotDetails" };
  }

  if (value.type === "setTitleOverride" && typeof value.titleOverride === "string") {
    return {
      type: "setTitleOverride",
      titleOverride: value.titleOverride
    };
  }

  return undefined;
}

export function createSlotDetailsResponse(slot: number, bookmark: BookmarkSlot | undefined): SlotDetailsResponse {
  return {
    type: "slotDetails",
    slot,
    url: bookmark?.url ?? "",
    title: bookmark?.title ?? "",
    titleOverride: bookmark?.titleOverride ?? ""
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
