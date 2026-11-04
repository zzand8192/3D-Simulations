# What If Humans Could Breathe Underwater?

A 47-second vertical (1080 × 1920, 9:16) 3D short made in the style of a cinematic "What If?" documentary, with some comedy along the way. It uses blocky, toy-like characters, cinematic lighting, and quiet serif text.

**Rendered video:** [`output/what-if-underwater.mp4`](output/what-if-underwater.mp4)

## Story

| Time | Set | On screen |
|---|---|---|
| 0 – 6.5 s | Beach at dawn, low angle | Title *What if humans could breathe underwater?* · label **THE FIRST HUMAN / DAY #1** |
| 6.5 – 13 s | Sunlit shallows | Max dives in, holds his breath, gives up and breathes · **DEPTH / 10 METERS** · *"Wait… I can actually breathe down here?"* |
| 13 – 21.5 s | Sea floor | Max sits on the sand like it's his couch. Leo swims in wearing goggles and a snorkel. *"Bro, why are you sitting down here?"* / *"I live here now."* A fish stops to stare into Leo's goggles. |
| 21.5 – 29 s | The deep: flashlights and glowing jellyfish | **DEPTH / 200 METERS** · *"My snorkel is not helping."* / *"It was never helping."* |
| 29 – 34.6 s | Wide shot of the underwater city | **UNDERWATER CITY / YEAR #25** |
| 34.6 – 41.6 s | Rooftop café | *"You know you don't need that anymore, right?"* / *"It's part of my look now."* A fish swims straight into Max's head. |
| 41.6 – 47 s | Low-angle shot looking up at the light | The title comes back, then fade to black |

## Text style

- **Title:** white Cormorant Garamond serif in the upper-middle of the frame, revealed one word at a time, with a soft dark shadow and no box.
- **Labels:** two lines of small white EB Garamond (a spaced-out key line, then a value line) under a thin hairline. No panels or borders.
- **Dialogue:** the exact spoken words in white serif inside a subtle, semi-transparent dark box, while the speaking character's mouth animates.
- The video has no neon captions, giant colored words, health bars, emoji, progress meters, or platform interface.
- All text and key action stay inside a safe area: 90 px from each side, the title at 400 px and the subtitles at 1330 px from the top, leaving the bottom ~420 px clear.

## Project layout

```
src/index.html      stage (1080×1920 WebGL canvas + HTML text layer)
src/style.css       cinematic typography, grade, vignette, safe area
src/main.js         renderer, shot switching, renderAt(t)
src/timeline.js     shot list, camera moves, acting, text cues  ← edit the story here
src/scenes.js       beach, reef, deep, city sets + the two lead characters
src/character.js    blocky character rig, drawn facial expressions, motions
src/env.js          caustics shader, light shafts, particles, fish, kelp, coral, jellyfish
src/ui.js           title / label / dialogue animation
scripts/render.mjs  headless frame-by-frame render → ffmpeg MP4
```

Everything is a pure function of time, so every render produces the same frames.

## Preview and render

```bash
npm run preview          # http://localhost:8080 , live player with scrubber (?t=20 to jump)
npm run render           # → output/what-if-underwater.mp4  (30 fps, H.264, quiet ambience track)
node scripts/render.mjs --stills 3,15,36          # PNG stills → output/stills/
node scripts/render.mjs --from 13 --to 21.5 --out output/clip.mp4
```

Requirements: Node 18+, `ffmpeg`, and Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`, unless they are already installed globally).

Three.js r170 and the fonts are kept in the repo under `src/vendor` and `src/fonts` (Cormorant Garamond and EB Garamond, both under the SIL OFL), so rendering works offline.
