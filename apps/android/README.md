# DondeGO Android

Native Kotlin + Jetpack Compose client for DondeGO — Santiago events aggregator
and self-service organizer platform. Design and API contract:
[`docs/android-app-plan.md`](../../docs/android-app-plan.md) ·
[`docs/android-api.md`](../../docs/android-api.md).

- **App name / Play listing:** DondeGO
- **applicationId / namespace:** `dondeg.app`
- **minSdk 26 · targetSdk 36 · compileSdk 37 · JDK 17 · Kotlin 2.x · AGP 9.x**
- **English-first**, localization-ready (all user-facing copy in string
  resources; add `values-es/strings.xml` later with no code changes).

## Module layout

```
apps/android/
├── app/                     # single-activity shell, DI container, NavHost
├── core/
│   ├── common/              # ApiResult
│   ├── model/               # domain models + enums (Unknown-tolerant)
│   ├── network/             # Retrofit + kotlinx.serialization, Bearer interceptor
│   ├── data/                # repositories + encrypted session storage
│   └── designsystem/        # Material 3 DondeGO theme, labels, formatters
└── feature/
    ├── discover/            # home feed, count-driven categories, search
    ├── eventdetail/         # native + scraped detail
    ├── auth/                # login / register
    ├── tickets/             # My Tickets + QR display
    ├── scanner/             # staff check-in (event picker + token entry)
    ├── organizer/ admin/    # role-gated dashboards (web console handoff)
    └── checkout/            # reserved for native PaymentSheet (see below)
```

## What's implemented

- **Visitor discovery**: home feed, count-driven category strip (rendered in
  server order), search, pull-to-refresh, loading/empty/error states.
- **Event detail** for both kinds. Native events → DondeGO checkout; scraped
  events → the original **source URL opened in the browser/Custom Tab** (never
  DondeGO checkout).
- **Auth**: login/register against the mobile endpoints; JWT stored in
  **EncryptedSharedPreferences**; role-aware navigation; session validated and
  expired-session handling on launch.
- **My Tickets + QR**: ticket list and detail with a **ZXing-rendered QR** of
  the server payload (`DGO1.<token>`); QR disabled for non-scannable statuses.
- **Scanner**: server-authorized event picker + manual token entry against
  `POST /api/scan`; all `ScanResult` states rendered; double-scan protection
  stays atomic on the backend.
- **Organizer / Admin**: role-gated; open the web dashboard/console in a
  Custom Tab (no ledger/moderation state machine on the device).

### Deferred (documented in the plan)

- **Native Stripe PaymentSheet**: native events currently hand off to the web
  checkout in a Custom Tab, which preserves the order → Stripe → **webhook =
  payment truth** invariant. The PaymentIntent endpoints for a fully native
  flow are specified in `docs/android-api.md` §3.4.
- **Camera QR scanning** (CameraX + ML Kit): the scanner uses manual/pasted
  token entry today; the camera pipeline is the next hardware integration.

## Run against the local backend

The debug build points at the host machine as seen from the Android emulator:

```
http://10.0.2.2:3000/
```

Start the backend from the repo root first:

```bash
npm run dev
```

Then run the `app` configuration from Android Studio, or build from the CLI.

## CLI build

Uses the Gradle wrapper (falls back to Android Studio's bundled JBR when system
Java is absent). Run from `apps/android`:

```bash
./gradlew :app:assembleDebug     # debug APK → app/build/outputs/apk/debug/
./gradlew :app:lintDebug         # lint (0 errors expected)
./gradlew test                   # unit tests
```

## Release build & Google Play

- `release` build type: R8 + resource shrinking on, ProGuard keep rules for
  Stripe / Retrofit / kotlinx.serialization (`app/proguard-rules.pro`), and the
  production API host in `API_BASE_URL` (update before shipping).
- **Signing**: create a keystore and supply it via Play App Signing / CI
  secrets. Never commit keystores or passwords. Example `~/.gradle/gradle.
  properties` (machine-local):

  ```
  DONDEGO_STORE_FILE=/abs/path/dondego-upload.jks
  DONDEGO_STORE_PASSWORD=...
  DONDEGO_KEY_ALIAS=upload
  DONDEGO_KEY_PASSWORD=...
  ```

  Wire these into a `signingConfigs { release { ... } }` block reading from
  `project.findProperty(...)` before the first Play upload.
- **Permissions**: `INTERNET` (required) and `CAMERA` (optional feature,
  `android:required="false"`) for the future camera scanner. Camera usage is
  explained to the user at the point of request.
- **Data safety**: collects name/email (account) and purchase history (orders);
  no ads SDK, no location. Payments are handled by Stripe (physical event
  tickets), which does not require Google Play Billing.
- `versionCode` / `versionName` in `app/build.gradle.kts`.
- Backups disabled (`allowBackup="false"`); the encrypted session file is
  excluded via `data_extraction_rules.xml`.

Produce an Android App Bundle for Play with `./gradlew :app:bundleRelease`
(after configuring signing).
