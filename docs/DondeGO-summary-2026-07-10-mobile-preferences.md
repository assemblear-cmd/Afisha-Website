# DondeGO — саммари и prompt для продолжения (стадия: мобильные предпочтения + редизайн)

Дата обновления: 2026-07-10
Репозиторий (Mac): `/Users/skif/Documents/GitHub/Afisha-Website`
Рабочая ветка: `claude/mobile-registration-preferences-a2vfqj`
Pull Request: https://github.com/assemblear-cmd/Afisha-Website/pull/5 (открыт, не смержен)
Production: `https://dondego.cl` (изменения этой ветки НЕ задеплоены)

Этот документ — для нового чата без контекста. Вставить первым сообщением
и продолжить работу.

## Prompt для нового чата

```text
Продолжай работу над DondeGO в репозитории:
/Users/skif/Documents/GitHub/Afisha-Website

Не начинай проект заново. Сначала прочитай
docs/DondeGO-summary-2026-07-10-mobile-preferences.md, затем проверь
git status --short, текущую ветку и релевантные файлы.

DondeGO — афиша мероприятий Сантьяго + self-service платформа для организаторов.
Стек: Next.js 14 App Router, TypeScript, Prisma/Postgres, Stripe, Vercel, Neon,
native Android на Kotlin/Jetpack Compose.

Текущая стадия: в ветке claude/mobile-registration-preferences-a2vfqj (PR #5)
реализованы: (1) онбординг при регистрации в приложении — 2 вопроса (категории
ивентов + площадки), ответы сохраняются за аккаунтом; (2) персонализация выдачи
на бэкенде — /api/v1/feed, /api/v1/events и главная веба ставят выбранные
площадки/категории вперёд; (3) редизайн Android в стиле Eventbrite — нижняя
навигация Discover/Saved/Tickets/Account, новый Discover (чип Santiago, поиск
"Find things to do", вертикальная лента), экран Account с Preferences;
(4) новый логотип — бордовый театральный занавес с белой вензельной D.

PR ещё не смержен, прод не обновлён. Перед деплоем ОБЯЗАТЕЛЬНО выполнить
npx prisma db push с продовым DATABASE_URL (Neon) — в схеме новые поля
User.preferredCategories / User.preferredVenues.

Важные правила:
- Не откатывай чужие/предыдущие незакоммиченные изменения.
- Секреты не писать в репозиторий.
- Для Android на телефоне используй ADB:
  /Users/skif/Library/Android/sdk/platform-tools/adb
- Debug APK для телефона:
  cd apps/android && ./gradlew :app:assembleDebug -PdondegoApiBase=http://127.0.0.1:3000/
- Туннель телефона к локальному Next server: adb reverse tcp:3000 tcp:3000
- Установка: adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
- Язык общения с пользователем: русский, кратко и по делу.
```

## Product Summary

DondeGO — поиск и публикация мероприятий в Сантьяго, Чили.

- Афиша/агрегатор: scraped-события театров, культурных площадок, календарей.
- Нативные события DondeGO: любой зарегистрированный пользователь создаёт
  событие, продаёт билеты или принимает донаты, управляет из dashboard.
- Мобильное приложение: персонализированная лента, поиск, категории, лайки
  (Saved), билеты/QR, сканер, онбординг предпочтений.
- Instagram growth loop: публикация афиш в Stories через физический телефон
  (см. `docs/agents/instagram-story-publisher-agent.md` — файл живёт локально
  на Mac, в репозитории может отсутствовать).

Локаль по умолчанию `es`, поддерживается `en`. Валюта `CLP`. Город — Santiago.

## Business Rules

- Любой зарегистрированный пользователь может создать мероприятие; organizer —
  не отдельная роль доступа.
- Комиссия платформы 5%, только с нативных DondeGO-events.
- Источник правды по оплатам — Stripe webhook (не client redirect).
- Прошедшие внешние события удаляются; прошедшие organizer events переходят
  в `COMPLETED` и не удаляются.
- Категории выдачи каунт-ориентированы: клиенты рендерят порядок сервера.
- НОВОЕ: у пользователя есть `preferredCategories` (slugs из EVENT_CATEGORIES)
  и `preferredVenues` (slugs Theater). Выдача для залогиненного пользователя:
  сначала события выбранных площадок (вес 2) и категорий (вес 1), суммарный
  скор убыв., внутри одного скора — прежний порядок по дате. Реализация:
  `src/lib/personalization.ts`, тесты `tests/unit/personalization.test.ts`.

## Production и Deploy

- Vercel project `afisha-website` (team `assemblear-4979s-projects`), Next.js,
  build `npm run build`.
