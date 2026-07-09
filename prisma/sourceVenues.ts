// Single source of truth for the Santiago aggregator venues and their event
// sources. Consumed by both prisma/seed.ts (full reseed) and
// prisma/sync-theaters.ts (non-destructive upsert that never touches Show rows).
//
// `website`     — the official venue page.
// `eventSources`— one or more venue-owned listing/detail/source URLs that list
//                 events for this venue, used by future source-specific scrapers
//                 where possible. Defaults to [website].
// `adapter`     — scraper adapter key (e.g. "municipal"); null = no adapter yet.
// `categories`  — LOCATION_CATEGORIES slugs (see src/lib/taxonomy.ts). A venue
//                 can belong to several.

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
  { slug: 'teatro-mori', name: 'Teatro Mori', website: 'https://teatromori.com', eventSources: ['https://teatromori.com'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-sidarte', name: 'Teatro Sidarte', website: 'https://www.sidarte.cl', eventSources: ['https://www.sidarte.cl'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-azares', name: 'Teatro Azares', website: 'https://www.teatroazares.cl', eventSources: ['https://www.teatroazares.cl'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-nunoa', name: 'Teatro Municipal de Ñuñoa', website: 'https://www.instagram.com/culturanunoa/', eventSources: ['https://www.nunoa.cl/festival/', 'https://www.instagram.com/culturanunoa/'], adapter: null, categories: ['teatro'] },
  // Venues that program both theater and cultural-center events.
  { slug: 'centro-cultural-ceina', name: 'Centro Cultural CEINA', website: 'https://ceina.cl', eventSources: ['https://ceina.cl'], adapter: null, categories: ['teatro', 'centro-cultural', 'sala-de-conciertos'] },
  { slug: 'gran-sala-sinfonica-nacional', name: 'Gran Sala Sinfónica Nacional', website: 'https://www.ceacuchile.cl/nueva-sala', eventSources: ['https://www.ceacuchile.cl/nueva-sala'], adapter: null, categories: ['sala-de-conciertos', 'centro-cultural'] },
  // Venue-owned sources discovered from aggregator listings.
  { slug: 'club-subterraneo', name: 'Club Subterráneo', website: 'https://www.facebook.com/ClubSubterraneo/', eventSources: ['https://www.facebook.com/ClubSubterraneo/'], adapter: null, categories: ['club', 'bar', 'sala-de-conciertos'] },
  { slug: 'parque-quinta-normal', name: 'Parque Quinta Normal', website: 'https://parquemet.cl/parques-urbanos/', eventSources: ['https://parquemet.cl/actividades/'], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'centro-costanera', name: 'Centro Costanera', website: 'https://www.cencomalls.cl/costanera', eventSources: ['https://www.cencomalls.cl/costanera'], adapter: null, categories: ['centro-comercial', 'sala-de-eventos', 'edificio'] },
  { slug: 'parque-metropolitano-santiago', name: 'Parque Metropolitano de Santiago', website: 'https://parquemet.cl/', eventSources: ['https://parquemet.cl/actividades/'], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'cenco-florida', name: 'Cenco Florida', website: 'https://www.cencomalls.cl/florida', eventSources: ['https://www.cencomalls.cl/florida'], adapter: null, categories: ['centro-comercial', 'sala-de-eventos'] },
  { slug: 'club-de-la-union-santiago', name: 'Club de la Unión de Santiago', website: 'https://www.clubdelaunion.cl/', eventSources: ['https://www.clubdelaunion.cl/'], adapter: null, categories: ['club', 'edificio', 'centro-cultural'] },
  { slug: 'polo-apoquindo', name: 'Polo Apoquindo', website: 'https://www.poloapoquindo.cl/', eventSources: ['https://www.poloapoquindo.cl/'], adapter: null, categories: ['sala-de-eventos', 'estadio'] },
  { slug: 'bar-el-bajo', name: 'BAR EL BAJO', website: 'https://barelbajo.cl/', eventSources: ['https://barelbajo.cl/'], adapter: null, categories: ['bar', 'club'] },
  { slug: 'centro-cultural-carabineros', name: 'Centro Cultural Carabineros de Chile', website: 'https://www.museocarabineros.cl/web/sitio', eventSources: ['https://www.museocarabineros.cl/web/sitio'], adapter: null, categories: ['museo', 'centro-cultural', 'sala-de-conciertos'] },
  { slug: 'santiago-marriott-hotel', name: 'Santiago Marriott Hotel', website: 'https://www.marriott.com/en-us/hotels/scldt-santiago-marriott-hotel/overview/', eventSources: ['https://www.marriott.com/en-us/hotels/scldt-santiago-marriott-hotel/overview/'], adapter: null, categories: ['hotel', 'centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'segreta-pizzeria', name: 'Segreta Pizzeria', website: 'https://segreta.cl/', eventSources: ['https://segreta.cl/'], adapter: null, categories: ['restaurante'] },
  { slug: 'colegio-pedro-de-valdivia-penalolen', name: 'Colegio Pedro de Valdivia - Peñalolén', website: 'https://www.cpvpenalolen.cl/', eventSources: ['https://www.cpvpenalolen.cl/vida-escolar'], adapter: null, categories: ['colegio', 'sala-de-eventos'] },
  { slug: 'ritz-carlton-santiago', name: 'The Ritz-Carlton, Santiago', website: 'https://www.ritzcarlton.com/en/hotels/sclrz-the-ritz-carlton-santiago/overview/', eventSources: ['https://www.ritzcarlton.com/en/hotels/sclrz-the-ritz-carlton-santiago/overview/'], adapter: null, categories: ['hotel', 'centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'centro-posgrado-usach', name: 'Centro de Posgrado Universidad de Santiago', website: 'https://postgrado.usach.cl/', eventSources: ['https://postgrado.usach.cl/'], adapter: null, categories: ['universidad', 'edificio', 'sala-de-eventos'] },
  { slug: 'movistar-arena-santiago', name: 'Movistar Arena', website: 'https://www.movistararena.cl/', eventSources: ['https://www.movistararena.cl/movistar/site/tax/port/all/taxport_1_1__11.html'], adapter: null, categories: ['arena', 'estadio', 'sala-de-conciertos'] },
  { slug: 'teatro-caupolican', name: 'Teatro Caupolicán', website: 'https://teatrocaupolican.cl/', eventSources: ['https://teatrocaupolican.cl/'], adapter: null, categories: ['sala-de-conciertos', 'teatro'] },
  { slug: 'teatro-coliseo', name: 'Teatro Coliseo', website: 'https://teatrocoliseo.com/', eventSources: ['https://teatrocoliseo.com/'], adapter: null, categories: ['sala-de-conciertos', 'teatro'] },
  { slug: 'blondie-santiago', name: 'Blondie', website: 'https://www.blondie.cl/', eventSources: ['https://www.blondie.cl/'], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'bar-de-rene', name: 'Bar de René', website: 'https://barderene.cl/', eventSources: ['https://barderene.cl/'], adapter: null, categories: ['bar', 'sala-de-conciertos'] },
  { slug: 'espacio-riesco', name: 'Espacio Riesco', website: 'https://www.espacioriesco.cl/', eventSources: ['https://www.espacioriesco.cl/calendario/'], adapter: null, categories: ['centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'estadio-nacional-santiago', name: 'Estadio Nacional', website: 'https://parqueestadionacional.cl/', eventSources: ['https://parqueestadionacional.cl/?page_id=207'], adapter: null, categories: ['estadio', 'arena', 'sala-de-conciertos'] },

  // Cross-venue event platforms and agenda sources for Santiago.
  { slug: 'red-salas-de-teatro', name: 'Red Salas de Teatro', website: 'https://redsalasdeteatro.cl/', eventSources: ['https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['plataforma-cultural', 'teatro'] },
  { slug: 'telon-ticket', name: 'TelonTicket', website: 'https://telonticket.cl/', eventSources: ['https://telonticket.cl/'], adapter: null, categories: ['plataforma-cultural', 'ticketera', 'teatro'] },
  { slug: 'fundacion-teatro-a-mil', name: 'Fundación Teatro a Mil', website: 'https://teatroamil.cl/', eventSources: ['https://teatroamil.cl/'], adapter: null, categories: ['productora', 'plataforma-cultural', 'teatro'] },
  { slug: 'chile-cultura', name: 'Chile Cultura', website: 'https://chilecultura.gob.cl/', eventSources: ['https://chilecultura.gob.cl/'], adapter: null, categories: ['plataforma-cultural'] },
  { slug: 'santiago-cultura', name: 'Santiago Cultura', website: 'https://www.santiagocultura.cl/', eventSources: ['https://www.santiagocultura.cl/agenda-cultural/'], adapter: null, categories: ['plataforma-cultural', 'centro-cultural'] },
  { slug: 'red-alameda-cultural', name: 'Red Alameda Cultural', website: 'https://redalamedacultural.cl/', eventSources: ['https://redalamedacultural.cl/'], adapter: null, categories: ['plataforma-cultural', 'centro-cultural'] },
  { slug: 'puntoticket', name: 'PuntoTicket', website: 'https://www.puntoticket.com/', eventSources: ['https://www.puntoticket.com/todos'], adapter: null, categories: ['ticketera', 'plataforma-cultural'] },
  { slug: 'ticketmaster-chile', name: 'Ticketmaster Chile', website: 'https://www.ticketmaster.cl/', eventSources: ['https://www.ticketmaster.cl/'], adapter: null, categories: ['ticketera'] },
  { slug: 'ticketplus-chile', name: 'Ticketplus Chile', website: 'https://ticketplus.cl/', eventSources: ['https://ticketplus.cl/'], adapter: null, categories: ['ticketera'] },
  { slug: 'eventrid-chile', name: 'Eventrid Chile', website: 'https://www.eventrid.cl/', eventSources: ['https://www.eventrid.cl/'], adapter: null, categories: ['ticketera'] },
  { slug: 'passline-chile', name: 'Passline Chile', website: 'https://www.passline.com/', eventSources: ['https://www.passline.com/'], adapter: null, categories: ['ticketera'] },
  { slug: 'portaldisc-portaltickets', name: 'PortalTickets / PortalDisc', website: 'https://www.portaldisc.com/', eventSources: ['https://www.portaldisc.com/eventos'], adapter: null, categories: ['ticketera', 'plataforma-cultural'] },
  { slug: 'fever-santiago', name: 'Fever Santiago', website: 'https://feverup.com/es/santiago', eventSources: ['https://feverup.com/es/santiago'], adapter: 'feverup', categories: ['ticketera', 'plataforma-cultural'] },

  // Cross-city event platforms scanned weekly (see /api/cron/scrape-platforms).
  { slug: 'eventbrite-santiago', name: 'Eventbrite Santiago', website: 'https://www.eventbrite.cl/', eventSources: ['https://www.eventbrite.cl/d/chile--santiago/all-events/'], adapter: 'eventbrite', categories: ['ticketera', 'plataforma-cultural'] },
  { slug: 'viagogo-santiago', name: 'viagogo Santiago', website: 'https://www.viagogo.com/cl/', eventSources: ['https://www.viagogo.com/cl/Santiago', 'https://www.viagogo.com/cl/Santiago/Entradas-Conciertos'], adapter: 'viagogo', categories: ['ticketera'] },
  { slug: 'stubhub-chile', name: 'StubHub Chile', website: 'https://www.stubhub.cl/', eventSources: ['https://www.stubhub.cl/entradas-santiago-de-chile/geography/448050/'], adapter: 'stubhub', categories: ['ticketera'] },

  // Theater, comedy and performing-arts rooms not yet covered above.
  { slug: 'teatro-nescafe-de-las-artes', name: 'Teatro Nescafé de las Artes', website: 'https://www.teatro-nescafe-delasartes.cl/', eventSources: ['https://www.teatro-nescafe-delasartes.cl/'], adapter: null, categories: ['teatro', 'sala-de-conciertos'] },
  { slug: 'teatro-finis-terrae', name: 'Teatro Finis Terrae', website: 'https://teatrofinisterrae.cl/', eventSources: ['https://teatrofinisterrae.cl/', 'https://ticketplus.cl/companies/teatro-finis-terrae'], adapter: null, categories: ['teatro', 'universidad'] },
  { slug: 'teatro-nacional-chileno', name: 'Teatro Nacional Chileno', website: 'https://tnch.uchile.cl/', eventSources: ['https://tnch.uchile.cl/cartelera/', 'https://ticketplus.cl/companies/teatro-nacional-chileno'], adapter: null, categories: ['teatro', 'universidad'] },
  { slug: 'teatro-camilo-henriquez', name: 'Teatro Camilo Henríquez', website: 'https://www.facebook.com/TeatroCamiloHenriquezSantiago/', eventSources: ['https://ticketplus.cl/companies/camilo-henriquez', 'https://www.facebook.com/TeatroCamiloHenriquezSantiago/'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-ictus', name: 'Teatro Ictus', website: 'https://teatroictus.cl/', eventSources: ['https://teatroictus.cl/category/cartelera/', 'https://ticketplus.cl/companies/ictus'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-el-cachafaz', name: 'Teatro El Cachafaz', website: 'https://www.elcachafaz.cl/', eventSources: ['https://www.elcachafaz.cl/', 'https://ticketplus.cl/companies/cachafaz'], adapter: null, categories: ['teatro', 'club', 'bar'] },
  { slug: 'espacio-vitrina', name: 'Espacio Vitrina', website: 'https://espaciovitrina.cl/', eventSources: ['https://espaciovitrina.cl/', 'https://telonticket.cl/mep_org/espacio-vitrina/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'teatro-camino', name: 'Teatro Camino', website: 'https://teatrocamino.cl/web/', eventSources: ['https://teatrocamino.cl/web/category/cartelera/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'teatro-lospleimovil', name: 'Teatro Lospleimovil', website: 'https://lospleimovil.cl/', eventSources: ['https://lospleimovil.cl/cartelera/', 'https://ticketplus.cl/companies/teatro-lospleimovil'], adapter: null, categories: ['teatro', 'bar'] },
  { slug: 'sala-tessier', name: 'Sala Tessier', website: 'https://redsalasdeteatro.cl/teatros-y-espacios/sala-tessier/', eventSources: ['https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['teatro'] },
  { slug: 'sala-teatro-universidad-mayor', name: 'Sala de Teatro Universidad Mayor', website: 'https://www.umayor.cl/', eventSources: ['https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['teatro', 'universidad'] },
  { slug: 'detuch', name: 'Departamento de Teatro Universidad de Chile (DETUCH)', website: 'https://artes.uchile.cl/teatro', eventSources: ['https://artes.uchile.cl/teatro', 'https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['teatro', 'universidad'] },
  { slug: 'teatro-san-gines', name: 'Teatro San Ginés', website: 'https://www.sangines.cl/', eventSources: ['https://www.sangines.cl/cartelera/', 'https://www.ticketmaster.cl/page/home-san-gines'], adapter: null, categories: ['teatro', 'sala-de-eventos'] },
  { slug: 'teatro-bellavista', name: 'Teatro Bellavista', website: 'https://teatrobellavista.cl/', eventSources: ['https://teatrobellavista.cl/'], adapter: null, categories: ['teatro'] },
  { slug: 'teatro-zoco', name: 'Teatro Zoco', website: 'https://teatrozoco.cl/', eventSources: ['https://teatrozoco.cl/', 'https://www.puntoticket.com/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'teatro-teleton', name: 'Teatro Teletón', website: 'https://www.teleton.cl/', eventSources: ['https://www.puntoticket.com/todos'], adapter: null, categories: ['teatro', 'sala-de-eventos', 'sala-de-conciertos'] },
  { slug: 'teatro-oriente', name: 'Teatro Oriente', website: 'https://teatrooriente.cl/', eventSources: ['https://teatrooriente.cl/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'teatro-la-cupula', name: 'Teatro La Cúpula', website: 'https://www.teatrolacupula.cl/', eventSources: ['https://www.teatrolacupula.cl/cartelera/', 'https://www.ticketmaster.cl/page/home-teatro-la-cupula'], adapter: null, categories: ['teatro', 'sala-de-conciertos', 'sala-de-eventos'] },
  { slug: 'teatro-la-memoria', name: 'Teatro La Memoria', website: 'https://www.teatrolamemoria.cl/', eventSources: ['https://www.teatrolamemoria.cl/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'teatro-viajeinmovil', name: 'Teatro Viajeinmóvil', website: 'https://www.viajeinmovil.cl/', eventSources: ['https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'teatro-aleph', name: 'Teatro Aleph', website: 'https://teatroaleph.cl/', eventSources: ['https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'espacio-checoeslovaquia', name: 'Espacio Checoeslovaquia', website: 'https://espaciochecoeslovaquia.cl/', eventSources: ['https://redsalasdeteatro.cl/nuestra-cartelera/'], adapter: null, categories: ['teatro', 'centro-cultural'] },

  // Cultural centers, libraries and municipal cultural agendas.
  { slug: 'matucana-100', name: 'Centro Cultural Matucana 100', website: 'https://www.m100.cl/', eventSources: ['https://www.m100.cl/'], adapter: null, categories: ['centro-cultural', 'teatro', 'sala-de-conciertos', 'cine', 'galeria'] },
  { slug: 'centro-cultural-la-moneda', name: 'Centro Cultural La Moneda', website: 'https://www.cclm.cl/', eventSources: ['https://www.cclm.cl/'], adapter: null, categories: ['centro-cultural', 'museo', 'cine', 'galeria'] },
  { slug: 'fundacion-corpartes-ca660', name: 'Centro Cultural CA660 / Fundación CorpArtes', website: 'https://corpartes.cl/', eventSources: ['https://corpartes.cl/'], adapter: null, categories: ['centro-cultural', 'teatro', 'sala-de-conciertos', 'galeria'] },
  { slug: 'centro-cultural-estacion-mapocho', name: 'Centro Cultural Estación Mapocho', website: 'https://www.estacionmapocho.cl/', eventSources: ['https://www.estacionmapocho.cl/', 'https://scl.tickethoy.com/lugares/centro-cultural-estacion-mapocho'], adapter: null, categories: ['centro-cultural', 'sala-de-eventos', 'galeria'] },
  { slug: 'centro-cultural-espana-santiago', name: 'Centro Cultural de España en Santiago', website: 'https://ccesantiago.cl/', eventSources: ['https://ccesantiago.cl/programacion/'], adapter: null, categories: ['centro-cultural', 'galeria'] },
  { slug: 'centro-extension-uc-alameda', name: 'Centro de Extensión UC Alameda', website: 'https://extension.uc.cl/', eventSources: ['https://extension.uc.cl/cartelera/'], adapter: null, categories: ['universidad', 'centro-cultural', 'cine', 'galeria'] },
  { slug: 'biblioteca-de-santiago', name: 'Biblioteca de Santiago', website: 'https://www.bibliotecasantiago.cl/', eventSources: ['https://www.bibliotecasantiago.cl/cartelera'], adapter: null, categories: ['biblioteca', 'centro-cultural'] },
  { slug: 'biblioteca-nacional-chile', name: 'Biblioteca Nacional de Chile', website: 'https://www.bibliotecanacional.gob.cl/', eventSources: ['https://www.bibliotecanacional.gob.cl/cartelera'], adapter: null, categories: ['biblioteca', 'centro-cultural', 'edificio'] },
  { slug: 'palacio-pereira', name: 'Palacio Pereira', website: 'https://www.palaciopereira.cl/', eventSources: ['https://www.palaciopereira.cl/'], adapter: null, categories: ['centro-cultural', 'edificio'] },
  { slug: 'corporacion-cultural-las-condes', name: 'Corporación Cultural Las Condes', website: 'https://agendacultural.culturallascondes.cl/', eventSources: ['https://agendacultural.culturallascondes.cl/', 'https://www.lascondes.cl/vive-las-condes/panorama-mensual/'], adapter: null, categories: ['centro-cultural', 'teatro', 'museo', 'galeria'] },
  { slug: 'fundacion-cultural-providencia', name: 'Fundación Cultural de Providencia', website: 'https://culturaprovidencia.cl/', eventSources: ['https://culturaprovidencia.cl/'], adapter: null, categories: ['centro-cultural', 'teatro', 'sala-de-eventos'] },
  { slug: 'centro-cultural-la-reina', name: 'Centro Cultural La Reina', website: 'https://culturalareina.cl/', eventSources: ['https://culturalareina.cl/'], adapter: null, categories: ['centro-cultural', 'teatro', 'cine', 'sala-de-eventos'] },
  { slug: 'centro-cultural-chimkowe', name: 'Centro Cultural Chimkowe', website: 'https://www.chimkowe.cl/', eventSources: ['https://www.chimkowe.cl/'], adapter: null, categories: ['centro-cultural', 'sala-de-eventos', 'sala-de-conciertos'] },
  { slug: 'centro-cultural-espacio-matta', name: 'Centro Cultural Espacio Matta', website: 'https://www.espaciomatta.cl/web/', eventSources: ['https://www.espaciomatta.cl/web/'], adapter: null, categories: ['centro-cultural', 'teatro', 'sala-de-eventos'] },
  { slug: 'lo-matta-cultural', name: 'Lo Matta Cultural', website: 'https://www.instagram.com/lomattacultural/', eventSources: ['https://www.instagram.com/lomattacultural/', 'https://vitacura.cl/actividades/'], adapter: null, categories: ['centro-cultural', 'galeria', 'sala-de-eventos'] },
  { slug: 'centro-cultural-san-joaquin', name: 'Centro Cultural San Joaquín', website: 'https://www.culturasanjoaquin.cl/', eventSources: ['https://www.culturasanjoaquin.cl/'], adapter: null, categories: ['centro-cultural', 'teatro', 'sala-de-eventos'] },
  { slug: 'teatro-municipal-maipu', name: 'Teatro Municipal de Maipú', website: 'https://municipalidadmaipu.cl/cultura', eventSources: ['https://municipalidadmaipu.cl/cultura', 'https://telonticket.cl/mep_org/teatro-municipal-de-maipu/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  { slug: 'casa-cultura-nunoa', name: 'Casa de la Cultura de Ñuñoa', website: 'https://www.instagram.com/culturanunoa/', eventSources: ['https://portaldisc.com/cartelera/casaculturanunoa', 'https://www.instagram.com/culturanunoa/'], adapter: null, categories: ['centro-cultural', 'sala-de-eventos'] },
  { slug: 'cultural-vitacura', name: 'Vitacura Cultura', website: 'https://vitacura.cl/actividades/', eventSources: ['https://vitacura.cl/actividades/', 'https://www.instagram.com/vitacuracultura/'], adapter: null, categories: ['centro-cultural', 'galeria', 'sala-de-eventos'] },

  // Museums and heritage/science venues with public activities.
  { slug: 'museo-nacional-bellas-artes', name: 'Museo Nacional de Bellas Artes', website: 'https://www.mnba.gob.cl/', eventSources: ['https://www.mnba.gob.cl/cartelera'], adapter: null, categories: ['museo', 'galeria', 'centro-cultural'] },
  { slug: 'museo-arte-contemporaneo', name: 'Museo de Arte Contemporáneo (MAC)', website: 'https://mac.uchile.cl/', eventSources: ['https://mac.uchile.cl/exposiciones', 'https://mac.uchile.cl/actividades'], adapter: null, categories: ['museo', 'universidad', 'galeria'] },
  { slug: 'mavi-uc', name: 'MAVI UC', website: 'https://mavi.uc.cl/', eventSources: ['https://mavi.uc.cl/'], adapter: null, categories: ['museo', 'universidad', 'galeria'] },
  { slug: 'museo-memoria-derechos-humanos', name: 'Museo de la Memoria y los Derechos Humanos', website: 'https://mmdh.cl/', eventSources: ['https://mmdh.cl/cartelera/'], adapter: null, categories: ['museo', 'centro-cultural', 'cine'] },
  { slug: 'museo-chileno-arte-precolombino', name: 'Museo Chileno de Arte Precolombino', website: 'https://museo.precolombino.cl/', eventSources: ['https://museo.precolombino.cl/'], adapter: null, categories: ['museo', 'centro-cultural'] },
  { slug: 'museo-historico-nacional', name: 'Museo Histórico Nacional', website: 'https://www.mhn.gob.cl/', eventSources: ['https://www.mhn.gob.cl/cartelera'], adapter: null, categories: ['museo', 'edificio', 'centro-cultural'] },
  { slug: 'museo-violeta-parra', name: 'Museo Violeta Parra', website: 'https://museovioletaparra.cl/', eventSources: ['https://museovioletaparra.cl/'], adapter: null, categories: ['museo', 'centro-cultural', 'sala-de-conciertos'] },
  { slug: 'museo-interactivo-mirador', name: 'Museo Interactivo Mirador (MIM)', website: 'https://mim.cl/', eventSources: ['https://mim.cl/eventos'], adapter: null, categories: ['museo', 'centro-cultural', 'parque'] },
  { slug: 'museo-nacional-historia-natural', name: 'Museo Nacional de Historia Natural', website: 'https://www.mnhn.gob.cl/', eventSources: ['https://www.mnhn.gob.cl/cartelera'], adapter: null, categories: ['museo', 'parque', 'centro-cultural'] },
  { slug: 'museo-educacion-gabriela-mistral', name: 'Museo de la Educación Gabriela Mistral', website: 'https://www.museodelaeducacion.gob.cl/', eventSources: ['https://www.museodelaeducacion.gob.cl/cartelera'], adapter: null, categories: ['museo', 'centro-cultural'] },
  { slug: 'museo-artequin', name: 'Museo Artequin', website: 'https://www.artequin.cl/', eventSources: ['https://www.artequin.cl/actividades/'], adapter: null, categories: ['museo', 'centro-cultural'] },
  { slug: 'museo-ferroviario-santiago', name: 'Museo Ferroviario de Santiago', website: 'https://www.museoferroviario.cl/', eventSources: ['https://www.museoferroviario.cl/'], adapter: null, categories: ['museo', 'parque'] },
  { slug: 'planetario-usach', name: 'Planetario USACH', website: 'https://vime.usach.cl/es/planetario-usach', eventSources: ['https://sertex.stonline.cl/planetariousach/planfrontoffice', 'https://www.instagram.com/planetariochile/'], adapter: null, categories: ['centro-cultural', 'universidad', 'cine'] },
  { slug: 'museo-solidaridad-salvador-allende', name: 'Museo de la Solidaridad Salvador Allende', website: 'https://www.instagram.com/mssa_cl/', eventSources: ['https://www.instagram.com/mssa_cl/', 'https://www.mssa.cl/'], adapter: null, categories: ['museo', 'galeria', 'centro-cultural'] },
  { slug: 'museo-benjamin-vicuna-mackenna', name: 'Museo Benjamín Vicuña Mackenna', website: 'https://www.museovicunamackenna.gob.cl/', eventSources: ['https://www.museovicunamackenna.gob.cl/cartelera'], adapter: null, categories: ['museo', 'edificio'] },
  { slug: 'museo-taller', name: 'Museo Taller', website: 'https://museotaller.cl/', eventSources: ['https://museotaller.cl/'], adapter: null, categories: ['museo', 'centro-cultural'] },
  { slug: 'museo-del-sonido', name: 'Museo del Sonido', website: 'https://museodelsonido.cl/', eventSources: ['https://museodelsonido.cl/'], adapter: null, categories: ['museo', 'centro-cultural'] },
  { slug: 'museo-ralli-santiago', name: 'Museo Ralli Santiago', website: 'https://www.museoralli.cl/', eventSources: ['https://www.museoralli.cl/'], adapter: null, categories: ['museo', 'galeria'] },
  { slug: 'museo-de-la-moda', name: 'Museo de la Moda', website: 'https://museodelamoda.cl/', eventSources: ['https://museodelamoda.cl/'], adapter: null, categories: ['museo', 'galeria'] },
  { slug: 'museo-colonial-san-francisco', name: 'Museo Colonial San Francisco', website: 'https://museosanfrancisco.com/', eventSources: ['https://museosanfrancisco.com/'], adapter: null, categories: ['museo', 'edificio', 'centro-cultural'] },
  { slug: 'museo-artes-decorativas', name: 'Museo de Artes Decorativas', website: 'https://www.artdec.gob.cl/', eventSources: ['https://www.artdec.gob.cl/cartelera'], adapter: null, categories: ['museo', 'galeria'] },
  { slug: 'museo-historico-dominico', name: 'Museo Histórico Dominico', website: 'https://www.museodominico.gob.cl/', eventSources: ['https://www.museodominico.gob.cl/cartelera'], adapter: null, categories: ['museo', 'edificio'] },
  { slug: 'museo-bomberos-santiago', name: 'Museo de Bomberos de Santiago', website: 'https://www.mubo.cl/', eventSources: ['https://www.mubo.cl/'], adapter: null, categories: ['museo', 'centro-cultural'] },

  // Cinemas and film programming sources.
  { slug: 'cineteca-nacional-chile', name: 'Cineteca Nacional de Chile', website: 'https://cinetecanacional.gob.cl/', eventSources: ['https://cinetecanacional.gob.cl/cartelera/', 'https://www.cclm.cl/cineteca-nacional-de-chile/cartelera/'], adapter: null, categories: ['cine', 'centro-cultural'] },
  { slug: 'centro-arte-alameda', name: 'Centro Arte Alameda', website: 'https://centroartealameda.cl/', eventSources: ['https://centroartealameda.cl/', 'https://www.facebook.com/Centroartealameda/'], adapter: null, categories: ['cine', 'centro-cultural', 'teatro', 'sala-de-conciertos'] },
  { slug: 'cine-arte-normandie', name: 'Cine Arte Normandie', website: 'https://normandie.cl/', eventSources: ['https://normandie.cl/cartelera/'], adapter: null, categories: ['cine', 'centro-cultural'] },
  { slug: 'cine-uc', name: 'Cine UC', website: 'https://extension.uc.cl/cine-uc/', eventSources: ['https://extension.uc.cl/cine-uc/', 'https://extension.uc.cl/cartelera/'], adapter: null, categories: ['cine', 'universidad', 'centro-cultural'] },
  { slug: 'cinemark-chile', name: 'Cinemark Chile', website: 'https://www.cinemark.cl/', eventSources: ['https://www.cinemark.cl/'], adapter: null, categories: ['cine'] },
  { slug: 'cinepolis-chile', name: 'Cinépolis Chile', website: 'https://cinepolischile.cl/', eventSources: ['https://cinepolischile.cl/'], adapter: null, categories: ['cine'] },
  { slug: 'cineplanet-chile', name: 'Cineplanet Chile', website: 'https://www.cineplanet.cl/', eventSources: ['https://www.cineplanet.cl/'], adapter: null, categories: ['cine'] },

  // Clubs, live-music bars and restaurants with recurring programming.
  { slug: 'club-chocolate', name: 'Club Chocolate', website: 'https://clubchocolate.cl/', eventSources: ['https://clubchocolate.cl/'], adapter: null, categories: ['club', 'bar', 'sala-de-conciertos'] },
  { slug: 'sala-metronomo', name: 'Sala Metrónomo', website: 'https://www.instagram.com/salametronomo/', eventSources: ['https://portaldisc.com/cartelera/metronomo', 'https://www.instagram.com/salametronomo/'], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'sala-rbx', name: 'Sala RBX / Rock Bar Xperience', website: 'https://rbxperience.cl/', eventSources: ['https://www.portaldisc.com/cartelera/salarbx', 'https://rbxperience.cl/'], adapter: null, categories: ['club', 'bar', 'sala-de-conciertos'] },
  { slug: 'club-amanda', name: 'Club Amanda', website: 'https://amanda.cl/', eventSources: ['https://amanda.cl/calendario-de-eventos-club-amanda/'], adapter: null, categories: ['club', 'sala-de-conciertos', 'sala-de-eventos'] },
  { slug: 'mibar', name: 'MiBar', website: 'https://www.instagram.com/mibardemusica/', eventSources: ['https://www.instagram.com/mibardemusica/'], adapter: null, categories: ['bar', 'club', 'sala-de-conciertos'] },
  { slug: 'sala-scd-bellavista', name: 'Sala SCD Bellavista', website: 'https://salasscd.cl/sitio/sala-bellavista/', eventSources: ['https://www.portaldisc.com/cartelera/scd-bellavista', 'https://www.portaldisc.com/eventos/salasscd'], adapter: null, categories: ['sala-de-conciertos', 'centro-cultural'] },
  { slug: 'sala-scd-egana', name: 'Sala SCD Egaña', website: 'https://salasscd.cl/sitio/', eventSources: ['https://www.portaldisc.com/eventos/salasscd'], adapter: null, categories: ['sala-de-conciertos', 'centro-cultural'] },
  { slug: 'sala-scd-vespucio', name: 'Sala SCD Plaza Vespucio', website: 'https://salasscd.cl/sitio/', eventSources: ['https://www.portaldisc.com/eventos/salasscd'], adapter: null, categories: ['sala-de-conciertos', 'centro-cultural'] },
  { slug: 'club-de-jazz-santiago-source', name: 'Club de Jazz de Santiago', website: 'https://www.facebook.com/clubdejazz/', eventSources: ['https://www.facebook.com/clubdejazz/', 'https://www.instagram.com/clubdejazz.santiago/'], adapter: null, categories: ['club', 'restaurante', 'sala-de-conciertos'] },
  { slug: 'thelonious-lugar-de-jazz', name: 'Thelonious Lugar de Jazz', website: 'https://www.theloniouschile.com/', eventSources: ['https://www.theloniouschile.com/cartelera'], adapter: null, categories: ['club', 'bar', 'restaurante', 'sala-de-conciertos'] },
  { slug: 'bar-grez', name: 'Bar Grez', website: 'https://bargrez.cl/', eventSources: ['https://bargrez.cl/', 'https://www.facebook.com/grezbluesclub/'], adapter: null, categories: ['bar', 'restaurante', 'sala-de-conciertos'] },
  { slug: 'la-batuta', name: 'La Batuta', website: 'https://batuta.cl/', eventSources: ['https://scl.tickethoy.com/lugares/batuta', 'https://www.instagram.com/la_batuta/'], adapter: null, categories: ['bar', 'club', 'sala-de-conciertos'] },
  { slug: 'maestra-vida', name: 'Salsoteca Maestra Vida', website: 'https://www.facebook.com/SalsotecaMaestraVida/', eventSources: ['https://www.facebook.com/SalsotecaMaestraVida/'], adapter: null, categories: ['club', 'bar', 'sala-de-conciertos'] },
  { slug: 'club-ambar', name: 'Club Ámbar', website: 'https://www.instagram.com/clubambar.cl/', eventSources: ['https://www.instagram.com/clubambar.cl/'], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'hard-rock-cafe-santiago', name: 'Hard Rock Cafe Santiago', website: 'https://cafe.hardrock.com/santiago/es/', eventSources: ['https://cafe.hardrock.com/santiago/es/', 'https://cafe.hardrock.com/event-calendar.aspx'], adapter: null, categories: ['restaurante', 'bar', 'sala-de-conciertos'] },
  { slug: 'sala-master-radio-uchile', name: 'Sala Master Radio Universidad de Chile', website: 'https://radio.uchile.cl/sala-master/', eventSources: ['https://radio.uchile.cl/sala-master/'], adapter: null, categories: ['sala-de-conciertos', 'universidad', 'centro-cultural'] },
  { slug: 'onaciu', name: 'Onaciu', website: 'https://www.instagram.com/onaciu/', eventSources: ['https://www.instagram.com/onaciu/'], adapter: null, categories: ['bar', 'club', 'sala-de-conciertos'] },

  // Sports, stadiums, racetracks and large event venues.
  { slug: 'claro-arena', name: 'Claro Arena', website: 'https://claroarena.cl/', eventSources: ['https://claroarena.cl/', 'https://www.puntoticket.com/claro-arena'], adapter: null, categories: ['estadio', 'arena', 'centro-deportivo', 'sala-de-conciertos'] },
  { slug: 'estadio-monumental-david-arellano', name: 'Estadio Monumental David Arellano', website: 'https://www.colocolo.cl/', eventSources: ['https://www.colocolo.cl/', 'https://www.puntoticket.com/todos'], adapter: null, categories: ['estadio', 'centro-deportivo', 'sala-de-conciertos'] },
  { slug: 'estadio-bicentenario-la-florida', name: 'Estadio Bicentenario La Florida', website: 'https://www.laflorida.cl/', eventSources: ['https://www.ticketmaster.cl/page/bicentenariolaflorida', 'https://www.puntoticket.com/todos'], adapter: null, categories: ['estadio', 'centro-deportivo', 'sala-de-conciertos'] },
  { slug: 'estadio-santa-laura', name: 'Estadio Santa Laura', website: 'https://www.unionespanola.cl/', eventSources: ['https://www.unionespanola.cl/', 'https://www.puntoticket.com/todos'], adapter: null, categories: ['estadio', 'centro-deportivo'] },
  { slug: 'club-hipico-santiago', name: 'Club Hípico de Santiago', website: 'https://www.clubhipico.cl/', eventSources: ['https://www.clubhipico.cl/', 'https://www.clubhipico.cl/eventos/tipos-de-eventos/'], adapter: null, categories: ['hipodromo', 'sala-de-eventos', 'centro-deportivo'] },
  { slug: 'hipodromo-chile', name: 'Hipódromo Chile', website: 'https://www.hipodromo.cl/', eventSources: ['https://www.hipodromo.cl/'], adapter: null, categories: ['hipodromo', 'sala-de-eventos', 'centro-deportivo'] },
  { slug: 'parque-mahuida', name: 'Parque Mahuida', website: 'https://www.parquemahuida.cl/', eventSources: ['https://www.parquemahuida.cl/'], adapter: null, categories: ['parque', 'centro-deportivo', 'sala-de-eventos'] },
  { slug: 'centroparque', name: 'CentroParque', website: 'https://centroparque.cl/', eventSources: ['https://centroparque.cl/'], adapter: null, categories: ['centro-de-convenciones', 'sala-de-eventos', 'parque'] },
  { slug: 'casapiedra', name: 'CasaPiedra', website: 'https://casapiedra.cl/', eventSources: ['https://casapiedra.cl/'], adapter: null, categories: ['centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'parque-padre-hurtado', name: 'Parque Padre Hurtado', website: 'https://www.parquemet.cl/parques-urbanos/', eventSources: ['https://www.parquemet.cl/actividades/'], adapter: null, categories: ['parque', 'sala-de-eventos', 'centro-deportivo'] },
  { slug: 'parque-bicentenario-vitacura', name: 'Parque Bicentenario de Vitacura', website: 'https://vitacura.cl/parque-bicentenario/parquebicentenario/', eventSources: ['https://vitacura.cl/actividades/', 'https://www.instagram.com/vitacuracultura/'], adapter: null, categories: ['parque', 'sala-de-eventos'] },

  // --- 2026-07-02 batch (santiago-event-sources.json): remaining sources ------
  // Arenas, stadiums & open-air
  { slug: 'gran-arena-monticello', name: 'Gran Arena Monticello', website: 'https://www.sunmonticello.cl', eventSources: ['https://www.sunmonticello.cl'], adapter: null, categories: ['arena', 'sala-de-conciertos'] },
  { slug: 'estadio-bicentenario-la-cisterna', name: 'Estadio Bicentenario Municipal de La Cisterna', website: 'https://www.palestino.cl', eventSources: ['https://www.palestino.cl'], adapter: null, categories: ['estadio'] },
  { slug: 'parque-ohiggins', name: "Parque O'Higgins", website: 'https://www.lollapaloozacl.com', eventSources: ['https://www.lollapaloozacl.com'], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'parque-bicentenario-cerrillos', name: 'Parque Bicentenario de Cerrillos', website: 'https://www.parquebicentenariocerrillos.cl', eventSources: ['https://www.parquebicentenariocerrillos.cl'], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'parque-ciudad-empresarial', name: 'Parque Ciudad Empresarial', website: 'https://www.puntoticket.com', eventSources: ['https://www.puntoticket.com'], adapter: null, categories: ['parque', 'sala-de-eventos'] },
  { slug: 'metropolitan-santiago', name: 'Metropolitan Santiago Convention & Event Center', website: 'https://metropolitan-santiago.cl', eventSources: ['https://metropolitan-santiago.cl'], adapter: null, categories: ['centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'fantasilandia', name: 'Fantasilandia', website: 'https://www.fantasilandia.cl', eventSources: ['https://www.fantasilandia.cl'], adapter: null, categories: ['parque'] },

  // Concert halls & theaters
  { slug: 'teatro-cariola', name: 'Teatro Cariola', website: 'https://www.teatrocariola.cl', eventSources: ['https://www.teatrocariola.cl'], adapter: null, categories: ['sala-de-conciertos', 'teatro'] },
  { slug: 'teatro-universidad-de-chile-ceac', name: 'Teatro Universidad de Chile (CEAC)', website: 'https://www.ceac.uchile.cl', eventSources: ['https://www.ceac.uchile.cl'], adapter: null, categories: ['sala-de-conciertos', 'teatro', 'universidad'] },
  { slug: 'aula-magna-manuel-de-salas', name: 'Aula Magna Manuel de Salas', website: 'https://www.ticketplus.cl', eventSources: ['https://www.ticketplus.cl'], adapter: null, categories: ['sala-de-eventos', 'teatro'] },
  { slug: 'espacio-diana', name: 'Espacio Diana', website: 'https://www.espaciodiana.cl', eventSources: ['https://www.espaciodiana.cl'], adapter: null, categories: ['teatro', 'cine', 'sala-de-conciertos'] },
  { slug: 'anfiteatro-bellas-artes', name: 'Anfiteatro Bellas Artes', website: 'https://www.anfiteatrobellasartes.cl', eventSources: ['https://www.anfiteatrobellasartes.cl'], adapter: null, categories: ['teatro'] },

  // Clubs, peñas & live restobars
  { slug: 'club-la-feria', name: 'Club La Feria', website: 'https://www.instagram.com/clublaferia', eventSources: ['https://ra.co/events/cl/santiago'], adapter: null, categories: ['club'] },
  { slug: 'casa-conejo', name: 'Casa Conejo', website: 'https://www.instagram.com/casaconejocl', eventSources: ['https://www.instagram.com/casaconejocl'], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'sala-epicentro', name: 'Sala Epicentro', website: 'https://www.instagram.com/salaepicentro', eventSources: ['https://www.instagram.com/salaepicentro'], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'pena-nano-parra', name: 'Peña Nano Parra', website: 'https://www.instagram.com/lapenadelnanoparra', eventSources: ['https://www.instagram.com/lapenadelnanoparra'], adapter: null, categories: ['club', 'bar'] },
  { slug: 'bar-el-clan', name: 'Bar El Clan', website: 'https://www.elclan.cl', eventSources: ['https://www.elclan.cl'], adapter: null, categories: ['bar', 'restaurante', 'sala-de-conciertos'] },
  { slug: 'casa-de-salud', name: 'Casa de Salud', website: 'https://www.instagram.com/casadesaludbar', eventSources: ['https://www.instagram.com/casadesaludbar'], adapter: null, categories: ['bar', 'sala-de-conciertos'] },
  { slug: 'lofchen', name: 'Lofchen', website: 'https://www.instagram.com/lofchen.cl', eventSources: ['https://www.instagram.com/lofchen.cl'], adapter: null, categories: ['bar', 'restaurante'] },
  { slug: 'raices-bar', name: 'Raíces Bar', website: 'https://www.instagram.com/raicesbar', eventSources: ['https://www.instagram.com/raicesbar'], adapter: null, categories: ['bar', 'restaurante'] },
  { slug: 'la-casa-en-el-aire', name: 'La Casa en el Aire', website: 'https://www.lacasaenelaire.cl', eventSources: ['https://www.lacasaenelaire.cl'], adapter: null, categories: ['bar', 'sala-de-conciertos'] },

  // Comedy venues
  { slug: 'comedy-restobar', name: 'Comedy Restobar', website: 'https://www.comedy.cl', eventSources: ['https://www.comedy.cl'], adapter: null, categories: ['club', 'restaurante', 'bar'] },
  { slug: 'gran-refugio', name: 'Gran Refugio', website: 'https://www.granrefugio.com', eventSources: ['https://www.granrefugio.com'], adapter: null, categories: ['restaurante', 'bar', 'sala-de-conciertos'] },
  { slug: 'distrito-04', name: 'Distrito 04', website: 'https://www.instagram.com/distrito04cl', eventSources: ['https://www.instagram.com/distrito04cl'], adapter: null, categories: ['restaurante', 'bar'] },
  { slug: 'palermo-teatro-bar', name: 'Palermo Teatro Bar', website: 'https://www.palermoteatrobar.cl', eventSources: ['https://www.palermoteatrobar.cl'], adapter: null, categories: ['teatro', 'bar', 'restaurante'] },

  // Cultural centers & cinemas
  { slug: 'centro-nacional-de-arte-cerrillos', name: 'Centro Nacional de Arte Contemporáneo Cerrillos', website: 'https://centronacionaldearte.cl', eventSources: ['https://centronacionaldearte.cl'], adapter: null, categories: ['centro-cultural', 'galeria'] },
  { slug: 'balmaceda-arte-joven', name: 'Balmaceda Arte Joven', website: 'https://www.balmacedartejoven.cl', eventSources: ['https://www.balmacedartejoven.cl'], adapter: null, categories: ['centro-cultural', 'galeria'] },
  { slug: 'goethe-institut-santiago', name: 'Goethe-Institut Santiago', website: 'https://www.goethe.de/ins/cl/es/index.html', eventSources: ['https://www.goethe.de/ins/cl/es/index.html'], adapter: null, categories: ['centro-cultural'] },
  { slug: 'sala-k', name: 'Sala K', website: 'https://www.salak.cl', eventSources: ['https://www.salak.cl'], adapter: null, categories: ['cine'] },
  { slug: 'nexo-cinema', name: 'Nexo Cinema', website: 'https://www.instagram.com/nexocinema', eventSources: ['https://www.instagram.com/nexocinema'], adapter: null, categories: ['cine'] },

  // Museums
  { slug: 'la-chascona', name: 'Casa Museo La Chascona (Fundación Neruda)', website: 'https://fundacionneruda.org', eventSources: ['https://fundacionneruda.org'], adapter: null, categories: ['museo'] },
  { slug: 'registro-museos-chile', name: 'Registro de Museos de Chile (directorio)', website: 'https://www.registromuseoschile.cl', eventSources: ['https://www.registromuseoschile.cl'], adapter: null, categories: ['plataforma-cultural'] },

  // Sports organizers (fixtures as event sources)
  { slug: 'anfp', name: 'ANFP - Campeonato Nacional', website: 'https://www.anfp.cl', eventSources: ['https://www.anfp.cl'], adapter: null, categories: ['productora'] },
  { slug: 'universidad-de-chile-club', name: 'Universidad de Chile (club)', website: 'https://www.udechile.cl', eventSources: ['https://www.udechile.cl'], adapter: null, categories: ['productora'] },
  { slug: 'cruzados-uc', name: 'Cruzados / Universidad Católica', website: 'https://www.cruzados.cl', eventSources: ['https://www.cruzados.cl'], adapter: null, categories: ['productora'] },
  { slug: 'maraton-de-santiago', name: 'Maratón de Santiago', website: 'https://www.maratondesantiago.com', eventSources: ['https://www.maratondesantiago.com'], adapter: null, categories: ['productora'] },
  { slug: 'chile-open', name: 'Chile Open ATP (tenis)', website: 'https://www.chileopen.cl', eventSources: ['https://www.chileopen.cl'], adapter: null, categories: ['productora'] },
  { slug: 'chile-rugby', name: 'Federación de Rugby de Chile / Selknam', website: 'https://www.chilerugby.cl', eventSources: ['https://www.chilerugby.cl'], adapter: null, categories: ['productora'] },

  // Promoters
  { slug: 'dg-medios', name: 'DG Medios', website: 'https://www.dgmedios.com', eventSources: ['https://www.dgmedios.com'], adapter: null, categories: ['productora'] },
  { slug: 'lotus-producciones', name: 'Lotus Producciones', website: 'https://www.lotus.cl', eventSources: ['https://www.lotus.cl'], adapter: null, categories: ['productora'] },
  { slug: 'bizarro-live', name: 'Bizarro Live Entertainment', website: 'https://www.bizarrolive.com', eventSources: ['https://www.bizarrolive.com'], adapter: null, categories: ['productora'] },
  { slug: 'fauna-producciones', name: 'Fauna Producciones', website: 'https://www.faunaprod.cl', eventSources: ['https://www.faunaprod.cl'], adapter: null, categories: ['productora'] },
  { slug: 'piknic-electronik-santiago', name: 'Piknic Électronik Santiago', website: 'https://santiago.piknicelectronik.com', eventSources: ['https://santiago.piknicelectronik.com'], adapter: null, categories: ['productora'] },

  // Ticketing platforms & listings aggregators
  { slug: 'welcu', name: 'Welcu', website: 'https://welcu.com', eventSources: ['https://welcu.com'], adapter: null, categories: ['ticketera'] },
  { slug: 'comedypass', name: 'ComedyPass', website: 'https://comedypass.online', eventSources: ['https://comedypass.online'], adapter: null, categories: ['ticketera'] },
  { slug: 'chilecomedia', name: 'Chilecomedia', website: 'https://www.chilecomedia.com', eventSources: ['https://www.chilecomedia.com/eventos/'], adapter: null, categories: ['ticketera', 'plataforma-cultural'] },
  { slug: 'la-comedia', name: 'La Comedia', website: 'https://lacomedia.cl', eventSources: ['https://lacomedia.cl/eventos/'], adapter: null, categories: ['ticketera', 'plataforma-cultural'] },
  { slug: 'panorama-teatral', name: 'Panorama Teatral', website: 'https://panoramateatral.cl', eventSources: ['https://panoramateatral.cl'], adapter: null, categories: ['plataforma-cultural'] },
  { slug: 'kono-live', name: 'KONO LIVE!', website: 'https://www.konolive.cl', eventSources: ['https://www.konolive.cl/conciertos-santiago.html'], adapter: null, categories: ['plataforma-cultural'] },
  { slug: 'resident-advisor-santiago', name: 'Resident Advisor (Santiago)', website: 'https://ra.co/events/cl/santiago', eventSources: ['https://ra.co/events/cl/santiago'], adapter: null, categories: ['plataforma-cultural'] },

  // --- 2026-07-09 batch: venues surfaced via the Instagram/Facebook scan ------
  // Municipal cultural corporations with their own event agendas.
  { slug: 'centro-cultural-recoleta', name: 'Centro Cultural Recoleta', website: 'https://www.instagram.com/elrecoleta/', eventSources: ['https://www.instagram.com/elrecoleta/', 'https://www.instagram.com/culturarecoleta/'], adapter: null, categories: ['centro-cultural', 'galeria', 'sala-de-conciertos'] },
  { slug: 'corporacion-cultural-lo-barnechea', name: 'Corporación Cultural de Lo Barnechea', website: 'https://corporacionculturaldelobarnechea.cl/', eventSources: ['https://corporacionculturaldelobarnechea.cl/', 'https://www.instagram.com/corporacionculturallb/'], adapter: null, categories: ['centro-cultural', 'teatro', 'galeria'] },
  { slug: 'corporacion-cultural-quilicura', name: 'Corporación Cultural Municipal de Quilicura', website: 'https://www.instagram.com/corpo_quilicura/', eventSources: ['https://www.instagram.com/corpo_quilicura/'], adapter: null, categories: ['centro-cultural', 'teatro'] },
  { slug: 'corporacion-cultural-puente-alto', name: 'Corporación Cultural de Puente Alto', website: 'https://www.culturapuentealto.cl/', eventSources: ['https://www.culturapuentealto.cl/'], adapter: null, categories: ['centro-cultural', 'teatro'] },
  { slug: 'aldea-del-encuentro', name: 'Aldea del Encuentro (La Reina)', website: 'https://tickets.aldeaencuentro.cl/catalogo/lista', eventSources: ['https://tickets.aldeaencuentro.cl/catalogo/lista'], adapter: null, categories: ['centro-cultural', 'sala-de-eventos', 'parque'] },
  { slug: 'teatro-novedades', name: 'Teatro Novedades (Barrio Yungay)', website: 'https://cordesansantiago.cl/teatro-novedades/', eventSources: ['https://cordesansantiago.cl/teatro-novedades/'], adapter: null, categories: ['teatro', 'centro-cultural'] },
  // Clubs, live venues and event restobars active mainly on Instagram/Facebook.
  { slug: 'teatro-club-santiago', name: 'Teatro Club', website: 'https://teatroclub.cl/', eventSources: ['https://teatroclub.cl/catalogo/lista'], adapter: null, categories: ['club', 'sala-de-conciertos'] },
  { slug: 'rustiko-huechuraba', name: 'Rustiko (Huechuraba)', website: 'https://rustikohuechuraba.cl/', eventSources: ['https://rustikohuechuraba.cl/catalogo/lista'], adapter: null, categories: ['restaurante', 'bar', 'sala-de-conciertos'] },
  { slug: 'broadway-chile', name: 'Broadway Chile', website: 'https://www.broadwaychile.cl/', eventSources: ['https://www.broadwaychile.cl/catalogo/lista', 'https://www.instagram.com/broadwaychile/'], adapter: null, categories: ['teatro', 'productora'] },
  { slug: 'zona-play', name: 'Zona Play', website: 'https://www.zonaplay.cl/', eventSources: ['https://www.zonaplay.cl/catalogo/lista'], adapter: null, categories: ['sala-de-eventos'] },
  // Convention/event centers.
  { slug: 'centro-eventos-san-carlos-apoquindo', name: 'Centro de Eventos San Carlos de Apoquindo', website: 'https://www.lacatolica.cl/secciones/1524', eventSources: ['https://www.lacatolica.cl/secciones/1524'], adapter: null, categories: ['centro-de-convenciones', 'sala-de-eventos'] },
  { slug: 'songkick-santiago', name: 'Songkick (Santiago metro)', website: 'https://www.songkick.com/metro-areas/27525-chile-santiago', eventSources: ['https://www.songkick.com/metro-areas/27525-chile-santiago'], adapter: null, categories: ['plataforma-cultural'] },
  { slug: 'bandsintown-santiago', name: 'Bandsintown (Santiago)', website: 'https://www.bandsintown.com/c/santiago-chile', eventSources: ['https://www.bandsintown.com/c/santiago-chile'], adapter: null, categories: ['plataforma-cultural'] },
  { slug: 'cooperativa-conciertos', name: 'Cooperativa - Cartelera de conciertos', website: 'https://www.cooperativa.cl/noticias/magazine/musica/shows-en-vivo/', eventSources: ['https://www.cooperativa.cl/noticias/magazine/musica/shows-en-vivo/'], adapter: null, categories: ['plataforma-cultural'] },
];
