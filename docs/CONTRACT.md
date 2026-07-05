# Afisha — Frontend ↔ Backend contract

Two repos / two chats, one seam.

| Side | Owns | Chat |
|---|---|---|
| **Frontend** (this repo) | The *vitrina*: pages, sections, cards, layout. Pure presentation. **No DB.** | this one |
| **Backend** (`Afisha`) | Data collection, sorting, storage (FastAPI + Postgres). Exposes a **read-only JSON API**. | the neighbouring `Afisha` chat |

The frontend only ever does HTTP `GET` to the backend. It never imports the backend DB, and the backend never renders UI.

## Connection

- Frontend reads the backend base URL from **`AFISHA_API_URL`** (default `http://127.0.0.1:8000` for local dev; on Vercel set it to the deployed backend URL).
- Frontend helper: `afishaFetch<T>(path, fallback)` in `src/lib/content/afisha.ts` (graceful empty state on any error).
- The backend must send **CORS** headers allowing the site origin (localhost + the production domain).

## Per-block convention

We integrate **one block at a time**. Each block is a single `GET` endpoint returning JSON:

```
GET {AFISHA_API_URL}/api/{block}
```

Blocks (and status):

| Block | Endpoint | Status |
|---|---|---|
| Teatros | `GET /api/repertoire` | ✅ live (shape below) |
| Lectures | `GET /api/lectures` | ✅ shape defined (below); frontend ready |
| Food (Gastronomía) | `GET /api/food` | ⏳ shape TBD per block |
| Films (Cine) | `GET /api/films` | ⏳ shape TBD per block |
| … | `GET /api/{block}` | … |

### Conventions for all blocks

- **Dates**: ISO 8601 strings, e.g. `"2026-07-18T19:00:00-04:00"` (or UTC `…Z`). Nullable allowed.
- **Money**: integer `price` + ISO `currency` (e.g. `"CLP"`). `null` = unknown; `0` / absent = free.
- **Images**: absolute `image_url` (or `null` → the frontend shows a gradient placeholder).
- **Links**: absolute `url` to the source/ticket page (`null` allowed).
- Stable string/number `id` per item.

## Live shape — Teatros (`GET /api/repertoire`)

Array, grouped by theater:

```jsonc
[
  {
    "theater": {
      "id": 1,
      "name": "Teatro Municipal de Santiago",
      "slug": "municipal",
      "website": "https://example.org",
      "city": "Santiago"
    },
    "events": [
      {
        "id": 101,
        "title": "Don Giovanni",
        "starts_at": "2026-07-18T19:30:00-04:00",
        "venue": "Sala Principal",
        "category": "Ópera",
        "price": 25000,
        "currency": "CLP",
        "url": "https://example.org/entradas/101",
        "image_url": "https://example.org/img/101.jpg"
      }
    ]
  }
]
```

Consumed by `src/app/teatros/page.tsx`.

## Shape — Lectures (`GET /api/lectures`)

Flat array of talks / conferences / workshops:

```jsonc
[
  {
    "id": 11,
    "title": "Foundations of Machine Learning",
    "speaker": "Dr. Ada Moore",
    "summary": "An accessible intro to ML for builders.",
    "starts_at": "2026-08-12T18:30:00-04:00",
    "venue": "Aula Magna, Universidad de Chile",
    "city": "Santiago",
    "topic": "Tech",
    "language": "es",
    "is_online": false,
    "price": 0,
    "currency": "CLP",
    "url": "https://example.org/lectures/11",
    "image_url": "https://example.org/img/lec11.jpg"
  }
]
```

Consumed by `src/app/lectures/page.tsx`. Notes: `is_online: true` → an "Online" badge; `price: 0`/`null` → "Free"/blank; `topic` → a coral badge; `speaker`, `venue`, `city`, `image_url`, `url` are all nullable.

## How a new block gets wired (the loop)

1. Agree the JSON shape for the block (extend the conventions above).
2. **Frontend**: add `src/app/{block}/page.tsx` that calls `afishaFetch('/api/{block}', [])` and renders cards. Works against the backend (or shows an empty state until it's ready).
3. **Backend** (`Afisha` chat): implement `GET /api/{block}` returning that shape.
4. Point `AFISHA_API_URL` at the running backend → the block is connected. Next block.
