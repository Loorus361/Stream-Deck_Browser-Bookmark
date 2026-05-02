/**
 * Stream Deck button image renderer.
 *
 * The plugin draws all visible text into a generated SVG data URL instead of
 * using Stream Deck's runtime title. This gives stable 144x144 button layout:
 * black background, title split into 7+7 characters, and centered favicon.
 */
export type SplitTitle = {
  top: string;
  bottom: string;
};

export type FilledButtonImageInput = {
  title: string;
  titleOverride?: string | undefined;
  faviconDataUrl: string;
};

export function splitTitle(title: string): SplitTitle {
  const chars = Array.from(title).slice(0, 14);
  const top = chars.slice(0, 7).join("");
  const bottom = chars.length < 8 ? "" : chars.slice(7, 14).join("");

  return { top, bottom };
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll("\"", "&quot;")
    .replaceAll(">", "&gt;");
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function renderFilledButtonImage(input: FilledButtonImageInput): string {
  const displayTitle = input.titleOverride?.trim() || input.title;
  const { top, bottom } = splitTitle(displayTitle);
  const svg = renderBaseSvg({
    top,
    bottom,
    center: `<image href="${escapeXml(input.faviconDataUrl)}" x="40" y="40" width="64" height="64" clip-path="url(#iconClip)" preserveAspectRatio="xMidYMid meet" />`
  });

  return svgToDataUrl(svg);
}

export function renderEmptyButtonImage(slot: number): string {
  const svg = renderBaseSvg({
    top: `Slot ${slot}`,
    bottom: "",
    center: `<g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"><path d="M72 47v50"/><path d="M47 72h50"/></g>`
  });

  return svgToDataUrl(svg);
}

function renderBaseSvg(input: { top: string; bottom: string; center: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144" width="144" height="144">
  <defs>
    <clipPath id="iconClip"><rect x="40" y="40" width="64" height="64" rx="10" ry="10"/></clipPath>
  </defs>
  <rect width="144" height="144" fill="#000"/>
  <text x="72" y="25" text-anchor="middle" fill="#fff" font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(input.top)}</text>
  ${input.center}
  <text x="72" y="130" text-anchor="middle" fill="#fff" font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(input.bottom)}</text>
</svg>`;
}