- Production DB: Neon Postgres (env `DATABASE_URL` в Vercel).
- Схема применяется через `npx prisma db push` (prisma migrate не используется).
- Домены: `dondego.cl`, `www.dondego.cl`, fallback `afisha-website.vercel.app`.
- Cron в `vercel.json`: `/api/cron/scrape-theaters` (06:00), 
  `/api/cron/cleanup-events` (06:30), auth `Bearer ${CRON_SECRET}`.

### Чек-лист вывода ЭТОЙ ветки в прод

1. `npx prisma db push` с продовым `DATABASE_URL` (новые поля User).
2. Merge PR #5 в `main` → Vercel задеплоит автоматически.
3. Release APK: `cd apps/android && ./gradlew :app:assembleRelease`
   (release по умолчанию смотрит на `https://dondego.cl/`; нужен signing).

## Архитектура Web

```text
Browser / Android app
        | HTTPS
Next.js 14 App Router (src/app, API route handlers, /api/v1 для mobile)
        | бизнес-логика в src/lib/*
Prisma 5 → PostgreSQL (Neon в prod)
Интеграции: Stripe Checkout/webhooks, Google OAuth (mobile), scrapers
```

Ключевые директории: `src/app` (страницы+API), `src/components`, `src/lib`
(auth, authz, taxonomy, data/shows, mobile/events, personalization, finance,
scrapers), `prisma/schema.prisma`, `apps/android`, `docs`.

Ключевые файлы этой стадии:

- `src/lib/personalization.ts` — скоринг и переупорядочивание выдачи.
- `src/app/api/v1/me/preferences/route.ts` — GET/PUT предпочтений (Bearer).
- `src/app/api/v1/onboarding/options/route.ts` — варианты для 2 вопросов.
- `src/app/api/v1/feed/route.ts`, `src/app/api/v1/events/route.ts` —
  учитывают пользователя через `getCurrentUser()` (Bearer или cookie).
- `src/app/page.tsx` + `src/components/home/Mosaic.tsx` — персонализация
  главной веба (мозаика ведёт выбранными категориями, грид «Upcoming events»
  ставит совпадения вперёд).
- `prisma/schema.prisma` — User.preferredCategories/preferredVenues
  (String[] @default([])).

## API Surface для Android

Контракт: `docs/android-api.md` (обновлён, §3.5).
Реализация клиента: `apps/android/core/network/.../DondeGoApi.kt`.

- `GET /api/v1/feed` — персонализированный (Bearer опционален)
- `GET /api/v1/events` — персонализированный, фильтры category/query/date/weekend/kind
- `GET /api/v1/events/native/{id}`, `GET /api/v1/events/scraped/{id}`
- `POST /api/v1/auth/login|register`, `POST /api/v1/auth/google`, `GET /api/auth/me`
- НОВОЕ: `GET /api/v1/onboarding/options` — `{categories:[{slug,count}],`
  `venues:[{slug,name,city,categories,upcomingCount}]}`; площадки без
  агрегаторов (`ticketera`, `plataforma-cultural`, `productora`)
- НОВОЕ: `GET /api/v1/me/preferences` → `{preferredCategories, preferredVenues}`
- НОВОЕ: `PUT /api/v1/me/preferences` — списки заменяются целиком, невалидные
  slugs молча отбрасываются
- `GET/POST/DELETE /api/v1/me/likes`, `GET /api/v1/me/events`
- `GET /api/v1/me/tickets`, `GET /api/v1/me/tickets/{id}`
- `GET /api/v1/scanner/events`, `POST /api/scan`

## Архитектура Android

applicationId `dondeg.app`, version `0.1.0` (versionCode 1), compileSdk 37,
targetSdk 36, minSdk 26, JDK 17, Compose BOM 2026.06.01, AGP 9.2.1.
Тестовый телефон: Samsung SM-S918U1, serial `R3CWA0H83HM`.

```text
apps/android/
├── app                # NavHost, DI, AccountScreen, OnboardingScreen, лого
├── core/common|model|network|data|designsystem
└── feature/discover|eventdetail|auth|tickets|scanner|organizer|admin|checkout
```

Новое в этой стадии:

- `core/model/PreferenceModels.kt` — VenueOption, OnboardingOptions, UserPreferences.
- `core/data/PreferencesRepository.kt` — options()/preferences()/save().
- `app/ui/OnboardingScreen.kt` — 2 вопроса (режимы Full/Interests/Venues):
  шаг 1 — чипы категорий; шаг 2 — список площадок с Follow/Following;
  Skip сверху, чёрная кнопка Continue/Save снизу. Сохранение через PUT.
- `app/ui/AccountScreen.kt` — профиль-карточка, синий баннер «Add interests»,
  Preferences (Interests, Venues you follow, Your events, Organizer, Scanner,
  Admin), язык через шестерёнку, sign in/out.
