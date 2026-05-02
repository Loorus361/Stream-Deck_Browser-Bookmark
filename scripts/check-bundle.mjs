/**
 * Build guard.
 *
 * Stream Deck runs the installed .sdPlugin folder without this repository's
 * node_modules. This script fails the build if the bundle still imports the
 * Stream Deck SDK as an external package.
 */
import { readFile } from "node:fs/promises";

const bundlePath = new URL("../com.carlosanderssohn.bookmark-slots.sdPlugin/bin/plugin.js", import.meta.url);
const bundle = await readFile(bundlePath, "utf8");

if (bundle.includes("from \"@elgato/streamdeck\"") || bundle.includes("from '@elgato/streamdeck'")) {
  console.error("Bundle still contains an unresolved @elgato/streamdeck import.");
  process.exit(1);
}
