# Агенты скрапинга и сортировки данных DondeGO

Обновлено: 2026-07-09.

Этот документ описывает все автоматические агенты, которые собирают события
для агрегатора, нормализуют их и раскладывают по страницам сайта: кто что
скрапит, по какому расписанию, как данные сортируются и как за всем этим
следить.

---

## 1. Общая схема потока данных

```text
                    ┌─ ДНЕВНАЯ ГРУППА (venues) ────────────────┐
Vercel Cron 06:00 ─▶│ municipal, gam, lascondes, teatrouc,     │
  /api/cron/        │ jsonld (generic) — сайты площадок        │
  scrape-theaters   └──────────────────────────────────────────┘
                                                   │
                    ┌─ НЕДЕЛЬНАЯ ГРУППА (platforms) ───────────┐
Vercel Cron пн 07:00│ eventbrite, feverup, viagogo, stubhub —  │
  /api/cron/        │ кросс-городские платформы                │
  scrape-platforms  └──────────────────────────────────────────┘
                                                   │
                                          runScrape(group)
                                                   │ upsert
                                                   ▼
                                         Таблица Show (Postgres)
                                                   │
Vercel Cron 06:30 ─▶ cleanup-events: COMPLETED для организаторских
  /api/cron/         событий, удаление прошедших scraped-шоу
  cleanup-events                                   │
                                                   ▼
                              Сортировка/выдача (src/lib/data/shows.ts):
                              главная, /calendario, /fin-de-semana,
                              /calendario/[date], /teatros, mobile /api/v1
```

Ключевой принцип: **каждый источник — строка `Theater`** (slug, website,
`eventSources[]`, `adapter`, `categories[]`), а каждый собранный ивент —
строка `Show` с уникальным `(theaterId, externalId)`. Один и тот же
оркестратор обслуживает и сайты театров, и билетные платформы.

---

## 2. Реестр источников

- Единый источник правды: `prisma/sourceVenues.ts` (~211 записей).
- В базу реестр попадает двумя путями:
  - `npm run db:sync-theaters` — **неразрушающий** upsert по slug (Show-строки
    и состояние сканирования не трогаются). Используйте его на проде.
  - `npm run db:seed` — полный реseed (стирает Theater + Show, только для
    локальной разработки).
- Категории площадок — слаги `LOCATION_CATEGORIES` из `src/lib/taxonomy.ts`
  (`teatro`, `club`, `ticketera`, `plataforma-cultural`, …).
- Площадки, найденные при скане Instagram/Facebook, тоже живут здесь: их
  IG/FB-страница записана в `website`/`eventSources`. Автоматически события
  из Instagram не собираются (анонимный доступ закрыт) — записи фиксируют
  площадку в справочнике и источник для будущих адаптеров.

---

## 3. Агенты-скраперы

Код: `src/lib/scrapers/` — `shared.ts` (общие кирпичики), `index.ts`
(venue-адаптеры + оркестратор), `platforms.ts` (платформы).
Адаптер выбирается по `Theater.adapter`; без адаптера работает generic
JSON-LD.

### 3.1. Дневная группа — сайты площадок (`index.ts`)

| Адаптер | Источник | Стратегия |
|---|---|---|
| `municipal` | municipal.cl | WordPress REST `/wp-json/wp/v2/shows`, дата из блока FECHAS страницы шоу, og:image |
| `gam` | gam.cl | Обход листингов дисциплин → JSON-LD Event с каждой детальной страницы, цена из текста |
| `lascondes` | tmlascondes.cl | Карточки `/estrenos/` → детальные страницы: даты «Fechas y Horarios», schema.org, ссылки на билеты |
| `teatrouc` | teatrouc.uc.cl | The Events Calendar REST `/wp-json/tribe/events/v1/events` (UTC-даты авторитетны) |
| `jsonld` | все остальные (~200) | Generic: schema.org Event JSON-LD с `eventSources[]`; сайты без разметки дают 0 шоу до появления адаптера |

### 3.2. Недельная группа — билетные платформы (`platforms.ts`)

У маркетплейсов нет стабильных публичных API, поэтому каждый адаптер
многостратегийный и «мягко деградирует» (пустая страница — не ошибка всего
скана):

