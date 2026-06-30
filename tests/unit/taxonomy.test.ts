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
});
