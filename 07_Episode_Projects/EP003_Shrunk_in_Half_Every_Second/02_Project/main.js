// EP003 — What if you shrunk in half every second?  Renderer, world, post chain, renderAt(t).
import * as THREE from 'three';
import { U, lerp, clamp01, ease } from './env.js';
import { buildWorld, updateWorld, lookTau } from './scenes_ep3.js';
import { placeCamera, actGreg, bubbleBursts, fadeAt, flashAt } from './timeline.js';
import { tauP } from './clock.js';
import { makePost } from './post.js';
import { updateUI } from './ui.js';

const cues = await (await fetch('cues.json')).json();
const DURATION = cues.duration, W = 1080, H = 1920;
const params = new URLSearchParams(location.search), RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: false, preserveDrawingBuffer: RENDER, logarithmicDepthBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 1e9);
const world = buildWorld(renderer); bubbleBursts(world);
const post = makePost(renderer, W, H);

// post settings by shrink second: [tau, depth-of-field strength, bloom, bloom threshold]
const POST = [[0, 0.6, 0, 1.4], [3, 1.5, 0, 1.4], [6, 9, 0, 1.4], [13.5, 11, 0.05, 1.3], [13.62, 6, 0.25, 1.05], [21, 5, 0.3, 1.0], [24, 3.5, 0.35, 1.0],
  [33, 3, 0.4, 0.95], [36, 2, 0.8, 0.8], [46, 2, 0.9, 0.75], [52, 1.5, 0.8, 0.8], [60, 1.2, 0.8, 0.8], [117, 0.5, 0.6, 0.8]];
function postAt(tau) {
  let i = 0; while (i < POST.length - 2 && tau > POST[i + 1][0]) i++;
  const a = POST[i], b = POST[i + 1], k = ease.io(clamp01((tau - a[0]) / Math.max(1e-3, b[0] - a[0])));
  return { aperture: lerp(a[1], b[1], k), bloom: lerp(a[2], b[2], k), threshold: lerp(a[3], b[3], k) };
}

function renderAt(t) {
  t = Math.max(0, Math.min(DURATION - 1e-3, t));
  U.time.value = t;
  const tau = tauP(t);
  updateWorld(world, t, tau, camera);
  actGreg(world, t);
  placeCamera(camera, t, world.greg.root.position);
  renderer.toneMappingExposure = world.exposure || 1;
  world.scene.updateMatrixWorld();
  const focus = camera.position.distanceTo(new THREE.Vector3(world.greg.root.position.x, 3.0 + world.greg.root.position.y, world.greg.root.position.z));
  post.render(world.scene, camera, { focus, ...postAt(lookTau(t, tau)) });
  updateUI(t, cues, flashAt(t));
  document.getElementById('fade').style.opacity = fadeAt(t, cues).toFixed(3);
}
window.DURATION = DURATION; window.renderAt = renderAt;
window.warmup = async () => { for (const t of [1, 8, 12, 16, 19, 24, 30, 36, 44, 50, 54, 58, 68]) renderAt(t); await document.fonts.ready; return true; };
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
