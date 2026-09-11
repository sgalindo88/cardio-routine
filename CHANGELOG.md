# Changelog

Notable changes to the Cardio Routine app. Newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] — 2026-09-11

### Added

- **An icon.** A white heart on the app's coral, replacing the `data:,` placeholder that existed
  only to suppress a 404.
  - The tab icon is an inline SVG data URI — no request, no file, sharp at any size.
  - `apple-touch-icon.png` (180) and `icon-192/512.png` exist because a home-screen icon cannot be
    SVG: iOS ignores anything else, and the home screen is where this is actually launched from.
    Without them iOS uses a screenshot of the page.
  - `manifest.webmanifest` carries the name and the two PNGs so Android's "Add to Home screen" has
    something to use.
  - The PNGs are full-bleed squares while the tab icon is rounded, because iOS masks its own
    corners and would round an already-rounded icon twice.

### Notes

- The PNGs are drawn from the parametric heart curve at 4× and downsampled, rather than rasterised
  from the SVG: ImageMagick's own SVG renderer was adding a stray dark outline and sizing the shape
  inconsistently. Checked legible at 16, 24, 32 and 48px.
- **No launch behaviour changed.** The manifest deliberately omits `display`, and there is no
  `apple-mobile-web-app-capable` meta, so the app still opens exactly as it did. Adding either
  would make it launch without browser chrome — a real improvement given how much vertical space
  this screen wants, but a different change from adding an icon.

---

## [2.3.0] — 2026-09-11

### Added

- **Badges sync to the Sheet.** A new `awards` row type, one row per badge as it is earned:
  `timestamp | date | time | badge_id | name | family | device | app_version`. Requires the updated
  `sheets/Code.gs` to be pasted in and redeployed — the app's rows are rejected as
  `unknown type: awards` until then, and a rejected row stays queued and retries, so nothing is
  lost by updating the two in either order.
- Badges credited by the one-time backfill are deliberately not sent. `finish()` only queues what
  that session crossed, so an existing user does not blast a burst of rows for sessions the sheet
  already holds. Each badge is queued as its own row, so a partial send never loses one.

### Fixed

- **Rows queued while a sync was in flight were silently destroyed.** `flush()` snapshots the
  outbox, and on success `done()` saved `[]` over the whole thing — discarding anything appended
  after the snapshot was taken. This is not theoretical and not new: any settings change made while
  a history row was in the air has been vanishing since sync shipped. Badges made it constant,
  because `finish()` queues the history row (which starts a flush) and then a row per badge
  microseconds later. Caught by the end-to-end test: the badge appeared on screen, the sheet got
  nothing, and the outbox read empty. `done()` now trims the *current* outbox by the number
  actually sent and re-flushes if anything is left.
- **`sheets/Code.gs`: a malformed `ended_at` reached `Utilities.formatDate` unguarded.** Found
  while testing the live endpoint — posting `ended_at: "not-a-date"` returned `ok:true`, so it was
  either writing a junk cell or relying on luck. A `safeDate()` helper now falls back to the row's
  own timestamp for anything that is not a real date, and both `history` and `awards` use it.

### Notes

- Verified against the live deployment: ping, `history`, `settings`, bad token, unknown type, empty
  body, malformed JSON, the 4096-byte cap, hostile numbers, and over-long device and version
  strings. End to end through the app: Save, Test, a settings change, a completed session, and an
  offline session that queued and then drained itself on reconnect. All requests go out as
  `text/plain;charset=utf-8` — `application/json` would add a CORS preflight Apps Script cannot
  answer, and every write would fail.
- The endpoint is write-only by design, so these tests confirm the script accepted each row without
  throwing; they cannot confirm the stored cell values.
- The queue-during-flush fix is verified against the live endpoint by parking the counters one
  session short of three thresholds at once: finishing sends `history` plus three `awards` rows,
  all three badges show on screen, and the outbox drains to zero. Before the fix the same run sent
  `history` alone.

---

## [2.2.0] — 2026-09-11

### Added

