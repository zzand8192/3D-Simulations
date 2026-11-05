// Low-poly stylized people (human proportions, simple drawn faces) with a small joint rig.
// One unit ~= 0.34 m: a character is ~5.4 units (~1.8 m) tall.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { causticMaterial } from './env.js';

const geo = new Map();
const cached = (k, f) => (geo.has(k) ? geo.get(k) : (geo.set(k, f()), geo.get(k)));
const rbox = (w, h, d, r = 0.08) => cached(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
// limb segment hanging down from its pivot
const limb = (rt, rb, len) => cached(`l${rt}|${rb}|${len}`, () => { const g = new THREE.CylinderGeometry(rt, rb, len, 9); g.translate(0, -len / 2, 0); return g; });
const torsoG = (wt, wb, h, d) => cached(`t${wt}|${wb}|${h}|${d}`, () => {
  const g = new THREE.CylinderGeometry(wt, wb, h, 12, 2); g.scale(1, 1, d); g.translate(0, h / 2, 0); return g;
});

const matCache = new Map();
function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, causticMaterial({ color, roughness: 0.72, metalness: 0, ...opts }));
  return matCache.get(k);
}

// ---------------------------------------------------------------- faces (style: dark oval eyes, small smile)
const faceCache = new Map();
function drawFace({ eyes = 'open', mouth = 'smile', brows = 'soft', look = 0, lips = false }) {
  const key = [eyes, mouth, brows, look, lips].join('|');
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  const ink = '#2a1a12', ex = [88, 168], ey = 112, lx = look * 9;
  g.fillStyle = ink; g.strokeStyle = ink;
  for (const x of ex) {
    if (eyes === 'open' || eyes === 'wide') {
      const w = eyes === 'wide' ? 26 : 20, h = eyes === 'wide' ? 36 : 28;
      g.beginPath(); g.ellipse(x + lx, ey, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + lx - 3, ey - 6, 3.5, 0, 7); g.fill(); g.fillStyle = ink;
    } else if (eyes === 'half') {
      g.beginPath(); g.ellipse(x + lx, ey + 4, 10, 8, 0, 0, Math.PI); g.fill();
      g.lineWidth = 6; g.beginPath(); g.moveTo(x - 14, ey + 2); g.lineTo(x + 14, ey + 2); g.stroke();
    } else if (eyes === 'closed') {
      g.lineWidth = 6; g.beginPath(); g.moveTo(x - 12, ey + 2); g.quadraticCurveTo(x, ey + 9, x + 12, ey + 2); g.stroke();
    } else if (eyes === 'happy') {
      g.lineWidth = 7; g.beginPath(); g.moveTo(x - 13, ey + 6); g.quadraticCurveTo(x, ey - 10, x + 13, ey + 6); g.stroke();
    } else if (eyes === 'squeeze') {
      const s = x < 128 ? 1 : -1; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x - 12 * s, ey - 8); g.lineTo(x + 10 * s, ey + 1); g.lineTo(x - 12 * s, ey + 10); g.stroke();
    }
  }
  g.lineWidth = 6;
  const brow = (x, y1, y2) => { g.beginPath(); g.moveTo(x - 14, y1); g.lineTo(x + 14, y2); g.stroke(); };
  if (brows === 'soft') { brow(ex[0], ey - 30, ey - 33); brow(ex[1], ey - 33, ey - 30); }
  else if (brows === 'up') { for (const x of ex) { g.beginPath(); g.moveTo(x - 14, ey - 38); g.quadraticCurveTo(x, ey - 50, x + 14, ey - 40); g.stroke(); } }
  else if (brows === 'flat') { brow(ex[0], ey - 27, ey - 27); brow(ex[1], ey - 27, ey - 27); }
  else if (brows === 'worried') { brow(ex[0], ey - 28, ey - 40); brow(ex[1], ey - 40, ey - 28); }
  else if (brows === 'angry') { brow(ex[0], ey - 40, ey - 27); brow(ex[1], ey - 27, ey - 40); }

  const my = 182, red = lips ? '#b8434d' : '#8a3a2e';
  g.strokeStyle = red; g.fillStyle = '#3a1612'; g.lineWidth = 6;
  switch (mouth) {
    case 'smile': g.beginPath(); g.moveTo(108, my - 4); g.quadraticCurveTo(128, my + 12, 148, my - 4); g.stroke(); break;
    case 'flat': g.beginPath(); g.moveTo(112, my); g.lineTo(144, my); g.stroke(); break;
    case 'smirk': g.beginPath(); g.moveTo(110, my + 2); g.quadraticCurveTo(136, my + 5, 150, my - 8); g.stroke(); break;
    case 'frown': g.beginPath(); g.moveTo(110, my + 6); g.quadraticCurveTo(128, my - 8, 146, my + 6); g.stroke(); break;
    case 'o': g.beginPath(); g.ellipse(128, my, 11, 14, 0, 0, 7); g.fill(); break;
    case 'small-o': g.beginPath(); g.ellipse(128, my, 7, 8, 0, 0, 7); g.fill(); break;
    case 'open': case 'shout':
      g.beginPath(); g.moveTo(104, my - 8); g.quadraticCurveTo(128, my + (mouth === 'shout' ? 40 : 28), 152, my - 8); g.closePath(); g.fill();
      g.fillStyle = '#c95e66'; g.beginPath(); g.ellipse(128, my + 8, 10, 5, 0, 0, 7); g.fill(); break;
    case 'talk': g.beginPath(); g.ellipse(128, my, 15, 9, 0, 0, 7); g.fill(); break;
    case 'grin':
      g.beginPath(); g.moveTo(100, my - 10); g.quadraticCurveTo(128, my + 26, 156, my - 10); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(108, my - 9, 40, 7); break;
    case 'puff':
      g.beginPath(); g.moveTo(116, my); g.quadraticCurveTo(128, my - 5, 140, my); g.stroke();
      g.fillStyle = 'rgba(225,110,110,.35)'; g.beginPath(); g.ellipse(70, my - 20, 22, 16, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(186, my - 20, 22, 16, 0, 0, 7); g.fill(); break;
    case 'wobble':
      g.beginPath(); g.moveTo(106, my); for (let i = 1; i <= 6; i++) g.lineTo(106 + i * 7.5, my + (i % 2 ? -5 : 5)); g.stroke(); break;
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  faceCache.set(key, tex);
  return tex;
}
const TALK = ['talk', 'open', 'small-o', 'talk', 'flat', 'open', 'talk', 'small-o'];

// ---------------------------------------------------------------- build
// spec: skin, hair, hairStyle(short|spiky|long|bun|bald|ponytail|curly), top:{color,trim,sleeves:'short'|'long'|'none'},
//       bottom:{color,length:'long'|'short'}, shoes ('none' = barefoot), coat, tie, cap, headset, backpack, glasses, scale
export function makeCharacter(spec) {
  const s = {
    skin: '#e0ac7e', hair: '#4a2a17', hairStyle: 'short', shoes: '#f3f3f3', scale: 1, ...spec,
    top: { color: '#2f6fe0', trim: '#f0a03a', sleeves: 'short', ...(spec.top || {}) },
    bottom: { color: '#23252b', length: 'long', ...(spec.bottom || {}) },
  };
  const root = new THREE.Group(); root.name = s.name || 'person';
  const body = new THREE.Group(); body.scale.setScalar(s.scale); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 2.62; body.add(hips);
  const skinM = mat(s.skin), topM = mat(s.top.color), trimM = mat(s.top.trim || s.top.color), botM = mat(s.bottom.color, { roughness: 0.85 });
  const shoeM = s.shoes === 'none' ? skinM : mat(s.shoes, { roughness: 0.5 }), hairM = mat(s.hair, { roughness: 0.8 });
  const add = (p, g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };

  // torso
  const torso = new THREE.Group(); hips.add(torso);
  add(torso, torsoG(0.66, 0.5, 1.72, 0.62), s.top.sleeves === 'none' && !s.swimsuit ? skinM : topM, 0, 0, 0);
  if (s.top.sleeves !== 'none') {
    const collar = add(torso, cached('collar', () => new THREE.TorusGeometry(0.27, 0.05, 6, 16)), trimM, 0, 1.72, 0.02); collar.rotation.x = Math.PI / 2; collar.scale.set(1, 0.75, 1);
  }
  if (s.swimsuit) add(torso, torsoG(0.6, 0.52, 1.25, 0.64), mat(s.swimsuit), 0, 0.05, 0);
  if (s.coat) { // lab coat: longer body + lapels
    const coatM = mat('#f4f6f7', { roughness: 0.8 });
    add(torso, torsoG(0.7, 0.62, 2.55, 0.66), coatM, 0, -0.85, 0);
    add(torso, rbox(0.08, 0.9, 0.04, 0.02), mat('#d9dee0'), -0.12, 1.2, 0.4);
    add(torso, rbox(0.08, 0.9, 0.04, 0.02), mat('#d9dee0'), 0.12, 1.2, 0.4);
    add(torso, rbox(0.2, 0.12, 0.03, 0.02), mat('#3a7bd5'), -0.32, 1.2, 0.41); // pen in pocket
  }
  if (s.tie) add(torso, rbox(0.14, 0.95, 0.05, 0.03), mat(s.tie), 0, 1.15, 0.38);
  if (s.backpack) add(torso, rbox(0.95, 1.05, 0.45, 0.14), mat(s.backpack), 0, 0.9, -0.55);
  if (s.top.text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = s.top.textColor || '#fff'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.top.text, 128, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
    pl.position.set(0, 1.15, 0.39); torso.add(pl);
  }

  // head
  const neck = new THREE.Group(); neck.position.y = 1.72; torso.add(neck);
  add(neck, limb(0.17, 0.19, 0.22), skinM, 0, 0.18, 0);
  const head = new THREE.Group(); head.position.y = 0.6; neck.add(head);
  add(head, rbox(0.8, 0.94, 0.8, 0.3), skinM);
  const faceMat = new THREE.MeshBasicMaterial({ map: drawFace({}), transparent: true, depthWrite: false });
  const face = new THREE.Mesh(cached('faceG', () => new THREE.PlaneGeometry(0.66, 0.66)), faceMat);
  face.position.set(0, -0.04, 0.405); face.renderOrder = 2; head.add(face);
  for (const x of [-0.41, 0.41]) add(head, rbox(0.08, 0.2, 0.14, 0.04), skinM, x, -0.02, 0); // ears

  // hair
  const H = s.hairStyle;
  if (H !== 'bald') {
    add(head, rbox(0.86, 0.34, 0.86, 0.16), hairM, 0, 0.36, -0.01);
    add(head, rbox(0.86, 0.62, 0.3, 0.12), hairM, 0, 0.12, -0.3);
    add(head, rbox(0.84, 0.16, 0.2, 0.06), hairM, 0, 0.36, 0.34); // fringe
    if (H === 'spiky') for (const [x, z, r] of [[-0.25, 0.1, 0.3], [0.05, 0.2, -0.1], [0.28, 0, -0.3]]) { const t = add(head, rbox(0.3, 0.32, 0.3, 0.08), hairM, x, 0.55, z); t.rotation.z = r; }
    if (H === 'long') { add(head, rbox(0.92, 1.25, 0.34, 0.12), hairM, 0, -0.25, -0.3); for (const x of [-0.44, 0.44]) add(head, rbox(0.1, 0.9, 0.5, 0.05), hairM, x, -0.05, -0.08); }
    if (H === 'bun') add(head, rbox(0.4, 0.36, 0.4, 0.15), hairM, 0, 0.62, -0.18);
    if (H === 'ponytail') { add(head, rbox(0.26, 0.8, 0.26, 0.1), hairM, 0, 0.0, -0.55); }
    if (H === 'curly') for (let i = 0; i < 7; i++) add(head, rbox(0.3, 0.3, 0.3, 0.14), hairM, Math.cos(i) * 0.32, 0.48 + (i % 2) * 0.06, Math.sin(i * 1.7) * 0.3);
  }
  if (s.cap) {
    const capM = mat(s.cap);
    add(head, rbox(0.9, 0.3, 0.9, 0.16), capM, 0, 0.42, 0);
    add(head, rbox(0.8, 0.05, 0.42, 0.02), capM, 0, 0.3, 0.6);
  }
  if (s.headset) add(head, rbox(0.06, 0.16, 0.4, 0.02), mat('#222'), 0.42, -0.18, 0.18);
  // sunglasses (on face, can be hidden)
  const shades = new THREE.Group(); head.add(shades);
  { const m = mat('#111', { roughness: 0.2, metalness: 0.4 });
    add(shades, rbox(0.3, 0.16, 0.05, 0.04), m, -0.17, 0.06, 0.43); add(shades, rbox(0.3, 0.16, 0.05, 0.04), m, 0.17, 0.06, 0.43);
    add(shades, rbox(0.12, 0.04, 0.04, 0.01), m, 0, 0.1, 0.43); }
  shades.visible = !!s.glasses;

  // arms with elbows
  const mkArm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.74, 1.55, 0); torso.add(sh);
    const longSleeve = s.top.sleeves === 'long' || s.coat;
    const sleeveM = s.coat ? mat('#f4f6f7', { roughness: 0.8 }) : topM;
    if (s.top.sleeves !== 'none' || s.coat) {
      add(sh, limb(0.27, 0.25, 0.48), sleeveM, 0, 0.06, 0);
      if (!longSleeve) add(sh, limb(0.26, 0.26, 0.08), trimM, 0, -0.38, 0);
    }
    add(sh, limb(0.17, 0.155, 0.95), longSleeve ? sleeveM : skinM);
    const el = new THREE.Group(); el.position.y = -0.95; sh.add(el);
    add(el, limb(0.15, 0.13, 0.82), longSleeve ? sleeveM : skinM);
    const hand = new THREE.Group(); hand.position.y = -0.82; el.add(hand);
    add(hand, rbox(0.22, 0.32, 0.14, 0.06), skinM, 0, -0.14, 0);
    return { sh, el, hand };
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // legs with knees
  const mkLeg = (side) => {
    const hp = new THREE.Group(); hp.position.set(side * 0.27, 0.05, 0); hips.add(hp);
    const short = s.bottom.length === 'short';
    add(hp, limb(0.25, 0.21, 1.3), short ? botM : botM);
    if (short) add(hp, limb(0.215, 0.2, 0.05), botM, 0, -0.62, 0);
    const kn = new THREE.Group(); kn.position.y = -1.28; hp.add(kn);
    add(kn, limb(0.2, 0.16, 1.18), short ? skinM : botM);
    const ft = new THREE.Group(); ft.position.y = -1.18; kn.add(ft);
    add(ft, rbox(0.3, 0.2, 0.56, 0.08), shoeM, 0, -0.06, 0.1);
    return { hp, kn, ft };
  };
  // shorts / swim trunks are shorter: hide shin fabric
  const legL = mkLeg(-1), legR = mkLeg(1);
  if (s.bottom.length === 'short') {
    for (const l of [legL, legR]) { const thigh = l.hp.children[0]; thigh.scale.y = 0.55; thigh.position.y = 0; const m2 = add(l.hp, limb(0.215, 0.2, 0.62), skinM, 0, -0.66, 0); }
  }

  const ch = {
    name: s.name, root, body, hips, torso, neck, head, face, shades, armL, armR, legL, legR,
    pose(p = {}) {
      hips.position.y = 2.62 + (p.hipY || 0);
      hips.rotation.set(p.lean || 0, p.twist || 0, p.tilt || 0);
      torso.rotation.set(p.torsoX || 0, p.torsoY || 0, p.torsoZ || 0);
      neck.rotation.set(p.headX || 0, p.headY || 0, p.headZ || 0);
      armL.sh.rotation.set(p.aLx || 0, p.aLy || 0, -(p.aLz ?? 0.08));
      armR.sh.rotation.set(p.aRx || 0, p.aRy || 0, p.aRz ?? 0.08);
      armL.el.rotation.set(p.eL || 0, 0, 0); armR.el.rotation.set(p.eR || 0, 0, 0);
      legL.hp.rotation.set(p.lLx || 0, 0, -(p.lLz || 0)); legR.hp.rotation.set(p.lRx || 0, 0, p.lRz || 0);
      legL.kn.rotation.set(p.kL || 0, 0, 0); legR.kn.rotation.set(p.kR || 0, 0, 0);
      legL.ft.rotation.set(p.fL || 0, 0, 0); legR.ft.rotation.set(p.fR || 0, 0, 0);
    },
    setFace(e, t = 0, talking = false, seed = 0) {
      const f = { lips: !!s.lips, ...e };
      if (talking) f.mouth = f.mouth === 'shout' ? (Math.floor(t * 9) % 3 ? 'shout' : 'open') : TALK[Math.floor(t * 11 + seed) % TALK.length];
      const bp = (t + seed * 0.61) % 3.9;
      if (bp < 0.12 && (f.eyes === 'open' || f.eyes === 'wide' || !f.eyes)) f.eyes = 'closed';
      faceMat.map = drawFace(f);
    },
  };
  ch.pose({});
  return ch;
}

