# Afisha-Website — Session Handoff

> Документ для продолжения работы в новом чате. Дата: 2026-06-22. Репозиторий:
> `github.com/assemblear-cmd/Afisha-Website`. Прод-домен: `expresscarwash.cl`.

---

## 1. Что это за проект

**Afisha** — агрегатор мероприятий в Чили, сайт-аналог **eventbrite.cl** («el
Eventbrite chileno»). Этот репозиторий (`Afisha-Website`) — это **сам сайт**
(Next.js-витрина + встроенный backend). Информация о мероприятиях (театры и др.)
хранится в БД и наполняется скрапером.

### Важно: два параллельных чата работают в этом репо
- **Этот чат** — фронтенд/сайт (страницы, UI, навигация, i18n, дизайн).
- **Соседний backend-чат** — бэкенд внутри того же репо: Prisma-схема, модели
  `Theater`/`Show`, скраперы (`src/lib/scrapers/`), слой данных (`src/lib/data/`),
  ежедневный cron (`src/app/api/cron/scrape-theaters`).
- Отдельного бэкенд-сервиса нет — всё деплоится одним Next.js-приложением.
- **Перед коммитом** проверяй `git status`: в дереве могут быть незакоммиченные
  правки backend-чата (напр. `src/lib/scrapers/index.ts`) — координируйся.

---

## 2. Архитектура и стек

- **Next.js 14** (App Router, React Server Components, `dynamic = 'force-dynamic'`).
- **React 18**, **TypeScript 5.6**, **Tailwind 3.4** (токены `coral #F05537`,
  `ink #1E0A3C`, `surface`, `muted`, `success`).
- **Prisma 5.22** — страницы (Server Components) читают БД **напрямую**
  (`prisma.event.findMany`, `prisma.theater.findMany`...), без внутреннего HTTP.
- **Auth**: JWT (`jose`) + `bcryptjs`, `src/lib/auth.ts`. Роли `visitor`/`organizer`.
- **Тесты**: Vitest + Testing Library (`npm test`), Playwright (`npm run test:e2e`).
- БД-модели: `User`, `Event`, `TicketType`, `Order` (витрина событий) + `Theater`,
  `Show` (агрегатор театров, наполняется скрапером).
- ⚠️ Устаревшее: `docs/CONTRACT.md` и `src/lib/content/afisha.ts` описывают старую
  двухрепозиторную модель (внешний FastAPI) — **не актуально**, бэкенд теперь in-repo.

---

