# DondeGO iOS

Native iOS client for DondeGO (SwiftUI, iOS 16+, iPhone portrait). Mirrors the
Android app: Discover / Saved / Tickets / Account tabs, eggshell theme, black
pills, burgundy curtain brand.

## Structure

```
apps/ios/
├── DondeGO.xcodeproj          # Xcode 16+ project (synchronized folder format)
├── Support/Info.plist         # App Store keys: launch screen, ATS, encryption exemption
├── scripts/render-appicon.swift  # Regenerates the 1024px app icon (runs on CLT)
└── DondeGO/
    ├── DondeGOApp.swift       # @main, TabView, auth sheet
    ├── Core/                  # Theme, wire Models, APIClient, Keychain session
    ├── Components/            # PosterImage, EventRow
    ├── Features/              # Discover, Detail, Saved, Tickets (+QR), Auth, Account
    ├── Localizable.xcstrings  # en/es String Catalog
    ├── PrivacyInfo.xcprivacy  # Privacy manifest (no tracking)
    └── Assets.xcassets        # AppIcon (no alpha), AccentColor, LaunchBackground
```

## API

Base URL comes from the `DONDEGO_API_BASE` build setting → Info.plist
`DondeGoAPIBase`:

- Debug: `http://127.0.0.1:3000/` (simulator reaches the local `npm run dev`)
- Release: `https://dondego.cl/`

Endpoints match `docs/android-api.md`: `/api/v1/feed`, `/api/v1/events`,
`/api/v1/events/{native|scraped}/{id}`, `/api/v1/auth/{login|register}`,
`/api/v1/me/{likes|tickets}`. Bearer token is stored in the Keychain.

## Build & run (simulator)

```bash
cd apps/ios
xcodebuild -project DondeGO.xcodeproj -scheme DondeGO \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
# or open DondeGO.xcodeproj in Xcode and hit Run
```

If Xcode was just installed: `sudo xcodebuild -license accept && xcodebuild -runFirstLaunch`.

## App Store notes

- Ticket purchase opens the DondeGO website (physical-world events —
  guideline 3.1.3(e) allows web checkout; same model as Eventbrite).
- `ITSAppUsesNonExemptEncryption = NO`, privacy manifest included, icon has
  no alpha channel, es/en localizations declared.
- Before submission: App Store Connect listing needs privacy "nutrition
  labels" matching PrivacyInfo.xcprivacy (email + name, app functionality),
  and guideline 5.1.1(v) requires an account-deletion path — the API has no
  delete endpoint yet; add one (or a web flow) before review.
- Release signing: set a Team in Xcode → Signing & Capabilities (bundle id
  `cl.dondego.app`), then Product → Archive.