- **Badges.** Eighteen across four families, each with its own accent, shown at the top of the
  History panel and revealed on the finished screen when newly earned.
  - **Milestones** (1, 5, 10, 25, 50, 100 sessions), **runs** (3, 7, 14, 30), **consistency**
    (three in a week, five in a week, four straight weeks of three-plus, twelve in a month) and
    **time moved** (1, 5, 10, 24 hours).
  - The History panel shows what she has earned, then the next target in each family with a
    progress meter. Only the next one per family is shown rather than all eighteen: a wall of
    greyed-out tiles reads as a list of failures, and progress toward the next is what actually
    moves behaviour.
  - Newly earned badges scale in on the "Well done" screen, staggered if more than one lands at
    once. Honours `prefers-reduced-motion`.
  - Icons are four stroked line-art `<symbol>`s in an inline sprite, drawn in `currentColor` so the
    family accent comes from CSS. No new files.
- **A rest day does not break a run.** A run continues while consecutive sessions are no more than
  two days apart; two days off starts it over, and the panel says so plainly. Strict day-resets are
  where habit apps lose people — the loss of a long streak is felt far more sharply than the gain
  ever was, and one miss tends to become "might as well stop". A rest day is also simply the right
  call for a 65-year-old doing daily cardio.

### Changed

- **Badge state lives in its own key, `cardio.awards.v1`**, not derived from history. Totals and
  the run counter are incremented once per finished session and never recomputed, and `earned` is
  append-only. This is deliberate: history is capped at 200 entries and "Clear history" empties it,
  so anything derived from it would silently erase what she had earned. Verified that clearing
  history leaves all badges and the session total intact, across a reload.
  - The consistency family is the exception — it is about how sessions spread across weeks and
    months, so it must read the history. It degrades honestly: badges already earned stay earned,
    only future evaluation restarts from the emptied array.
  - On first run it backfills from whatever history exists, so an existing user does not restart at
    zero, then latches. Backfilled badges deliberately do not animate — she did not just earn them.

### Fixed

- **"Session number N" on the finished screen capped at 200.** It counted `hist.length`, and
  `finish()` trims that array to the last 200 entries, so it would have read "Session number 200"
  forever. It now counts the awards total, which is never trimmed.

### Notes

- All date maths runs on the device's local calendar date, not the stored UTC timestamp. Bucketing
  by UTC would push a 9pm session onto the following day in any timezone behind UTC, which either
  breaks a run or falsely extends one. Day numbers go through `Date.UTC()` on those local
  components, which also makes DST a non-issue.
- Run rule verified against consecutive days, one rest day, two days off, twice in one day, and
  month, year and DST boundaries. Backfill verified against a seeded 14-session history: 14
  sessions, best run of 5, and exactly the eight badges that history earns.
- Badges are not synced to the Sheet. The Apps Script that receives those rows lives outside this
  repo, so sending a new row type would need a matching change there first.

---

## [2.1.0] — 2026-09-11

### Added

- **The full session plan on the start screen**, below the existing block: every exercise she will
  do, in order, with its duration. Grouped into Warm-up, Workout and Cool-down, each group showing
  its own running time.
  - Built from the same `WARMUP` / `EXERCISES` / `COOLDOWN` arrays and the same `settings` object
    `buildTimeline()` reads, so the list cannot drift from what actually runs. Verified: the three
    group durations sum to `timelineSeconds(buildTimeline(settings))` exactly, and stay equal after
    changing work, recover and water-break in the settings panel.
  - `renderPlan()` hangs off `renderStartSummary()`, which the settings panel already calls, so
    durations and the note update live as she adjusts them.
  - Group headings take the colour that group will show during the session — coral for the working
    intervals, calm for warm-up and cool-down — so the list previews the colour coding rather than
    introducing a third scheme.

### Changed

- **The start screen scrolls now**; it is the only one that does. `justify-content` stays
  `flex-start` there deliberately: centring a flex column that overflows puts the top of it out of
  reach. Checked at 320×568 and 390×844 that the title is visible at rest and the last row is
  reachable at the bottom.

### Notes