// ---------------------------------------------------------------- motions (return pose objects)
export const motion = {
  idle(t, k = 1, ph = 0) {
    const b = Math.sin(t * 1.5 + ph) * 0.025 * k;
    return { torsoX: b, headX: -b, aLz: 0.1 + b, aRz: 0.1 + b, eL: -0.12, eR: -0.12, headY: Math.sin(t * 0.4 + ph) * 0.12 * k };
  },
  walk(t, sp = 1, ph = 0) {
    const w = Math.sin(t * 6.5 * sp + ph), c = Math.cos(t * 6.5 * sp + ph);
    return { lLx: w * 0.55, lRx: -w * 0.55, kL: Math.max(0, -c) * 0.8 + 0.08, kR: Math.max(0, c) * 0.8 + 0.08,
      aLx: -w * 0.45, aRx: w * 0.45, eL: -0.3, eR: -0.3, aLz: 0.1, aRz: 0.1, hipY: -Math.abs(c) * 0.06 };
  },
  tread(t, k = 1, ph = 0) { // upright in water
    const w = Math.sin(t * 2.6 + ph);
    return { lLx: w * 0.35 * k - 0.1, lRx: -w * 0.35 * k - 0.1, kL: 0.35 + w * 0.2, kR: 0.35 - w * 0.2,
      aLz: 0.6 + Math.sin(t * 2.6 + ph + 1) * 0.25 * k, aRz: 0.6 + Math.sin(t * 2.6 + ph + 2.2) * 0.25 * k, aLx: -0.35, aRx: -0.35, eL: -0.4, eR: -0.4 };
  },
  swim(t, k = 1, ph = 0) { // horizontal front crawl-ish (use with lean ~1.35 and root yaw)
    const w = Math.sin(t * 6 + ph), a = t * 3.2 + ph;
    return { lean: 1.38, headX: -0.85, lLx: w * 0.4 * k, lRx: -w * 0.4 * k, kL: 0.15 + Math.max(0, w) * 0.3, kR: 0.15 + Math.max(0, -w) * 0.3,
      aLx: -2.9 + Math.sin(a) * 0.9 * k, aRx: -2.9 + Math.sin(a + Math.PI) * 0.9 * k, aLz: 0.2, aRz: 0.2, eL: -0.2, eR: -0.2 };
  },
  sitChair(t, ph = 0) {
    const b = Math.sin(t * 1.3 + ph) * 0.02;
    return { hipY: -1.1, lLx: -1.5, lRx: -1.45, kL: 1.5, kR: 1.45, lean: -0.08 + b, aLz: 0.12, aRz: 0.12, aLx: -0.35, aRx: -0.35, eL: -0.6, eR: -0.6 };
  },
  lounge(t, ph = 0) { // reclined lawn chair
    const b = Math.sin(t * 1.1 + ph) * 0.02;
    return { hipY: -1.55, lean: -0.75 + b, lLx: -1.25, lRx: -1.2, kL: 0.5, kR: 0.55, headX: 0.45, aLx: -2.6, aRx: -2.6, aLz: 0.5, aRz: 0.5, eL: -2.2, eR: -2.2 };
  },
  sitFloor(t, ph = 0) {
    const b = Math.sin(t * 1.3 + ph) * 0.02;
    return { hipY: -2.25, lLx: -1.35, lRx: -1.3, kL: 0.25, kR: 0.3, lean: -0.25 + b, aLx: 0.7, aRx: 0.7, aLz: 0.25, aRz: 0.25, headX: 0.2 };
  },
  crossLegFloor(t, ph = 0) {
    const b = Math.sin(t * 1.3 + ph) * 0.02;
    return { hipY: -2.3, lLx: -1.45, lRx: -1.45, lLz: 0.9, lRz: 0.9, kL: 2.3, kR: 2.3, lean: -0.05 + b, aLx: -0.5, aRx: -0.5, eL: -0.6, eR: -0.6, aLz: 0.15, aRz: 0.15 };
  },
  lieBack() { return { hipY: -2.3, lean: -1.57, lLx: 0, lRx: 0, aLz: 0.3, aRz: 0.3, aLx: -0.2, aRx: -0.2 }; },
};
export const mergePose = (...ps) => Object.assign({}, ...ps);
