/**
 * Safari AppleScript adapter.
 *
 * Reads the URL/title from Safari's front document and opens or focuses stored
 * URLs by exact URL match across Safari windows and tabs.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SAFARI_OUTPUT_DELIMITER = "\u001f";
const APPLESCRIPT_TIMEOUT_MS = 5000;

export type SafariTab = {
  url: string;
  title: string;
};

export type SafariRunner = (script: string, args?: string[]) => Promise<string>;

export async function getActiveSafariTab(runAppleScript: SafariRunner = runAppleScriptWithOsascript): Promise<SafariTab> {
  const output = await runAppleScript(`
if application "Safari" is not running then error "Safari laeuft nicht."

tell application "Safari"
  if (count of windows) is 0 then error "Safari hat kein geoeffnetes Fenster."
  set activeUrl to URL of current tab of front window
  set activeTitle to name of current tab of front window
end tell

if activeUrl is missing value or activeUrl is "" then error "Keine URL im aktiven Safari-Tab gefunden."

return (activeUrl as text) & (ASCII character 31) & (activeTitle as text)
`);

  return parseSafariTabOutput(output);
}

export async function openOrFocusSafariUrl(url: string, runAppleScript: SafariRunner = runAppleScriptWithOsascript): Promise<void> {
  await runAppleScript(`
on run argv
  set targetUrl to item 1 of argv

  tell application "Safari"
    activate
    delay 0.2

    if (count of windows) is 0 then
      make new document with properties {URL:targetUrl}
      return
    end if

    repeat with windowIndex from 1 to count of windows
      set tabCount to count of tabs of window windowIndex
      repeat with tabIndex from 1 to tabCount
        if (URL of tab tabIndex of window windowIndex) is targetUrl then
          set current tab of window windowIndex to tab tabIndex of window windowIndex
          set index of window windowIndex to 1
          activate
          return
        end if
      end repeat
    end repeat

    tell front window to make new tab with properties {URL:targetUrl}
    activate
  end tell
end run
`, [url]);
}

export function parseSafariTabOutput(output: string): SafariTab {
  const trimmed = output.trimEnd();
  const delimiterIndex = trimmed.indexOf(SAFARI_OUTPUT_DELIMITER);
  if (delimiterIndex < 0) {
    throw new Error("Unexpected Safari tab output: missing delimiter");
  }

  const url = trimmed.slice(0, delimiterIndex).trim();
  const title = trimmed.slice(delimiterIndex + SAFARI_OUTPUT_DELIMITER.length).trim();

  if (!url) {
    throw new Error("Unexpected Safari tab output: missing URL");
  }

  return { url, title };
}

async function runAppleScriptWithOsascript(script: string, args: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-e", script, ...args], {
    timeout: APPLESCRIPT_TIMEOUT_MS,
    maxBuffer: 1024 * 1024
  });

  return stdout;
}
