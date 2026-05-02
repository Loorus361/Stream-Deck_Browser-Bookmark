/**
 * Small built-in data URL assets used by runtime rendering.
 *
 * Manifest icons live in the .sdPlugin/assets folder. This file contains the
 * generic fallback icon that is embedded into generated button SVGs.
 */
import { svgToDataUrl } from "./render/button-image.js";

export const GENERIC_FALLBACK_ICON = svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="12" y="12" width="104" height="104" rx="24" fill="#1f2937"/>
  <circle cx="64" cy="54" r="27" fill="none" stroke="#e5e7eb" stroke-width="8"/>
  <path d="M39 54h50" stroke="#e5e7eb" stroke-width="8" stroke-linecap="round"/>
  <path d="M64 27c9 8 14 17 14 27s-5 19-14 27c-9-8-14-17-14-27s5-19 14-27Z" fill="none" stroke="#e5e7eb" stroke-width="7" stroke-linejoin="round"/>
  <path d="M42 78h44v29L64 94l-22 13Z" fill="#60a5fa"/>
</svg>`);

export const CHROME_FALLBACK_ICON = GENERIC_FALLBACK_ICON;
