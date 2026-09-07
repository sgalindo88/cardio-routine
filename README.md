# Cardio Routine

A guided workout timer built for a 65-year-old: large type, high contrast, spoken cues, looping
video demonstrations, and big buttons that work at arm's length in a living room.

**22 minutes** — 2 min warm-up · 2 rounds of 8 exercises (45s work / 15s march) · 1 min water
break · 3 min cool-down.

No build step, no bundler, no npm. Four files and a folder. The only external dependency is the
YouTube IFrame API, loaded at runtime and non-fatal if it fails.

---

## Run it

Double-click `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

A local server is worth it — the media fallback and wake lock behave more like production than
they do over `file://`.

## Deploy to GitHub Pages

Push, then **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**. Give it a
minute; it'll be at `https://<you>.github.io/<repo>/`.

Add it to her home screen from the browser's share menu so it opens like an app, without the
address bar eating vertical space.

## Using it

| Control | What it does |
|---|---|
| **Start** | Begins the warm-up |
| **Pause / Resume** | Freezes the clock. Space bar also works |
| **⏮ / ⏭** | Previous / next interval. ⏮ restarts the current one if you're more than 3s in. Arrow keys too |
| **+15** | Adds 15 seconds to the interval on screen — handy on a rest that needs to be longer |
| **Reset** | Back to the start. Nothing is recorded |

**Settings** adjusts work / recover / water-break durations, and toggles the countdown beeps and
the spoken cues independently. Changes are remembered.

**History** lists completed sessions. Only finished sessions are recorded — stopping early leaves
no trace.

## Files

```
index.html    markup: 3 screens, 2 panels, the video panel
styles.css    palette, layout, orientation handling
config.js     stays blank — sync config lives on the device, not the repo
app.js        data, timeline, timer, audio, wake lock, storage, sync
media/        optional exercise loops — see media/README.md
```

The Apps Script source and its setup guide are kept outside this repo as local notes, so the
repository holds only what the site serves.

Editing the workout means editing the `EXERCISES`, `WARMUP`, and `COOLDOWN` arrays at the top of
`app.js`. Nothing else needs to change — the timeline, the "Next up" preview, the round labels and
the total duration are all derived from them.

## Exercise videos

Each exercise shows a short looping clip of the movement, muted, pulled from a single source video
via the YouTube IFrame API. The clip is seeked to that exercise's window and looped for the whole
interval.

Every warm-up, exercise, and cool-down segment has a clip — 26 of the 43 segments. The 15-second
recovery marches and the water break deliberately show no video: it is a rest she does not need
demonstrated, and reloading the player between every exercise is churn. Those segments collapse the
panel and lean on the name, cue, and "Next up" preview instead.

Clips are defined at the top of `app.js`:

```js
var VIDEO_ID = 'HP_P-A3crw4';
var CLIPS = { 'half-jacks': [628, 638], ... };   // [startSeconds, endSeconds]
```

To retime a clip or point at a different video, edit those values. Nothing else needs to change.

**The warm-up and cool-down were both matched to the source footage**, so each clip shows the
movement its cue describes. They were originally written independently of the video and have been
reshaped to fit what it actually demonstrates.

Two caveats. The leg she demonstrates on screen will not always be the side the cue names — the cue
is authoritative. And the warm-up clips were identified by stepping through the video frame by
frame, so give them a quick look before she uses this in earnest.

**Video is decoration, never a dependency.** If the API fails to load, the device is offline, or
embedding is disabled on the video, the panel falls back to a local loop from `media/` if one
exists and otherwise collapses — the timer, audio cues, and history all run exactly the same. The
player is also hidden while paused, because a paused YouTube frame fills with its own title bar,
play button, and suggested-video thumbnails.

### Local loops

`media/` still works as an offline fallback. Drop in `half-jacks.webp` and it is used whenever the
video is unavailable. See `media/README.md`. The folder ships empty.

## Google Sheets sync

Off by default. When configured, each completed session appends a row to a private spreadsheet so
the log survives a wiped device and you can check her progress remotely.

**The endpoint is stored per-device, not in this repo.** `config.js` stays blank: GitHub Pages
needs a public repo on the free tier, and public repos are scraped by bots hunting for endpoints.
Nothing about the sheet appears in this repository or in the page source.

To connect a device:

1. **Settings → Sheet sync**, paste the Apps Script `/exec` URL and token, press **Save**.
2. Press **Test** to confirm it connects — this writes nothing to the sheet.
3. To set up a second device without retyping, press **Copy setup link** and open that link once
   on the other device. The app saves the config and strips it from the address bar. The link
   contains the token, so treat it like a password.

**Clear** removes it from the device and the app goes back to local-only.

The app never waits on the network: sessions are saved locally first and pushed in the background
with retry. It runs identically with the wifi off.

## Notes

- **Audio needs one tap.** Browsers block sound until the user interacts, so the first **Start**
  press is what unlocks it. This is a browser rule, not something the app can skip.
- **The screen stays awake** during a session via the Wake Lock API, where supported. Where it
  isn't, the app carries on unchanged — set the device's screen timeout to 5+ minutes.
- **Spoken cues** use the browser's built-in voice. If the device has none, the toggle hides
  itself.
- **Timing is clock-based**, not tick-counted, so backgrounding the tab mid-workout and coming
  back doesn't leave the timer minutes behind.
- **Ads.** Embedded YouTube can serve ads, which replace the clip mid-interval. There is no player
  parameter that prevents this. When one is detected the panel shows a notice across the top of the
  player, and **the player stays tappable so YouTube's own "Skip" button can be reached** — an
  earlier version blocked taps to stop her opening YouTube by accident, which also made ads
  unskippable. If she ignores the ad entirely the timer, audio cues, and history are unaffected and
  the clip returns by itself when the ad ends.

  Because the player is tappable, a stray tap can pause the demo. The clip poller notices a
  playback state of PAUSED while the workout is running and restarts it within a fifth of a second,
  so this self-corrects.

  Ads are inherent to embedding someone else's monetised video. Populating `media/` with local
  loops is the only way to eliminate them outright.
- **Captions are force-disabled** on every clip load, since they render over the bottom of the
  frame and reappear each time a video is loaded.
