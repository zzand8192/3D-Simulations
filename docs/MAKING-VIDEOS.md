# Making 3D "What If?" simulation videos: the playbook

This is the complete method behind `output/what-if-underwater.mp4`. Follow it to make new videos in the same style: more "What if…?" scenarios, or any other 3D simulation (history, science, "a day in the life of…", disasters, futures).

Everything is code. Three.js builds the world, the scene at time `t` is a pure function of `t`, headless Chromium renders every frame, and ffmpeg encodes the frames together with a procedurally synthesized soundtrack. There are no AI image or video generators, no voice acting, and no external assets beyond the fonts and Three.js already in the repo.

---

## 1. The style (approved by the user)

### Format
| Item | Value |
|---|---|
| Resolution | 1080 × 1920 (9:16), 30 fps |
| Length | **over 60 s** (needed for monetization); aim for 65–75 s |
| Encode | H.264 CRF 17, yuv420p, AAC 192 kb/s, about −14 LUFS, `+faststart` |
| Safe area | text and key action within x 90–990, y 250–1500 (platform UI covers the edges and the bottom) |

### Characters
**This is the only character style in the series.** Use **low-poly stylized people with human proportions**, like a polished 3D simulation game, built with `makeCharacter()` from `src/character.js`. Never build cube-headed blocky figures, even when a prompt says "Roblox-inspired" or "blocky"; Isaac confirmed this on 2026-11-05.

- They have a head (rounded box) with a neck and ears. The face is a drawn decal: dark oval eyes with a tiny highlight, short brows, and a small reddish smile.
- Their torso is a tapered T-shirt with a **colored collar and sleeve trim** (the signature look is a blue tee with orange trim). They have slim skin-colored arms with hands, long trousers or shorts, and **white sneakers**.
- **Expressive:** faces change per beat (eyes: `open wide half closed happy squeeze`; mouth: `smile flat smirk frown o small-o open shout talk grin puff wobble`; brows: `soft up flat worried angry`). They blink automatically and animate their mouths while speaking.
- **Consistency:** every recurring person is one entry in a `CAST` table and is always built from that spec. If the same person appears in two scenes, build two instances from the same spec.
- **Populated worlds:** fill every location with background people using `randomPerson(r, 'beach' | 'swim', extra)`, plus props and animals.

### Text and graphics
| Element | Look | Behaviour |
|---|---|---|
| **Opening title** | Large white Cormorant Garamond, ~100 px, centered, soft shadow | Each word fades up and un-blurs in turn. At about 4 s it **shrinks toward the upper left and dissolves into the first label** (`ui.js → title()`, `cues.title.hold/morph`). It never cuts abruptly. |
| **Side labels** | Upper left (top 270 px). Key line 48 px (`DAY #1`, `YEAR #15`), value line 27 px with wide tracking (`THE FIRST DISCOVERY`). Thin hairline above. No box. | Fade in over 0.9 s, hold, fade out. One label per story chapter. |
| **Dialogue** | **Speech bubble over the speaker's head**: rgba(8,12,18,.62) rounded box, white EB Garamond 44 px, tail pointing at the head | The bubble follows the head's projected position and is clamped to the safe area. Several can be on screen at once. Every line needs a `who` that matches a speaker in the shot. |
| **News graphics** (optional) | Fictional channel **WORLD 24** (`W24 LIVE` bug top-right, red BREAKING NEWS tag, white headline bar, place line, ticker) | Only during `cues.news` windows. Never use real network branding. |

**Banned:** narrator or voices, neon or meme captions, giant colored words, emoji, health bars or gaming HUDs, progress meters, any real social-app interface, real brands, and real people.

