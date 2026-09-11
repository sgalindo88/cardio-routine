# Cardio Routine

A guided workout timer built for a 65-year-old: large type, high contrast, spoken cues, looping
video demonstrations, and big buttons that work at arm's length in a living room.

Styled after a commercial fitness app — near-white ground, heavy black type, the clip as the hero,
and progress shown as a horizontal bar that is also the pause button — but with the type and touch
targets sized up, and an exercise description the reference does not have.

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
| **The progress bar** | Tap anywhere on it to pause or resume. It is also how far through the interval she is. Space bar works too |
| **⏮ / ⏭** | Previous / next interval. ⏮ restarts the current one if you're more than 3s in. Arrow keys too |
| **+15** | Adds 15 seconds to the interval on screen — handy on a rest that needs to be longer |
| **X**, top left | Ends the workout and returns to the start. Nothing is recorded |

**The start screen** lists every exercise in the session, in order and with durations, grouped into
warm-up, workout and cool-down. The list is generated from the same arrays and settings the
timeline is built from, so it cannot fall out of step with what actually runs — change a duration
in Settings and the list updates with it. Editing the `EXERCISES`, `WARMUP` or `COOLDOWN` arrays
updates the list automatically too; there is no second copy to maintain.

**Settings** adjusts work / recover / water-break durations, and toggles the countdown beeps and
the spoken cues independently. Changes are remembered.

**History** lists completed sessions, with her badges above them. Only finished sessions are
recorded — stopping early leaves no trace.

## Badges

Eighteen badges across four families — sessions completed, runs, consistency across weeks and
months, and total time moved — each with its own accent colour. The panel shows what she has earned
and the next target in each family with a progress meter; newly earned ones animate in on the
"Well done" screen.

**A rest day does not break a run.** A run continues while sessions are no more than two days
apart. This is deliberate: strict day-resets are where habit apps lose people, because a lost
streak is felt far more sharply than it was ever enjoyed, and one miss easily becomes "might as
well stop". A rest day is also the right call for a 65-year-old doing daily cardio.

**Badge state is in `cardio.awards.v1`, not derived from history.** Totals and the run counter are
incremented once per finished session and never recomputed; `earned` is append-only. This matters
because history is capped at 200 entries and **Clear history** empties it — anything derived from
history would quietly erase what she had earned. The consistency family is the one exception, since
it is about how sessions spread over time; badges already earned still stay earned.

All date maths uses the device's **local** calendar date, never the stored UTC timestamp. Bucketing
by UTC puts a 9pm session on the following day anywhere behind UTC, which would break a run or
falsely extend one. Day numbers go through `Date.UTC()` on the local components, so DST cannot
shift them either.

Badges are sent to the Sheet as an `awards` row each time one is earned, if sync is configured.
That needs the `awards` type in `sheets/Code.gs`, pasted into the Apps Script editor and
redeployed; until then those rows come back `unknown type: awards`, stay queued, and retry — so
updating the app and the script in either order loses nothing. Badges credited by the one-time
backfill are not sent, since the sheet already has the sessions behind them.

## Files

```
index.html    markup: 3 screens, 2 panels, the video stage
styles.css    palette, layout, type scale, orientation handling
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

**If an exercise shows no clip and the gap closes up**, the app has marked that file unplayable.
`clipFailed` in `app.js` is the only thing that does this and it is written in exactly one place —
the video element's `error` handler. That handler must identify the failed file by `currentSrc`,
not by the app's own `clipSrc`: an error can arrive after the next segment has swapped the src, and
blaming `clipSrc` kills the *incoming* clip instead. Only `MEDIA_ERR_SRC_NOT_SUPPORTED` is treated
as permanent, and `start()` clears the map so a bad load does not outlive the session.

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
- **Two colours carry the whole app.** Coral while she is working, a calm teal for warm-up,
  recovery, the water break and cool-down. That one distinction is the only thing colour is asked
  to encode, so it survives being glanced at from across the room. Coral also marks the primary
  action on the start and finished screens.
- **The pause glyph stays dark.** It sits mid-bar, so it spends the first half of each interval on
  the pale track and the second half on the coloured fill. White reads at 1.26:1 against the track
  — invisible. Dark measures 14.5:1, 4.9:1 and 3.2:1 across the three cases.
- **Type is sized to be read from across the room**, not to fit the most on screen. The exercise
  cue lands at 25px on a phone — past iOS's "Large Text" setting — and the exercise name around
  26px. Sizes are `clamp()`s whose *floor* is what applies on a phone, so the handset case is
  fixed and predictable and only larger screens scale up.
- **The clip absorbs whatever the text does not use.** `.wo-info` is `flex: 0 0 auto` and `.wo-stage`
  is `flex: 1 1 auto`, so raising the type takes room from the clip and nothing else — no other
  element needs adjusting to compensate. Two smaller tiers, both keyed on height, handle screens
  that cannot hold the full scale: a 4"-class phone in portrait, and any phone in landscape.
- **Overflow on the workout screen is silent.** The stage has `min-height: 0`, so if the text block
  ever outgrows the screen the clip shrinks to nothing first and then content is clipped rather
  than scrolled, with nothing on screen to say so. After changing sizes or spacing there, check the
  longest cue in the routine at 320×568 as well as at a modern phone size.
