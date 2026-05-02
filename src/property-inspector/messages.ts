/**
 * Typed message shapes between the Property Inspector HTML and plugin runtime.
 *
 * The Property Inspector cannot read bookmarks.json directly. It asks the
 * plugin for slot details and sends title override updates back to the runtime.
 */
import type { BookmarkSlot } from "../bookmarks/store.js";

export type PropertyInspectorRequest =
  | { type: "getSlotDetails" }
  | { type: "setTitleOverride"; titleOverride: string }
  | { type: "createBackup" }
  | { type: "exportBookmarks" }
  | { type: "importBookmarks"; json: string };

export type SlotDetailsResponse = {
  type: "slotDetails";
  slot: number;
  url: string;
  title: string;
  titleOverride: string;
};

export type BackupCreatedResponse = {
  type: "backupCreated";
  fileName: string;
};

export type ExportBookmarksResponse = {
  type: "bookmarksExport";
  fileName: string;
};

export type ImportCompletedResponse = {
  type: "importCompleted";
  backupFileName: string;
};

export type BookmarkOperationFailedResponse = {
  type: "bookmarkOperationFailed";
  message: string;
};

export type PropertyInspectorResponse =
  | SlotDetailsResponse
  | BackupCreatedResponse
  | ExportBookmarksResponse
  | ImportCompletedResponse
  | BookmarkOperationFailedResponse;

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

  if (value.type === "createBackup") {
    return { type: "createBackup" };
  }

  if (value.type === "exportBookmarks") {
    return { type: "exportBookmarks" };
  }

  if (value.type === "importBookmarks" && typeof value.json === "string") {
    return {
      type: "importBookmarks",
      json: value.json
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

export function createBackupCreatedResponse(fileName: string): BackupCreatedResponse {
  return {
    type: "backupCreated",
    fileName
  };
}

export function createExportBookmarksResponse(fileName: string): ExportBookmarksResponse {
  return {
    type: "bookmarksExport",
    fileName
  };
}

export function createImportCompletedResponse(backupFileName: string): ImportCompletedResponse {
  return {
    type: "importCompleted",
    backupFileName
  };
}

export function createBookmarkOperationFailedResponse(message: string): BookmarkOperationFailedResponse {
  return {
    type: "bookmarkOperationFailed",
    message
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
