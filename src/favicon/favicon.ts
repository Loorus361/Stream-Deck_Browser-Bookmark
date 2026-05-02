/**
 * Favicon loader for saved bookmarks.
 *
 * V1 uses Google's favicon endpoint for normal http/https hostnames because it
 * is simple and reliable enough for a local tool. Internal URLs, localhost,
 * file URLs, and failed downloads fall back to the bundled generic icon.
 */
import { Buffer } from "node:buffer";

import type { FaviconSource } from "../bookmarks/store.js";

export type FaviconResult = {
  dataUrl: string;
  source: FaviconSource;
};

type FaviconServiceSharedOptions = {
  fetch?: typeof fetch;
  log?: (message: string) => void | Promise<void>;
};

export type FaviconServiceOptions =
  | (FaviconServiceSharedOptions & {
      fallbackDataUrl: string;
      chromeFallbackDataUrl?: string;
    })
  | (FaviconServiceSharedOptions & {
      fallbackDataUrl?: string;
      chromeFallbackDataUrl: string;
    });

export function getFaviconServiceUrl(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname || parsed.hostname === "localhost") {
    return undefined;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`;
}

export function createFaviconService(options: FaviconServiceOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const log = options.log ?? (() => undefined);
  const fallbackDataUrl = getFallbackDataUrl(options);

  async function fetchFavicon(url: string): Promise<FaviconResult> {
    const faviconUrl = getFaviconServiceUrl(url);
    if (!faviconUrl) {
      return fallback(fallbackDataUrl);
    }

    try {
      const response = await fetchImpl(faviconUrl);
      if (!response.ok) {
        await log(`Favicon download failed with HTTP ${response.status} for ${url}`);
        return fallback(fallbackDataUrl);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0) {
        await log(`Favicon download returned empty response for ${url}`);
        return fallback(fallbackDataUrl);
      }

      const contentType = response.headers.get("content-type") || "image/png";
      return {
        dataUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
        source: "google"
      };
    } catch (error) {
      await log(`Favicon download failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
      return fallback(fallbackDataUrl);
    }
  }

  return { fetchFavicon };
}

function fallback(dataUrl: string): FaviconResult {
  return {
    dataUrl,
    source: "chrome"
  };
}

function getFallbackDataUrl(options: FaviconServiceOptions): string {
  if (options.fallbackDataUrl !== undefined) {
    return options.fallbackDataUrl;
  }

  if (options.chromeFallbackDataUrl !== undefined) {
    return options.chromeFallbackDataUrl;
  }

  throw new Error("Missing favicon fallback data URL");
}
