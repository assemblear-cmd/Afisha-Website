// Architectural guarantee for the homepage events mosaic.
//
// The product rule "no more than 2 events from the same category" is enforced
// here, in one pure function, and the Mosaic component routes every tile set
// through it. That is what bakes the rule into the block's architecture: a
// caller cannot assemble a mosaic that violates it without going around this
// function on purpose.
//
// Items are multi-category (an event can belong to several categories at once),
// so an item is only admitted when EVERY one of its categories still has room.

export interface MosaicSelectable {
  categories: string[];
}

export interface SelectMosaicOptions {
  /** Hard cap on how many admitted items may share any single category. */
  maxPerCategory?: number;
  /** Upper bound on total tiles (the category rule may stop it sooner). */
  limit?: number;
}

const UNCATEGORIZED = '__uncategorized__';

export function selectMosaic<T extends MosaicSelectable>(
  items: T[],
  { maxPerCategory = 2, limit = 12 }: SelectMosaicOptions = {}
): T[] {
  const counts = new Map<string, number>();
  const picked: T[] = [];

  for (const item of items) {
    if (picked.length >= limit) break;
    const cats = item.categories.length ? item.categories : [UNCATEGORIZED];
    // Admit only if none of this item's categories is already at the cap.
    if (cats.some((c) => (counts.get(c) ?? 0) >= maxPerCategory)) continue;
    picked.push(item);
    for (const c of cats) counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  return picked;
}