### Story shape (the template that worked)
1. **Hook (0–6 s):** a populated establishing shot with the title question. The camera glides toward the place where things will happen.
2. **First discovery (6–11 s):** one person, one small accident, one surprising realization, and a short line ("Wait… what?").
3. **It spreads (11–21 s):** friends try it, then the crowd. An authority figure objects, and someone answers back in a funny way.
4. **The world reacts (21–35 s):** a news studio with live footage on the wall, 0.6–0.8 s cuts to other countries, and a field reporter with a background gag (here, a man walks out of the sea carrying a lawn chair).
5. **Science (35–43 s):** a lab, monitors, and two or three short lines that end on a dry punchline.
6. **Everyday life (43–54 s):** 4 quick comedic vignettes, about 2.5 s each.
7. **Time jump (54–62 s):** a wide reveal of the transformed world (infrastructure, vehicles, construction), plus a TV inside a home showing the anchor's update.
8. **Ending (62–70 s):** a petty, relatable argument in the new world ("You can't park there!" / "It's literally the ocean!"), then the camera pulls back and fades to black.

Keep it **worldwide** rather than about one protagonist, keep the humor understated, and **respect the scenario's limits** (in this video, pressure, cold, and visibility were still dangerous, and cities still needed engineering).

---

## 2. Project layout

```
src/                        one video = one project folder
  index.html, style.css     stage + text layer (copy as-is)
  main.js                   renderer, scene list, render-to-texture screens, renderAt(t)
  cues.json                 ALL timing: duration, title, labels, subs (bubbles), news, shots
  timeline.js               makeShots(): one object per shot (camera, acting, gags)
  scenes.js                 CAST + randomPerson + buildXxx(renderer) per location
  props.js                  reusable low-poly props
  character.js              makeCharacter, motion presets, faces
  env.js                    shaders & nature: caustics, sky dome, water, shafts, particles, fish...
  ui.js                     title morph, labels, bubbles, news graphics
  vendor/, fonts/           three.js r170, RoundedBoxGeometry, Cormorant + EB Garamond (OFL)
scripts/render.mjs          stills / parallel full render / mux audio (+ loudnorm)
scripts/audio.py            procedural ambience + SFX + music from cues.json
```

### Starting a new video
```bash
cp -r src projects/<slug>        # keep the engine files, then rewrite these per video:
#   cues.json   (script + timing)    scenes.js (CAST + locations)    timeline.js (shots)
#   main.js     (which scenes to build, any in-world screens)
cp scripts/audio.py projects/<slug>/audio.py   # only if the sound layout differs
node scripts/render.mjs --src projects/<slug> --stills 2,10,20 --dir /tmp/s
node scripts/render.mjs --src projects/<slug> --workers 3 --out output/<slug>.mp4
```
`render.mjs` uses `<project>/audio.py` when it exists and falls back to `scripts/audio.py` otherwise. Both read `<project>/cues.json`.

---

## 3. Workflow (follow this order)

1. **Write the script in `cues.json` first.**
   - Set `duration` (more than 60).
   - Set `title {text, start, hold, morph}`. The title morphs between `hold` and `morph`, and the first label should start around `hold + 0.9`.
   - Add `labels [{start, end, k, v}]`, one per chapter.
   - Add `subs [{id, start, end, who, text}]`, which become the bubbles. Allow `len(text)/15 + 0.9` seconds of reading time, and make each bubble end before its shot ends.
   - Add `news [{start, end, place}]` (optional) and `shots {name: [start, end]}` covering 0…duration with no gaps.
2. **Build the locations** in `scenes.js`. There is one `buildXxx(renderer)` per set, and each returns a `THREE.Scene` with `userData = { update(t, cam), actors, caustic, surfaceY, exposure, ... }`. Reuse an existing builder when it fits.
3. **Write the shots** in `timeline.js`. Each shot is `shot(name, { scene, setup(), update(lt, t, cam), speakers: () => ({who: object3D}), prerender?, news? })`.
4. **Review stills before a full render.** Render about 10–15 frames at the important moments (each dialogue line, each gag, each transition), tile them into a contact sheet, and look at it. Fix framing, lighting, and overlap, then repeat. This loop is cheap (about 3 s per frame) and catches almost everything.
5. **Do the full render in the background** with `--workers 3` and a watcher (`until grep -q wrote log; do sleep 20; done`). A 70 s video takes about 35 minutes on 4 CPUs.
6. **Verify the result.** Check it with `ffprobe` (1080x1920, 30 fps, duration, an aac stream), measure loudness with `ebur128`, and make a 1-frame-every-5-s contact sheet of the final MP4.
7. **Commit and send.** Commit `output/<slug>.mp4` along with the source, push, and send the MP4 to the user.

