# Instagram Story auto-posting — серверная фича (Graph API)

Полностью серверный агент, который по расписанию публикует Instagram-сторис по
ближайшему событию Сантьяго через **официальный Instagram Graph API**. Без
браузера, без маскировки под человека, без риска бана — санкционированный
Meta способ для Business/Creator-аккаунтов.

Есть также локальный браузерный агент (`docs/instagram-story-agent.md`) для
ручных разовых публикаций. Этот документ — про автоматическую серверную
публикацию на проде.

---

## Как это работает

```text
Vercel Cron (ежедневно 15:00 UTC)
  → GET /api/cron/instagram-story           (защищён CRON_SECRET)
     → runInstagramStoryPost()              src/lib/promotion/instagram-story.ts
        1. выбрать ближайшее не опубликованное событие Сантьяго
           (src/lib/promotion/story-content.ts, состояние — таблица
            InstagramStoryPost)
        2. собрать публичный URL картинки:
           {APP_URL}/api/promotion/instagram/story-image/<eventId>
        3. Graph API: создать STORIES-контейнер (image_url) → опубликовать
           (src/lib/promotion/instagram.ts)
        4. записать результат в InstagramStoryPost (POSTED/FAILED)
```

Картинку рендерит `next/og` (Satori) в маршруте
`/api/promotion/instagram/story-image/[id]` — публичный по необходимости:
серверы Instagram сами скачивают `image_url`. Роут отдаёт 1080×1920 PNG в
брендинге DondeGO и рендерит только PUBLISHED-события (иначе 404). Хранилище
не нужно — картинка генерируется на лету.

Выбор события (та же логика, что и в локальном агенте):
- только Сантьяго, только будущие, ближайшее первым;
- приоритет — ближайшие 21 день (`DEFAULT_STORY_LOOKAHEAD_DAYS`);
- уже опубликованные (`InstagramStoryPost.status = POSTED`) пропускаются →
  ротация к следующему; когда всё опубликовано, cron отдаёт
  `skipped: no-upcoming-events` и ничего не постит повторно;
- `FAILED`-строка не блокирует событие: следующий прогон повторит попытку.

---

## Разовая настройка (со стороны владельца аккаунта)

1. Перевести Instagram в **Business** или **Creator** и привязать к странице
   Facebook (Instagram → Settings → Account type; связать со страницей).
2. Создать приложение в **Meta for Developers**
   (https://developers.facebook.com/), добавить продукт **Instagram Graph
   API**.
3. Получить **долгоживущий access token** с правами
   `instagram_content_publish` (+ `instagram_basic`,
   `pages_read_engagement`). Для публикации на прод-аккаунте приложение должно
   пройти **App Review** по разрешению `instagram_content_publish`.
4. Узнать **IG User ID** бизнес-аккаунта (`GET /me/accounts` → страница →
   `instagram_business_account`).
5. Прописать переменные окружения в Vercel (Production):

   ```text
   INSTAGRAM_ACCESS_TOKEN=<долгоживущий токен>
   INSTAGRAM_BUSINESS_ACCOUNT_ID=<IG user id>
   INSTAGRAM_GRAPH_VERSION=v21.0        # опционально
   APP_URL=https://dondego.cl           # уже задан; нужен для image_url
   CRON_SECRET=<уже задан>
   ```

Пока `INSTAGRAM_ACCESS_TOKEN`/`INSTAGRAM_BUSINESS_ACCOUNT_ID` не заданы, cron
безопасно пропускает публикацию (`skipped: not-configured`) — фичу можно
влить и включить позже.

Секреты в репозиторий не коммитим — только в env Vercel.

## Применить схему БД

Фича добавляет таблицу `InstagramStoryPost`. На проде:

```bash
npx prisma generate
npx prisma db push
```

---

## Расписание и ручной запуск

Cron уже в `vercel.json`: `/api/cron/instagram-story`, `0 15 * * *`
(ежедневно 15:00 UTC ≈ 11:00 или 12:00 в Сантьяго — хорошее время для сторис).
Каждый день постится следующее по времени событие; когда очередь исчерпана —
пропуск до появления новых.

Проверка без публикации (работает и без токенов IG):

```bash
# выбор события + URL картинки, без постинга
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://dondego.cl/api/cron/instagram-story?dryRun=1"

# посмотреть саму картинку
open "https://dondego.cl/api/promotion/instagram/story-image/<eventId>"
```

Боевой запуск вне расписания (после настройки токенов):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://dondego.cl/api/cron/instagram-story"
# result.status: posted | skipped | failed; при posted — result.mediaId
```

---

## Переменные окружения

| Переменная | Обяз. | Назначение |
|---|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | да (для постинга) | долгоживущий токен Graph API |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | да (для постинга) | IG User ID бизнес-аккаунта |
| `INSTAGRAM_GRAPH_VERSION` | нет | версия API, по умолчанию `v21.0` |
| `APP_URL` | да | публичный origin для `image_url` картинки |
| `CRON_SECRET` | да | авторизация cron-эндпоинта |

---

## Связь с прайсом промо-услуг

Эта же механика — основа платной промо-услуги «Instagram story» из
монетизации платформы: рендер брендированной сторис по событию и публикация
через Graph API. Дальше можно повесить постинг на оплаченный `PromotionOrder`
конкретного организатора (не только на общий cron ближайших событий).

## Ограничения

- Instagram Content Publishing: лимит ~50 постов/сутки на аккаунт — ежедневный
  cron сильно ниже лимита.
- `image_url` должен быть публично доступен (поэтому роут картинки открыт).
- Сторис живёт 24 часа — это ожидаемо для формата; постоянные ссылки на
  событие остаются на сайте.
- Файлы: `src/lib/promotion/{story-content,instagram,instagram-story}.ts`,
  `src/app/api/promotion/instagram/story-image/[id]/route.tsx`,
  `src/app/api/cron/instagram-story/route.ts`. Тесты:
  `tests/unit/{story-content,instagram}.test.ts`.