| Адаптер | Источник | Стратегии |
|---|---|---|
| `eventbrite` | eventbrite.cl `/d/chile--santiago/all-events/` (+ `?page=2..3`) | 1) майнинг `window.__SERVER_DATA__`; 2) JSON-LD ItemList; берутся только ссылки `/e/`; онлайн-ивенты отброшены |
| `feverup` | feverup.com/es/santiago | 1) JSON-LD городской страницы; 2) обнаружение планов `/m/<id>` по ссылкам → JSON-LD с каждой (до 18 страниц) |
| `viagogo` | viagogo.com/cl/Santiago (+ Entradas-Conciertos) | JSON-LD + майнинг `application/json`-блобов; **строгий гео-фильтр** |
| `stubhub` | stubhub.cl geography-страница Сантьяго | тот же движок, что viagogo (общая реализация `marketplaceScraper`) |

Общие механики платформенных агентов:

- **Майнер встроенного JSON** (`mineEventObjects`): обходит любые JSON-блобы
  страницы и собирает объекты, похожие на событие (name + дата + ссылка),
  вместе с площадкой, городом, картинкой и минимальной ценой. Устойчив к
  дрейфу схемы платформ.
- **Гео-фильтр Сантьяго** (`isSantiagoLocation`): маркетплейсы торгуют
  глобальным инвентарём — событие проходит только при совпадении
  площадки/адреса с Большим Сантьяго; ложные друзья («Estadio Santiago
  Bernabéu», «Santiago de Compostela») отсекаются раньше. Городские страницы
  Eventbrite/Fever уже отфильтрованы платформой — там отбрасываются только
  явные несовпадения.
- **Идемпотентность**: `externalId` = URL события без query/hash, поэтому
  повторный прогон обновляет те же строки, а не плодит дубли.
- Прошедшие события (старше 12 ч) и события без названия отбрасываются;
  на платформу берётся максимум 150 событий за прогон.

### 3.3. Агент очистки (`src/lib/event-cleanup.ts`)

Не скрапер, но часть жизненного цикла данных:

- scraped-шоу удаляются **на следующий день после окончания** (retention по
  умолчанию 0 дней; шоу без дат — 30-дневный грейс по `lastSeenAt`);
- события организаторов **никогда не удаляются** — живые (`APPROVED`/
  `PUBLISHED`) после `endsAt` переводятся в `COMPLETED` и снимаются с
  публикации (архив организатора).

---

## 4. Оркестратор

`runScrape(group)` в `src/lib/scrapers/index.ts`:

- `group`: `venues` (по умолчанию — дневной скан), `platforms` (недельный),
  `all`. Принадлежность к группе определяется по `PLATFORM_ADAPTER_KEYS`.
- Активные Theater обрабатываются батчами по 8 параллельно.
- **Изоляция ошибок**: падение одного источника записывается в его строку
  (`lastScrapedAt`, `lastScrapeOk`, `lastError`) и не мешает остальным.
- Каждое найденное шоу upsert-ится по `(theaterId, externalId)`; категория
  события нормализуется в `Show.categories[]`.

---

## 5. Расписания и запуск

### Vercel Cron (`vercel.json`)

| Эндпоинт | Расписание | Что делает |
|---|---|---|
| `/api/cron/scrape-theaters` | `0 6 * * *` (ежедневно 06:00 UTC) | скан сайтов площадок (группа `venues`) |
| `/api/cron/cleanup-events` | `30 6 * * *` (ежедневно 06:30 UTC) | очистка прошедших событий |
| `/api/cron/scrape-platforms` | `0 7 * * 1` (понедельник 07:00 UTC = 03:00 Сантьяго) | скан платформ (группа `platforms`) |

Авторизация (`src/lib/cron-auth.ts`): заголовок
`Authorization: Bearer ${CRON_SECRET}`; вне production дополнительно принимается
`?secret=` для ручной отладки.

### Ручной запуск

```bash
# против БД из окружения (DATABASE_URL)
npm run db:scrape                       # venue-сайты
npm run db:scrape -- --group=platforms  # платформы
npm run db:scrape -- --group=all        # всё сразу
npm run db:sync-theaters                # синк реестра площадок в БД
npm run db:cleanup-events               # очистка

# через HTTP (например, после деплоя)
curl -H "Authorization: Bearer $CRON_SECRET" https://dondego.cl/api/cron/scrape-platforms
curl -H "Authorization: Bearer $CRON_SECRET" "https://dondego.cl/api/cron/cleanup-events?dryRun=1"
```

