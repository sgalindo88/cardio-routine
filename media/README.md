# Exercise loops

**This folder ships empty, and that's the normal state.** Every exercise falls back to a built-in
animated stick figure, so the app looks complete with nothing in here.

Drop a file in and that one exercise upgrades to the real loop. The rest keep their figures. You
can add them one at a time over weeks — there's no all-or-nothing switch.

## Filenames

The name must match exactly:

| File | Exercise |
|---|---|
| `march-reach.webp` | Brisk March with High Arm Reaches |
| `side-step-taps.webp` | Side Step-Taps with Pushes |
| `half-jacks.webp` | Half-Jacks |
| `knee-taps.webp` | Cross-Body Knee Taps |
| `skater-taps.webp` | Skater Taps |
| `shadow-boxing.webp` | Shadow Boxing |
| `heel-digs.webp` | Heel Digs with Bicep Swings |
| `fast-feet.webp` | Fast-Feet Shuffles to Soft Reach |

Warm-up and cool-down moves use figures only — they're held positions where a loop adds little.

## Specs

- **Animated WebP.** Roughly a third the size of GIF at the same quality, supported everywhere
  that matters now.
- **2–4 seconds**, looping cleanly. It plays for the full 45 seconds, so a visible seam gets
  irritating fast.
- **~480px wide**, and **under 500 KB** — she may be on tablet wifi.
- **Plain background**, figure fully in frame including feet.
- No text or captions. The cue is already on screen at a readable size.

## Using GIF instead

If a source is only available as GIF, change the extension in `app.js`:

```js
EXERCISES.forEach(function (e) { e.media = 'media/' + e.id + '.webp'; });
```

Swap `.webp` for `.gif`, or set a per-exercise `media` path directly if you end up with a mix.

## Converting

With ffmpeg:

```sh
ffmpeg -i clip.mp4 -vf "fps=15,scale=480:-1" -loop 0 -q:v 60 half-jacks.webp
```

Trim first with `-ss 3 -t 3.5` (start at 3s, take 3.5s) to land on a clean loop point.
