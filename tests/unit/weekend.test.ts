import { weekendWindow } from '@/lib/weekend';

describe('weekendWindow', () => {
  it('returns the upcoming Saturday–Sunday before the weekend starts', () => {
    // Thu 2026-07-02 and Fri 2026-07-03 both point at Sat 07-04 / Sun 07-05.
    expect(weekendWindow('2026-07-02')).toEqual({ start: '2026-07-04', end: '2026-07-05' });
    expect(weekendWindow('2026-07-03')).toEqual({ start: '2026-07-04', end: '2026-07-05' });
  });

  it('keeps the current Saturday–Sunday window during the weekend', () => {
    expect(weekendWindow('2026-07-04')).toEqual({ start: '2026-07-04', end: '2026-07-05' });
    expect(weekendWindow('2026-07-05')).toEqual({ start: '2026-07-04', end: '2026-07-05' });
  });

  it('moves to the next Saturday–Sunday window after Sunday', () => {
    // Mon 2026-07-06 → Sat 07-11 / Sun 07-12.
    expect(weekendWindow('2026-07-06')).toEqual({ start: '2026-07-11', end: '2026-07-12' });
  });
});
