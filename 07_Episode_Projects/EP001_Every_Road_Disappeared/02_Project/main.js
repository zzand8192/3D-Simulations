// EP001 — What if every road disappeared?  Renderer, sets, in-world screens, renderAt(t).
import * as THREE from 'three';
import { U, rng } from './env.js';
import { makeCharacter } from './character.js';
import * as V from './vehicles.js';
import * as P from './props.js';
import { buildCity, buildSuburb, buildHighway, person, randomPerson } from './scenes_city.js';
import { buildStudio, buildGasStation, buildGrocery, buildHospital, buildStation, buildAirport, buildConstruction, CAST } from './scenes_places.js';
import { makeShots, fadeAt } from './timeline.js';
import { updateUI } from './ui.js';

const cues = await (await fetch('cues.json')).json();
const DURATION = cues.duration, W = 1080, H = 1920;
const params = new URLSearchParams(location.search), RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 3000);
const rtWall = new THREE.WebGLRenderTarget(768, 432, { samples: 4 }); rtWall.texture.colorSpace = THREE.SRGBColorSpace;

const S = {};
// New York: roads vanish at cues.tv
S.nyc = buildCity(renderer, { style: 'nyc', tv: cues.tv, seed: 11 });
{ const N = S.nyc.userData; N.hero = N.vehicles[2]; N.hideZone = null; N.actors = {};
  N.actors.ped1 = person(S.nyc, CAST.ped1, -13.4, 0.3, 17.5, Math.PI / 2);
  N.driverCar = V.car('#f2c230', 'taxi'); N.driverCar.position.set(-3, N.H(-3, -62) + 0.1, -62); N.driverCar.userData.body.rotation.z = 0.03; S.nyc.add(N.driverCar);
  N.actors.driver = person(S.nyc, CAST.driver, -5.8, 0, -62.5, -Math.PI / 2);
  N.driverCar.visible = false; N.actors.driver.root.visible = false;
  N.extras.push((t) => { const on = t > cues.tv + 0.5; N.driverCar.visible = on; N.actors.driver.root.visible = on;
    for (const p of N.peds) p.c.root.visible = !(N.hideZone && p.x < 0 && p.c.root.position.z > N.hideZone[0] && p.c.root.position.z < N.hideZone[1]);
    for (const q of N.vehicles) q.v.visible = !(on && !q.parked && Math.abs(q.v.position.z + 62) < 16 && Math.abs(q.v.position.x + 3) < 8); }); }
S.suburb = buildSuburb(renderer);
S.highway = buildHighway(renderer);
S.studio = buildStudio(renderer, rtWall.texture);
S.tokyo = buildCity(renderer, { style: 'tokyo', stranded: true, seed: 23, taxi: '#2b5f3a', noBus: false });
{ const T = S.tokyo.userData; T.actors = { reporter: person(S.tokyo, CAST.reporter, -15, 0.3, 26, 0.15) };
  T.extras.push(() => { for (const p of T.peds) if (p.x < 0 && p.c.root.position.z > 16) p.c.root.visible = false; });
  const mic = P.microphone(); mic.rotation.x = Math.PI; mic.position.y = -0.15; mic.scale.setScalar(1.3); T.actors.reporter.armR.hand.add(mic);
  for (let z = -40; z <= 60; z += 6.4) for (const x of [-12.6, 12.6]) { if (x < 0 && z > 10) continue; const b = V.barrier(6); b.position.set(x, 0.3, z); b.rotation.y = Math.PI / 2; S.tokyo.add(b); } }
