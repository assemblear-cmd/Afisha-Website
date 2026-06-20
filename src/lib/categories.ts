export type Category = { slug: string; label: string; emoji: string };

// Category set mirrors the reference landing page (with "Lectures" in place of "Dating").
export const CATEGORIES: Category[] = [
  { slug: 'music', label: 'Music', emoji: '🎵' },
  { slug: 'nightlife', label: 'Nightlife', emoji: '🪩' },
  { slug: 'performing-visual-arts', label: 'Performing & Visual Arts', emoji: '🎭' },
  { slug: 'holidays', label: 'Holidays', emoji: '🎉' },
  { slug: 'lectures', label: 'Lectures', emoji: '🎓' },
  { slug: 'hobbies', label: 'Hobbies', emoji: '🎮' },
  { slug: 'business', label: 'Business', emoji: '💼' },
  { slug: 'food-drink', label: 'Food & Drink', emoji: '🍴' },
];

export function categoryLabel(slug: string): string {
  const found = CATEGORIES.find((c) => c.slug === slug);
  return found ? found.label : slug;
}

export function categoryEmoji(slug: string): string {
  const found = CATEGORIES.find((c) => c.slug === slug);
  return found ? found.emoji : '🎟️';
}
