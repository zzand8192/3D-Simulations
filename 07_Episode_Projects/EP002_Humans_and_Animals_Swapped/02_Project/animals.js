// Low-poly animals in the studio character style. They reuse the human rig (same pose keys, walk cycles,
// hands that hold props) with an animal head (muzzle + moving jaw, nose, ears, mane/trunk/patches), fur,
// paws and a tail. Animals can stand upright in clothes or drop to all fours (motion.allFours).
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { makeCharacter, mat } from './character.js';

const GC = new Map();
const rb = (w, h, d, r = 0.06) => { const k = `${w}|${h}|${d}|${r}`; if (!GC.has(k)) GC.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))); return GC.get(k); };
const add = (p, g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };

// fur, secondary (muzzle/belly), nose, ear type, muzzle length, tail, scale
export const KINDS = {
  dog:      { fur: '#d9a35a', fur2: '#f1d6a6', nose: '#2a1a12', ears: 'floppy', earC: '#b7843f', snout: 0.42, tail: 'wag', scale: 0.9 },
  shepherd: { fur: '#8a5a32', fur2: '#d9b07a', nose: '#1a1110', ears: 'pointy', earC: '#2a1c14', snout: 0.48, tail: 'wag', scale: 0.95, mask: '#2a1c14' },
  cat:      { fur: '#9aa0a8', fur2: '#e9ecef', nose: '#d77a8a', ears: 'pointy', earC: '#9aa0a8', snout: 0.18, tail: 'long', scale: 0.85, whiskers: true, stripes: '#6f757d' },
  ginger:   { fur: '#e08a3a', fur2: '#f6dcb8', nose: '#d77a8a', ears: 'pointy', earC: '#e08a3a', snout: 0.18, tail: 'long', scale: 0.85, whiskers: true, stripes: '#b8662a' },
  lion:     { fur: '#d9a85a', fur2: '#f0d6a0', nose: '#5a3a2a', ears: 'round', earC: '#c08a44', snout: 0.3, tail: 'tuft', scale: 1.1, mane: '#8a4f22' },
  kangaroo: { fur: '#b07a4e', fur2: '#e2c29c', nose: '#2a1a12', ears: 'tall', earC: '#9a6640', snout: 0.4, tail: 'thick', scale: 1.05 },
  bear:     { fur: '#6b4a32', fur2: '#a88566', nose: '#1a1110', ears: 'round', earC: '#6b4a32', snout: 0.3, tail: 'stub', scale: 1.15 },
  panda:    { fur: '#f4f4f2', fur2: '#f4f4f2', nose: '#111', ears: 'round', earC: '#1b1b1b', snout: 0.26, tail: 'stub', scale: 1.1, patches: true, limbs: '#1b1b1b' },
  pig:      { fur: '#f2b3b8', fur2: '#f7c9cd', nose: '#e08d96', ears: 'pig', earC: '#e8a0a8', snout: 0.16, tail: 'curl', scale: 0.95, flatNose: true },
  rabbit:   { fur: '#efe9df', fur2: '#ffffff', nose: '#e58a9a', ears: 'long', earC: '#efe9df', snout: 0.16, tail: 'puff', scale: 0.8 },
  fox:      { fur: '#d9662a', fur2: '#f6efe6', nose: '#1a1110', ears: 'pointy', earC: '#2a1c14', snout: 0.42, tail: 'bushy', scale: 0.9 },
  monkey:   { fur: '#6b4a32', fur2: '#e3c2a0', nose: '#3a2a20', ears: 'side', earC: '#e3c2a0', snout: 0.16, tail: 'long', scale: 0.85, faceMask: true },
  elephant: { fur: '#8f979e', fur2: '#a7aeb4', nose: '#8f979e', ears: 'elephant', earC: '#7d858c', snout: 0.0, tail: 'thin', scale: 1.3, trunk: true },
  cow:      { fur: '#f4f2ee', fur2: '#e9b7b2', nose: '#d88f8a', ears: 'side', earC: '#2a2522', snout: 0.3, tail: 'thin', scale: 1.1, horns: true, spots: '#2a2522' },
};

