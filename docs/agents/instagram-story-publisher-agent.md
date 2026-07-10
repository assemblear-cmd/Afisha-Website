# Instagram Story Publisher Agent

Last updated: 2026-07-09

## Mission

This agent prepares and publishes DondeGO Instagram Stories from real event posters, using the connected Android phone over USB. It should preserve the successful posting workflow and improve it after each run.

Primary goal: publish one event poster to Instagram Stories with event/date info on the creative and the event URL only through Instagram's native Link sticker.

## Operating Rules

- Do not publish the final Story without fresh user approval, unless the current user request explicitly says to publish or to complete the full posting flow.
- Use the physical Android phone over ADB, not Instagram web, for Stories.
- Keep the event URL out of the image itself. The link belongs only in the Instagram Link sticker.
- Do not add `DondeGO`, `Agenda Santiago`, or any top branding unless the user explicitly asks.
- Put event/date/venue text directly over the poster. Avoid boxed UI, visible link blocks, or framed cards.
- Verify the Story in the Instagram editor before publishing and verify the published Story after publishing.
- Keep screenshots in `/tmp/` for quick inspection during the run.

## Environment

Repo:

```text
/Users/skif/Documents/GitHub/Afisha-Website
```

ADB:

```text
/Users/skif/Library/Android/sdk/platform-tools/adb
```

Known phone:

```text
Serial: R3CWA0H83HM
Model: SM-S918U1
Instagram package: com.instagram.android
```

Useful checks:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" devices
"$ADB" shell getprop ro.product.model
"$ADB" shell pidof com.instagram.android || true
```

If Instagram opens a black Story preview, grant media permissions:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" shell 'pm grant com.instagram.android android.permission.READ_MEDIA_IMAGES 2>&1 || true; pm grant com.instagram.android android.permission.READ_EXTERNAL_STORAGE 2>&1 || true'
```

## Event Selection

Prefer live scraped events from DondeGO:

```bash
curl -sS 'https://dondego.cl/api/v1/events?limit=80'
```

Fallback endpoint:

```bash
curl -sS 'https://dondego.cl/api/events'
```

Choose an event that has:

- a real poster or venue image, not a generic placeholder;
- a future local date in `America/Santiago`;
- a real `sourceUrl` or ticket URL;
- a different event from the most recently posted Story unless the user asks for a specific one.

Convert UTC `startsAt` to Santiago local time before writing the date text.

## Creative Format

Output:

```text
1080x1920 JPEG
/tmp/dondego-story-<event-slug>.jpg
```

Design rules from the successful 2026-07-09 run:

- full-bleed poster background;
- no top `DondeGO` or `Agenda Santiago`;
- no visible `link de evento` block;
- no visible URL text on the image;
- event info is text over the poster, without a card/frame;
- text can use shadow/outline for readability;
- keep important event title/date away from Instagram bottom controls.

Recommended content:

```text
<LOCAL DATE> · <LOCAL TIME>
<EVENT TITLE>
<short category/description if useful>
<venue>
```

Successful example:

```text
16 JUL · 19:00
PATA DE CABRA
Festival internacional de magia
Teatro Municipal de Las Condes
```

## Build Story Image

Use Pillow to compose the image. Prefer a full-bleed crop that keeps the important poster text visible. Apply only subtle top/bottom fades if needed for readability; avoid card-like blocks.

Successful output from last run:

```text
/tmp/dondego-story-pata-de-cabra.jpg
```

Successful source image:

```text
https://www.tmlascondes.cl/wp-content/uploads/2026/06/WEB_PATA-DE-CABRA_DEST-1.jpg
```

Successful event URL:

```text
https://sertex.stonline.cl/tmlc/tmlcFrontOffice/Venta/Funciones?vprId=30782
```

## Push Image To Phone

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
PHONE_DIR='/sdcard/Pictures/DondeGO'
PHONE_FILE="$PHONE_DIR/dondego-story-<event-slug>.jpg"

"$ADB" shell mkdir -p "$PHONE_DIR"
"$ADB" push /tmp/dondego-story-<event-slug>.jpg "$PHONE_FILE"
"$ADB" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://$PHONE_FILE" >/dev/null
```

Find the media ID:

```bash
"$ADB" shell "content query --uri content://media/external/images/media --projection _id:_display_name:date_added | grep dondego-story-<event-slug>.jpg | tail -1"
```

Note: Android `content query --where "_display_name='...'"` can fail on filenames with hyphens. The grep approach worked reliably.

## Open Instagram Story Editor

Replace `<MEDIA_ID>` and `<EVENT_URL>`:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" shell 'am start -W -a com.instagram.share.ADD_TO_STORY -d content://media/external/images/media/<MEDIA_ID> -t image/jpeg --es content_url "<EVENT_URL>" --es source_application "dondego" --grant-read-uri-permission -p com.instagram.android'
```

