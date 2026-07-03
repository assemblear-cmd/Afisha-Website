import { weekendWindow } from '@/lib/weekend';

describe('weekendWindow', () => {
  it('returns Friday through Sunday before the weekend starts', () => {
    expect(weekendWindow('2026-07-02')).toEqual({ start: '2026-07-03', end: '2026-07-05' });
  });

  it('keeps the current Friday-Sunday window during the weekend', () => {
    expect(weekendWindow('2026-07-03')).toEqual({ start: '2026-07-03', end: '2026-07-05' });
    expect(weekendWindow('2026-07-04')).toEqual({ start: '2026-07-03', end: '2026-07-05' });
    expect(weekendWindow('2026-07-05')).toEqual({ start: '2026-07-03', end: '2026-07-05' });
  });

  it('moves to the next Friday-Sunday window after Sunday', () => {
    expect(weekendWindow('2026-07-06')).toEqual({ start: '2026-07-10', end: '2026-07-12' });
  });
});
