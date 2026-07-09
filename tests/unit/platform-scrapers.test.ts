import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoverFeverPlanUrls,
  eventbriteScraper,
  feverupScraper,
  isSantiagoLocation,
  mineEmbeddedEvents,
  normalizeExternalId,
  sliceBalancedJson,
  stubhubScraper,
} from '@/lib/scrapers/platforms';

const NEXT_YEAR = new Date().getFullYear() + 1;

function htmlResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as Response;
}

/** Stubs global fetch with a URL → HTML map; unknown URLs 404. */
function stubFetch(pages: Record<string, string>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      const hit = Object.entries(pages).find(([key]) => url.startsWith(key));
      return hit ? htmlResponse(hit[1]) : htmlResponse('not found', 404);
    })
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sliceBalancedJson', () => {
  it('extracts a balanced object even with braces inside strings', () => {
    const text = 'window.__SERVER_DATA__ = {"a": "b } c", "d": {"e": 1}}; other';
    const start = text.indexOf('{');
    expect(sliceBalancedJson(text, start)).toBe('{"a": "b } c", "d": {"e": 1}}');
  });

  it('handles escaped quotes and arrays', () => {
    const text = '[{"a": "say \\"hi\\""}, {"b": 2}] tail';
    expect(sliceBalancedJson(text, 0)).toBe('[{"a": "say \\"hi\\""}, {"b": 2}]');
  });

  it('returns null for non-JSON starts and unterminated blobs', () => {
    expect(sliceBalancedJson('function () {}', 0)).toBeNull();
    expect(sliceBalancedJson('{"a": 1', 0)).toBeNull();
  });
});

describe('normalizeExternalId', () => {
  it('strips tracking query and hash but keeps the path', () => {
    expect(
      normalizeExternalId('https://www.eventbrite.cl/e/entradas-fiesta-123?aff=escb&utm_source=x#top')
    ).toBe('https://www.eventbrite.cl/e/entradas-fiesta-123');
  });
});

describe('isSantiagoLocation', () => {
  it('matches Santiago and Greater Santiago comunas', () => {
    expect(isSantiagoLocation('Movistar Arena, Santiago, Chile')).toBe(true);
    expect(isSantiagoLocation('Teatro Coliseo, Providencia')).toBe(true);
    expect(isSantiagoLocation('Club Amanda, Vitacura, Región Metropolitana')).toBe(true);
  });

  it('rejects other cities and Santiago false friends', () => {
    expect(isSantiagoLocation('Estadio Santiago Bernabéu, Madrid')).toBe(false);
    expect(isSantiagoLocation('Santiago de Compostela, España')).toBe(false);
    expect(isSantiagoLocation('Teatro Colón, Buenos Aires')).toBe(false);
    expect(isSantiagoLocation(null)).toBe(false);
  });
});

describe('mineEmbeddedEvents', () => {
  it('finds event-shaped objects in window.__SERVER_DATA__ assignments', () => {
    const html = `
      <script>
        window.__SERVER_DATA__ = {"search_data": {"event_search": {"results": [
          {
            "name": "Festival Gastronómico Santiago",
            "url": "https://www.eventbrite.cl/e/festival-gastronomico-123?aff=escb",
            "start_date": "${NEXT_YEAR}-03-14",
            "start_time": "19:00",
            "is_online_event": false,
            "primary_venue": {"name": "Parque Bicentenario", "address": {"localized_address_display": "Vitacura, Santiago"}},
            "image": {"original": {"url": "https://img.evbuc.com/abc.jpg"}},
            "ticket_availability": {"minimum_ticket_price": {"major_value": "12000", "currency": "CLP"}}
          },
          {
            "name": "Curso online de cocina",
            "url": "https://www.eventbrite.cl/e/curso-online-456",
            "start_date": "${NEXT_YEAR}-03-15",
            "is_online_event": true
          }
        ]}}};
      </script>`;
    const mined = mineEmbeddedEvents(html);
    expect(mined).toHaveLength(1);
    expect(mined[0].name).toBe('Festival Gastronómico Santiago');
    expect(mined[0].dateRaw).toBe(`${NEXT_YEAR}-03-14T19:00`);
    expect(mined[0].venueName).toBe('Parque Bicentenario');
    expect(mined[0].locationText).toContain('Vitacura');
    expect(mined[0].imageUrl).toBe('https://img.evbuc.com/abc.jpg');
    expect(mined[0].priceValue).toBe(12000);
  });

  it('finds events in application/json script blobs (StubHub/viagogo style)', () => {
    const html = `
      <script id="index-data" type="application/json">
        {"grid": {"items": [
          {"name": "Gorillaz", "url": "/gorillaz-tickets/event/1001/", "eventDateLocal": "${NEXT_YEAR}-02-10T21:00:00-03:00", "venueName": "Movistar Arena", "formattedCityStateCountry": "Santiago, Chile"},
          {"name": "Real Madrid", "url": "/real-madrid/event/1002/", "eventDateLocal": "${NEXT_YEAR}-02-11T20:00:00+01:00", "venueName": "Estadio Santiago Bernabéu", "formattedCityStateCountry": "Madrid, España"}
        ]}}
      </script>`;
    const mined = mineEmbeddedEvents(html);
    expect(mined.map((m) => m.name)).toEqual(['Gorillaz', 'Real Madrid']);
    expect(mined[0].locationText).toContain('Santiago, Chile');
  });
});

