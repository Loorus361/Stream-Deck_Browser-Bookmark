import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBackupCreatedResponse,
  createExportBookmarksResponse,
  createImportCompletedResponse,
  parsePropertyInspectorRequest
} from "./messages.js";

test("parsePropertyInspectorRequest accepts backup, export, and import requests", () => {
  assert.deepEqual(parsePropertyInspectorRequest({ type: "createBackup" }), { type: "createBackup" });
  assert.deepEqual(parsePropertyInspectorRequest({ type: "exportBookmarks" }), { type: "exportBookmarks" });
  assert.deepEqual(parsePropertyInspectorRequest({ type: "importBookmarks", json: "{\"version\":1,\"slots\":{}}" }), {
    type: "importBookmarks",
    json: "{\"version\":1,\"slots\":{}}"
  });
});

test("parsePropertyInspectorRequest rejects import requests without JSON text", () => {
  assert.equal(parsePropertyInspectorRequest({ type: "importBookmarks" }), undefined);
});

test("backup, export, and import responses include user-facing status data", () => {
  assert.deepEqual(createBackupCreatedResponse("bookmarks.backup-test.json"), {
    type: "backupCreated",
    fileName: "bookmarks.backup-test.json"
  });

  assert.deepEqual(createExportBookmarksResponse("bookmarks.export-test.json"), {
    type: "bookmarksExport",
    fileName: "bookmarks.export-test.json"
  });

  assert.deepEqual(createImportCompletedResponse("bookmarks.backup-before-import.json"), {
    type: "importCompleted",
    backupFileName: "bookmarks.backup-before-import.json"
  });
});
