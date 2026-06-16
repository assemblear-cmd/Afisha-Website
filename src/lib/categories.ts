export type Category = { slug: string; label: string; emoji: string };

export const CATEGORIES: Category[] = [
  { slug: 'music', label: 'Music', emoji: '🎵' },
  { slug: 'business', label: 'Business', emoji: '💼' },
  { slug: 'food-drink', label: 'Food & Drink', emoji: '🍴' },
  { slug: 'arts', label: 'Arts', emoji: '🎨' },
  { slug: 'tech', label: 'Tech', emoji: '💻' },
  { slug: 'sports', label: 'Sports', emoji: '🏆' },
  { slug: 'health', label: 'Health', emoji: '🧘' },
  { slug: 'community', label: 'Community', emoji: '🤝' },
  { slug: 'film', label: 'Film & Media', emoji: '🎬' },
  { slug: 'fashion', label: 'Fashion', emoji: '👗' },
];

export function categoryLabel(slug: string): string {
  const found = CATEGORIES.find((c) => c.slug === slug);
  return found ? found.label : slug;
}