describe('discoverFeverPlanUrls', () => {
  it('collects absolute and relative /m/<id> plan links, deduped', () => {
    const html = `
      <a href="/m/123456">Plan A</a>
      <a href="https://feverup.com/m/123456?utm=x">Plan A again</a>
      <a href="/m/789012/candlelight">Plan B</a>
      <a href="/santiago/other">not a plan</a>`;
    const urls = discoverFeverPlanUrls(html, 'https://feverup.com/es/santiago');
    expect(urls).toContain('https://feverup.com/m/123456');
    expect(urls.some((u) => u.startsWith('https://feverup.com/m/789012'))).toBe(true);
    expect(urls).toHaveLength(2);
  });
});

describe('eventbriteScraper', () => {
  it('extracts Santiago events from __SERVER_DATA__ and stops on an empty page', async () => {
    const page1 = `
      <script>window.__SERVER_DATA__ = {"results": [
        {"name": "Concierto Andino", "url": "https://www.eventbrite.cl/e/concierto-andino-111?aff=x",
         "start_date": "${NEXT_YEAR}-05-02", "start_time": "20:00",
         "primary_venue": {"name": "Teatro Caupolicán", "address": {"localized_address_display": "Santiago, Chile"}}}
      ]};</script>`;
    stubFetch({
      'https://www.eventbrite.cl/d/chile--santiago/all-events/?page=2': '<html>empty</html>',
      'https://www.eventbrite.cl/d/chile--santiago/all-events/': page1,
    });

    const shows = await eventbriteScraper.fetchShows({ website: 'https://www.eventbrite.cl/' });
    expect(shows).toHaveLength(1);
    expect(shows[0].externalId).toBe('https://www.eventbrite.cl/e/concierto-andino-111');
    expect(shows[0].title).toBe('Concierto Andino');
    expect(shows[0].venue).toBe('Teatro Caupolicán');
    expect(shows[0].categories).toContain('concierto');
    // 20:00 Santiago wall clock — the UTC instant must be 23:00Z (CLT, UTC-3)
    // or 00:00Z next day (CLST, UTC-4), never 20:00Z.
    expect([23, 0]).toContain(shows[0].startsAt?.getUTCHours());
  });

  it('yields no shows (not an exception) when the platform blocks the fetch', async () => {
    stubFetch({}); // every URL 404s
    const shows = await eventbriteScraper.fetchShows({ website: 'https://www.eventbrite.cl/' });
    expect(shows).toEqual([]);
  });
});

describe('stubhubScraper (marketplace)', () => {
  it('keeps only events whose venue/city is in Greater Santiago', async () => {
    const geoPage = `
      <script type="application/json">{"items": [
        {"name": "Gorillaz", "url": "https://www.stubhub.cl/gorillaz-entradas/event/1/", "eventDateLocal": "${NEXT_YEAR}-02-10T21:00:00-03:00", "venueName": "Movistar Arena", "formattedCityStateCountry": "Santiago, Chile"},
        {"name": "Real Madrid", "url": "https://www.stubhub.cl/real-madrid/event/2/", "eventDateLocal": "${NEXT_YEAR}-02-11T20:00:00+01:00", "venueName": "Estadio Santiago Bernabéu", "formattedCityStateCountry": "Madrid, España"},
        {"name": "Lorde", "url": "https://www.stubhub.cl/lorde-entradas/event/3/", "eventDateLocal": "${NEXT_YEAR}-03-01T20:00:00-03:00", "venueName": "Teatro Coliseo", "formattedCityStateCountry": "Santiago de Chile, Chile"}
      ]}</script>`;
    stubFetch({ 'https://www.stubhub.cl/': geoPage });

    const shows = await stubhubScraper.fetchShows({ website: 'https://www.stubhub.cl/' });
    expect(shows.map((s) => s.title).sort()).toEqual(['Gorillaz', 'Lorde']);
  });
});

describe('feverupScraper', () => {
  it('harvests plan pages linked from the city page', async () => {
    const cityPage = `<a href="/m/555111">Candlelight: Tributo a Queen</a>`;
    const planPage = `
      <script type="application/ld+json">
        {"@context": "https://schema.org", "@type": "Event",
         "name": "Candlelight: Tributo a Queen",
         "startDate": "${NEXT_YEAR}-04-20T20:00:00",
         "url": "https://feverup.com/m/555111",
         "location": {"@type": "Place", "name": "Teatro Oriente",
                      "address": {"addressLocality": "Providencia", "addressCountry": "CL"}},
         "offers": {"@type": "Offer", "price": "15000", "priceCurrency": "CLP"},
         "image": "https://fever.imgix.net/plan.jpg"}
      </script>`;
    stubFetch({
      'https://feverup.com/m/555111': planPage,
      'https://feverup.com/es/santiago': cityPage,
    });

    const shows = await feverupScraper.fetchShows({ website: 'https://feverup.com/es/santiago' });
    expect(shows).toHaveLength(1);
    expect(shows[0].title).toBe('Candlelight: Tributo a Queen');
    expect(shows[0].externalId).toBe('https://feverup.com/m/555111');
    expect(shows[0].venue).toBe('Teatro Oriente');
    expect(shows[0].priceCents).toBe(1500000); // 15 000 CLP * 100 (cents convention)
    expect(shows[0].categories).toContain('concierto');
  });
});
