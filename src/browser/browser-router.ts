import { closeActiveChromeTab, getActiveChromeTab, openOrFocusChromeUrl, type ChromeTab } from "./chrome.js";
import { getActiveFirefoxTab, openFirefoxUrl, type FirefoxTab } from "./firefox.js";
import { getFrontmostBrowser, type BrowserId } from "./frontmost.js";
import { closeActiveSafariTab, getActiveSafariTab, openOrFocusSafariUrl, type SafariTab } from "./safari.js";

export type ActiveBrowserTab = ({ browser: "chrome" } & ChromeTab) | ({ browser: "safari" } & SafariTab) | ({ browser: "firefox" } & FirefoxTab);

export type BookmarkUrlTarget = {
  browser: BrowserId;
  url: string;
};

export type BrowserRouterDependencies = {
  getFrontmostBrowser?: () => Promise<BrowserId | undefined>;
  getActiveChromeTab?: () => Promise<ChromeTab>;
  getActiveSafariTab?: () => Promise<SafariTab>;
  getActiveFirefoxTab?: () => Promise<FirefoxTab>;
};

export type BrowserOpenDependencies = {
  openOrFocusChromeUrl?: (url: string) => Promise<void>;
  openOrFocusSafariUrl?: (url: string) => Promise<void>;
  openFirefoxUrl?: (url: string) => Promise<void>;
  openYouTubeInFirefox?: boolean;
};

export type BrowserCloseDependencies = {
  closeActiveChromeTab?: (url: string) => Promise<void>;
  closeActiveSafariTab?: (url: string) => Promise<void>;
};

export async function getActiveBrowserTab(dependencies: BrowserRouterDependencies = {}): Promise<ActiveBrowserTab> {
  const frontmostBrowser = await (dependencies.getFrontmostBrowser ?? getFrontmostBrowser)();

  if (frontmostBrowser === "chrome") {
    const tab = await (dependencies.getActiveChromeTab ?? getActiveChromeTab)();
    return { browser: "chrome", ...tab };
  }

  if (frontmostBrowser === "safari") {
    const tab = await (dependencies.getActiveSafariTab ?? getActiveSafariTab)();
    return { browser: "safari", ...tab };
  }

  if (frontmostBrowser === "firefox") {
    const tab = await (dependencies.getActiveFirefoxTab ?? getActiveFirefoxTab)();
    return { browser: "firefox", ...tab };
  }

  throw new Error("Kein unterstuetzter Browser ist im Vordergrund.");
}

export async function openOrFocusBookmarkUrl(target: BookmarkUrlTarget, dependencies: BrowserOpenDependencies = {}): Promise<void> {
  if (dependencies.openYouTubeInFirefox && isYouTubeUrl(target.url)) {
    await (dependencies.openFirefoxUrl ?? openFirefoxUrl)(target.url);
    return;
  }

  if (target.browser === "chrome") {
    await (dependencies.openOrFocusChromeUrl ?? openOrFocusChromeUrl)(target.url);
    return;
  }

  if (target.browser === "firefox") {
    await (dependencies.openFirefoxUrl ?? openFirefoxUrl)(target.url);
    return;
  }

  await (dependencies.openOrFocusSafariUrl ?? openOrFocusSafariUrl)(target.url);
}

export async function closeActiveBookmarkTab(target: BookmarkUrlTarget, dependencies: BrowserCloseDependencies = {}): Promise<void> {
  if (target.browser === "chrome") {
    await (dependencies.closeActiveChromeTab ?? closeActiveChromeTab)(target.url);
    return;
  }

  if (target.browser === "firefox") {
    throw new Error("Firefox-Tab-Schliessen wird nicht unterstuetzt.");
  }

  await (dependencies.closeActiveSafariTab ?? closeActiveSafariTab)(target.url);
}

function isYouTubeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  return hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}