S.london = buildCity(renderer, { style: 'london', stranded: true, seed: 31, busColor: '#c4161c', doubleDecker: true, noCrossers: true });
{ const L = S.london.userData; const r = rng(4); for (let i = 0; i < 6; i++) { const b = V.bus('#c4161c', true); const x = i < 3 ? -40 - i * 34 : 0 + (i % 2 ? -9 : 9), z = i < 3 ? -3.6 : -40 - i * 30; b.position.set(x, L.H(x, z) + 0.1, z); b.rotation.y = i < 3 ? Math.PI / 2 : (i % 2 ? 0 : Math.PI); b.userData.body.rotation.z = (r() - 0.5) * 0.05; S.london.add(b); } }
S.sao = buildCity(renderer, { style: 'sao', stranded: true, seed: 41, carsPerLane: 16, noCrossers: true, noBus: true });
S.gas = buildGasStation(renderer, { rebuilt: false });
{ const G = S.gas.userData, greg = G.actors.greg;
  const s = P.sandwich(); s.scale.setScalar(0.5); s.position.set(0, -0.5, 0.35); s.rotation.x = -0.3; greg.armR.hand.add(s);
  const d = P.cup('#d94a3a'); d.scale.setScalar(1.4); d.position.set(0, -0.5, 0.25); greg.armL.hand.add(d);
  G.hand = { s, d }; s.visible = d.visible = false; }
S.gas2 = buildGasStation(renderer, { rebuilt: true });
{ const G = S.gas2.userData; G.gregCar.position.set(25, 0.25, 15); G.gregCar.rotation.y = 0.1; G.keys.visible = true; G.actors.cashier.root.visible = false; }
S.grocery = buildGrocery(renderer);
S.hospital = buildHospital(renderer);
S.station = buildStation(renderer, { hub: false });
S.hub = buildStation(renderer, { hub: true });
S.airport = buildAirport(renderer);
S.build = buildConstruction(renderer);
S.year5 = buildCity(renderer, { style: 'rebuilt', roadsIntact: true, seed: 57, noCrossers: true, peds: 60 });
S.year5.userData.actors = { walker: person(S.year5, { name: 'walker', ...randomPerson(rng(9)), top: { kind: 'tee', color: '#f4c542', trim: '#2f6fe0' } }, -15.2, 0.3, 0, 0) };

const wallCam = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 2000);
function renderInto(rt, scene, cam, t) {
  const pe = renderer.toneMappingExposure; renderer.toneMappingExposure = scene.userData.exposure || 1;
  U.caustic.value = 0; scene.userData.update?.(t, cam);
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); renderer.toneMappingExposure = pe;
}
const R = { renderWall(t) { const a = t * 0.05; wallCam.position.set(4 + Math.sin(a) * 4, 70, 96); wallCam.lookAt(0, 0, -20); renderInto(rtWall, S.nyc, wallCam, t); } };

const shots = makeShots(S, cues);
let current = null;
const shotAt = (t) => shots.find((s) => t >= s.start && t < s.end) || shots[shots.length - 1];
function renderAt(t) {
  t = Math.max(0, Math.min(DURATION - 1e-3, t));
  const shot = shotAt(t);
  if (shot !== current) { current = shot; shot.setup?.(); }
  U.time.value = t;
  shot.prerender?.(R, t);
  const scene = shot.scene;
  U.caustic.value = scene.userData.caustic || 0;
  renderer.toneMappingExposure = scene.userData.exposure || 1;
  scene.userData.update?.(t, camera);
  shot.update(t - shot.start, t, camera);
  scene.updateMatrixWorld();
  renderer.render(scene, camera);
  updateUI(t, cues, {}, camera);
  document.getElementById('fade').style.opacity = fadeAt(t).toFixed(3);
}
window.DURATION = DURATION; window.renderAt = renderAt;
window.warmup = async () => { for (const s of shots) renderAt(s.start + 0.02); current = null; await document.fonts.ready; return true; };
if (!RENDER) {
  const fit = () => document.documentElement.style.setProperty('--s', Math.min(innerWidth / W, innerHeight / H));
  addEventListener('resize', fit); fit();
  const ctl = document.getElementById('controls'); ctl.hidden = false;
  const scrub = document.getElementById('scrub'), clock = document.getElementById('clock'), play = document.getElementById('play');
  scrub.max = DURATION; let playing = true, t = Number(params.get('t') || 0), last = performance.now();
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; };
  scrub.oninput = () => { t = Number(scrub.value); };
  const loop = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; if (playing) { t += dt; if (t >= DURATION) t = 0; } renderAt(t); scrub.value = t; clock.textContent = t.toFixed(1) + 's'; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
window.__ready = true;
