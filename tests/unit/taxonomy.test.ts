import { normalizeEventCategories } from '@/lib/taxonomy';

describe('normalizeEventCategories', () => {
  it('maps GAM visual arts labels to exposicion', () => {
    expect(normalizeEventCategories('Artes visuales y mediales')).toContain('exposicion');
  });

  it('does not treat popular art works as pop concerts or theater plays', () => {
    expect(normalizeEventCategories('Exposición de obras de arte popular')).toEqual(['exposicion']);
  });

  it('maps book launches and ideas programs to charla', () => {
    expect(normalizeEventCategories('Lanzamiento de libro: Pajarona')).toContain('charla');
    expect(normalizeEventCategories('Ideas y Pensamiento contemporáneo')).toContain('charla');
  });

  it('maps interactive labs and treasure hunts to evento-interactivo', () => {
    expect(normalizeEventCategories('Laboratorio Señales Interactivas')).toContain('evento-interactivo');
    expect(normalizeEventCategories('Búsqueda del tesoro en GAM')).toContain('evento-interactivo');
  });

  it('can assign both charla and evento-interactivo to mixed programs', () => {
    expect(normalizeEventCategories('Charla magistral con experiencia interactiva')).toEqual(
      expect.arrayContaining(['charla', 'evento-interactivo'])
    );
  });

  it('maps Eventbrite business, tech and networking labels', () => {
    expect(normalizeEventCategories('Santiago Tech Mixer and Social (Tech / AI / Data / IT)')).toEqual(
      expect.arrayContaining(['tecnologia', 'fiesta-y-vida-nocturna'])
    );
    expect(normalizeEventCategories('Meeting or Networking Event')).toContain('networking');
    expect(normalizeEventCategories('Business & Professional Conference')).toContain('negocios');
  });

  it('maps Fever immersive and comedy formats without forcing them into theater', () => {
    expect(normalizeEventCategories('Dopamine Land: a multi-sensory immersive experience')).toContain(
      'evento-interactivo'
    );
    expect(normalizeEventCategories('Stand-up comedy night')).toContain('comedia');
  });

  it('maps food, wellness, family and charity source categories', () => {
    expect(normalizeEventCategories('Food & Drink wine tasting')).toContain('gastronomia');
    expect(normalizeEventCategories('Health & Wellness seminar')).toContain('salud-y-bienestar');
    expect(normalizeEventCategories('Family kids school activity')).toContain('familia');
    expect(normalizeEventCategories('Charity & Causes fundraiser')).toContain('beneficencia');
  });
});
