/**
 * Firefox adapter.
 *
 * Firefox does not expose tab URL/title/focus automation as reliably as Chrome
 * and Safari on macOS. For saving, this adapter captures the active address bar
 * with keyboard shortcuts, validates the copied URL, and restores the previous
 * text clipboard content.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const APPLESCRIPT_TIMEOUT_MS = 5000;

export type FirefoxTab = {
  url: string;
  title: string;
};

export type FirefoxRunner = (script: string, args?: string[]) => Promise<string>;

export async function getActiveFirefoxTab(runAppleScript: FirefoxRunner = runAppleScriptWithOsascript): Promise<FirefoxTab> {
  const output = await runAppleScript(`
set previousClipboard to the clipboard

try
  tell application "Firefox" to activate
  delay 0.1
  tell application "System Events"
    keystroke "l" using command down
    delay 0.05
    keystroke "c" using command down
  end tell
  delay 0.1
  set copiedUrl to the clipboard as text
  set the clipboard to previousClipboard
  return copiedUrl
on error errorMessage
  try
    set the clipboard to previousClipboard
  end try
  error errorMessage
end try
`);

  const url = parseFirefoxAddressBarUrl(output);
  return { url, title: url };
}

export async function openFirefoxUrl(url: string, runAppleScript: FirefoxRunner = runAppleScriptWithOsascript): Promise<void> {
  await runAppleScript(`
on run argv
  set targetUrl to item 1 of argv

  tell application "Firefox"
    activate
    open location targetUrl
  end tell
end run
`, [url]);
}

export function parseFirefoxAddressBarUrl(output: string): string {
  const raw = output.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Keine gueltige Firefox-URL in der Zwischenablage gefunden.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Keine gueltige Firefox-URL in der Zwischenablage gefunden.");
  }

  return raw;
}

async function runAppleScriptWithOsascript(script: string, args: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-e", script, ...args], {
    timeout: APPLESCRIPT_TIMEOUT_MS,
    maxBuffer: 1024 * 1024
  });

  return stdout;
}