- Distinct exercises only. The routine also contains sixteen 15-second recovery marches and a water
  break; listing those as rows would treble the length of the list with repeats of a single line,
  so they are named in the Workout group's note instead ("2 rounds of these 8, with 15s marching
  between each and a 60s water break between rounds").
- No thumbnails, unlike the reference app's list. The clips are video with no poster images, and
  generating a tier of stills would add fourteen assets for a screen that is read once per session.
  Worth revisiting if the list ever needs to be scannable at a glance rather than read.

---

## [2.0.0] — 2026-09-11

Restyled after a commercial fitness app, from a reference video. The countdown ring is gone, the
clip is now the hero, and progress is a horizontal bar that doubles as the pause button.

### Changed

- **The clip is the hero.** It takes every pixel the text block does not need, instead of sitting
  below the text in whatever was left. On a 390×844 phone the smallest clip in the routine went
  from 265px to 358px, and at 320×568 from 174px to 174px — every size gained, none lost.
- **The countdown ring is gone**, replaced by a full-width bar that fills left to right as the
  interval is spent. The bar is also the pause button, as in the reference. `RING_C`, the SVG and
  all the ring CSS went with it.
- **The text block is left-aligned under the clip**: a large timer with the segment tag beside it,
  then the exercise name, then the cue. The reference has no cue line at all; keeping one is the
  deliberate departure, since reading the instruction from across the room is the whole point of
  this app.
- **Two colours, not five.** Coral `#E0564C` while she is working, a calm teal `#3F6F6B` for
  warm-up, recovery, the water break and cool-down. The old sage/ochre/terracotta/slate set is
  gone. Coral also carries the primary action on the start and finished screens.
- **Near-white ground** `#F6F4F3` in place of the warm paper `#F7F4EF`, with heavier, tighter black
  type. Buttons lost their outlines and drop shadow for flat tinted discs and full-round pills.
- **Reset moved into the header as an X**, where the reference puts its exit, freeing the bottom of
  the screen for the progress bar.
- Segments with no clip — the recovery marches and the water break — collapse the stage and centre
  their text, which is how the reference lays out its "get ready" screens.

### Fixed

- The pause glyph would have been white on the pale track for the first half of every interval —
  1.26:1, effectively invisible — because the icon sits mid-bar and the fill only reaches it at the
  halfway point. It is dark in both halves now: 14.5:1 on the track, 4.9:1 on coral, 3.2:1 on the
  calm fill, all clear of the 3:1 a glyph this size needs.
- `--sage` was still referenced by the settings toggles after the palette was replaced, which would
  have left them with no "on" colour at all. Every `var()` in the stylesheet now resolves.

### Notes

- `btn-toggle` is no longer a text button; it wraps the fill and an icon span, so `setToggle()`
  swaps the glyph and the `aria-label` rather than writing `textContent`, which would delete the
  fill out of the button.
- The progress fill is driven by `transform: scaleX()`, not `width` — it is written every animation
  frame, and it carries no transition, which would make it lag the number beside it.
- Verified across 390×844, 375×812, 320×568, 430×932, 360×780, 390×701 and 844×390: all 26
  clip-bearing segments render, no cue clipped, no overflow on either axis at any size. Pause and
  resume, the space bar, and the header X all checked by hand.
- Kept from the reference but sized up: its controls are small and low-contrast. Ours stay at 56px
  with a 62px bar, because they are pressed mid-exercise.
- Kept deliberately against the reference: bare seconds rather than `MM:SS` (fewer characters means
  much larger digits at the same width), and the clip keeps its rounded card and shadow, since our
  footage has a busy background where the reference's model is shot on white.

---

## [1.4.0] — 2026-09-11

The workout screen retuned for readability. It is used on a phone by someone in their sixties,
propped up across the room, and the exercise descriptions were too small to follow along with.

### Changed

- **The exercise cue is 25px on a typical phone**, up from ~15px — past iOS's "Large Text" setting.
  The exercise name went to ~30px from ~22px, the "Next up" line to ~18px from ~14px, and the
  header's round label and time-left readout to ~17px and ~15px from ~13px and ~12px.
