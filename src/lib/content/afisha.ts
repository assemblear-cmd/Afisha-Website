// Frontend ↔ backend seam for the Afisha "vitrina".
//
// This site is a light showcase only. All content (theaters, lectures, food,
// films, …) is collected/sorted by the separate Afisha backend (FastAPI +
// Postgres) and exposed over a read-only JSON API. The frontend never touches
// that database — it only fetches per-block JSON from AFISHA_API_URL.
//
// See docs/CONTRACT.md for the agreed HTTP contract.

/** Base URL of the Afisha backend read API. Override with AFISHA_API_URL. */
export const AFISHA_API_URL = process.env.AFISHA_API_URL ?? 'http://127.0.0.1:8000';

export type ApiResult<T> = { data: T; error: string | null };

/**
 * Server-side GET to the Afisha read API with graceful degradation: any
 * network/HTTP error resolves to `fallback` plus an `error` string, so a
 * block page can render an empty state instead of crashing when the backend
 * is offline. Use inside Server Components / route handlers only.
 */
export async function afishaFetch<T>(path: string, fallback: T): Promise<ApiResult<T>> {
  const url = `${AFISHA_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { data: fallback, error: `API ${res.status}` };
    return { data: (await res.json()) as T, error: null };
  } catch (e) {
    return { data: fallback, error: e instanceof Error ? e.message : 'fetch failed' };
  }
}
