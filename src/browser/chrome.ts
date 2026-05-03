/**
 * Chrome AppleScript adapter.
 *
 * This is the only module that talks to Google Chrome. It reads the URL/title
 * from the active tab of the front Chrome window and opens/focuses stored URLs.
 * AppleScript is executed with execFile, a timeout, and arguments instead of
 * interpolating user-controlled URLs into a shell command.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CHROME_OUTPUT_DELIMITER = "\u001f";
const APPLESCRIPT_TIMEOUT_MS = 5000;

export type ChromeTab = {
  url: string;
  title: string;
};

export type ChromeRunner = (script: string, args?: string[]) => Promise<string>;

export async function getActiveChromeTab(runAppleScript: ChromeRunner = runAppleScriptWithOsascript): Promise<ChromeTab> {
  const output = await runAppleScript(`
if application "Google Chrome" is not running then error "Google Chrome laeuft nicht."

tell application "Google Chrome"
  if (count of windows) is 0 then error "Google Chrome hat kein geoeffnetes Fenster."
  set activeUrl to URL of active tab of front window
  set activeTitle to title of active tab of front window
end tell

if activeUrl is missing value or activeUrl is "" then error "Keine URL im aktiven Chrome-Tab gefunden."

return (activeUrl as text) & (ASCII character 31) & (activeTitle as text)
`);

  return parseChromeTabOutput(output);
}

export async function openOrFocusChromeUrl(url: string, runAppleScript: ChromeRunner = runAppleScriptWithOsascript): Promise<void> {
  await runAppleScript(`
on run argv
  set targetUrl to item 1 of argv

  tell application "Google Chrome"
    activate
    delay 0.2

    if (count of windows) is 0 then
      make new window
      set URL of active tab of front window to targetUrl
      return
    end if

    repeat with windowIndex from 1 to count of windows
      set tabCount to count of tabs of window windowIndex
      repeat with tabIndex from 1 to tabCount
        if (URL of tab tabIndex of window windowIndex) is targetUrl then
          set active tab index of window windowIndex to tabIndex
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

export async function closeActiveChromeTab(url: string, runAppleScript: ChromeRunner = runAppleScriptWithOsascript): Promise<void> {
  await runAppleScript(`
on run argv
  set targetUrl to item 1 of argv

  tell application "Google Chrome"
    if (count of windows) is 0 then error "Google Chrome hat kein geoeffnetes Fenster."

    set activeUrl to URL of active tab of front window
    if activeUrl is not targetUrl then error "Aktiver Chrome-Tab hat sich geaendert."

    close active tab of front window
  end tell
end run
`, [url]);
}

export function parseChromeTabOutput(output: string): ChromeTab {
  const trimmed = output.trimEnd();
  const delimiterIndex = trimmed.indexOf(CHROME_OUTPUT_DELIMITER);
  if (delimiterIndex < 0) {
    throw new Error("Unexpected Chrome tab output: missing delimiter");
  }

  const url = trimmed.slice(0, delimiterIndex).trim();
  const title = trimmed.slice(delimiterIndex + CHROME_OUTPUT_DELIMITER.length).trim();

  if (!url) {
    throw new Error("Unexpected Chrome tab output: missing URL");
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