- `feature/discover/SavedScreen.kt` — лайкнутые события (вкладка Saved).
- `feature/auth/AuthScreen.kt` — `onAuthenticated(registeredNewAccount)`:
  после регистрации открывается onboarding/full (auth-экран заменяется).
- `app/ui/DondeGoApp.kt` — нижняя навигация Discover/Saved/Tickets/Account
  (всегда 4), глобального TopAppBar нет, `prefsVersion` перезагружает ленту
  после сохранения предпочтений (viewModel key).
- `feature/discover/DiscoverScreen.kt` — чип «Santiago ⌄», поиск-пилюля
  «Find things to do» (иконка Tune), чипы категорий (выбранная — чёрная),
  вертикальные строки EventRow (постер 92dp слева, заголовок, «дата · место»,
  цена, сердечко). Hero-rail и «Popular now» удалены.
- `core/designsystem/DondeGoTheme.kt` — фон light `#F2F1EB` (eggshell),
  `DondeGoPillBlack #16141A`, `DondeGoBannerBlue #3B47F1`.
- `app/src/main/res/drawable/ic_launcher.xml` — НОВЫЙ ЛОГОТИП: бордовый круг
  с вертикальными складками занавеса (градиент #8C1528→#4A0812) и белая
  каллиграфическая D-вензель (штрихи + завитки). Превью рендерилось и
  утверждено визуально.
- Строки EN/ES обновлены (app и discover модули).

## Состояние Git / что где

- Ветка `claude/mobile-registration-preferences-a2vfqj` запушена, PR #5 открыт.
- Коммиты стадии: `90fe7be` (онбординг+персонализация+редизайн),
  `99f4e20` (логотип), далее этот документ.
- Работа велась в облачной сессии Claude Code (без Android SDK и без ADB):
  Kotlin-код НЕ компилировался — первая же локальная сборка
  `./gradlew :app:assembleDebug` может выявить мелкие ошибки компиляции,
  чинить по выводу.
- Бэкенд проверен end-to-end на локальном Postgres: регистрация → PUT
  preferences → GET /api/v1/feed с Bearer ставит события выбранной площадки
  (GAM) первыми; аноним получает порядок по дате. `npm run typecheck`,
  `npm run build`, `npm run test` (149) — зелёные.
- На Mac пользователя могут оставаться старые незакоммиченные правки от
  предыдущих сессий (глобальные стили, organizer-страницы) — не откатывать.

## Verification Checklist

Web (локально):

```bash
npm install && npx prisma db push && npm run dev
npm run typecheck && npm run test
```

- Главная: залогиненный пользователь с предпочтениями видит свои категории
  первыми в мозаике и совпадения первыми в «Upcoming events».
- `curl -X PUT /api/v1/me/preferences` с Bearer сохраняет и валидирует slugs.

Android (на Mac, телефон по USB):

```bash
cd apps/android
./gradlew :app:assembleDebug -PdondegoApiBase=http://127.0.0.1:3000/
ADB=/Users/skif/Library/Android/sdk/platform-tools/adb
$ADB reverse tcp:3000 tcp:3000
$ADB install -r app/build/outputs/apk/debug/app-debug.apk
$ADB shell am start -n dondeg.app/.MainActivity
```

- Иконка: бордовый занавес + белая вензельная D (если лаунчер кэширует —
  `adb uninstall dondeg.app` и поставить заново).
- Регистрация нового аккаунта → сразу 2 экрана вопросов → Continue →
  лента перегружается, выбранное — сверху.
- Account → Interests / Venues you follow редактируют ответы; счётчик
  «N Following» обновляется.
- Нижняя навигация: Discover, Saved (лайки), Tickets, Account.
- ES-локаль: все новые строки переведены.

## Следующие задачи

1. Собрать debug APK локально, починить возможные ошибки компиляции Kotlin,
   установить на телефон, пройти QA-чеклист выше (включая новый логотип).
2. `npx prisma db push` на Neon (прод) → merge PR #5 → проверить прод-веб.
3. QA онбординга на проде + Google sign-in (для Google-регистраций онбординг
   сейчас не запускается — это осознанно; решить, нужно ли предлагать вопросы
   при первом Google-входе).
4. Веб-версия онбординга: задать те же 2 вопроса при регистрации на сайте
   и добавить редактирование предпочтений в аккаунте на вебе (API уже готов).
5. Пагинация/подгрузка ленты в приложении (сейчас первая страница из feed).
6. Release-сборка Android с signing для распространения.
7. Скрейпер на следующий месяц + проверка дублей/категорий; cron на проде.
8. Instagram Story agent — продолжать после каждой успешной публикации.
