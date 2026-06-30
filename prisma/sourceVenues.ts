// Single source of truth for the Santiago aggregator venues and their event
// sources. Consumed by both prisma/seed.ts (full reseed) and
// prisma/sync-theaters.ts (non-destructive upsert that never touches Show rows).
//
// `website`     — the official venue page (or the source feed when no official
//                 site is tracked yet).
// `eventSources`— one or more listing/detail/source URLs that actually list
//                 events for this venue, used by future source-specific scrapers
//                 (Fever / Eventbrite / Bandsintown). Defaults to [website].
// `adapter`     — scraper adapter key (e.g. "municipal"); null = no adapter yet.
// `categories`  — LOCATION_CATEGORIES slugs (see src/lib/taxonomy.ts). A venue
//                 can belong to several.

export const FEVER_SANTIAGO = 'https://feverup.com/en/santiago';
export const FEVER_TOP_10 = `${FEVER_SANTIAGO}/top-10`;
export const EVENTBRITE_SANTIAGO = 'https://www.eventbrite.com/d/chile--santiago/events/';
export const BANDSINTOWN_SANTIAGO = 'https://www.bandsintown.com/c/santiago-chile';

export type SourceVenue = {
  slug: string;
  name: string;
  website: string;
  eventSources?: string[];
  adapter: string | null;
  categories: string[];
};

