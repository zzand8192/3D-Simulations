# Previous underwater project and character findings

Inspected November 4, 2026. Source branch is what-if-underwater at commit 150641c4ff89c4a5872a045e893b8e092bed0f07.

Repository source — https://github.com/zzand8192/3D-Simulations

The directory what-if-underwater contains a local snapshot of the committed project, including its source, documentation, fonts, vendor libraries, rendering scripts, and existing output video. The .git history is excluded from this copy. SOURCE_SNAPSHOT.json records the commit and verified file hashes.

## What was recovered

This project implements a 70-second cinematic underwater-breathing simulation in Three.js. Characters, environments, camera motion, text, and sound are generated through code. The output folder contains the previous rendered video. This is a prior studio project and is cataloged separately from the 25 external reference examples.

## Character source map

| File | Existing capability | How to reuse it |
| --- | --- | --- |
| src/character.js | makeCharacter(spec), geometry, face drawing, joint hierarchy, pose controls, motion presets | Use as the existing character foundation when the style fits |
| src/scenes.js | CAST table with 15 named entries and randomPerson() for background crowds | Keep one stable spec for each recurring person |
| src/timeline.js | Character acting, shot camera movement, props, face changes, speaker associations | Study how the model is used in scenes |
| src/cues.json | Shot times, dialogue text, who fields, title, labels, and news windows | Keep dialogue and shot timing connected |
| src/ui.js | Projected speech bubbles and title-to-label transition | Reuse the existing text treatment if selected |
| docs/MAKING-VIDEOS.md | Detailed style, engine API, workflow, camera calculations, and known pitfalls | Read before continuing the old implementation |
| CLAUDE.md | Short project-specific instructions | Historical project guidance that must be reconciled with newer requests |

## The implemented look

The old project uses low-poly human proportions. Heads are rounded boxes with ears and necks. Faces are canvas-drawn decals with oval eyes, small highlights, eyebrows, and simple mouths. The standard torso is a tapered T-shirt with colored collar and sleeve trim. Arms are slim, hands are simple forms, and legs can wear long pants or shorts. Shoes can be selected or omitted.

The source comments describe approximately 5.4 model units as roughly 1.8 metres. This is a project scale convention. Preserve the actual geometry when reusing scenes rather than converting all coordinates from that approximate comment.

## Character creation and appearance controls

The builder accepts skin color, hair color and style, top color and trim, short or long sleeves, long or short bottoms, shoes, scale, cap, glasses, coat, tie, backpack, swimsuit, headset, and selected text on the top. These are procedural geometry and material options.

The cap already includes a crown and projecting brim. Long sleeves already cover both upper arms and forearms. A long-sleeved blue top with black pants can be built using existing controls. The inspected builder contains no hoodie-specific hood, drawstrings, or front pocket. Those features require an extension or a separate approved character asset if Greg's final design needs them.

## Acting and rig

The character has nested transform groups for hips, torso, neck/head, shoulders, elbows, hands, hip joints, knees, and feet. The pose() function sets their rotations and offsets. This is a procedural joint hierarchy built from meshes. No Blender character source or standalone FBX/GLB character model was found in the inspected snapshot.

Motion presets include idle, walk, tread water, swim, sit in a chair, recline, sit on the floor, cross-legged sitting, and lying on the back. mergePose combines a preset with shot-specific overrides. Props can attach to either hand group.

setFace() selects eyes, mouth, brows, and gaze, with automatic blinking and a mouth-shape cycle when a scene marks the character as talking. In the old project's presentation, speech is conveyed through bubbles even when the mouth animates.

## Cast consistency

The shared CAST table stores Sam, Mia, Kai, the guard, reporter, chair-carrying man, anchor, two scientists, volunteer, Ray, Dan, Ava, Owen, and Luis. The same spec can create a separate instance in each location.

Dan uses a blue T-shirt with orange trim and dark pants. Luis has a cap and an orange top. These are existing cast members. Neither has a finished Greg identity. The table keys Owen and Luis use internal names nb1 and nb2, which matter when mapping speakers and cues.

## Existing UI and sound details

The project bundles Cormorant Garamond and EB Garamond font files and implements an opening title that moves into the upper-left labels. Dialogue uses dark rounded speech bubbles following speaker heads. Fictional WORLD 24 news graphics are implemented. scripts/audio.py synthesizes ambience, effects, and music; render.mjs contains the export and audio-normalization workflow.

These are verified source capabilities. The previous handbook's generic statement that fonts and a UI project had not been supplied is now supplemented by this recovered project. Selection and approval for the new series remain open.

## Differences that matter for a future AI

The old repository documents human-proportion low-poly people, no spoken voices, speech-bubble dialogue, chapter labels, and a discovery-to-worldwide-adaptation story. Its project instructions describe these as approved at that time. The newer discussion uses the broader phrase Roblox-inspired, studies numerical readouts, and introduces Greg as the recurring character.

Treat the recovered rules as evidence of the previous production. Preserve the implementation when useful. Do not silently promote every historical rule into the new series. If a future task depends on deciding between spoken dialogue and speech bubbles, or between chapter labels and a numerical metric, identify that specific choice and follow Isaac's current direction. The old monetization rationale is historical text and was not validated here.

## Recommended integration path

1. Use the existing character system as a candidate foundation.
2. Claude develops Greg's design and model using Isaac's confirmed visual anchors, then records the selected face, proportions, palette, and hoodie geometry.
3. Define one new CAST.greg spec after that approval.
4. Extend the builder only for features the chosen design actually needs.
5. Reuse the working face and pose system, then create the newspaper, food, and waiting reactions needed for Greg's ordinary tasks.
6. Review a few stills and a short animation test before producing an episode.

## Inspection performed

Source and documentation were read, the full committed working tree was copied and hash-verified, and selected frames were extracted from the existing video. The rendering pipeline was not re-run. Its current compatibility with this Windows environment has not been tested. Old cloud-specific commands in the archived docs may need adaptation.