## 3. Локальный запуск (бесплатно)

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
docker compose up -d        # локальный Postgres :5433 (creds afisha/afisha, как в .env)
npm run setup               # prisma db push + seed
npm run dev                 # http://localhost:3000  (если занят — :3001)
```

Сид наполняет: **Theaters 11, Shows 4, Events 19, Ticket types 31, Users 3**.
Демо-логины (пароль у всех `password123`): `organizer@afisha.test`,
`studio@afisha.test`, `visitor@afisha.test`.

Сейчас dev-сервер запущен на **:3001** (Docker-Postgres со свежими данными).
На :3000 мог остаться старый сервер на SQLite — лишний можно погасить.

### Грабли локального запуска (реально словили)
- **zsh не считает `#` комментарием** → не вставляй в команду хвост вида
  `npm run dev # http://localhost:3000` (он уйдёт аргументом → «Invalid project
  directory …/#»). Запускай просто `npm run dev`.
- `npm run dev` нужно запускать **из папки репо** (сначала `cd …/Afisha-Website`),
  иначе `ENOENT: package.json`.
- **Datasource split**: `prisma/schema.prisma` должен быть `provider = "postgresql"`
  (и для Docker-Postgres локально, и для прода). Есть артефакт `prisma/dev.db`
  (SQLite) от раннего запуска — **не коммить переключение схемы на sqlite**.

---

## 4. Деплой / домен (статус)

- **Хостинг = Vercel** (cron в `vercel.json` — фича Vercel; деплой по push в `main`).
  Пользователь подтвердил: Vercel-проект подключён к репо, домен + прод-Postgres
  настроены на его стороне.
- ⚠️ **Домен `expresscarwash.cl` сейчас отдаётся GitHub Pages** (`server: GitHub.com`,
  из-за файла `CNAME` в корне), а не Vercel. Pages умеет только статику — наш
  динамический сайт там работать не будет. Чтобы сайт открылся на домене, нужно
  **увести домен с Pages на Vercel** (в безопасном порядке):
  1. Vercel → Project → Domains: добавить `expresscarwash.cl`.
  2. У регистратора: переключить DNS на Vercel (`A 76.76.21.21` / `CNAME cname.vercel-dns.com`).
  3. После переключения — отключить GitHub Pages и **удалить файл `CNAME`** из репо.
  (DNS/Vercel — аккаунты пользователя, у ассистента доступа нет.)
- Альтернативы Vercel (обсуждали цены, ~MVP): **Render** ~$15/мес фикс, **Railway**
  ~$5–15 usage, **Vercel Pro** ~$20–40. БД (managed Postgres типа Neon/Supabase)
  можно отвязать от веб-хостинга — тогда строка БД в сравнении ~константа.

---

## 5. История изменений этой сессии

### Закоммичено и запушено в `main` — коммит `b199349`
`feat(web): live theater repertoire + a11y and cover-system polish`
- **A11y**: `Field`-примитив accessible-by-construction (`aria-describedby`,
  `aria-invalid`, error `role="alert"` + связь по id); error-баннеры → live-region
  `role="alert"` в `AuthForm`, `CreateEventForm`, `CheckoutForm`.
- **Дизайн**: компонент `CoverPlaceholder` — детерминированные дуотон-обложки по seed
  + emoji категории; helper `categoryEmoji`; подключён в `EventCard`, `teatros`,
  `events/[id]` (вместо одинакового градиента).
- **Презентация**: `afisha-presentation.html` (одностраничный HTML-дек о продукте).
- В этот же коммит попала работа backend-чата (Show/Theater data layer, скраперы,
  Vercel cron, seed, orders API, `api-error.ts`, `vercel.json`, `docker-compose.yml`).

### Сделано ПОСЛЕ `b199349` — НЕ закоммичено (текущая фича-работа)
1. **Вкладка «Teatros» в шапке** (`src/components/layout/Header.tsx`) — сделана
   всегда видимой (была `hidden lg:inline`, только десктоп).
2. **i18n (двуязычность ES/EN), cookie-based**:
   - `src/i18n/config.ts` — `locales=['es','en']`, default `es`, `localeNames`,
     `getDictionary()`, `isLocale()`. Расширяемо: новый язык = +код + файл словаря.
   - `src/i18n/getLocale.ts` — читает локаль из cookie `NEXT_LOCALE` (server).
   - `src/i18n/dictionaries/es.json` + `en.json` — словари (nav/home/teatros).
   - `src/components/layout/LanguageMenu.tsx` — меню 🌐 ES/EN (cookie + `router.refresh()`).
   - **Header**, **главная** (`src/app/page.tsx`), **театры** (`src/app/teatros/page.tsx`)
     переведены через словарь.
   - Архитектура **cookie-based** (URL не меняются), НЕ path-based `/en /es` —
     сознательно, чтобы не переносить всё дерево роутов поверх правок backend-чата.
     Легко апгрейдится до `/en /es` позже.
3. **Вкладка «Театры» — все театры из БД**:
   - `src/lib/data/shows.ts` — добавлена `getTheatersWithShows()` (все активные
     театры + их предстоящие shows).
   - `src/app/teatros/page.tsx` переписана: список **всех 11 театров**, у каждого
     своя афиша (карточки shows) или плейсхолдер «Repertorio próximamente».
   - Логика по ТЗ: пользователь → вкладка «Театры» → видит афиши разных театров.

**Проверки:** `tsc --noEmit` — PASS; `/teatros` → 200, рендерит все 11 театров.

---

## 6. Текущее состояние

- Ветка `main`. Последний коммит — `b199349` (запушен).
- Незакоммичено: вся фича-работа из раздела 5 (i18n + меню языков + все театры +
  видимый таб). Готово к коммиту, когда скажет пользователь.
- Dev-сервер запущен на **:3001** (Docker-Postgres, засеяно).
- `tsc` зелёный.

---

## 7. Открытые задачи / следующие шаги

- [ ] Закоммитить и запушить фичу (i18n + все театры). Перед коммитом убедиться,
      что `schema.prisma` = `postgresql`. Учесть параллельные правки backend-чата.
- [ ] **i18n — перевести остальные страницы** (login, register, dashboard,
      events, events/[id], checkout, orders) — добавить ключи в словари тем же паттерном.
- [ ] **Домен**: увести `expresscarwash.cl` с GitHub Pages на Vercel (см. раздел 4).
- [ ] `/teatros`: у большинства театров пока «скоро» — наполнится скрапером
      (backend-чат). Сейчас 4 show.
- [ ] (Опц.) Дизайн-доводки: идентичность театра (монограмма/логотип в секции),
      плотность checkout/dashboard.
- [ ] (Опц.) Апгрейд i18n до path-based `/en /es` + middleware, если нужен SEO по локалям.

---

## 8. Окружение / прочие грабли

- **GateGuard (ECC-хук)** перехватывает первый Bash и каждый Edit/Write, требуя
  «огласить факты»; проходит со второй попытки (retry). Отключение:
  `ECC_GATEGUARD=off` или `ECC_DISABLED_HOOKS=pre:bash:gateguard-fact-force,pre:edit-write:gateguard-fact-force`.
- Память проекта (handoff для ассистента) лежит в
  `~/.claude/projects/-Users-skif-Documents-GitHub-Afisha-Website/memory/`.
  Часть ранних заметок про «фронтенд-онли / homepage заморожена» **устарела** —
  по ходу сессии скоуп расширился до всего сайта (главную трогали, фичи деплоили).

## 9. Карта ключевых файлов

```
src/app/page.tsx                       Главная (i18n)
src/app/teatros/page.tsx               Театры: все театры из БД + афиши (i18n)
src/app/api/**                         API-роуты (auth, events, orders, cron) — backend-чат
src/components/layout/Header.tsx       Шапка + таб Teatros + меню языков
src/components/layout/LanguageMenu.tsx Меню 🌐 ES/EN
src/components/ui/Field.tsx            Accessible форм-поле
src/components/ui/CoverPlaceholder.tsx Детерминированные обложки
src/i18n/config.ts | getLocale.ts      i18n-конфиг + резолв локали
src/i18n/dictionaries/{es,en}.json     Словари
src/lib/data/shows.ts                  getUpcomingShows / getTheatersWithShows — backend-чат
src/lib/scrapers/**                    Скраперы — backend-чат
prisma/schema.prisma                   Модели (postgresql!) — backend-чат
docker-compose.yml                     Локальный Postgres :5433
vercel.json                            Vercel cron (скрапер)
afisha-presentation.html               Дек о продукте
```