---

## 4. Engine reference

### Characters (`character.js`)
```js
const c = makeCharacter({
  name: 'sam',                     // must equal the `who` in cues.subs to get a talking mouth + bubble
  skin: '#d9a47c', hair: '#3b2414', hairStyle: 'short',   // short|spiky|long|bun|ponytail|curly|bald
  top: { color: '#2f6fe0', trim: '#f0a03a', sleeves: 'short', text: 'GUARD' },  // sleeves: short|long|none (shirtless)
  bottom: { color: '#23252b', length: 'long' },           // long|short
  shoes: '#f3f3f3',               // 'none' = barefoot
  swimsuit: '#e94f6a', coat: true /* lab coat */, tie: '#c00', cap: '#d9412f', backpack: '#e8423b',
  glasses: true /* sunglasses, c.shades */, lips: true, scale: 0.7 /* kids */,
});
c.root.position.set(x, y, z); c.root.rotation.y = yaw;  // +z is the character's forward; yaw = atan2(dx, dz)
c.pose({ ... });                     // see keys below
c.setFace({ eyes, mouth, brows, look }, t, talking, seed);  // the shots' face() helper sets `talking` from cues
c.armR.hand.add(prop);               // attach props to hands (sunglasses, mic, megaphone, cup, phone, chair...)
```
**Pose keys (radians):** `hipY` (lowers the hips, e.g. −1.1 to sit), `lean` (hips pitch; 1.38 = horizontal swim), `twist`, `tilt`, `torsoX/Y/Z`, `headX` (−1 looks up) / `headY` / `headZ`, `aLx aLy aLz aRx aRy aRz` (arms: x negative = forward or up, z = out to the side), `eL eR` (elbows, negative = bend forward), `lLx lRx lLz lRz` (legs), `kL kR` (knees, positive = bend back), `fL fR` (feet).

**Motion presets** (each returns a pose; combine with `mergePose(preset, overrides)`): `idle(t)`, `walk(t, speed)`, `tread(t)` (upright in water), `swim(t)` (horizontal; set root yaw to the travel direction), `sitChair(t)` (seat about 1.4 high), `lounge(t)` (reclined chair), `sitFloor(t)`, `crossLegFloor(t)`, `lieBack()`.

**Kneel:** `{hipY:-1.12, kL:1.55, kR:1.6, fL:-0.3, fR:-0.3}`. **Point:** `{aRx:-1.5, eR:-0.05}`. **Shrug:** `{aLz:.8, aRz:.8, eL:-1.4, eR:-1.4, headZ:.15}`. **Phone in front of face:** `{aRx:-1.25, eR:-1.25, headX:.32}`. **Megaphone to mouth:** `{aRx:-1.45, eR:-1.25}`.

### World building (`env.js`, `props.js`, `scenes.js`)
- **Determinism:** use `rng(seed)` everywhere; never call `Math.random()`. Easing comes from `ease.io/out/in`, `seg(t, a, b)` (0→1 between a and b), `lerp`, and `clamp01`.
- **`causticMaterial(params)`** is MeshStandardMaterial with animated underwater caustics. Use it for almost everything. Caustic strength per scene comes from `scene.userData.caustic` (0 above water) and fades with depth below `surfaceY`.
- **Sky and water:**
  - `gradientDome({top, mid, bottom, sunDir})` gives a sky or underwater gradient. Its uniforms can be recolored per shot (sunset cut, for example).
  - `surfaceFromBelow({y})` is the rippling surface seen from underwater.
  - `lightShafts(...)` gives sunbeams (call `.userData.update(t, cam)`), and `particles(...)` gives drifting marine snow or dust.
  - An underwater set is `underwaterBase(renderer, {fogColor, density 0.008–0.02, top, mid, bottom})` plus a directional sun with shadows plus a hemisphere light.
