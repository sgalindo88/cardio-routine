# Cardio Routine

A guided workout timer built for a 65-year-old: large type, high contrast, spoken cues, looping
video demonstrations, and big buttons that work at arm's length in a living room.

**22 minutes** — 2 min warm-up · 2 rounds of 8 exercises (45s work / 15s march) · 1 min water
break · 3 min cool-down.

No build step, no bundler, no npm, and no external dependencies at all. Four files, a folder of
short video clips, and it runs entirely offline.

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
media/        14 square exercise clips, ~1.4MB total — see media/README.md
```

The Apps Script source and its setup guide are kept outside this repo as local notes, so the
repository holds only what the site serves.

Editing the workout means editing the `EXERCISES`, `WARMUP`, and `COOLDOWN` arrays at the top of
`app.js`. Nothing else needs to change — the timeline, the "Next up" preview, the round labels and
the total duration are all derived from them.

## Exercise videos

Each exercise shows a short looping clip of the movement, muted, played from a local file in
`media/`. There is no player UI, no network request, and nothing to tap — a plain `<video>` element
with `muted loop playsinline` and no `controls` attribute.

Every warm-up, exercise, and cool-down segment has a clip — 26 of the 43 segments, drawn from 14
files. The 15-second recovery marches and the water break deliberately show nothing: it is a rest
that does not need demonstrating. Those segments collapse the panel and lean on the name, cue, and
"Next up" preview instead.

Clips are mapped at the top of `app.js`:

```js
var CLIPS = { 'half-jacks': 'half-jacks.mp4', ... };
```

To swap a clip, drop a new file in `media/` and point the entry at it. A file that is missing or
will not play collapses that segment's panel rather than showing a broken element.

**These replaced a YouTube embed**, and with it every problem that came from running someone else's
player: ads that could interrupt mid-exercise, branding and title overlays, captions burning
themselves over the frame, and a hard dependency on the network. See `media/README.md` for how the
clips were produced.

Clips are square, cropped 360×360 out of the 640×360 source. Both of the source's burned-in
overlays sit in corners the square excludes, and because the crop is tighter the figure ends up
larger on screen than a 16:9 version would be.

One note on the footage: the leg demonstrated on screen will not always be the side a cool-down cue
names. The cue is authoritative.

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
- **Fully offline.** Nothing is fetched at runtime. Once the page and clips are cached she can work
  out with the wifi off.
