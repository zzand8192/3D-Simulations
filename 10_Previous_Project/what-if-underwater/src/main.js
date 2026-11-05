import * as THREE from 'three';
import { U } from './env.js';
import { buildBeach, buildShallows, buildPool, buildStudio, buildLab, buildApartment, buildCity } from './scenes.js';
import { makeShots, fadeAt } from './timeline.js';
import { updateUI } from './ui.js';

const cues = await (await fetch('cues.json')).json();
const DURATION = cues.duration;
const W = 1080, H = 1920;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2500);

// screens inside the world: the studio video wall shows the beach; the living-room TV shows the studio
const rtWall = new THREE.WebGLRenderTarget(768, 432, { samples: 4 }); rtWall.texture.colorSpace = THREE.SRGBColorSpace;
const rtTV = new THREE.WebGLRenderTarget(768, 432, { samples: 4 }); rtTV.texture.colorSpace = THREE.SRGBColorSpace;
const S = {};
S.beach = buildBeach(renderer);
S.shallows = buildShallows(renderer);
S.pool = buildPool(renderer);
S.studio = buildStudio(renderer, rtWall.texture);
S.lab = buildLab(renderer);
S.apartment = buildApartment(renderer, rtTV.texture);
S.city = buildCity(renderer);

const wallCam = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 2000);
const tvCam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 500);
function renderInto(rt, scene, cam, t) {
  const prevExp = renderer.toneMappingExposure, prevC = U.caustic.value, prevS = U.surfaceY.value;
  U.caustic.value = scene.userData.caustic || 0; U.surfaceY.value = scene.userData.surfaceY ?? 30;
  renderer.toneMappingExposure = scene.userData.exposure || 1;
  scene.userData.update?.(t, cam);
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
  renderer.toneMappingExposure = prevExp; U.caustic.value = prevC; U.surfaceY.value = prevS;
}
const R = {
  renderWall(t) { // drone footage of the crowded beach and swimmers
    const a = t * 0.06;
    wallCam.position.set(Math.sin(a) * 30 - 10, 30, 30 + Math.cos(a) * 8); wallCam.lookAt(0, 0, -14);
    renderInto(rtWall, S.beach, wallCam, t);
  },
  renderTV(t) {
    tvCam.position.set(0.3, 5.0, 12.5); tvCam.lookAt(0, 5.6, -2);
    renderInto(rtTV, S.studio, tvCam, t);
  },
};

const shots = makeShots(S, cues, R);
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
  U.surfaceY.value = scene.userData.surfaceY ?? 30;
  renderer.toneMappingExposure = scene.userData.exposure || 1;
  scene.userData.update?.(t, camera);
  shot.update(t - shot.start, t, camera);
  scene.updateMatrixWorld();
  renderer.render(scene, camera);
  updateUI(t, cues, shot.speakers(), camera);
  document.getElementById('fade').style.opacity = fadeAt(t).toFixed(3);
}

window.DURATION = DURATION;
window.renderAt = renderAt;
window.warmup = async () => { for (const s of shots) renderAt(s.start + 0.02); current = null; await document.fonts.ready; return true; };

if (!RENDER) {
  const fit = () => document.documentElement.style.setProperty('--s', Math.min(innerWidth / W, innerHeight / H));
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
    renderAt(t); scrub.value = t; clock.textContent = t.toFixed(1) + 's';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
window.__ready = true;
