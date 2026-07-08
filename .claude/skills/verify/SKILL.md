---
name: verify
description: Build, run, and drive the DondeGO web app locally to verify changes end-to-end.
---

# Verifying DondeGO locally

## Database (no Docker daemon in remote sessions)

Use the system Postgres 16 binaries as the `postgres` user (data dir must be
readable by that user — `/var/lib/postgresql/...` works, deep `/tmp` paths may not):

```bash
PGBIN=/usr/lib/postgresql/16/bin
PGDIR=/var/lib/postgresql/verify-pgdata
mkdir -p "$PGDIR" && chown postgres:postgres "$PGDIR"
su postgres -c "$PGBIN/initdb -D $PGDIR -U afisha --auth=trust"
su postgres -c "$PGBIN/pg_ctl -D $PGDIR -o '-p 5433 -k /tmp -c listen_addresses=127.0.0.1' -l /var/lib/postgresql/pg.log start"
su postgres -c "$PGBIN/createdb -h 127.0.0.1 -p 5433 -U afisha afisha"
export DATABASE_URL="postgresql://afisha:afisha@127.0.0.1:5433/afisha"
npx prisma db push --skip-generate
DATABASE_URL="$DATABASE_URL" npm run db:seed   # demo logins: visitor@afisha.test / organizer@afisha.test, password123
```

## App

```bash
npm run build
DATABASE_URL=... AUTH_SECRET="local-verify-secret-0123456789" CRON_SECRET="verify-cron-secret" npm run start
# then: curl --noproxy 127.0.0.1 http://127.0.0.1:3000/api/events
```

`--noproxy 127.0.0.1` matters: the environment routes HTTPS through a proxy.

## Driving with Playwright

The project's pinned Playwright launches Chromium with `--headless=old`, which
the full Chrome binary no longer supports — use the headless shell:

```js
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
});
```

Run driver scripts from the repo root (ESM resolves `@playwright/test` from
`node_modules` relative to the script path, so place the script inside the repo).

Login form gotcha: the header also contains a search form, so target
`form:has(input[type="password"]) button[type="submit"]` on `/login`.

## Cron surfaces

```bash
curl --noproxy 127.0.0.1 -H "Authorization: Bearer $CRON_SECRET" \
  "http://127.0.0.1:3000/api/cron/cleanup-events?dryRun=1"
```
