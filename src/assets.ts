/**
 * Small built-in data URL assets used by runtime rendering.
 *
 * Manifest icons live in the .sdPlugin/assets folder. This file contains the
 * fallback Chrome icon that is embedded into generated button SVGs.
 */
import { svgToDataUrl } from "./render/button-image.js";

export const CHROME_FALLBACK_ICON = svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="58" fill="#e0e0e0"/>
  <path d="M64 64 30 64A58 58 0 0 1 118 45Z" fill="#ea4335"/>
  <path d="M64 64 47 94A58 58 0 0 1 30 64Z" fill="#fbbc04"/>
  <path d="M64 64 118 45A58 58 0 0 1 47 94Z" fill="#34a853"/>
  <circle cx="64" cy="64" r="25" fill="#4285f4" stroke="#fff" stroke-width="8"/>
</svg>`);
