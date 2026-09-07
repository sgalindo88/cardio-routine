# Changelog

Notable changes to the Cardio Routine app. Newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] — 2026-09-07

Video coverage completed for the warm-up; recovery intervals deliberately left without it.

### Added

- **Warm-up clips.** All four warm-up segments now show real footage, located by stepping through
  the source video's opening two and a half minutes.

### Changed

- **Warm-up reshaped to match available footage**, the same way the cool-down was in 1.1.0. The
  source video is continuous cardio and contains no mobility warm-up, so "Shoulder Rolls & Arm
  Circles", "Heel-Toe Rocks", and "Gentle Torso Twists" are replaced by "Easy Walk in Place",
  "Arm Raises — Forward and Up", and "Heel Digs" — all of which it does demonstrate. Duration
  unchanged at 2 minutes.
- **Recovery intervals no longer show video.** The 15-second marches between exercises collapse the
  panel instead. It is a rest that does not need demonstrating, and reloading the player between
  every exercise is churn.

### Fixed

- **Captions came back on some clips.** The captions module reloads asynchronously after
  `loadVideoById`, so the single call at load time was regularly too early. It is now retried
  across the re-initialisation window and again whenever playback starts, and `setOption` is used
  alongside `unloadModule` since the latter alone does not always stick.
- The "Arm Raises" cue described both arms moving together; the footage shows an alternating
  single-arm reach. Cue corrected to match.

### Notes

- 26 of 43 segments carry a clip. The other 17 are the 16 recovery marches and the water break,
  all intentionally without video.

---

## [1.1.0] — 2026-09-07

Exercise demonstrations are now real video instead of drawn figures.

### Added

- **YouTube exercise clips.** Each exercise plays a short muted loop of the movement, pulled from
  one source video (`HP_P-A3crw4`) via the YouTube IFrame API and seeked to a per-exercise window.
  The march clip doubles as the visual for every recovery interval.
- **Clip looping by polling.** `getCurrentTime()` is checked every 200ms and seeked back just
  before the end point. Letting the player reach `endSeconds` fires `ENDED` and produces a visible
  black flash on each loop — four or five times per 45-second interval.
- **Paused card.** Pausing hides the player and shows a plain card of the same size. A paused
  YouTube frame fills with its own title bar, play button, share button, suggested-video
  thumbnails, and captions, which is exactly the clutter this UI avoids.
- **Cool-down clips matched to the source footage.** The stretch block in the source video was
  stepped through frame by frame to locate real windows for the quad, calf, and hamstring
  stretches.

### Changed

- **Cool-down reshaped to match available footage.** "Chest & Shoulder Opener" and "Overhead Reach
  & Side Bend" are replaced by "Calf Stretch — Right" and "Calf Stretch — Left", which the source
  video actually demonstrates. Duration is unchanged at 3 minutes.
- Info panel is now vertically centred, so segments without a video don't leave a gap where the
  panel used to be.
- Captions are force-disabled on every clip load. `cc_load_policy` alone is overridden by a
  viewer's global caption setting, so the captions module is unloaded explicitly each time.
- The player iframe is scaled slightly past its frame and clipped, pushing YouTube's residual
  chrome outside the visible area.

### Removed

- **All SVG stick figures and their CSS animations** (~124 lines). Segments with no clip now show
  name and cue only, with the panel collapsed.

### Notes

- 39 of 43 segments have a clip. The three warm-up mobility moves and the water break are
  text-only — the source video has no matching footage.
- The leg demonstrated on screen in a cool-down clip will not always match the side named in the
  cue. The cue is authoritative.
- Video is decoration, never a dependency. If the API fails, the device is offline, or embedding
  is disabled, the panel falls back to `media/` or collapses; the timer, audio, and history are
  unaffected.
- Embedded YouTube can serve ads, which would replace the clip mid-interval. No player parameter
  prevents this.

---

## [1.0.0] — 2026-09-07

First working version.

### Added

- **22-minute guided session** — 2 min warm-up, 2 rounds of 8 exercises (45s work / 15s march),
  1 min water break, 3 min cool-down. The timeline, round labels, "Next up" preview, and total
  duration are all derived from the exercise arrays.
- **Clock-based timer.** Segment deadlines are absolute and the display is computed from the clock
  each frame. Counting `setInterval` ticks drifts and is throttled or frozen outright when a mobile
  browser backgrounds the tab, which would leave the timer minutes behind mid-workout.
- **Countdown beeps and spoken cues**, independently toggleable. Web Audio oscillators and
  `speechSynthesis` — no audio files. The `AudioContext` is created inside the first Start tap
  because iOS refuses audio created outside a user gesture.
- **Controls** — Start, Pause/Resume, Reset, skip forward/back, and `+15s`. Back restarts the
  current interval if more than 3 seconds in, otherwise steps to the previous one.
- **Adjustable durations** for work, recovery, and the water break, with limits and persistence.
- **Screen wake lock** while a session runs, re-acquired when the tab returns to visible.
- **Session history** — completed sessions only, stored locally with a dated list view.
- **Optional Google Sheets mirror.** Completed sessions append to a private spreadsheet through an
  Apps Script endpoint. Rows queue locally and flush in the background with retry, so the app never
  waits on the network and runs fully offline.
- **Warm-up and cool-down**, which the original spec omitted — it started cold at full effort and
  ended abruptly.

### Security

- **Sync endpoint stored per-device, never committed.** Free-tier GitHub Pages requires a public
  repo, and public repos are continuously scraped for credentials. `config.js` ships blank; the URL
  and token live in `localStorage`, entered in Settings or via a one-time `#sync=` setup link that
  is stripped from the address bar on arrival.
- Endpoint is write-only with no `doGet`, rate limited per device, and has a kill switch.

### Fixed

- `finish()` was not idempotent and wrote duplicate history and sync rows when the end of the
  timeline was reached more than once.
- The exercise image was layered over the SVG figure instead of replacing it. `hidden` is an
  `HTMLElement` property that does not exist on `SVGElement`, so `svg.hidden = true` set a JS
  expando rather than the attribute and the element kept rendering.
- A slow-loading image could resolve after the user had skipped on, showing the wrong exercise.
