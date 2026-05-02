import assert from "node:assert/strict";
import { test } from "node:test";

import { getFrontmostBrowser, parseFrontmostProcessOutput } from "./frontmost.js";

test("parseFrontmostProcessOutput maps Google Chrome bundle identifier to chrome", () => {
  assert.equal(parseFrontmostProcessOutput("com.google.Chrome\u001fGoogle Chrome"), "chrome");
});

test("parseFrontmostProcessOutput maps Safari bundle identifier to safari", () => {
  assert.equal(parseFrontmostProcessOutput("com.apple.Safari\u001fSafari"), "safari");
});

test("parseFrontmostProcessOutput returns undefined for other frontmost apps", () => {
  assert.equal(parseFrontmostProcessOutput("com.apple.finder\u001fFinder"), undefined);
});

test("getFrontmostBrowser asks System Events for frontmost bundle identifier and name", async () => {
  let capturedScript = "";

  const browser = await getFrontmostBrowser(async (script) => {
    capturedScript = script;
    return "com.apple.Safari\u001fSafari";
  });

  assert.equal(browser, "safari");
  assert.match(capturedScript, /System Events/);
  assert.match(capturedScript, /first application process whose frontmost is true/);
  assert.match(capturedScript, /bundle identifier/);
  assert.match(capturedScript, /name of frontProcess/);
});
