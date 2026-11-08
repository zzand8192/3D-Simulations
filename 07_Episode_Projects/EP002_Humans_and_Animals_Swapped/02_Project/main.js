// EP002 — What if humans and animals swapped places?  Renderer, sets, in-world screens, renderAt(t).
import * as THREE from 'three';
import { U, rng } from './env.js';
import { makeCharacter } from './character.js';
import { makeAnimal, addCollar } from './animals.js';
import * as V from './vehicles.js';
import { buildCity, buildSuburb, person } from './scenes_city.js';
import { buildStudio } from './scenes_places.js';
import { HUMANS, animal, mixedCrowd, makeLeash, buildOffice, buildPodium, buildZoo, buildDogPark, buildPetStore, buildVet, buildLivingRoom, addSpeciesCity } from './scenes_ep2.js';
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
const rtBoard = new THREE.WebGLRenderTarget(768, 432, { samples: 4 }); rtBoard.texture.colorSpace = THREE.SRGBColorSpace;

const S = {};
// the street: Tom walks Biscuit
S.street = buildSuburb(renderer, { intact: true });
{ const st = S.street.userData; st.actors = { tom: person(S.street, HUMANS.tom, -30, 0.32, 3.2, Math.PI / 2), biscuit: animal.biscuit() };
  S.street.add(st.actors.biscuit.root); st.collar = addCollar(st.actors.tom); st.leash = makeLeash(S.street, '#c9473a');
  st.dome = S.street.children.find((c) => c.material?.uniforms?.cTop); }
// cities with animals in charge
const ped = mixedCrowd(0.78);
S.city = buildCity(renderer, { style: 'nyc', roadsIntact: true, seed: 12, noCrossers: true, pedFactory: ped, peds: 50, humanFace: { eyes: 'wide', mouth: 'small-o', brows: 'up' } });
{ const C = S.city.userData; C.actors = { police: animal.police() }; S.city.add(C.actors.police.root);
  C.actors.stopped = person(S.city, HUMANS.stopped, -15.6, 0.3, 8.6, 0); addCollar(C.actors.stopped, '#2f6fe0');
  C.extras.push(() => { for (const p of C.peds) p.c.root.visible = !(p.x < 0 && p.c.root.position.z > -2 && p.c.root.position.z < 26); }); }
S.office = buildOffice(renderer);
S.podium = buildPodium(renderer);
S.studio = buildStudio(renderer, rtWall.texture, () => animal.anchor());
S.tokyo = buildCity(renderer, { style: 'tokyo', roadsIntact: true, seed: 24, noCrossers: true, pedFactory: mixedCrowd(0.8), peds: 50, taxi: '#2b5f3a' });
S.london = buildCity(renderer, { style: 'london', roadsIntact: true, seed: 33, noCrossers: true, pedFactory: mixedCrowd(0.8), peds: 40, busColor: '#c4161c', doubleDecker: true });
S.zoo = buildZoo(renderer);
S.dogpark = buildDogPark(renderer);
S.pet = buildPetStore(renderer);
S.vet = buildVet(renderer);
S.city6 = buildCity(renderer, { style: 'rebuilt', roadsIntact: true, seed: 58, noCrossers: true, pedFactory: mixedCrowd(0.85), peds: 60 });
{ const C = S.city6.userData; C.extras.push(...addSpeciesCity(S.city6, C.ax));
  const frame = V.at(V.B(16.4, 9.6, 0.6, new THREE.MeshStandardMaterial({ color: '#111' })), -18.6, 20, 12); frame.rotation.y = Math.PI / 2; S.city6.add(frame);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: rtBoard.texture, toneMapped: false })); board.position.set(-18.2, 20, 12); board.rotation.y = Math.PI / 2; S.city6.add(board);
  const top = new THREE.Object3D(); top.position.set(-18.2, 25.4, 12); S.city6.add(top); C.boardTop = top; }
S.living = buildLivingRoom(renderer);

const wallCam = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 2000), boardCam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 500);
function renderInto(rt, scene, cam, t) {
  const pe = renderer.toneMappingExposure; renderer.toneMappingExposure = scene.userData.exposure || 1;
  U.caustic.value = 0; scene.userData.update?.(t, cam);
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); renderer.toneMappingExposure = pe;
}
const R = {
  renderWall(t) { wallCam.position.set(4, 60, 90); wallCam.lookAt(0, 0, -20); renderInto(rtWall, S.city, wallCam, t); },
  renderBoard(t) { boardCam.position.set(0.3, 5.0, 12.5); boardCam.lookAt(0, 5.6, -2); renderInto(rtBoard, S.studio, boardCam, t); },
};

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
  shot.after?.(t);
  renderer.render(scene, camera);
  updateUI(t, cues, shot.speakers ? shot.speakers() : {}, camera);
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
