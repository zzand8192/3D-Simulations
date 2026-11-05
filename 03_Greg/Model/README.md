# Greg model files

- `GREG_v1_spec.json`: the approved-for-use v1 spec, with its palette, proportions, rig, faces, tested poses and limitations.
- `GREG_v1_character.js`: a snapshot of the character builder that contains `GREG`. Episodes import their own copy, beginning with `07_Episode_Projects/EP001_Every_Road_Disappeared/02_Project/character.js`.
- `GREG_v1_model_sheet.js`: the page script that renders the reference views in `03_Greg/Looks`. To re-render them, run `node scripts/render.mjs --src <episode project> --page model_sheet.html --stills 0,1,2,3,4,5,6,7,8,9,10`.

Always build Greg with `makeCharacter(GREG)` and never restyle him per episode. If his design changes, bump the version to `GREG_v2`, re-render the Looks, and update `03_Greg/Design_Status_and_Continuity.md`.
