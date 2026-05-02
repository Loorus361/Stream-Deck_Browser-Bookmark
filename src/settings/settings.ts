/**
 * Stream Deck action settings helpers.
 *
 * Per-key Stream Deck settings intentionally store only the slot number.
 * Shared bookmark data, including titleOverride, lives in bookmarks.json so
 * multiple keys using the same slot stay visually and behaviorally identical.
 */
export type BookmarkSlotSettings = {
  slot?: number;
};

export function normalizeSettings(value: unknown): BookmarkSlotSettings {
  if (!isRecord(value)) {
    return {};
  }

  const slot = value.slot;
  if (typeof slot === "number" && Number.isInteger(slot) && slot > 0) {
    return { slot };
  }

  return {};
}

export function chooseNextFreeSlot(visibleSlots: Iterable<number>): number {
  const used = new Set<number>();
  for (const slot of visibleSlots) {
    if (Number.isInteger(slot) && slot > 0) {
      used.add(slot);
    }
  }

  let candidate = 1;
  while (used.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
