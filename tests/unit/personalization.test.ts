import { hasPreferences, preferenceScore, prioritizeListedShows } from '@/lib/personalization';
import type { ListedShow } from '@/lib/data/shows';

function show(overrides: Partial<ListedShow> & { id: string }): ListedShow {
  return {
    title: overrides.id,
    startsAt: null,
    venue: null,
    category: 'otros',
    categories: ['otros'],
    priceText: null,
    priceCents: null,
    currency: 'CLP',
    sourceUrl: null,
    imageUrl: null,
    theater: { name: 'Somewhere', slug: null, website: null },
    ...overrides,
  };
}

const prefs = {
  preferredCategories: ['concierto'],
  preferredVenues: ['teatro-municipal'],
};

describe('hasPreferences', () => {
  it('is false for null and empty preferences', () => {
    expect(hasPreferences(null)).toBe(false);
    expect(hasPreferences({ preferredCategories: [], preferredVenues: [] })).toBe(false);
  });

  it('is true when either list has entries', () => {
    expect(hasPreferences({ preferredCategories: ['cine'], preferredVenues: [] })).toBe(true);
    expect(hasPreferences({ preferredCategories: [], preferredVenues: ['gam'] })).toBe(true);
  });
});

describe('preferenceScore', () => {
  it('scores venue matches above category matches, both above none', () => {
    const venueOnly = show({
      id: 'v',
      theater: { name: 'Municipal', slug: 'teatro-municipal', website: null },
    });
    const categoryOnly = show({ id: 'c', categories: ['concierto'] });
    const both = show({
      id: 'b',
      categories: ['concierto'],
      theater: { name: 'Municipal', slug: 'teatro-municipal', website: null },
    });
    const neither = show({ id: 'n' });

    expect(preferenceScore(both, prefs)).toBeGreaterThan(preferenceScore(venueOnly, prefs));
    expect(preferenceScore(venueOnly, prefs)).toBeGreaterThan(preferenceScore(categoryOnly, prefs));
    expect(preferenceScore(categoryOnly, prefs)).toBeGreaterThan(preferenceScore(neither, prefs));
  });
});

describe('prioritizeListedShows', () => {
  it('keeps the original order when there are no preferences', () => {
    const shows = [show({ id: 'a' }), show({ id: 'b' })];
    expect(prioritizeListedShows(shows, null).map((s) => s.id)).toEqual(['a', 'b']);
    expect(
      prioritizeListedShows(shows, { preferredCategories: [], preferredVenues: [] }).map(
        (s) => s.id
      )
    ).toEqual(['a', 'b']);
  });

  it('moves preferred venues and categories first, keeping date order inside buckets', () => {
    const shows = [
      show({ id: 'plain-1' }),
      show({ id: 'category-match', categories: ['concierto'] }),
      show({ id: 'plain-2' }),
      show({
        id: 'venue-match',
        theater: { name: 'Municipal', slug: 'teatro-municipal', website: null },
      }),
      show({ id: 'plain-3' }),
    ];

    expect(prioritizeListedShows(shows, prefs).map((s) => s.id)).toEqual([
      'venue-match',
      'category-match',
      'plain-1',
      'plain-2',
      'plain-3',
    ]);
  });
});
