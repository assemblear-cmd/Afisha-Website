import { describe, expect, it } from 'vitest';
import {
  isSantiagoEvent,
  pickStoryEvent,
  storyBadge,
  storyLabels,
  type StoryEvent,
} from '@/lib/promotion/story-content';

const NOW = new Date('2026-07-09T12:00:00Z');

function event(overrides: Partial<StoryEvent> = {}): StoryEvent {
  return {
    id: 'ev1',
    title: 'Don Giovanni',
    startsAt: new Date('2026-07-18T23:00:00Z'), // 19:00 Santiago (CLT, UTC-4)
    venue: 'Teatro Municipal de Santiago',
    address: 'Agustinas 794, Santiago',
    city: 'Santiago',
    category: 'performing-visual-arts',
    description: 'Ópera en dos actos de Mozart',
    isFree: false,
    minPriceClp: 12000,
    ...overrides,
  };
}

describe('isSantiagoEvent', () => {
  it('matches Santiago and Greater Santiago comunas', () => {
    expect(isSantiagoEvent({ city: 'Santiago', address: '' })).toBe(true);
    expect(isSantiagoEvent({ city: '', address: 'Av. Providencia 043, Providencia' })).toBe(true);
    expect(isSantiagoEvent({ city: 'Las Condes', address: '' })).toBe(true);
  });

  it('rejects other cities', () => {
    expect(isSantiagoEvent({ city: 'New York', address: '120 Greenwich St' })).toBe(false);
    expect(isSantiagoEvent({ city: 'San Francisco', address: '' })).toBe(false);
  });
});

describe('pickStoryEvent', () => {
  const soon = event({ id: 'soon', startsAt: new Date('2026-07-15T23:00:00Z') });
  const later = event({ id: 'later', startsAt: new Date('2026-07-30T23:00:00Z') });
  const past = event({ id: 'past', startsAt: new Date('2026-07-01T23:00:00Z') });
  const ny = event({ id: 'ny', city: 'New York', address: '', startsAt: new Date('2026-07-16T23:00:00Z') });

  it('picks the nearest upcoming Santiago event, skipping past and non-Santiago', () => {
    const picked = pickStoryEvent([later, past, ny, soon], [], { now: NOW });
    expect(picked?.id).toBe('soon');
  });

  it('skips already-posted events and rotates to the next', () => {
    const picked = pickStoryEvent([soon, later], ['soon'], { now: NOW });
    expect(picked?.id).toBe('later');
  });

  it('prefers an unposted event within the lookahead window over a nearer window miss', () => {
    // With a 10-day window, `later` (21 days out) is outside it; but if `soon`
    // is posted, the only unposted is `later`, so it still returns.
    const picked = pickStoryEvent([soon, later], ['soon'], { now: NOW, lookaheadDays: 10 });
    expect(picked?.id).toBe('later');
  });

  it('returns null when everything upcoming is already posted (no re-post)', () => {
    expect(pickStoryEvent([soon, later], ['soon', 'later'], { now: NOW })).toBeNull();
  });

  it('returns null when there are no upcoming Santiago events', () => {
    expect(pickStoryEvent([past, ny], [], { now: NOW })).toBeNull();
  });
});

describe('storyBadge', () => {
  it('detects opera and symphonic titles over the stored category', () => {
    expect(storyBadge({ title: 'Don Giovanni', description: 'Ópera', category: 'performing-visual-arts' })).toBe('ÓPERA');
    expect(storyBadge({ title: 'Sinfónica: Beethoven 9', description: '', category: 'music' })).toBe('CONCIERTO');
  });

  it('maps known categories and falls back for unknown', () => {
    expect(storyBadge({ title: 'Stand up night', description: '', category: 'comedia' })).toBe('COMEDIA');
    expect(storyBadge({ title: 'Mystery', description: '', category: 'zzz' })).toBe('PANORAMA');
  });
});

describe('storyLabels', () => {
  it('formats Santiago date/time and CLP price', () => {
    const labels = storyLabels(event());
    expect(labels.badge).toBe('ÓPERA');
    expect(labels.dateLabel).toBe('Sábado, 18 de julio');
    expect(labels.timeLabel).toBe('19:00 hrs'); // 23:00Z → 19:00 CLT
    expect(labels.priceLabel).toBe('Entradas desde $12.000 CLP');
  });

  it('shows a free label for free events', () => {
    expect(storyLabels(event({ isFree: true, minPriceClp: 0 })).priceLabel).toBe('Entrada gratuita');
  });

  it('falls back when price is unknown', () => {
    expect(storyLabels(event({ isFree: false, minPriceClp: null })).priceLabel).toBe('Entradas en dondego.cl');
  });
});
