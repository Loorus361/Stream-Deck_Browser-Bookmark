import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const FRONTMOST_OUTPUT_DELIMITER = "\u001f";
const APPLESCRIPT_TIMEOUT_MS = 5000;

export type BrowserId = "chrome" | "safari" | "firefox";
export type FrontmostRunner = (script: string, args?: string[]) => Promise<string>;

export async function getFrontmostBrowser(runAppleScript: FrontmostRunner = runAppleScriptWithOsascript): Promise<BrowserId | undefined> {
  const output = await runAppleScript(`
tell application "System Events"
  set frontProcess to first application process whose frontmost is true
  set processBundleIdentifier to bundle identifier of frontProcess
  set processName to name of frontProcess
end tell

return (processBundleIdentifier as text) & (ASCII character 31) & (processName as text)
`);

  return parseFrontmostProcessOutput(output);
}

export function parseFrontmostProcessOutput(output: string): BrowserId | undefined {
  const trimmed = output.trimEnd();
  const delimiterIndex = trimmed.indexOf(FRONTMOST_OUTPUT_DELIMITER);
  const bundleIdentifier = (delimiterIndex < 0 ? trimmed : trimmed.slice(0, delimiterIndex)).trim();

  if (bundleIdentifier === "com.google.Chrome") {
    return "chrome";
  }

  if (bundleIdentifier === "com.apple.Safari") {
    return "safari";
  }

  if (bundleIdentifier === "org.mozilla.firefox") {
    return "firefox";
  }

  return undefined;
}

async function runAppleScriptWithOsascript(script: string, args: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-e", script, ...args], {
    timeout: APPLESCRIPT_TIMEOUT_MS,
    maxBuffer: 1024 * 1024
  });

  return stdout;
}
