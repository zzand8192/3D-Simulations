# What If Every Human Could Breathe Underwater?

A 70-second vertical (1080 × 1920, 9:16) 3D short that plays out like a cinematic "What If?" simulation. It follows humanity's reaction to an impossible event, from one crowded beach to worldwide news, a lab, everyday life, and an underwater suburb 15 years later.

**Rendered video:** [`output/what-if-underwater.mp4`](output/what-if-underwater.mp4)

There is no narrator and no voice acting. The story is told through what the characters do, their dialogue in speech bubbles over their heads, fictional news graphics, small serif side labels, and synthesized sound effects and music.

## Story

| Time | Label | What happens |
|---|---|---|
| 0–6 s | the title, then **DAY #1 / THE FIRST DISCOVERY** | A crowded beach. *"What if every human could breathe underwater?"* appears large and centered, then shrinks and moves to the upper left, where it becomes the first label. Sam's sunglasses slip off into the sea. |
| 6–11 s | | Sam dives, picks the sunglasses up off the sand, runs out of breath, and breathes. **"Wait… what?"** |
| 11–21.5 s | **MINUTES LATER / THE DISCOVERY SPREADS** | **"Guys, you can breathe down there!"** Mia ducks under: **"Oh my gosh. He's right!"** Dozens follow. The lifeguard shouts **"Everybody out of the water!"** and a swimmer yells back **"WE CAN BREATHE DOWN HERE!"** The lifeguard just stares. |
| 21.5–35.4 s | **BREAKING NEWS / GLOBAL PHENOMENON** | The WORLD 24 anchor (fictional channel) with live beach footage on the video wall, quick cuts to Sydney and Tokyo, then a field reporter. Behind her, a man walks out of the sea carrying a lawn chair. |
| 35.4–43.2 s | **DAY #2 / SCIENTISTS BAFFLED** | A volunteer in an observation tank, SpO₂ 98%. **"His oxygen levels are normal."** / **"That shouldn't be possible."** / **"Well… apparently it is."** |
| 43.2–54.4 s | **WEEK #3 / EVERYDAY LIFE CHANGES** | A lawn chair at the bottom of a pool. Students swimming to school. A sandwich that falls apart underwater: **"Are you serious?"** A touchscreen that won't respond. |
| 54.4–62.4 s | **YEAR #15 / UNDERWATER SETTLEMENTS** | A wide shot of a city with marked submarine routes, a construction crane, and a research station. A living-room TV: **"The world's first permanent underwater residential community has officially opened."** |
| 62.4–70 s | **YEAR #15 / SOME THINGS NEVER CHANGE** | Owen spots a submarine parked across his door. **"You can't park there!"** / **"It's literally the ocean!"** The camera pulls back to show the whole neighborhood, then fades to black. |

The world stays internally consistent: the reporter and the news ticker warn that pressure, cold, and visibility are still dangerous, and the city has engineered buildings, transit routes, and construction work.

## Look

- **Characters:** low-poly people with human proportions and simple faces (dark oval eyes, a small smile), modeled on the reference image. They wear T-shirts with colored collar and sleeve trim, slim arms with hands, long legs, and white sneakers. Elbows and knees bend, faces change expression, and every recurring character looks the same in every shot.
- **Locations:** a sunny beach with a crowd, umbrellas, a lifeguard tower, seagulls, and a waterfront town; sunlit shallows with caustics and light rays; a pool; a news studio; a lab; an apartment; and an underwater city.
- **Text:**
  - The opening question is set in large white Cormorant Garamond serif.
  - Side labels are small white serif in the upper left.
  - Dialogue appears in semi-transparent dark speech bubbles that follow the speaker's head.
  - All text stays inside a 9:16 safe area (90 px from each side, between y = 250 and 1500).
- **No** narrator, voices, gaming HUD, progress bars, meme captions, or social-app interface.

## Sound

`scripts/audio.py` uses numpy to synthesize every sound, with no external samples:
- **Beach:** waves, crowd murmur, seagulls, splashes, and a cheer.
- **Underwater:** ambience and bubble bursts that match the on-screen bubbles.
- **News and lab:** a news sting, monitor beeps at 72 bpm, and phone taps.
- **City:** underwater machinery and submarine hum.
- **Music:** a soft D-major pad.

The final mix is loudness-normalized to −14 LUFS.

## Project layout

```
src/cues.json       timing: title, side labels, dialogue bubbles, news segments, shot list  ← edit text here
src/timeline.js     each shot: camera moves, acting, gags
src/scenes.js       the sets + cast definitions (CAST)
src/props.js        umbrellas, lifeguard tower, buildings, lawn chair, sandwich, phone, mini-sub, pod houses…
src/character.js    character model, face expressions, poses (walk, swim, tread, sit, lounge…)
src/env.js          caustics shader, water surface, light shafts, particles, fish, kelp, coral
src/ui.js           title-to-label morph, labels, speech bubbles, broadcast graphics
scripts/render.mjs  headless frame-by-frame render (optionally parallel) → MP4 with audio
scripts/audio.py    procedural sound design → output/audio.wav
```

## Preview and render

```bash
npm run preview                              # live player with scrubber: http://localhost:8080 (?t=30 to jump)
node scripts/render.mjs --workers 3          # full video → output/what-if-underwater.mp4
node scripts/render.mjs --stills 3,24,65     # PNG stills → output/stills/
node scripts/render.mjs --from 43 --to 54.4 --out output/clip.mp4
```

Requirements: Node 18+, ffmpeg, Python 3 with numpy, and Playwright with Chromium. Three.js r170 and the fonts (SIL OFL) are included in the repo, so rendering works offline.