Wait for the editor to render:

```bash
sleep 2
"$ADB" exec-out screencap -p > /tmp/instagram-story-editor.png
"$ADB" shell uiautomator dump /sdcard/window.xml >/dev/null
"$ADB" shell cat /sdcard/window.xml | sed 's/></>\n</g' | grep -E 'Your story|Close Friends|Share to|Stickers|Text'
```

Expected editor controls include:

```text
Text
Stickers
Your story
Close Friends
Share to
```

## Add Link Sticker

Successful coordinates on SM-S918U1 portrait:

```text
Open Stickers: 1313 448
Tap Link Sticker after search: 190 1196
Tap Done in link form: 1300 530
Publish to Your story: 330 2790
Open own Story from home tray: 190 520
```

Coordinates can drift. Prefer UI tree verification when possible.

Flow:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"

# Open sticker tray.
"$ADB" shell input tap 1313 448
sleep 1

# If search is focused with "link" already, Link Sticker may be visible.
# Otherwise type link in the sticker search field.
"$ADB" shell input text link

# Tap Link Sticker.
"$ADB" shell input tap 190 1196
sleep 1

# Type event URL.
URL='<EVENT_URL>'
"$ADB" shell input text "$URL"
sleep 1

# Confirm.
"$ADB" shell input tap 1300 530
sleep 2
```

Verify the Link sticker is present and not covering event/date text:

```bash
"$ADB" exec-out screencap -p > /tmp/instagram-story-with-link.png
"$ADB" shell uiautomator dump /sdcard/window.xml >/dev/null
"$ADB" shell cat /sdcard/window.xml | sed 's/></>\n</g' | grep -E 'Your story|Close Friends|Share to|Sticker|Tap for more|SERTEX|sertex|Link'
```

Successful Link sticker UI evidence:

```text
Sticker. Touch and hold to reposition...
Tap for more
SERTEX.STONLINE.CL
```

## Publish And Verify

Publish:

```bash
"$ADB" shell input tap 330 2790
```

Wait and inspect:

```bash
sleep 4
"$ADB" exec-out screencap -p > /tmp/instagram-story-after-publish.png
"$ADB" shell uiautomator dump /sdcard/window.xml >/dev/null
"$ADB" shell cat /sdcard/window.xml | sed 's/></>\n</g' | grep -E 'Your story|Activity|Share on|Send|Mention|More|Stories archive|OK|Posting|Try Again|story, [0-9]+ of [0-9]+'
```

If Instagram shows the `Stories archive` dialog, tap OK:

```bash
"$ADB" shell input tap 720 2030
```

Verification levels:

1. Home tray shows own Story as `serg.stepmail's story, 0 of 1, Unseen` or similar.
2. Open own Story and confirm the published viewer, not the editor.
3. UI tree contains `reel_viewer_root` and the self-story toolbar:

```text
Activity
Share on…
Send
Mention
More
```

Successful final screenshot from last run:

```text
/tmp/instagram-pata-published-view.png
```

## Last Successful Run

Date: 2026-07-09

Event:

```text
Pata de Cabra
Teatro Municipal de Las Condes
2026-07-16 19:00 America/Santiago
```

Poster:

```text
https://www.tmlascondes.cl/wp-content/uploads/2026/06/WEB_PATA-DE-CABRA_DEST-1.jpg
```

Link sticker URL:

```text
https://sertex.stonline.cl/tmlc/tmlcFrontOffice/Venta/Funciones?vprId=30782
```

Phone media ID:

```text
31508
```

Output image:

```text
/tmp/dondego-story-pata-de-cabra.jpg
```

Confirmed published by:

```text
reel_viewer_root
Activity / Share on… / Send / Mention / More toolbar
```

## Training Log

Append every future run here.

### 2026-07-09 - Successful

- Published `Pata de Cabra`.
- Removed top `DondeGO / Agenda Santiago` branding.
- Removed visible link block from image.
- Put date/title/venue directly on the poster with text shadow only.
- Added event URL only through Instagram Link sticker.
- Verified published Story from the owner's viewer.

### Known Issues

- Instagram web cannot reliably publish Stories; use Android app over USB.
- Instagram may show black image if media permissions are denied.
- ADB coordinates are device/UI-version dependent; always verify with screenshot and UI tree before publishing.
- The Link sticker can cover event art; check `/tmp/instagram-story-with-link.png` before tapping `Your story`.
