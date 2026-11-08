# EP003 — What If You Shrunk in Half Every Second?

Episode ID and title — EP003, "What if you shrunk in half every second?"

Stage — Rendered v01, in review

Target runtime and platform — 75 s, 1080×1920 at 30 fps (Shorts, Reels, TikTok)

Approved script and shot-list versions — `01_Script/EP003_Script_and_Shot_List_v01.md`

## Premise

Altered rule — Greg's height halves every second: height = 1.8 m ÷ 2^n at second n. The speed never changes.

Onset, scope, duration, and restoration — It starts on a city sidewalk at second 0 and never stops. There is no restoration.

Fictional assumptions:
- Greg keeps working at every scale.
- His clothes and phone shrink with him.
- He can stay "inside" water, atoms and a proton as an observer.
- Past second 22 he is smaller than a wave of visible light, so everything shown is a scientific illustration. The video says so on screen.

Factual claims and sources — Every comparison is something larger than Greg at that second (table in the script). Typical sizes used:
- **Everyday objects and animals:** adult 1.7 m, ladybug 7 mm, small ant 2–3 mm, dust mite 0.25–0.3 mm.
- **Microscopic:** paramecium 0.1–0.3 mm, hair 70 µm, red blood cell 7.8 µm, bacteria 1–2 µm, red light 620–750 nm, violet light 380–450 nm.
- **Viruses and molecules:** flu virus 80–120 nm, ribosome 20–30 nm, antibody 10–15 nm, DNA 2 nm wide.
- **Atoms:** water molecule 0.28 nm, oxygen atom ~0.3 nm, hydrogen atom 0.106 nm.
- **Nuclei and below:** uranium nucleus ~15 fm, oxygen nucleus ~6 fm, proton charge diameter 1.68 fm, Planck length 1.616 × 10⁻³⁵ m.

## Audience promise

Opening image — Greg on a busy sidewalk, scrolling his phone, as the title question appears word by word.

What the viewer is waiting to see — How small he gets, what towers over him next, and where it ends.

Three distinct consequences:
- Ordinary things become terrain: shoes, a pigeon, grass, a key, sand grains.
- He falls into a dew drop full of cells and microbes.
- He passes through molecules and an atom into a proton.

Final meaningful image — Past the Planck length, Greg waves, shrugs and dwindles to a speck while the counter keeps going.

## Greg

Location — A city sidewalk (New York-style avenue), then the world beneath it.

Ordinary task and goal — Scrolling his phone while waiting on the sidewalk.

Event consequence — He shrinks in half every second.

Recognition and response:
- He notices at second 2.
- He flinches at giant shoes, backs away from a pigeon and freezes for an ant.
- He covers his mouth near viruses.
- He shrugs at how empty an atom is.
- He sits down inside a proton and checks his phone.

Return or final payoff — There is no return: a small wave goodbye and a shrug at the Planck length.

Model status and version — GREG_v1 (unchanged)

## Production

Required assets:
- New: `models.js` (pigeon, key, ladybug, rice, ant, dust mite, sand, droplet, microbes, cells, viruses, proteins, DNA, sugar, water, electron cloud, nucleus, quarks).
- New: `scenes_ep3.js` (an exact 2× world scale per second around Greg), `post.js` (depth of field and glow) and `clock.js` (counter maths).

Hardest shot or effect — The 1-to-10⁻³⁷ zoom without precision loss. It's solved by keeping Greg fixed and scaling each layer, built in its own unit, by 3·2^n render units per metre.

Next concrete action — Isaac's review of v01.
