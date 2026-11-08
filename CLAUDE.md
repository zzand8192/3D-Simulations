# CLAUDE.md: 3D "What If?" simulation videos

This repo makes cinematic, vertical (9:16) 3D simulation videos in code: Three.js scenes rendered frame by frame in headless Chromium, then encoded with ffmpeg. The first video is `src/` → `output/what-if-underwater.mp4`. The studio bible starts at `00_START_HERE.md`.

## Series notes (latest first)
- **EP001 "What if every road disappeared?"** lives in `07_Episode_Projects/EP001_Every_Road_Disappeared/`, with the project in `02_Project` and the delivery in `03_Delivery`. It is the most complete engine to copy for new episodes: city builder with removable roads, vehicles, studio, interiors, and per-episode `audio.py`. Render it with `--src 07_Episode_Projects/<EP>/02_Project --out 07_Episode_Projects/<EP>/03_Delivery/<file>.mp4`.
- **Characters: one style only.** Use the low-poly human-proportion people from the underwater episode and EP001, built with `makeCharacter()` from `src/character.js` (the canonical builder; episodes copy it). Never build blocky, cube-bodied Roblox-style figures, even if an episode prompt says "Roblox-inspired" or "blocky". Isaac confirmed this on 2026-11-05.
- **Greg** is the recurring character. Build him with `makeCharacter(GREG)` (GREG_v1; see `03_Greg/Model` and `03_Greg/Looks`). Change his location and task every episode and log it in `03_Greg/Episode_Appearance_Log.md`.
- **Dialogue:** there is never voice audio. Show text either as bubbles over heads (underwater) or subtitles near the bottom (EP001, per its prompt). Follow the episode prompt.

**When the user asks for a new "What if…?" video, or any 3D simulation video, read `docs/MAKING-VIDEOS.md` first and follow it.** It is the full playbook: the house style, the engine API, the workflow, the camera math, and the mistakes to avoid. The rules below are the non-negotiables.

## House style (the user has approved this; don't drift from it)
- **Format:** 1080×1920, 30 fps, **longer than 60 s** (needed for monetization; 65–75 s is the sweet spot). H.264 + AAC, loudness about −14 LUFS.
- **Characters:** low-poly people with human proportions, *not* blocky Roblox-style cubes. They have simple drawn faces (dark oval eyes, a small smile, short brows), T-shirts with colored collar and sleeve trim, slim arms with hands, long legs, and white sneakers. Build them with `makeCharacter()` in `src/character.js` (the only character builder; it includes outfits such as hoodie, apron, hi-vis vest, hard hat, lab coat, cap and beard). Every recurring person gets one spec in a `CAST` table so they look identical in every shot.
- **No narrator and no voices.** Dialogue appears **only in speech bubbles over the speaker's head**: semi-transparent dark rounded box, white EB Garamond serif, with a tail pointing at the head.
- **Opening title:** a large, centered, white serif question (Cormorant Garamond), revealed one word at a time over a moving establishing shot. Around 4–6 s it **shrinks and moves to the upper left** and dissolves into the first label.
- **Side labels:** small white serif in the upper left. One line for the time, one for the situation (`DAY #1` / `THE FIRST DISCOVERY`, `YEAR #15` / `SOME THINGS NEVER CHANGE`). A thin hairline sits above them. No boxes.
- **Never:** neon or meme captions, giant colored words, emoji, health bars, gaming HUDs, progress meters, real social-app interface, or real brands or logos. A fictional news channel (e.g. **WORLD 24**) with a lower-third headline is fine during news segments.
- **Story:** worldwide scope that escalates over time: one discovery → a crowd reacts → global news → scientists → everyday-life comedy montage → a jump years ahead → a funny ending, then fade to black. Keep the humor understated and situational. Keep the fictional premise internally consistent; the physical limits still apply.
- **Sound:** a procedural ambience bed per location, sound effects synced to on-screen events, and a soft music bed. No voices (`scripts/audio.py`).
- **Safe area:** keep all text and key action between x = 90–990 and y = 250–1500.

## Quick commands
```bash
export NODE_PATH=/opt/node22/lib/node_modules          # global Playwright in this cloud environment
node scripts/render.mjs --src src --stills 2,9.5,24 --dir /tmp/stills   # review frames first
node scripts/render.mjs --src src --workers 3          # full render (~30 s of wall time per second of video)
npm run preview                                         # live scrubber at http://localhost:8080
```
- Run long renders in the background and wait with a watcher; never block on them.
- For review, tile stills into a contact sheet with `ffmpeg -pattern_type glob -i 't*.png' -vf "scale=300:533,tile=5x2" sheet.png` and look at it.
- Commit the finished MP4 to `output/` and send it to the user with the file-sharing tool.
