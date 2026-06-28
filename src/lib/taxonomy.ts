// Canonical category taxonomy for the scraped theater/events aggregator.
//
// Both events (Show) and locations (Theater) can belong to SEVERAL categories at
// once, so each is persisted as a String[] of the slugs defined here. These slugs
// are the stable, language-neutral keys that drive DB sorting and the user-facing
// search/filter on /teatros. Human-readable labels (es/en) live in the i18n
// dictionaries keyed by slug — this file is the single source of truth for the
// slugs themselves, shared by the seed, the scrapers and the data layer.
//
// NOTE: this is distinct from src/lib/categories.ts, which holds the unrelated
// Eventbrite-style category set for the events-MVP homepage.
//
// Slugs are Spanish (matching the venue categories already in the seed). The
// trailing comment on each line is the Russian gloss from the product spec.

// ---- Event categories (Show.categories) -----------------------------------
export const EVENT_CATEGORIES = [
  'concierto', //           концерт
  'festival', //            фестиваль
  'exposicion', //          выставка
  'charla', //              лекция
  'obra-de-teatro', //      театральная постановка
  'evento-interactivo', //  интерактивное мероприятие
  'otros', //               другие
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

// ---- Location categories (Theater.categories) -----------------------------
export const LOCATION_CATEGORIES = [
  'teatro', //              театр
  'sala-de-conciertos', //  концертный зал
  'museo', //               музей
  'universidad', //         университет
  'bar', //                 бар
  'club', //                клуб
  'estadio', //             стадион
  'centro-cultural', //     культурный центр
  'restaurante', //         ресторан
  'oficina', //             офис
  'edificio', //            здание
  'otros', //               другие
] as const;
export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

// Keyword → event category. Sources expose a single, messy genre/discipline label
// (a GAM discipline, a The-Events-Calendar term, "teatro", "Ópera", "Danza"…);
// this maps that onto our controlled vocabulary. Performing-arts stage forms
// (theater, opera, ballet, dance, circus, puppetry) all collapse to
// `obra-de-teatro`, which is the dominant category for these venues — tune here
// if a finer split is ever needed.
const EVENT_KEYWORDS: [RegExp, EventCategory][] = [
  [/concier|recital|sonata|m[úu]sica|musical|sinf[óo]nic|orquesta|c[áa]mara|jazz|rock|pop|coral/i, 'concierto'],
  [/festival/i, 'festival'],
  [/exposici[óo]n|exhibici[óo]n|muestra|galer[íi]a|artes?\s*visuales|pintura|fotograf/i, 'exposicion'],
  [/charla|conferencia|seminario|conversatorio|coloquio|lectura|ponencia|clase\s*magistral/i, 'charla'],
  [/interactiv|inmersiv|experiencia|instalaci[óo]n/i, 'evento-interactivo'],
  [/teatro|obra|drama|comedia|esc[ée]nic|[óo]pera|ballet|danza|circo|t[íi]teres|monolog|stand[\s-]?up/i, 'obra-de-teatro'],
];

// Normalize a raw source label into one or more controlled event slugs. Returns
// at least one slug; falls back to `otros` when nothing matches (or the label is
// empty). The scraper defaults `category` to "teatro" for theater sources, so a
// missing label still resolves to `obra-de-teatro` in practice.
export function normalizeEventCategories(raw?: string | null): EventCategory[] {
  const label = (raw ?? '').trim();
  if (!label) return ['otros'];
  const hits = new Set<EventCategory>();
  for (const [re, slug] of EVENT_KEYWORDS) {
    if (re.test(label)) hits.add(slug);
  }
  return hits.size ? [...hits] : ['otros'];
}
