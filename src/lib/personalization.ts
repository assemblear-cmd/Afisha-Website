import { prisma } from '@/lib/prisma';
import type { ListedShow } from '@/lib/data/shows';

// Personalized feed ordering. Users pick event categories and venues during
// registration (mobile onboarding) or later from their account; feeds on both
// web and mobile put matching events first while keeping the date order
// inside each priority bucket.

export type UserPreferences = {
  preferredCategories: string[];
  preferredVenues: string[];
};

export const EMPTY_PREFERENCES: UserPreferences = {
  preferredCategories: [],
  preferredVenues: [],
};

export function hasPreferences(prefs: UserPreferences | null | undefined): boolean {
  return !!prefs && (prefs.preferredCategories.length > 0 || prefs.preferredVenues.length > 0);
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredCategories: true, preferredVenues: true },
  });
  if (!user) return EMPTY_PREFERENCES;
  return {
    preferredCategories: user.preferredCategories,
    preferredVenues: user.preferredVenues,
  };
}

/**
 * Priority score for one feed item: followed venue beats followed category,
 * matching both beats either. Venue matches use the theater slug (scraped
 * shows); native organizer events have no venue slug and match by category.
 */
export function preferenceScore(
  show: Pick<ListedShow, 'categories'> & { theater: { slug?: string | null } },
  prefs: UserPreferences
): number {
  let score = 0;
  const slug = show.theater.slug;
  if (slug && prefs.preferredVenues.includes(slug)) score += 2;
  if (show.categories.some((category) => prefs.preferredCategories.includes(category))) score += 1;
  return score;
}

/**
 * Stable reorder: higher preference score first, original (date) order kept
 * within each score bucket. No-op when the user has no saved preferences.
 */
export function prioritizeListedShows<T extends ListedShow>(
  shows: T[],
  prefs: UserPreferences | null | undefined
): T[] {
  if (!hasPreferences(prefs)) return shows;
  return shows
    .map((show, index) => ({ show, index, score: preferenceScore(show, prefs!) }))
    .sort((a, b) => (a.score !== b.score ? b.score - a.score : a.index - b.index))
    .map((entry) => entry.show);
}