Ответ cron-эндпоинтов содержит `totals` и по-источниковый список
`{theater, ok, found, upserted, error}` — это основной инструмент проверки.

---

## 6. Сортировка и нормализация

### 6.1. Нормализация при записи (агенты → Show)

- **Категории событий**: `normalizeEventCategories()`
  (`src/lib/taxonomy.ts`) превращает сырые ярлыки источника + название в
  контролируемые слаги (`concierto`, `obra-de-teatro`, `festival`, …,
  fallback `otros`). На платформах категорию дополнительно подсказывает URL
  листинга (`…/Entradas-Conciertos` → `concierto`); имя площадки в
  классификацию не подмешивается («Teatro X» — не жанр).
- **Даты**: строки без таймзоны считаются настенным временем Сантьяго и
  конвертируются в UTC-инстант через `santiagoTime()`/`isoToInstant()`
  (`shared.ts`) — DST Чили обрабатывается автоматически. Никогда не
  используйте голый `new Date('2026-05-02T20:00')` в адаптерах.
- **Цены**: CLP целыми; в БД хранится `priceCents = CLP * 100` (общая
  конвенция минорных единиц).

### 6.2. Сортировка при выдаче (Show → страницы)

`src/lib/data/shows.ts` объединяет scraped-шоу и опубликованные события
организаторов в единые списки `ListedShow`:

| Функция | Страница | Правило отбора и сортировки |
|---|---|---|
| `getUpcomingShows()` | главная (мозаика) | будущие + шоу без дат; сортировка по дате, TBA в конце |
| `getCalendarShows()` | `/calendario` | окно **сегодня → +31 день**, группировка по дню и категории |
| `getShowsForDate(date)` | `/calendario/[date]` | один день (границы дня — Сантьяго); прошлые даты редиректят на сегодня |
| `getWeekendShows()` | `/fin-de-semana` | окно суббота–воскресенье |
| `getTheatersWithShows()` | `/teatros` | по площадкам, внутри — по дате |

Общий порядок: `startsAt` по возрастанию, при равенстве — по названию;
фильтр категории — по `Show.categories[]`.

---

## 7. Мониторинг и отладка

- Состояние каждого источника — в его строке Theater: `lastScrapedAt`,
  `lastScrapeOk`, `lastError` (обрезается до 500 символов).
- Логи прод-запусков: `npx vercel logs afisha-website.vercel.app --since 1h`.
- Известные ограничения:
  - **viagogo/StubHub** за анти-бот защитой (DataDome): периодические
    блокировки ожидаемы; они видны как `lastError` с HTTP-кодом и не влияют
    на остальные источники. Если блокировки постоянные — подключать
    рендеринг через внешний сервис (ScrapingBee/Browserless) внутри этих
    двух адаптеров.
  - **Instagram/Facebook** не отдают контент анонимно — площадки из IG/FB
    занесены в реестр, но событий сами не порождают.
  - Generic `jsonld` даёт 0 событий на сайтах без schema.org-разметки — это
    не ошибка, а сигнал, что площадке нужен свой адаптер.

---

## 8. Как добавить нового агента

1. Добавьте площадку/платформу в `prisma/sourceVenues.ts` (slug, website,
   `eventSources[]`, категории). Если хватает generic JSON-LD — `adapter:
   null`, готово.
2. Иначе напишите адаптер:
   - сайт площадки → `src/lib/scrapers/index.ts`, ключ в `SCRAPERS`;
   - кросс-городская платформа → `src/lib/scrapers/platforms.ts`, ключ в
     `PLATFORM_SCRAPERS` **и** в `PLATFORM_ADAPTER_KEYS` (иначе попадёт в
     дневную группу).
   Переиспользуйте `shared.ts`: `fetchText`, `extractJsonLdEventsFromHtml`,
   `isoToInstant`, `mapLimit`; на платформах — `mineEmbeddedEvents` и
   гео-фильтр.
3. Пропишите `adapter` у записи в `sourceVenues.ts`.
4. Добавьте фикстурные тесты в `tests/unit/platform-scrapers.test.ts`
   (fetch стабится — сеть в тестах не нужна).
5. `npm run db:sync-theaters`, затем ручной прогон
   `npm run db:scrape -- --group=…` и проверка `found/upserted/error`.