export const SOURCE_VENUES: SourceVenue[] = [
  {
    slug: 'municipal-santiago',
    name: 'Teatro Municipal de Santiago',
    website: 'https://www.municipal.cl',
    eventSources: ['https://www.municipal.cl/wp-json/wp/v2/shows?per_page=60&_embed'],
    adapter: 'municipal',
    categories: ['teatro', 'sala-de-conciertos'],
  },
  {
    slug: 'municipal-las-condes',
    name: 'Teatro Municipal de Las Condes',
    website: 'https://www.tmlascondes.cl',
    eventSources: ['https://www.tmlascondes.cl/estrenos/'],
    adapter: 'lascondes',
    categories: ['teatro'],
  },
  {
    slug: 'gam',
    name: 'Centro Cultural Gabriela Mistral (GAM)',
    website: 'https://www.gam.cl',
    eventSources: ['https://gam.cl/es/que-hacer-en-gam/'],
    adapter: 'gam',
    categories: ['centro-cultural', 'teatro'],
  },
  {
    slug: 'teatro-uc',
    name: 'Teatro UC (Universidad Católica)',
    website: 'https://www.teatrouc.cl',
    eventSources: ['https://teatrouc.uc.cl/wp-json/tribe/events/v1/events'],
    adapter: 'teatrouc',
    categories: ['teatro', 'universidad'],
  },
  { slug: 'teatro-del-puente', name: 'Teatro del Puente', website: 'https://www.teatrodelpuente.cl', eventSources: ['https://www.teatrodelpuente.cl'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-mori', name: 'Teatro Mori', website: 'https://www.teatromori.cl', eventSources: ['https://www.teatromori.cl', FEVER_TOP_10], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-sidarte', name: 'Teatro Sidarte', website: 'https://www.sidarte.cl', eventSources: ['https://www.sidarte.cl'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-azares', name: 'Teatro Azares', website: 'https://www.teatroazares.cl', eventSources: ['https://www.teatroazares.cl'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-nunoa', name: 'Teatro Municipal de Ñuñoa', website: 'https://www.nunoa.cl/teatro-municipal', eventSources: ['https://www.nunoa.cl/teatro-municipal'], adapter: null, categories: ['teatro'] },
  // Venues that program both theater and cultural-center events.
  { slug: 'centro-cultural-ceina', name: 'Centro Cultural CEINA', website: 'https://ceina.cl', eventSources: ['https://ceina.cl', FEVER_TOP_10], adapter: null, categories: ['teatro', 'centro-cultural', 'sala-de-conciertos'] },
  { slug: 'gran-sala-sinfonica-nacional', name: 'Gran Sala Sinfónica Nacional', website: 'https://www.ceacuchile.cl/nueva-sala', eventSources: ['https://www.ceacuchile.cl/nueva-sala'], adapter: null, categories: ['sala-de-conciertos', 'centro-cultural'] },
  // Fever Santiago venues and event sources.
  { slug: 'club-subterraneo', name: 'Club Subterráneo', website: 'https://feverup.com/en/santiago/venue/club-subterraneo', eventSources: ['https://feverup.com/en/santiago/venue/club-subterraneo'], adapter: null, categories: ['club', 'bar', 'sala-de-conciertos'] },
  { slug: 'parque-quinta-normal', name: 'Parque Quinta Normal', website: FEVER_TOP_10, eventSources: [FEVER_TOP_10], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'centro-costanera', name: 'Centro Costanera', website: FEVER_TOP_10, eventSources: [FEVER_TOP_10], adapter: null, categories: ['centro-comercial', 'sala-de-eventos', 'edificio'] },
  { slug: 'parque-metropolitano-santiago', name: 'Parque Metropolitano de Santiago', website: FEVER_TOP_10, eventSources: [FEVER_TOP_10], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'cenco-florida', name: 'Cenco Florida', website: FEVER_TOP_10, eventSources: [FEVER_TOP_10], adapter: null, categories: ['centro-comercial', 'sala-de-eventos'] },
  { slug: 'club-de-la-union-santiago', name: 'Club de la Unión de Santiago', website: FEVER_TOP_10, eventSources: [FEVER_TOP_10], adapter: null, categories: ['club', 'edificio', 'centro-cultural'] },
  { slug: 'polo-apoquindo', name: 'Polo Apoquindo', website: FEVER_TOP_10, eventSources: [FEVER_TOP_10], adapter: null, categories: ['sala-de-eventos', 'estadio'] },
  // Eventbrite Santiago venues discovered from the city event feed.
  { slug: 'bar-el-bajo', name: 'BAR EL BAJO', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.com/e/santiago-tech-mixer-and-social-tech-ai-data-it-tickets-1989643846304', 'https://www.eventbrite.com/e/santiago-social-and-language-exchange-make-new-friends-tickets-1989649691788'], adapter: null, categories: ['bar', 'club'] },
  { slug: 'centro-cultural-carabineros', name: 'Centro Cultural Carabineros de Chile', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.cl/e/concierto-el-piano-y-la-pasion-un-retrato-romantico-ludovico-troncanetti-tickets-1991714524759', 'https://www.eventbrite.cl/e/concierto-cuentos-de-medianoche-orquesta-sinfonica-uniacc-tickets-1991778311547'], adapter: null, categories: ['centro-cultural', 'sala-de-conciertos'] },
  { slug: 'santiago-marriott-hotel', name: 'Santiago Marriott Hotel', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.com/e/data-center-ai-infrastructure-latam-2026-tickets-1986427560306', 'https://www.eventbrite.com/e/analyzing-finance-with-nick-meetup-santiago-chile-registration-1987974408972'], adapter: null, categories: ['hotel', 'centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'segreta-pizzeria', name: 'Segreta Pizzeria', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.co.uk/e/lshtm-alumni-santiago-meetup-tickets-1992478639246'], adapter: null, categories: ['restaurante'] },
  { slug: 'colegio-pedro-de-valdivia-penalolen', name: 'Colegio Pedro de Valdivia - Peñalolén', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.com/e/fundacion-santo-tomas-de-aquino-tickets-1992590076558'], adapter: null, categories: ['colegio', 'sala-de-eventos'] },
  { slug: 'ritz-carlton-santiago', name: 'The Ritz-Carlton, Santiago', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.com/e/the-mba-tour-santiago-tickets-1988918168783'], adapter: null, categories: ['hotel', 'centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'centro-posgrado-usach', name: 'Centro de Posgrado Universidad de Santiago', website: EVENTBRITE_SANTIAGO, eventSources: [EVENTBRITE_SANTIAGO, 'https://www.eventbrite.co/e/entradas-certificacion-para-equipos-y-grupos-con-lego-serious-play-santiago-1991522221575'], adapter: null, categories: ['universidad', 'edificio', 'sala-de-eventos'] },
  // Bandsintown city/concert venues.
  { slug: 'movistar-arena-santiago', name: 'Movistar Arena', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['arena', 'estadio', 'sala-de-conciertos'] },
  { slug: 'teatro-caupolican', name: 'Teatro Caupolicán', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['sala-de-conciertos', 'teatro'] },
  { slug: 'teatro-coliseo', name: 'Teatro Coliseo', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['sala-de-conciertos', 'teatro'] },
  { slug: 'blondie-santiago', name: 'Blondie', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'bar-de-rene', name: 'Bar de René', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['bar', 'sala-de-conciertos'] },
  { slug: 'espacio-riesco', name: 'Espacio Riesco', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'estadio-nacional-santiago', name: 'Estadio Nacional', website: BANDSINTOWN_SANTIAGO, eventSources: [BANDSINTOWN_SANTIAGO], adapter: null, categories: ['estadio', 'arena', 'sala-de-conciertos'] },
];
