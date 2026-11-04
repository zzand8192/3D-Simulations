import * as THREE from 'three';
import { U, beamCone } from './env.js';
import { makeCast, buildBeach, buildReef, buildDeep, buildCity } from './scenes.js';
import { makeShots, cues, fadeAt, DURATION } from './timeline.js';
import { updateUI } from './ui.js';

const W = 1080, H = 1920;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);

const S = { beach: buildBeach(renderer), reef: buildReef(renderer), deep: buildDeep(renderer), city: buildCity(renderer) };
const cast = makeCast();

// flashlights (only switched on in the deep)
function flashlight(hand) {
  const g = new THREE.Group();
  g.rotation.x = Math.PI / 2; // +z of the group points down the arm
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.1, 12), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.4, metalness: 0.6 }));
  body.rotation.x = Math.PI / 2; body.position.z = 0.2; g.add(body);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), new THREE.MeshBasicMaterial({ color: '#fff8e0' }));
  lens.position.z = 0.76; g.add(lens);
  const beam = beamCone({ length: 26, radius: 5.5, opacity: 0.2 }); beam.position.z = 0.78; g.add(beam);
  const spot = new THREE.SpotLight('#fff1d0', 900, 60, 0.42, 0.55, 1.6);
  spot.position.z = 0.8; g.add(spot);
  const tgt = new THREE.Object3D(); tgt.position.z = 12; g.add(tgt); spot.target = tgt;
  hand.add(g);
  return g;
}
const gear = { max: flashlight(cast.max.armR.hand), leo: flashlight(cast.leo.armL.hand) };
// soft key so faces read in the dark
const faceFill = new THREE.PointLight('#7fd8ff', 60, 30, 1.6); faceFill.position.set(0, 6, 9); S.deep.add(faceFill);

const shots = makeShots(S, cast, gear);
let current = null;

function shotAt(t) { return shots.find((s) => t >= s.start && t < s.end) || shots[shots.length - 1]; }

export function renderAt(t) {
  t = Math.max(0, Math.min(DURATION - 1e-3, t));
  const shot = shotAt(t);
  const scene = shot.scene;
  if (shot !== current) {
    current = shot;
    scene.add(cast.max.root, cast.leo.root);
    shot.setup?.();
    U.caustic.value = scene.userData.caustic || 0;
    U.surfaceY.value = scene.userData.surfaceY ?? 30;
    renderer.toneMappingExposure = scene.userData.exposure || 1;
  }
  U.time.value = t;
  shot.update(t - shot.start, t, camera);
  scene.userData.update?.(t, camera);
  renderer.render(scene, camera);
  updateUI(t, cues);
  document.getElementById('fade').style.opacity = fadeAt(t).toFixed(3);
}

window.DURATION = DURATION;
window.renderAt = renderAt;
// compile all scenes up front so the first frame of each shot is not a hitch
window.warmup = async () => {
  for (const s of shots) { renderAt(s.start + 0.01); }
  current = null;
  await document.fonts.ready;
  return true;
};

if (!RENDER) {
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    document.documentElement.style.setProperty('--s', s);
  };
  addEventListener('resize', fit); fit();
  const ctl = document.getElementById('controls'); ctl.hidden = false;
  const scrub = document.getElementById('scrub'), clock = document.getElementById('clock'), play = document.getElementById('play');
  scrub.max = DURATION;
  let playing = true, t = Number(params.get('t') || 0), last = performance.now();
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; };
  scrub.oninput = () => { t = Number(scrub.value); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') play.click(); });
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { t += dt; if (t >= DURATION) t = 0; }
    renderAt(t);
    scrub.value = t; clock.textContent = t.toFixed(1) + 's';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
window.__ready = true;