// outfits for animals in charge (top/bottom specs for makeCharacter)
export const OUTFITS = {
  none: {},
  police: { top: { kind: 'long', color: '#1f2c4a', trim: '#1f2c4a', text: 'POLICE', textColor: '#e8c33a' }, bottom: { color: '#1f2c4a' }, cap: '#1f2c4a' },
  suit: { top: { kind: 'long', color: '#2f3238', trim: '#2f3238' }, bottom: { color: '#2f3238' }, tie: '#b03a2e' },
  leader: { top: { kind: 'long', color: '#1e2a44', trim: '#1e2a44' }, bottom: { color: '#1e2a44' }, tie: '#c9a227' },
  zookeeper: { top: { kind: 'tee', color: '#a8935f', trim: '#7d6c42' }, bottom: { color: '#7d6c42', length: 'short' }, cap: '#7d6c42' },
  vet: { top: { kind: 'tee', color: '#2aa198', trim: '#2aa198' }, bottom: { color: '#2aa198' }, coat: true },
  farmer: { top: { kind: 'tee', color: '#c9473a', trim: '#ffffff' }, bottom: { color: '#3a5a8a' }, cap: '#d9b44a' },
  casual: { top: { kind: 'tee', color: '#3aa76d', trim: '#ffffff' }, bottom: { color: '#3a5a8a' } },
  hoodie: { top: { kind: 'hoodie', color: '#8e5bd6', trim: '#6a40a8' }, bottom: { color: '#2b2f3a' } },
  anchor: { top: { kind: 'long', color: '#16264a', trim: '#16264a' }, bottom: { color: '#16264a' }, tie: '#c4161c' },
  reporter: { top: { kind: 'long', color: '#c9473a', trim: '#c9473a' }, bottom: { color: '#2b2f3a' } },
  driver: { top: { kind: 'long', color: '#2f6fe0', trim: '#2f6fe0' }, bottom: { color: '#23252b' }, cap: '#2f6fe0' },
};

