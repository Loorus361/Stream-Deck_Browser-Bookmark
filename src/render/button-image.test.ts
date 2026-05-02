import assert from "node:assert/strict";
import { test } from "node:test";

import { escapeXml, splitTitle } from "./button-image.js";

test("splitTitle uses first seven characters as top line and next seven as bottom line", () => {
  assert.deepEqual(splitTitle("ABCDEFGHIJKLMNO"), {
    top: "ABCDEFG",
    bottom: "HIJKLMN"
  });
});

test("splitTitle leaves bottom line empty for short titles", () => {
  assert.deepEqual(splitTitle("Gmail"), {
    top: "Gmail",
    bottom: ""
  });
});

test("escapeXml escapes SVG-sensitive characters", () => {
  assert.equal(escapeXml(`A&B<"C">`), "A&amp;B&lt;&quot;C&quot;&gt;");
});
