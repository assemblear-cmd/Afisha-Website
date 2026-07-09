---
name: instagram-story
description: Post an Instagram Story for the next upcoming DondeGO Santiago event. Requires a local session with the Claude in Chrome browser extension and an Instagram account already logged in. Trigger with /instagram-story or "post a story / запость сторис".
---

# DondeGO Instagram Story agent

You are posting ONE Instagram Story for the next upcoming Santiago event.
The generator script does the data + design work; you drive the logged-in
browser. Follow the steps in order and stop at the first blocked step —
never improvise other actions on the Instagram account.

## Hard rules

- Only create a story with the image the generator produced. Do not like,
  follow, comment, message, change settings, or touch anything else in the
  account.
- Post at most one story per run. If `alreadyPosted` is true in the generator
  output, stop and report — do not repost without the user asking.
- If the Instagram UI does not match these steps (logged out, checkpoint /
  verification screen, unexpected dialog), stop immediately and report what
  you see. Never enter credentials or verification codes yourself.
- Mark the event as posted (step 5) ONLY after you can see the story is live.

## Steps

1. **Generate the story image** (repo root):

   ```bash
   node scripts/instagram-story/generate-story.mjs
   ```

   Parse the JSON it prints: `imagePath` (1080×1920 PNG), `event.id`,
   `event.title`, `storyLink`, `markPostedCommand`. On `ok: false` or a fetch
   error, report and stop. If `usedCover` is false, that's fine — the
   branded gradient design is intentional.

2. **Open Instagram** in the connected Chrome (browser extension tools):
   go to https://www.instagram.com/ and confirm the account is logged in
   (home feed with the left sidebar). If a login screen appears — stop and
   ask the user to log in first.

3. **Create the story.** Try in this order:
   - Sidebar **Create (+)** → if the menu offers **"Story"** (Historia),
     choose it; a file picker opens — upload the PNG at `imagePath`.
   - Otherwise click the **"Your story"** avatar with the `+` ring at the top
     of the feed; it opens the same picker.
   - If neither exposes a story option (desktop rollout varies), open
     https://www.instagram.com/stories/create/ directly.
   - If the file picker cannot be automated by the browser tooling, tell the
     user the exact `imagePath` so they can select it manually, wait for
     them, then continue.

4. **Before sharing**, optionally add the link sticker: sticker icon →
   "Link" → paste `storyLink` → Done. Then press **"Add to your story" /
   "Share"**. Wait until the composer closes and the "Your story" avatar
   shows the active (colored) ring — that is the success signal. Take a
   screenshot for the report.

5. **Mark as posted** so the next run picks the next event:

   ```bash
   node scripts/instagram-story/generate-story.mjs --mark-posted <event.id>
   ```

   (the exact command is in `markPostedCommand`).

6. **Report**: event title, date, whether the link sticker was added, and the
   screenshot. If anything failed, say exactly at which step and why.

## Notes

- The generator reads the live site (`DONDEGO_API_BASE`, default
  https://dondego.cl) and keeps state in
  `scripts/instagram-story/.state/posted.json` (gitignored). It never marks
  events itself.
- Scheduling and setup live in `docs/instagram-story-agent.md`.
