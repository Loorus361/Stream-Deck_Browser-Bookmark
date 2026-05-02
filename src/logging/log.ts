/**
 * Sparse plugin logging.
 *
 * Logs are written to /Users/carlosanderssohn/.streamdeck-bookmarks/plugin.log.
 * Logging must never interrupt button behavior, so write failures are ignored.
 */
import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_DATA_DIR = path.join(os.homedir(), ".streamdeck-bookmarks");
export const DEFAULT_LOG_PATH = path.join(DEFAULT_DATA_DIR, "plugin.log");

export type LogLevel = "info" | "error";

export async function logMessage(message: string, level: LogLevel = "info", logPath = DEFAULT_LOG_PATH): Promise<void> {
  try {
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${new Date().toISOString()} [${level}] ${message}\n`, "utf8");
  } catch {
    // Logging must never break Stream Deck button behavior.
  }
}