- **Ground:** `terrain({size, amp, flatRadius, color})` gives a vertex-colored floor with `userData.heightAt(x, z)`, so you can place things on it. A beach slopes into the sea with a custom height function (`beachHeight`).
- **Life:**
  - `school({n, path:(t, v)=>v.set(...)})` gives schools of fish, and `fish()` a single one.
  - `kelp()`, `coral()`, `rock()`, `jellyfish()` (call `.userData.update(t)` on the animated ones).
  - `bubbleEmitter(max)` takes `.userData.burst({t0, origin: Vector3 | ()=>Vector3, n, spread, rise, size, life, stagger})`. Bursts are de-duplicated by `t0`, so they are safe to register in `setup()`.
- **Props:** `umbrella`, `towel`, `beachBall`, `lifeguardTower`, `palm`, `building` (facades with window texture), `seagull`, `sunglasses`, `megaphone`, `microphone`, `clipboard`, `cup`, `lawnChair`, `sandwich` (parts that float apart), `phone`, `miniSub`, `crane`, `routeMarkers`, `podHouse({open})` (open = walk-in front with door and window gaps). Use `canvasTex(w, h, draw)` for signs, screens, and monitors (redraw and set `needsUpdate` for live monitors).
- **Existing sets** you can reuse or adapt:
  - `buildBeach` (sunny and crowded, sea, town, tower, gulls)
  - `buildShallows` (sandy shallows with 4 separate areas)
  - `buildPool`
  - `buildStudio(rtTexture)` (news desk and video wall)
  - `buildLab` (observation tank and live monitors)
  - `buildApartment(rtTexture)` (TV and round ocean window)
  - `buildCity` (future underwater city: sub traffic on marked routes, crane, research station, citizens, plus a pod-house neighborhood at z ≈ 100)
- **Screens inside the world:** render another scene into a `WebGLRenderTarget` in the shot's `prerender` (see `R.renderWall` / `R.renderTV` in `main.js`): drone footage on the studio wall, or the studio on a living-room TV.

### Shots (`timeline.js`)
```js
shot('reporter', {
  scene: S.beach, news: true,
  setup() { /* one-time per shot: register bubble bursts, recolor sky, show/hide props */ },
  update(lt, t, cam) {           // lt = time since shot start, t = global time
    // 1) place & pose actors   2) faces   3) camera via aim(cam, pos, target, fov)
  },
  speakers: () => ({ reporter: B.actors.reporter.head }),  // who → Object3D the bubble points at
}),
```
`main.js` calls `scene.userData.update(t)` (crowds, water, fish) **before** `shot.update`, so the shot always has the final say.

---

## 5. Camera and composition rules for 9:16

- **The frame is narrow.** Visible width = `2 · distance · tan(fov/2) · 0.5625`. At fov 50 and distance 10 that is only 5.2 units, and a person is 5.4 units tall and about 1.6 wide. For a two-shot, stand back 15–20 units or use fov 55–60.
- **Use the vertical space:** put faces in the upper middle and the scene's depth (sea, city, video wall) behind them or above them.
- **Low angles feel cinematic:** camera at about 1–3 units high looking slightly up. Underwater, include the bright surface at the top of the frame.
- **Keep the camera above the ground:** check `heightAt(cam.x, cam.z) + 1`. Otherwise the terrain fills the frame with a blown-out slab.
- **Keep the foreground clear:** skip crowd placement in the corridor the camera flies through, and hide walkers that cross close to the lens (see the reporter shot).
- **Move gently and continuously:** slow pushes, dolly arcs, and a pull-back reveal at the end, with `IO(seg(lt, …))` easing on every move. Use hard cuts for montage and news, and short dips to black (0.25 s each way) only for time jumps.
- **Leave room for text:** the label sits in the upper left (y 270–360) and a news lower-third occupies y 1296–1500, so don't frame faces there during those moments.