- **The countdown shrank by a quarter to pay for it.** The ring was sized at up to 46vh / 72vw and
  is now 27vh / 46vw — 242px down to 179px on a typical phone. `.seconds` came down by the same
  factor (`min(16vh,24vw,5.25rem)`, each term 75% of the ring's) so the number keeps its proportion
  inside the ring instead of growing to fill it. **Change the two together**, or the digits stop
  fitting: at 179px the ring's inner clearance is 147px and "45" is 106px wide.
- **More air between the stacked components**, which at these sizes were reading as one block:
  `.info-area` 6px → 14px, `.wo-body` 10px → 20px, and a few px more under the header and above
  the controls. Net of the ring's donation, the clip still came out slightly larger than in 1.3.1.
- Settings and History text came up too, since the same person is reading it: row labels to 19px,
  their hints to 16px from 13px, history rows to 18px, panel notes and the sync fields to ~17px.
- The steppers in Settings drop from 56px to 48px taps so the larger row labels keep their width —
  "marching between moves" was breaking onto three lines. Still above the 44px touch minimum, and
  these are not buttons pressed mid-exercise.
- `.wo-head` may now wrap, and the round label's letter-spacing tightened from `.10em` to `.05em`.
  At the larger size "COOL-DOWN · 6 OF 6" plus the clock no longer fits one line on a 320px screen;
  the tighter tracking makes it fit, and the wrap is the fallback if it ever doesn't.

### Added

- **Two reduced type tiers for screens that cannot hold the full one**, both keyed on height, which
  is the axis that actually binds:
  - `(orientation: portrait) and (max-height: 700px)` — a 4"-class phone. Cue 20px, name 24px,
    tighter gaps, ring down to `min(23vh,40vw,170px)`.
  - `(orientation: landscape) and (max-height: 500px)` — a phone held sideways, which has the same
    ~390px of height. Same type step-down; a tablet in landscape still gets the full scale.

### Fixed

- **Some exercises lost their demonstration clip for the rest of the session** — the gap closed up
  and the text re-centred, as if that segment had never had one. `clipFailed` is the only thing
  that can do that, it is written in exactly one place, and it was blaming the wrong file: the
  handler read `clipSrc`, meaning "the last src we set", but an `error` event can arrive after the
  next segment has already swapped it. A slow or failed load therefore marked the *incoming* clip
  dead. Three changes:
  - Blame `currentSrc`, the file the element was actually on.
  - Only `MEDIA_ERR_SRC_NOT_SUPPORTED` is permanent. An aborted load is just a segment change, and
    a network or decode error is worth retrying the next time that exercise comes round — which it
    does twice a session.
  - `start()` clears the map, so one bad load no longer leaves an exercise blank for every
    subsequent workout until the tab is closed.
- **The cue lost its last line on a 320×568 screen.** `.info-area` has `min-height: 0`, so what
  does not fit is clipped outright rather than scrolled — the clip shrinks to nothing first and
  then the text is simply cut, with nothing on screen to say so. The portrait tier above is the
  fix. Worth knowing about when editing this screen: overflow here is silent.
- **The four controls needed 348px and a 375px phone offers 347**, so they wrapped to a second row
  and spent 72px of height on it. Below 380px the round buttons are now 48px and the bar stays on
  one row — the vertical space is worth more than 8px of button diameter, since it is what keeps
  the clip full-size under the larger text. Pre-existing, but the larger type made it expensive.
- The sync fields were `.95rem` (15.2px), just under the 16px threshold at which iOS zooms the page
  in when a text field takes focus. They are 16.8px now, so focusing one no longer forces a pinch
  back out.
- `.ex-cue` capped its width at `34ch` with no upper bound. At the new size that is wider than a
  narrow phone's text column, so it is `min(34ch, 100%)` now.

### Notes

- The clip regression above was reported against "Arm Raises — Forward and Up" and "Cross-Body Knee
  Taps" specifically. Both were red herrings: all fourteen files are present, faststart, and
  byte-identical in encoding (H.264 Main, level 3.1, yuv420p, 30fps, video-only), every first frame
  has her in shot, and all 26 clip-bearing segments render at eight real phone viewports with the
  smallest clip still 137px. Nothing about those two files differs — they were simply whichever
  clip happened to be loading when an earlier one reported its error.
- Verified against the routine's longest cue ("Step right, tap the left toe in…") at 390×844,
  375×812 and 320×568 portrait and 844×390 landscape: no overflow in either axis, nothing clipped
  inside `.info-area`, and the clip visible at a usable size in all four.
- Sizes are written as `clamp()` with a floor that wins on phone-sized screens, so the phone case
  is fixed and predictable while larger screens can still scale up.

---

## [1.3.1] — 2026-09-07

### Changed

- **Clips recropped to a centred 1:1 square**, 360×360 out of the 640×360 source. Both of the
  source's burned-in overlays sit in corners the square excludes, so its countdown ring is now gone
  as well as its remaining-time readout — the ring had survived every earlier attempt, and blurring
  it with `delogo` left a worse smear than leaving it. The tighter crop also renders the figure
  larger on screen.
- All fourteen clips were checked frame by frame to confirm she stays fully in shot, including
  arms-wide on half-jacks and the lateral travel in side-steps and skaters.
- The video box sizes from `width`/`height: auto` against both maxima rather than `width: 100%`,
  which would letterbox a square clip against the background whenever height is the tighter
  constraint.

---

## [1.3.0] — 2026-09-07

Exercise demonstrations moved from a YouTube embed to local video files.

### Changed

- **Clips are now local files** in `media/` — fourteen of them, about 1.2 MB in total, cut from the
  source video with `src-files/extract-clips.sh`. Playback is a plain `<video muted loop
  playsinline>` with no `controls` attribute, so the element is inert to taps and has no player UI.
- The frame now **stays on screen while paused**, frozen on the movement. The placeholder card
  existed only because a paused YouTube player filled with its own chrome.

### Removed

- **The entire YouTube integration**, and with it every problem that came from running someone
  else's player: ads interrupting mid-exercise, the unskippable-ad bug from 1.2.1, branding and
  title overlays, captions burning over the frame, the iframe crop that hid them, ad detection, the
  loop poller, and the tap-recovery workaround. Native `loop` replaces the poller entirely.
- The local `.webp` image tier, which existed as a fallback for the embed and is now redundant.
- The last external dependency. Nothing is fetched at runtime; the app runs fully offline.

### Fixed

- `object-fit: cover` combined with a forced `16/9` box was silently re-cropping clips that are
  encoded at 480×276, trimming the top edge. The box now follows the clip's own aspect ratio.

### Notes

- Clips are cropped at the bottom-right corner only, removing the source's burned-in remaining-time
  readout, which otherwise sat beside our timer showing a different number. Cropping from that one
  corner keeps her feet in frame and leaves the source's countdown ring in the top-left whole; a
  centred crop clips it into a fragment that looks worse than leaving it be.
- The source video stays outside the repository. Only the ~2 minutes of footage the app plays is
  extracted.

---

## [1.2.1] — 2026-09-07

### Fixed

- **Ads could not be skipped.** `pointer-events: none` on the video container — added to stop a
  stray tap opening YouTube — also blocked YouTube's own "Skip" button, so an ad had to be watched
  to the end with no way out. The shield is removed and the player is interactive again.
- The clip poller now restarts playback if it finds the player paused while the workout is running,
  so a stray tap on the now-interactive player self-corrects within about 200ms instead of leaving
  a frozen demo for the rest of the interval.

### Added

- **Ad detection and notice.** While an ad plays, `getDuration()` reports the ad's length rather
  than the video's — the only signal the IFrame API offers. Two consecutive polls of a mismatch
  raise a notice across the top of the player telling her she can skip or carry on. Seeking is
  suspended while an ad is on screen, since the poller would otherwise fight it.
- The notice sits along the top edge, where the Skip button never is, and passes clicks through so
  it can never block it.

### Notes

- Ad handling could not be verified end to end: ads cannot be triggered on demand, so the detection
  threshold is unproven against a real one. The skip fix itself is verified — the player is
  interactive and auto-recovers from taps.

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