export function makeAnimal(kind, outfit = 'none', extra = {}) {
  const K = { ...KINDS[kind], ...(extra.kind || {}) }, O = OUTFITS[outfit] || outfit;
  const spec = {
    name: extra.name || kind, skin: K.fur, hairStyle: 'bald', shoes: K.limbs || K.fur, scale: (extra.scale || 1) * K.scale,
    top: { kind: 'tank', color: K.fur, trim: K.fur }, bottom: { color: K.limbs || K.fur, length: 'short' }, ...O, ...(extra.spec || {}),
  };
  if (!O.top) spec.top = { kind: 'tank', color: K.fur, trim: K.fur, sleeves: 'none' };
  const capColor = spec.cap; delete spec.cap; // animal hats sit between the ears (added below)
  const ch = makeCharacter(spec);
  const furM = mat(K.fur), fur2M = mat(K.fur2), noseM = mat(K.nose, { roughness: 0.4 }), earM = mat(K.earC);
  // hide the human head parts (skull, ears, hair, shades) — keep the face plane for the eyes
  for (const c of ch.head.children) if (c !== ch.face) c.visible = false;
  const H = ch.head;
  add(H, rb(0.9, 0.86, 0.86, 0.3), furM);
  // muzzle (upper) + jaw (moves when talking)
  const sl = K.snout;
  if (sl > 0) {
    add(H, rb(0.52, 0.26, 0.3 + sl, 0.1), fur2M, 0, -0.14, 0.32 + sl / 2);
    add(H, K.flatNose ? rb(0.36, 0.26, 0.08, 0.08) : rb(0.2, 0.13, 0.1, 0.05), noseM, 0, K.flatNose ? -0.14 : -0.04, 0.48 + sl);
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.27, 0.3); H.add(jaw);
  if (sl > 0) add(jaw, rb(0.44, 0.1, 0.18 + sl, 0.04), fur2M, 0, -0.03, (0.18 + sl) / 2);
  // face plane: eyes only, a little higher
  ch.face.position.set(0, 0.1, 0.44); ch.face.scale.setScalar(0.92);
  // ears
  const E = K.ears;
  const ear = (g, x, y, z, rz = 0, rx = 0) => { const o = add(H, g, earM, x, y, z); o.rotation.set(rx, 0, rz); return o; };
  if (E === 'floppy') { ear(rb(0.16, 0.56, 0.34, 0.07), -0.5, 0.0, -0.02, 0.18); ear(rb(0.16, 0.56, 0.34, 0.07), 0.5, 0.0, -0.02, -0.18); }
  if (E === 'pointy') { ear(rb(0.28, 0.36, 0.12, 0.04), -0.26, 0.52, -0.05, 0.32); ear(rb(0.28, 0.36, 0.12, 0.04), 0.26, 0.52, -0.05, -0.32); for (const x of [-0.25, 0.25]) add(H, rb(0.14, 0.2, 0.04, 0.02), mat('#e8a0a8'), x, 0.5, 0.02).rotation.z = -Math.sign(x) * 0.32; }
  if (E === 'round') { ear(rb(0.26, 0.26, 0.12, 0.1), -0.34, 0.47, -0.05); ear(rb(0.26, 0.26, 0.12, 0.1), 0.34, 0.47, -0.05); }
  if (E === 'tall') { ear(rb(0.2, 0.5, 0.1, 0.06), -0.24, 0.62, -0.05, 0.25); ear(rb(0.2, 0.5, 0.1, 0.06), 0.24, 0.62, -0.05, -0.25); }
  if (E === 'long') { ear(rb(0.17, 0.85, 0.08, 0.06), -0.16, 0.85, -0.05, 0.08); ear(rb(0.17, 0.85, 0.08, 0.06), 0.16, 0.85, -0.05, -0.08); }
  if (E === 'pig') { ear(rb(0.24, 0.24, 0.06, 0.04), -0.3, 0.46, 0.08, 0.4, 0.5); ear(rb(0.24, 0.24, 0.06, 0.04), 0.3, 0.46, 0.08, -0.4, 0.5); }
  if (E === 'side') { ear(rb(0.1, 0.22, 0.3, 0.05), -0.5, 0.12, 0, 0.5); ear(rb(0.1, 0.22, 0.3, 0.05), 0.5, 0.12, 0, -0.5); }
  if (E === 'elephant') { ear(rb(0.08, 0.8, 0.62, 0.08), -0.52, -0.02, -0.02, 0.15); ear(rb(0.08, 0.8, 0.62, 0.08), 0.52, -0.02, -0.02, -0.15); }
  if (K.mane) { const mm = mat(K.mane, { roughness: 0.95 }); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(H, rb(0.34, 0.34, 0.34, 0.12), mm, Math.cos(a) * 0.58, Math.sin(a) * 0.56 - 0.05, -0.12); } add(H, rb(1.0, 0.9, 0.3, 0.14), mm, 0, -0.05, -0.36); }
  if (K.trunk) { let p = new THREE.Group(); p.position.set(0, -0.12, 0.44); H.add(p); const segs = []; for (let i = 0; i < 4; i++) { add(p, rb(0.26 - i * 0.03, 0.34, 0.26 - i * 0.03, 0.08), furM, 0, -0.15, 0); const q = new THREE.Group(); q.position.y = -0.3; q.rotation.x = 0.18; p.add(q); segs.push(p); p = q; } ch.trunk = segs; }
  if (K.patches) for (const x of [-0.17, 0.17]) add(H, rb(0.22, 0.24, 0.04, 0.08), mat('#1b1b1b'), x, 0.14, 0.42);
  if (K.faceMask) add(H, rb(0.62, 0.5, 0.06, 0.18), fur2M, 0, 0.02, 0.41);
  if (K.mask) add(H, rb(0.7, 0.26, 0.05, 0.08), mat(K.mask), 0, 0.33, 0.41);
  if (K.whiskers) for (const s of [-1, 1]) for (const dy of [-0.02, -0.1]) { const w = add(H, rb(0.36, 0.015, 0.015, 0.005), mat('#f4f4f4'), s * 0.36, dy - 0.1, 0.58); w.rotation.z = s * dy * 2; }
  if (K.horns) for (const s of [-1, 1]) add(H, rb(0.1, 0.24, 0.1, 0.04), mat('#e9e2cf'), s * 0.3, 0.52, -0.05).rotation.z = -s * 0.3;
  if (K.stripes) for (let i = 0; i < 3; i++) add(H, rb(0.1, 0.03, 0.5, 0.01), mat(K.stripes), (i - 1) * 0.16, 0.44, -0.02);
  if (K.spots) { add(ch.torso, rb(0.5, 0.4, 0.05, 0.1), mat(K.spots), 0.25, 1.0, -0.33); add(ch.torso, rb(0.4, 0.5, 0.05, 0.1), mat(K.spots), -0.3, 0.6, 0.33); }
  if (capColor) { const cm = mat(capColor); add(H, rb(0.62, 0.22, 0.62, 0.1), cm, 0, 0.5, 0.02); add(H, rb(0.56, 0.04, 0.3, 0.02), cm, 0, 0.42, 0.42); }
  H.scale.setScalar(K.headScale || 1.3); H.position.y += 0.14;   // bigger, cartoon-animal heads
  // tail
  const tailRoot = new THREE.Group(); tailRoot.position.set(0, 0.25, -0.32); ch.hips.add(tailRoot);
  const T = K.tail, tm = T === 'tuft' ? furM : furM; let tp = tailRoot; const tailSegs = [];
  const tailDef = { wag: [4, 0.14, 0.32], long: [6, 0.1, 0.3], tuft: [5, 0.08, 0.3], thick: [5, 0.34, 0.42], stub: [1, 0.2, 0.18], curl: [4, 0.07, 0.14], puff: [1, 0.3, 0.26], bushy: [4, 0.3, 0.32], thin: [4, 0.06, 0.26] }[T] || [3, 0.1, 0.3];
  for (let i = 0; i < tailDef[0]; i++) { const s = new THREE.Group(); s.position.z = i ? -tailDef[2] : 0; s.rotation.x = T === 'thick' ? 0.25 : -0.35; add(s, rb(tailDef[1] * (1 - i * (T === 'thick' ? 0.12 : 0.05)), tailDef[1] * (1 - i * (T === 'thick' ? 0.12 : 0.05)), tailDef[2], tailDef[1] * 0.4), T === 'bushy' && i === tailDef[0] - 1 ? mat('#f6efe6') : tm, 0, 0, -tailDef[2] / 2); tp.add(s); tailSegs.push(s); tp = s; }
  if (T === 'tuft') add(tp, rb(0.2, 0.2, 0.2, 0.08), mat(K.mane || '#8a4f22'), 0, 0, -0.32);
  // talking = jaw motion; base face draws eyes only
  const baseFace = ch.setFace.bind(ch);
  ch.setFace = (e, t = 0, talking = false, seed = 0) => {
    baseFace({ ...e, mouth: 'none', brows: e.brows || 'soft' }, t, false, seed);
    jaw.rotation.x = talking ? 0.12 + Math.abs(Math.sin(t * 13 + seed)) * 0.32 : (e.mouth === 'o' || e.mouth === 'open' || e.mouth === 'shout') ? 0.35 : 0;
  };
  ch.wag = (t, k = 1) => tailSegs.forEach((s, i) => { s.rotation.y = Math.sin(t * (T === 'wag' ? 12 : 3) + i * 0.6) * 0.35 * k; });
  ch.isAnimal = true; ch.kind = kind; ch.jaw = jaw;
  return ch;
}

// a red collar for humans who are now pets
export function addCollar(ch, color = '#c9473a', tag = true) {
  const g = new THREE.Group(); g.position.y = 0.08; ch.neck.add(g);
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 6, 18), mat(color)); t.rotation.x = Math.PI / 2; t.scale.set(1, 0.85, 1); t.castShadow = true; g.add(t);
  if (tag) add(g, rb(0.12, 0.12, 0.03, 0.03), mat('#e8c33a', { metalness: 0.7, roughness: 0.3 }), 0, -0.1, 0.24);
  ch.collar = g; return g;
}

// all-fours pose for the upright rig (dog walking normally before the swap)
export const allFours = (t = 0, walk = 0, ph = 0) => {
  const w = Math.sin(t * 7 + ph) * walk;
  return { lean: 1.32, hipY: -0.95, headX: -1.05, lLx: -1.6 + w * 0.4, lRx: -1.6 - w * 0.4, kL: 1.45, kR: 1.45, fL: 0.2, fR: 0.2,
    aLx: -1.32 - w * 0.45, aRx: -1.32 + w * 0.45, aLz: 0.04, aRz: 0.04, eL: 0, eR: 0 };
};
