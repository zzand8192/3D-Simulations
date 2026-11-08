# EP002 — Review and release

## Review history

| Date | Version | Finding | Revision | Status |
| --- | --- | --- | --- | --- |
| 2026-11-08 | Animal cast sheet | Heads too human-sized; odd belly patch | Heads scaled 1.3×, patch removed | Done |
| 2026-11-08 | Stills passes 1–4 | Parked car blocking the swap; police dog cut off; Kevin off frame; elephant and mics blocking the lion; upside-down newspaper; kangaroo clipped; TV blocking the living room | Cars removed from the street, cameras reframed, press kept clear of the podium, mics lowered, newspaper flipped | Done |
| 2026-11-08 | v01 export | Checked: 1080×1920, 30 fps, 93.0 s, AAC, about -14.7 LUFS. Contact sheet at 1 frame per 4.5 s reviewed | — | Superseded by v02 |
| 2026-11-08 | v01 30 fps check | Every frame checked. Issues: dog snapped 180° at 12 s; mailboxes in the walking path; tree blocking the police shot; Tokyo camera in a traffic lane; zoo framing; park dogs facing the wrong way; aerial started inside a tower; living-room TV and framing | All fixed in the timeline and sets | Done |
| 2026-11-08 | Isaac: empty backgrounds | Greg's zoo and other scenes had large empty areas | Added `decor.js`: clouds, hills, skylines, house rows, trees, benches, lamps, shop rows, zoo and park dressing, podium banners, shelves, frames and window views | Done |
| 2026-11-08 | Isaac: building texture bug | Facades were one stretched texture: window sizes changed per wall, blurry up close, moiré at distance | Rebuilt `building()` with fixed-size tiled window bays, storefront band, trim, parapet and rooftop units; sizes snapped to whole bays so neighbours never overlap. Ported to EP001 and `src` | Done |
| 2026-11-08 | v02 30 fps check | Opening: a new street lamp passed in front of the camera | Lamps moved behind the walkers; re-rendered | Done |
| 2026-11-08 | v02 export | 1080×1920, 30 fps, 93.0 s, AAC. Every frame checked; 1 fps contact sheets reviewed | — | Awaiting Isaac's review |

## Delivery

- **Export:** `03_Delivery/EP002_Humans_and_Animals_Swapped_v02.mp4` (v01 kept for comparison)
- **Specs:** 1080 × 1920, 30 fps, 93.0 s, stereo AAC, loudness-normalized
- **Source:** `01_Script/EP002_Script_and_Shot_List_v01.md` and `02_Project/cues.json`
- **Phone playback check:** pending, for Isaac

## Release

Not yet published.
