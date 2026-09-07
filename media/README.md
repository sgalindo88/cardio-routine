# Exercise clips

Fourteen short muted square clips, one per movement, played on a loop while the timer runs. About
1.4 MB in total.

These are cut from a single source video that is kept **outside this repository**, in
`src-files/videoplayback.mp4`. Only the windows the app actually plays are extracted — roughly two
minutes of footage, not the whole 22-minute file.

## Files

| File | Used by |
|---|---|
| `march.mp4` | Warm-up 1, exercise 1, cool-down 1 |
| `walk.mp4` | Warm-up 2 |
| `arm-raises.mp4` | Warm-up 3 |
| `heel-digs.mp4` | Warm-up 4 and exercise 7 |
| `shadow-boxing.mp4` | Exercise 6 |
| `knee-taps.mp4` | Exercise 4 |
| `side-step-taps.mp4` | Exercise 2 |
| `half-jacks.mp4` | Exercise 3 |
| `skater-taps.mp4` | Exercise 5 |
| `fast-feet.mp4` | Exercise 8 |
| `quad-stretch.mp4` | Cool-down 2 and 3 |
| `calf-right.mp4` | Cool-down 4 |
| `calf-left.mp4` | Cool-down 5 |
| `hamstring.mp4` | Cool-down 6 |

Filenames are mapped in `app.js`; nothing here is discovered by convention.

## Regenerating

`src-files/extract-clips.sh` rebuilds all fourteen. It needs `ffmpeg` and the source video beside
it. Edit the start times in that script to retime a clip.

Encoding choices worth knowing:

- **Audio is stripped** (`-an`). Every clip plays muted, so the track is pure weight.
- **`yuv420p`** — Safari will not decode some other pixel formats.
- **Square, 360×360, CRF 30.** A centred crop out of the 640×360 source. Both of the source's
  burned-in overlays — its countdown ring at the left, its remaining-time readout at the right —
  sit in corners the square excludes. That readout was the one that mattered, since it sat beside
  our timer showing a different number.
- **360×360 is native resolution**, so nothing is upscaled, and the tighter crop makes the figure
  larger on screen than a 16:9 version.
- Every clip was checked frame by frame to confirm she stays fully in shot, including arms-wide on
  half-jacks and the lateral travel in side-steps and skaters.

## Adding a clip

Drop the file in, then point the relevant entry in `app.js` at it. A missing or unplayable file
collapses that segment's panel rather than showing a broken element, so a bad filename degrades
quietly rather than breaking the workout.
