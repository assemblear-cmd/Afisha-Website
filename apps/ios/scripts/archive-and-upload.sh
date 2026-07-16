#!/usr/bin/env bash
# Archive DondeGO (Release) and upload to App Store Connect.
#
# Prerequisites (one-time, done by a human — cannot be scripted):
#   1. Xcode → Settings → Accounts → sign in with an Apple ID that is enrolled
#      in the Apple Developer Program.
#   2. App Store Connect → Apps → + → New App, bundle id cl.dondego.app.
#   3. Put your 10-char Team ID in apps/ios/ExportOptions.plist (teamID), or
#      pass it as the first argument to this script.
#
# Usage:
#   ./scripts/archive-and-upload.sh <TEAM_ID>
#
# Auth for the upload step, pick ONE:
#   A) Be signed into Xcode (Accounts) — automatic signing handles it.
#   B) App Store Connect API key: export these before running —
#        export ASC_KEY_ID=XXXXXXXXXX
#        export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#        export ASC_KEY_PATH=/absolute/path/AuthKey_XXXXXXXXXX.p8
set -euo pipefail

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd "$(dirname "$0")/.."

TEAM_ID="${1:-}"
ARCHIVE_PATH="build/DondeGO.xcarchive"
EXPORT_DIR="build/export"

if [ -n "$TEAM_ID" ]; then
  /usr/libexec/PlistBuddy -c "Set :teamID $TEAM_ID" ExportOptions.plist
fi

echo "==> Archiving (Release, https://dondego.cl/)…"
xcodebuild -project DondeGO.xcodeproj -scheme DondeGO \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  ${TEAM_ID:+DEVELOPMENT_TEAM=$TEAM_ID} \
  clean archive

echo "==> Exporting + uploading to App Store Connect…"
if [ -n "${ASC_KEY_ID:-}" ]; then
  # Export the .ipa, then upload with the API key (no Apple ID prompt).
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist ExportOptions.plist
  IPA=$(find "$EXPORT_DIR" -name '*.ipa' | head -1)
  xcrun altool --upload-app -f "$IPA" -t ios \
    --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
else
  # Direct upload via the signed-in Xcode account.
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist ExportOptions.plist
fi

echo "==> Done. Check App Store Connect → TestFlight for the processing build."
