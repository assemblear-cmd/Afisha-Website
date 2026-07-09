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
  'comedia', //             комедия / стендап
  'fiesta-y-vida-nocturna', // вечеринка / ночная жизнь
  'networking', //          нетворкинг / meetup
  'negocios', //            бизнес
  'tecnologia', //          технологии
  'gastronomia', //         еда и напитки
  'curso-taller', //        курс / мастер-класс
  'salud-y-bienestar', //   здоровье и wellness
  'deportes', //            спорт
  'familia', //             семейные / дети
  'cine', //                кино
  'beneficencia', //        благотворительность
  'religion-espiritualidad', // религия / духовность
  'otros', //               другие
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

// The homepage mosaic keeps its original seven-slot rhythm even as the source
// taxonomy grows for Eventbrite/Fever/Bandsintown imports.
export const FEATURED_EVENT_CATEGORIES = [
  'concierto',
  'festival',
  'exposicion',
  'charla',
  'obra-de-teatro',
  'evento-interactivo',
  'otros',
] satisfies EventCategory[];

// ---- Location categories (Theater.categories) -----------------------------
export const LOCATION_CATEGORIES = [
  'teatro', //              театр
  'sala-de-conciertos', //  концертный зал
  'museo', //               музей
  'universidad', //         университет
  'bar', //                 бар
  'club', //                клуб
  'cine', //                кинотеатр / кинозал
  'estadio', //             стадион
  'centro-deportivo', //    спортивный центр
  'hipodromo', //           ипподром
  'centro-cultural', //     культурный центр
  'biblioteca', //          библиотека
  'galeria', //             галерея
  'restaurante', //         ресторан
  'oficina', //             офис
  'edificio', //            здание
  'arena', //               арена
  'sala-de-eventos', //     event hall / venue
  'centro-de-convenciones', // конференц-центр
  'ticketera', //           ticketing platform
  'plataforma-cultural', //  cultural listings platform
  'productora', //          event producer / organizer
  'hotel', //               отель
  'parque', //              парк
  'centro-comercial', //    торговый центр
  'colegio', //             школа / колледж
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
  [/concier|recital|sonata|m[úu]sica|musical|sinf[óo]nic|orquesta|c[áa]mara|\bjazz\b|\brock\b|\bpop\b|coral|tribut[eo]|candlelight|\bgira\b|\btour\b|en\s+vivo\b|\blive\b/i, 'concierto'],
  [/festival/i, 'festival'],
  [/exposici[óo]n|exhibici[óo]n|muestra|galer[íi]a|artes?\s*visuales|pintura|fotograf/i, 'exposicion'],
  [/charla|conferencia|seminario|conversatorio|coloquio|lectura|ponencia|clase\s*magistral|lanzamiento\s+de\s+libro|presentaci[óo]n\s+de\s+libro|ideas?\s+y\s+pensamiento|convocatoria/i, 'charla'],
  [/interactiv|immersiv|inmersiv|experiencia|instalaci[óo]n|laboratorio|juegos?\s+de\s+mesa|b[úu]squeda\s+del\s+tesoro/i, 'evento-interactivo'],
  [/teatro|obras?\s+(?:de\s+)?teatro|obra\s+de\s+danza|drama|esc[ée]nic|[óo]pera|ballet|danza|circo|t[íi]teres/i, 'obra-de-teatro'],
  [/stand[\s-]?up|comedy|comediante|humor|impro/i, 'comedia'],
  [/party|fiesta|nightlife|discoteca|club night|techno|afterwork|social/i, 'fiesta-y-vida-nocturna'],
  [/networking|meetup|language exchange|intercambio|alumni|make new friends|comunidad|community/i, 'networking'],
  [/business|professional|mba|finance|emprend|startup|corporate|empresa|negocios/i, 'negocios'],
  [/tech|technology|data|ai|inteligencia artificial|cyber|software|science\s*&\s*technology/i, 'tecnologia'],
  [/food|drink|wine|vino|queso|pizzeria|gastron[oó]m|degustaci[óo]n|restaurante/i, 'gastronomia'],
  [/workshop|class|training|curso|certificaci[óo]n|taller/i, 'curso-taller'],
  [/health|wellness|medical|mind and body|salud|bienestar|yoga|meditaci[óo]n/i, 'salud-y-bienestar'],
  [/sport|deport|marathon|running|f[úu]tbol|formula|f1|race/i, 'deportes'],
  [/family|kids|niñ|infantil|colegio|school/i, 'familia'],
  [/cinema|cine|film|pel[ií]cula/i, 'cine'],
  [/charity|causes|benefic|fundaci[óo]n|fraternal|ayuda/i, 'beneficencia'],
  [/relig|spiritual|dios|iglesia|cristian/i, 'religion-espiritualidad'],
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