---

## 6. Sound (`scripts/audio.py`)
- Only numpy. Every layer is placed using `cues.json` times, so picture and sound stay in sync.
- **Beds per shot** (`bed(name, fn)` with 0.12 s crossfades):
  - `waves` + `crowd` for beaches
  - `underwater(depth)` for underwater shots
  - `room` + `hum` for interiors
  - `machinery` for future cities
- **One-shots:**
  - `gull`, `splash(size)`, `bubble_burst(n)` (match every visual bubble burst)
  - `whoosh` (title morph and news cuts), `sting` (news open)
  - `beep` (monitors, at a bpm), `tap`
  - a crowd cheer swell
- **Music:** a soft additive pad plus sparse plucks on a 4-chord loop. Its gain curve dips under news segments and swells at the ending.
- `render.mjs` muxes the result with `loudnorm=I=-14:TP=-1.5`.

---

## 7. Pitfalls already hit (don't repeat them)

| Problem | Fix |
|---|---|
| `Object.assign(mesh, {position: v})` throws ("read-only position") | Use `mesh.position.copy(v)` or the `pos(o, v)` / `at(o, x, y, z)` helpers |
| A full render dies with "page.screenshot: Timeout 30000ms" when running parallel workers | Playwright timeouts are disabled (`setDefaultTimeout(0)`, `timeout: 0`); keep it that way |
| Stills render out of time order, so state from another shot leaks in (e.g. a dropped prop still visible) | Every shot must set the visibility and positions of the props it cares about in `update`, not just once |
| The sea hides people badly | Make the sea plane slightly transparent (`opacity 0.9`); people in the water stand chest-deep on the sloped floor (`root.y ≈ −3.6`) |
| The title overlaps the first label | The title is fully faded by about 70% of its morph; start the label around `hold + 0.9` |
| Underwater skin looks grey and washed out | Lower the fog density (0.016 for shallows) and the exposure (0.72–0.9); turn caustics down to about 0.6 in bright pools |
| A character's arm or legs block the lens | Check the stills; move background walkers or crowd out of the camera's path |
| The news ticker or bar sits outside the safe area | Bar top 1296 px, ticker top 1452 px |
| Faces are hidden behind props or hands | Watch for poses where a hand covers the face (e.g. hand-on-chin near the camera) |
| Text in the world (signs, monitors) | Draw it with `canvasTex`; keep names fictional |
| People look too big next to buildings (a person taller than a storey) | **Scale: 3 units = 1 m; a person is 5.4 units (1.8 m).** Storeys are 9.6 units (3.2 m), window bays 7.2 (2.4 m), shop fronts 12.9 (4.3 m), street trees about 20 units, lamps about 20 units. `src/props.js` and EP003's `scenes_city.js` use these; EP001/EP002 predate the fix |

## 8. Environment notes (Claude Code cloud container)
- `export NODE_PATH=/opt/node22/lib/node_modules` lets the global Playwright and Chromium work; don't run `playwright install`.
- Rendering uses SwiftShader (CPU): about 3 s per still, and about 0.5 s per video-frame per worker in a full render (with 3 workers, about 30 s of wall time per second of video).
- `ffmpeg` and `numpy` are available. Fonts and Three.js are in the repo (offline-safe).
- Use the scratchpad for stills and contact sheets. Commit only source files and the final MP4 (`output/stills`, segments, and `audio.wav` are git-ignored).

## 9. Ideas that fit this format
What if… the Moon disappeared? Gravity halved for a day? Every human could fly? It never got dark? Earth stopped spinning? Animals could talk? Everyone could read minds? Each one follows the same arc: a populated location → a first person notices → the crowd → news → scientists → everyday-life montage → a time jump with infrastructure → a petty relatable ending.
