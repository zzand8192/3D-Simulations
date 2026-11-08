// EP003 timeline: Greg's acting (silent) and the camera. One continuous shot; the camera keeps zooming in
// on Greg by following the shrink with a short lag, so each halving reads as Greg dropping away and the
// camera chasing him down.
import * as THREE from 'three';
import { ease, seg, lerp, clamp01 } from './env.js';
import { motion, mergePose } from './character.js';
import { T0, JUMP, tauP, tauCam } from './clock.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z), IO = ease.io;
const win = (t, a, b, fi = 0.3, fo = 0.3) => (t < a || t > b ? 0 : Math.min(IO((t - a) / fi), IO((b - t) / fo)));
function blend(a, b, k) { const o = { ...a }; for (const key in b) o[key] = lerp(a[key] || 0, b[key], k); for (const key in a) if (!(key in b)) o[key] = lerp(a[key], 0, k * 0); return o; }
const add = (base, extra, k) => (k > 0 ? blend(base, mergePose(base, extra), k) : base);

// ---------------------------------------------------------------- camera keys: t, azimuth, elevation, distance, focus height, fov
// azimuth 0 = camera on Greg's front (-x side); positive swings toward screen-right (+z)
const CAM = [
  [4.0, 0.2, 0.1, 11.8, 3.0, 45], [6.0, 0.12, 0.07, 11.4, 3.0, 45], [7.4, -0.08, 0.03, 11.6, 3.2, 46], [9.2, -0.28, 0.1, 12.4, 3.4, 46],
  [10.8, 0.05, 0.12, 12.0, 3.0, 45], [12.0, 0.3, 0.22, 11.6, 2.6, 45], [13.4, -0.05, 0.07, 11.0, 2.8, 45], [15.0, 0.05, 0.05, 11.4, 2.8, 46],
  [16.2, 0.32, 0.08, 11.6, 2.9, 46], [17.4, 0.22, 0.09, 11.4, 2.9, 46], [17.62, 0.05, 0.12, 11.0, 2.8, 46],
  [20.0, -0.12, 0.1, 11.0, 2.9, 46], [23.0, 0.2, 0.06, 10.8, 3.0, 46], [26.0, -0.1, 0.12, 11.0, 3.0, 46], [30.0, 0.22, 0.04, 11.2, 3.0, 46],
  [34.0, -0.18, 0.1, 11.4, 3.2, 46], [37.0, 0.12, 0.12, 11.0, 3.0, 46], [41.0, 0.32, 0.05, 11.6, 3.0, 46], [45.0, 0.0, 0.1, 11.6, 3.0, 46],
  [49.0, 0.28, 0.12, 12.2, 3.0, 46], [52.0, 0.05, 0.08, 11.6, 3.0, 46], [56.0, -0.2, 0.14, 11.0, 2.6, 46], [60.0, 0.15, 0.1, 10.6, 2.5, 46], [64.6, 0.25, 0.08, 10.8, 2.6, 46],
  [66.6, 0.1, 0.1, 10.8, 3.0, 46], [70.0, -0.05, 0.08, 10.8, 3.0, 46], [75.0, -0.12, 0.08, 10.8, 3.0, 46],
];
function camKey(t) {
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], k = IO(clamp01((t - a[0]) / (b[0] - a[0])));
  return a.map((x, j) => lerp(x, b[j], k));
}
export function placeCamera(cam, t, follow = null) {
  if (t < T0) { // establishing: glide down the avenue to Greg
    const k = IO(clamp01(t / T0));
    const pos = v3(-34, 21, 30).lerp(v3(-11.1, 4.2, 2.4), k), tgt = v3(0, 8.5, 4).lerp(v3(0, 3.0, 0), k);
    cam.fov = 45; cam.position.copy(pos); cam.lookAt(tgt); cam.updateProjectionMatrix(); return;
  }
  const [, az, el, D, fy, fov] = camKey(t);
  const lagD = Math.pow(2, tauP(t) - tauCam(t));
  const dir = v3(-Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  const focus = v3(follow ? follow.x * 0.85 : 0, fy, follow ? follow.z * 0.85 : 0), d = D * lagD;
  cam.position.copy(focus).addScaledVector(dir, d);
  if (t >= JUMP.in) cam.position.y += Math.sin(t * 0.7) * 0.15;
  cam.lookAt(focus.x, fy + (d - D) * 0.04, focus.z);
  cam.fov = fov; cam.near = 0.05; cam.far = 1e9; cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------- Greg
export function actGreg(W, t) {
  const g = W.greg, root = g.root;
  let pose = motion.idle(t), face = { eyes: 'open', mouth: 'smile' };
  let pos = v3(0, 0, 0), yaw = -Math.PI / 2, rx = 0, rz = 0;
  const water = t >= 17.62, jump = t >= JUMP.in;
  W.phone.visible = (t < 10.35) || (t > 60.0 && t < 61.7);

  if (!water) {
    // phone scrolling, then noticing
    const ph = 1 - IO(seg(t, 6.4, 7.0));
    pose = add(pose, mergePose(motion.phone, { aRx: -0.85 + Math.sin(t * 2.2) * 0.03, eR: -1.45, headX: 0.42 }), ph);
    if (t < 6.0) face = { eyes: Math.sin(t * 0.9) > 0.85 ? 'half' : 'open', mouth: 'smile' };
    if (t >= 6.0) { face = { eyes: 'wide', mouth: 'small-o', brows: 'up' }; pose = add(pose, { headX: -0.15 }, win(t, 6.0, 6.8, 0.2, 0.2)); }
    pose = add(pose, { headY: Math.sin((t - 6.6) * 2.6) * 0.65, aRx: -0.55, eR: -1.0 }, win(t, 6.6, 7.9, 0.3, 0.3));
    // giant shoes behind him
    pose = add(pose, { hipY: -0.32, kL: 0.6, kR: 0.6, lean: 0.2, aLz: 0.9, aRz: 0.9, eL: -0.6, eR: -0.6, headY: 0.7, headX: 0.1 }, win(t, 8.05, 8.7, 0.12, 0.35));
    if (t > 8.05 && t < 8.7) face = { eyes: 'squeeze', mouth: 'frown', brows: 'worried' };
    // the pigeon (behind his left shoulder): turns to it, backs off, pockets the phone, ducks when it flies
    const turn = IO(seg(t, 8.8, 9.4)) * (1 - IO(seg(t, 11.0, 11.7)));
    yaw += turn * 1.25; pose = add(pose, { headX: -0.35, headY: 0.25 }, win(t, 8.9, 10.6, 0.3, 0.3));
    if (t > 8.9 && t < 10.6) face = { eyes: 'wide', mouth: 'o', brows: 'up' };
    const back = IO(seg(t, 9.6, 10.4)); pos.add(v3(-1.0, 0, -0.7).multiplyScalar(back));
    if (t > 9.6 && t < 10.4) pose = blend(pose, mergePose(motion.walk(-t, 0.7), { headX: -0.35 }), win(t, 9.6, 10.4, 0.15, 0.15));
    pose = add(pose, { aRx: 0.15, aRz: 0.25, eR: -0.4 }, win(t, 10.1, 10.6, 0.15, 0.15)); // hand to pocket
    pose = add(pose, { ...motion.handsOnHead, hipY: -0.35, kL: 0.6, kR: 0.6, lean: 0.25 }, win(t, 10.6, 11.4, 0.12, 0.35));
    if (t > 10.6 && t < 11.4) face = { eyes: 'squeeze', mouth: 'frown', brows: 'worried' };
    // key, ladybug, rice, grass
    pose = add(pose, { headX: 0.4, headY: 0.55 }, win(t, 11.5, 12.6, 0.3, 0.3));
    if (t > 11.5) face = { eyes: 'wide', mouth: 'flat', brows: 'up' };
    pose = add(pose, { headY: -0.75, headX: -0.1 }, win(t, 12.8, 13.6, 0.3, 0.3));
    // the ant: freezes with hands up, edges away
    const ant = win(t, 13.6, 15.0, 0.25, 0.4);
    pose = add(pose, { aLx: -0.9, aRx: -0.9, eL: -1.6, eR: -1.6, aLz: 0.35, aRz: 0.35, headY: -0.9, lean: -0.12 }, ant);
    if (ant > 0.5) face = { eyes: 'wide', mouth: 'small-o', brows: 'worried' };
    pos.add(v3(-0.8, 0, 0.3).multiplyScalar(IO(seg(t, 14.0, 14.6))));
    // sand boulders: looks around, rubs his head
    pose = add(pose, { headY: Math.sin((t - 15.2) * 1.8) * 0.6, headX: -0.25, aLx: -2.3, eL: -2.2, aLz: 0.5 }, win(t, 15.2, 16.1, 0.3, 0.3));
    if (t > 15.2 && t < 16.1) face = { eyes: 'open', mouth: 'flat', brows: 'worried' };
    // the dust mite from his left (+z): backs away into the droplet behind him
    if (t > 16.0) { const away = IO(seg(t, 16.55, 17.55));
      yaw = -Math.PI / 2 + IO(seg(t, 16.0, 16.5)) * 1.0;
      pos.add(v3(-0.3, 0, -3.4).multiplyScalar(away));
      pose = blend(mergePose(motion.idle(t), { headY: 0.75, aLz: 0.6, aRz: 0.6, eL: -0.5, eR: -0.5 }), mergePose(motion.walk(-t * 1.2, 0.9), { headY: 0.75, aLx: -0.8, aRx: -0.8, eL: -0.9, eR: -0.9 }), win(t, 16.5, 17.4, 0.15, 0.15));
      pose = add(pose, { lean: -0.55, aLx: -2.2, aRx: -2.4, eL: -0.3, eR: -0.3, aLz: 0.6, aRz: 0.6, kL: 0.3, kR: 0.5 }, win(t, 17.3, 17.62, 0.15, 0.01));
      face = { eyes: 'wide', mouth: t > 17.3 ? 'open' : 'o', brows: 'worried' };
    }
  } else if (!jump) {
    // floating: tread water, then drift, react
    const bob = Math.sin(t * 1.4) * 0.15;
    pos.set(0, 0.6 + bob, 0);
    const flail = 1 - IO(seg(t, 17.62, 18.6));
    pose = blend(motion.tread(t, 1), mergePose(motion.tread(t * 2.2, 1.6), motion.armsOut, { headX: -0.2 }), flail);
    face = flail > 0.5 ? { eyes: 'squeeze', mouth: 'puff', brows: 'worried' } : { eyes: 'open', mouth: 'small-o', brows: 'up' };
    yaw = -Math.PI / 2 + Math.sin(t * 0.21) * 0.18;
    // watching things go by
    pose = add(pose, { headY: Math.sin((t - 18) * 1.1) * 0.7 }, win(t, 18.3, 19.6, 0.3, 0.3));                         // paramecium
    pose = add(pose, { aLx: -1.3, eL: -0.3, aLz: 0.2, headY: 0.4 }, win(t, 19.2, 20.2, 0.3, 0.3));                      // reaches for the hair
    pose = add(pose, { lean: -0.2, headX: -0.3, aRz: 0.9, aLz: 0.9 }, win(t, 20.2, 21.0, 0.25, 0.3));                   // pollen spines
    const bump = seg(t, 21.95, 22.9); rz = Math.sin(bump * Math.PI) * 0.35 * (1 - bump) ; rx = Math.sin(bump * Math.PI * 2) * 0.12;
    if (t > 21.95 && t < 22.6) face = { eyes: 'squeeze', mouth: 'frown', brows: 'worried' };
    pose = add(pose, { aLx: -2.9, eL: -0.6, aLz: 0.3 + Math.sin(t * 9) * 0.3, headY: 0.35 }, win(t, 23.7, 24.7, 0.2, 0.25)); // waves at a bacterium
    if (t > 23.7 && t < 24.7) face = { eyes: 'happy', mouth: 'smile', brows: 'soft' };
    pose = add(pose, { aLx: -1.0, aRx: -1.0, eL: -1.5, eR: -1.5, aLz: 0.1, aRz: 0.1, headX: 0.45 }, win(t, 25.0, 27.0, 0.4, 0.4)); // looks at his hands in the light waves
    if (t > 25.0 && t < 27.0) face = { eyes: 'wide', mouth: 'small-o', brows: 'up' };
    pose = add(pose, { aRx: -1.7, eR: -2.35, aRz: -0.15, headX: 0.05 }, win(t, 27.9, 30.4, 0.25, 0.35));             // covers his mouth near the viruses
    if (t > 27.9 && t < 30.4) face = { eyes: 'wide', mouth: 'puff', brows: 'worried' };
    const dnaTurn = win(t, 33.4, 35.6, 0.5, 0.5); yaw += dnaTurn * 0.9; pose = add(pose, { headX: -0.45, aLx: -1.6, eL: -0.2 }, dnaTurn);
    if (dnaTurn > 0.5) face = { eyes: 'wide', mouth: 'o', brows: 'up' };
    const jost = win(t, 35.9, 38.2, 0.2, 0.4);                                                                        // water molecules jostle him
    rz += jost * (Math.sin(t * 9.1) * 0.12 + Math.sin(t * 5.3) * 0.08); rx += jost * Math.sin(t * 7.7) * 0.1;
    pose = add(pose, { ...motion.armsOut, headZ: Math.sin(t * 6) * 0.15 }, jost);
    if (jost > 0.5) face = { eyes: Math.sin(t * 4) > 0 ? 'squeeze' : 'wide', mouth: 'wobble', brows: 'worried' };
    pose = add(pose, { headY: Math.sin((t - 38.6) * 0.9) * 0.8, headX: -0.2 }, win(t, 38.6, 41.0, 0.4, 0.4));        // inside the atom
    pose = add(pose, motion.shrug, win(t, 41.6, 43.0, 0.3, 0.4));                                                     // ...it's mostly empty
    if (t > 41.6 && t < 43.0) face = { eyes: 'half', mouth: 'flat', brows: 'flat' };
    const look = win(t, 44.6, 50.0, 0.6, 0.5); yaw += look * 0.75; pose = add(pose, { headX: -0.15 }, look);          // notices the nucleus
    if (look > 0.5) face = { eyes: 'wide', mouth: 'small-o', brows: 'up' };
    pose = add(pose, { aRx: -2.5, eR: -1.9, aRz: -0.2, headX: 0.12 }, win(t, 50.2, 52.6, 0.3, 0.4));                  // shades his eyes
    if (t > 50.2 && t < 52.6) face = { eyes: 'squeeze', mouth: 'flat', brows: 'worried' };
    pose = add(pose, { ...motion.armsOut, headX: -0.2 }, win(t, 53.6, 56.0, 0.3, 0.5));                               // into the proton
    if (t > 53.6 && t < 56.0) face = { eyes: 'wide', mouth: 'o', brows: 'up' };
    const sit = IO(seg(t, 56.2, 57.6));                                                                               // gives up and sits
    pose = blend(pose, mergePose(motion.sitChair(t), { aLx: -0.15, aRx: -0.15, eL: -0.9, eR: -0.9, aLz: 0.25, aRz: 0.25 }), sit); pos.y = lerp(pos.y, 1.2 + bob * 0.5, sit);
    if (t > 57.6) face = { eyes: 'half', mouth: 'flat', brows: 'flat' };
    pose = add(pose, { ...motion.phone, headX: 0.38 }, win(t, 60.0, 61.7, 0.3, 0.3));                                  // checks his phone
    if (t > 60.0 && t < 61.7) face = { eyes: 'open', mouth: 'flat', brows: 'up' };
    if (t > 61.7 && t < 63.6) face = { eyes: 'half', mouth: 'smirk', brows: 'flat' };
  } else {
    // past the Planck length: calm, a small wave goodbye, a shrug
    const bob = Math.sin(t * 1.2) * 0.12; pos.set(0, 0.6 + bob, 0);
    pose = motion.tread(t, 0.6); face = { eyes: 'open', mouth: 'small-o', brows: 'up' };
    pose = add(pose, { headX: 0.05 }, 1);
    pose = add(pose, { aLx: -2.9, eL: -0.5, aLz: 0.3 + Math.sin(t * 8) * 0.3 }, win(t, 69.4, 70.8, 0.25, 0.3));
    if (t > 69.4 && t < 70.8) face = { eyes: 'happy', mouth: 'smile', brows: 'soft' };
    pose = add(pose, motion.shrug, win(t, 71.2, 72.8, 0.3, 0.4));
    if (t > 71.2) face = { eyes: 'half', mouth: 'smirk', brows: 'flat' };
  }
  root.position.copy(pos); root.rotation.set(rx, yaw, rz);
  g.pose(pose); g.setFace(face, t, false, 7);
}

export function bubbleBursts(W) {
  W.bubbles.userData.burst({ t0: 17.62, origin: v3(0, 3, 0), n: 46, spread: 6, rise: 3.2, size: 0.28, life: 2.6, stagger: 0.012 });
  W.bubbles.userData.burst({ t0: 17.95, origin: v3(0.2, 3.6, 0.3), n: 12, spread: 1.4, rise: 2.4, size: 0.16, life: 2.2, stagger: 0.05 });
}
// black fades from cues.fade, plus coloured flashes for the splash and the proton
export function fadeAt(t, cues) { // cues.fade = [[0,a,'in'], [b,c,'out'], [d,e,'in'], [f,g,'out']]
  const [[, i0], [o1s, o1e], [i2s, i2e], [o3s, o3e]] = cues.fade;
  if (t < i0) return 1 - IO(t / i0);
  if (t < o1s) return 0;
  if (t < o1e) return IO((t - o1s) / (o1e - o1s));
  if (t < i2s) return 1;
  if (t < i2e) return 1 - IO((t - i2s) / (i2e - i2s));
  if (t < o3s) return 0;
  return IO(clamp01((t - o3s) / (o3e - o3s)));
}
export function flashAt(t) {
  const sp = Math.max(0, 1 - Math.abs(t - 17.62) / (t < 17.62 ? 0.18 : 0.42));
  const pr = Math.max(0, 1 - Math.abs(t - 55.8) / 0.6) * 0.55;
  return sp > pr ? { a: Math.pow(sp, 1.3), c: '#dffcff' } : { a: pr, c: '#ffd0ec' };
}
