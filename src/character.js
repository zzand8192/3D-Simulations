// Blocky, toy-like 3D characters with drawn faces and a simple pose rig.
// One unit ~= 0.34 m (a character is ~5.4 units / ~1.8 m tall).
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { causticMaterial } from './env.js';

const geoCache = new Map();
function rbox(w, h, d, r = 0.12) {
  const k = `${w}|${h}|${d}|${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 3, r));
  return geoCache.get(k);
}

function mat(color, opts = {}) {
  return causticMaterial({ color, roughness: 0.62, metalness: 0.0, ...opts });
}

// ---------------------------------------------------------------- faces
const faceCache = new Map();
function drawFace({ eyes = 'open', mouth = 'smile', brows = 'none', blush = false, look = 0 }) {
  const key = [eyes, mouth, brows, blush, look].join('|');
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ink = '#1b1410';
  const ex = [84, 172], ey = 104, lx = look * 10;

  // eyes
  for (const x of ex) {
    g.fillStyle = ink; g.strokeStyle = ink;
    if (eyes === 'open' || eyes === 'wide') {
      const w = eyes === 'wide' ? 30 : 24, h = eyes === 'wide' ? 44 : 36;
      roundRect(g, x - w / 2 + lx, ey - h / 2, w, h, w / 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x - 4 + lx, ey - h / 4, eyes === 'wide' ? 7 : 6, 0, Math.PI * 2); g.fill();
    } else if (eyes === 'half') {
      g.fillRect(x - 13 + lx, ey - 2, 26, 16);
      g.lineWidth = 7; g.beginPath(); g.moveTo(x - 18, ey - 4); g.lineTo(x + 18, ey - 4); g.stroke();
    } else if (eyes === 'closed') {
      g.lineWidth = 7; g.beginPath(); g.moveTo(x - 15, ey + 4); g.quadraticCurveTo(x, ey + 12, x + 15, ey + 4); g.stroke();
    } else if (eyes === 'happy') {
      g.lineWidth = 8; g.beginPath(); g.moveTo(x - 16, ey + 8); g.quadraticCurveTo(x, ey - 14, x + 16, ey + 8); g.stroke();
    } else if (eyes === 'squeeze') {
      g.lineWidth = 7; g.beginPath();
      const s = x < 128 ? 1 : -1;
      g.moveTo(x - 14 * s, ey - 10); g.lineTo(x + 12 * s, ey + 2); g.lineTo(x - 14 * s, ey + 12); g.stroke();
    }
  }
  // brows
  g.lineWidth = 7; g.strokeStyle = ink;
  if (brows === 'up') {
    for (const x of ex) { g.beginPath(); g.moveTo(x - 16, ey - 42); g.quadraticCurveTo(x, ey - 54, x + 16, ey - 44); g.stroke(); }
  } else if (brows === 'flat') {
    for (const x of ex) { g.beginPath(); g.moveTo(x - 16, ey - 30); g.lineTo(x + 16, ey - 30); g.stroke(); }
  } else if (brows === 'worried') {
    g.beginPath(); g.moveTo(ex[0] - 16, ey - 30); g.lineTo(ex[0] + 14, ey - 42); g.stroke();
    g.beginPath(); g.moveTo(ex[1] + 16, ey - 30); g.lineTo(ex[1] - 14, ey - 42); g.stroke();
  } else if (brows === 'determined') {
    g.beginPath(); g.moveTo(ex[0] - 16, ey - 42); g.lineTo(ex[0] + 14, ey - 32); g.stroke();
    g.beginPath(); g.moveTo(ex[1] + 16, ey - 42); g.lineTo(ex[1] - 14, ey - 32); g.stroke();
  }
  if (blush) {
    g.fillStyle = 'rgba(230,90,90,.28)';
    for (const x of ex) { g.beginPath(); g.ellipse(x + (x < 128 ? -14 : 14), ey + 40, 20, 11, 0, 0, Math.PI * 2); g.fill(); }
  }
  // mouth
  const my = 184;
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 8;
  switch (mouth) {
    case 'smile': g.beginPath(); g.moveTo(98, my - 6); g.quadraticCurveTo(128, my + 18, 158, my - 6); g.stroke(); break;
    case 'flat': g.beginPath(); g.moveTo(106, my); g.lineTo(150, my); g.stroke(); break;
    case 'smirk': g.beginPath(); g.moveTo(104, my + 2); g.quadraticCurveTo(140, my + 6, 160, my - 10); g.stroke(); break;
    case 'o': g.beginPath(); g.ellipse(128, my, 13, 17, 0, 0, Math.PI * 2); g.fill(); break;
    case 'small-o': g.beginPath(); g.ellipse(128, my, 8, 10, 0, 0, Math.PI * 2); g.fill(); break;
    case 'open':
      g.beginPath(); g.moveTo(98, my - 10); g.quadraticCurveTo(128, my + 34, 158, my - 10); g.closePath(); g.fill();
      g.fillStyle = '#c9535a'; g.beginPath(); g.ellipse(128, my + 8, 13, 6, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'talk':
      g.beginPath(); g.ellipse(128, my, 20, 12, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'grin':
      g.beginPath(); g.moveTo(90, my - 12); g.quadraticCurveTo(128, my + 34, 166, my - 12); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(100, my - 11, 56, 9);
      break;
    case 'puff':
      g.beginPath(); g.moveTo(112, my); g.quadraticCurveTo(128, my - 6, 144, my); g.stroke();
      g.fillStyle = 'rgba(230,110,110,.35)';
      g.beginPath(); g.ellipse(64, my - 18, 28, 20, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(192, my - 18, 28, 20, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'wobble':
      g.beginPath(); g.moveTo(100, my);
      for (let i = 1; i <= 6; i++) g.lineTo(100 + i * 9.3, my + (i % 2 ? -6 : 6));
      g.stroke(); break;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  faceCache.set(key, tex);
  return tex;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// mouth shape used while a line of dialogue is being spoken
const TALK_FRAMES = ['talk', 'open', 'small-o', 'talk', 'flat', 'open'];

// ---------------------------------------------------------------- build
export function makeCharacter(spec) {
  const s = {
    skin: '#f1c27d', shirt: '#2f7fd0', sleeve: null, pants: '#2b3a55', shoes: '#f2f2f2',
    hair: '#4a2c17', hairStyle: 'spiky', hood: false, ...spec,
  };
  const root = new THREE.Group();
  root.name = s.name || 'character';

  const hips = new THREE.Group(); hips.position.y = 2.0; root.add(hips);
  const skinM = mat(s.skin), shirtM = mat(s.shirt), sleeveM = mat(s.sleeve || s.shirt),
    pantsM = mat(s.pants, { roughness: 0.8 }), shoeM = mat(s.shoes), hairM = mat(s.hair, { roughness: 0.7 });

  const add = (parent, geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };

  // torso
  const torso = new THREE.Group(); hips.add(torso);
  add(torso, rbox(2, 2, 1, 0.14), shirtM, 0, 1.0, 0);
  if (s.hood) {
    add(torso, rbox(1.5, 0.7, 0.5, 0.2), sleeveM, 0, 1.75, -0.6);
    const cordM = mat('#f6efe3');
    add(torso, rbox(0.08, 0.6, 0.08, 0.03), cordM, -0.28, 1.55, 0.52);
    add(torso, rbox(0.08, 0.6, 0.08, 0.03), cordM, 0.28, 1.55, 0.52);
    add(torso, rbox(1.2, 0.45, 0.06, 0.05), sleeveM, 0, 0.5, 0.51); // pouch pocket
  }
  if (s.stripe) add(torso, rbox(2.02, 0.28, 1.02, 0.05), mat(s.stripe), 0, 1.25, 0);

  // head
  const neck = new THREE.Group(); neck.position.y = 2.0; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.66; neck.add(head);
  add(head, rbox(1.25, 1.25, 1.25, 0.24), skinM, 0, 0, 0);
  const faceMat = new THREE.MeshBasicMaterial({ map: drawFace({}), transparent: true, depthWrite: false, toneMapped: true });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.12), faceMat);
  face.position.z = 0.632; face.renderOrder = 2; head.add(face);

  // hair
  if (s.hairStyle === 'spiky') {
    add(head, rbox(1.34, 0.42, 1.34, 0.12), hairM, 0, 0.56, -0.02);
    add(head, rbox(1.34, 0.9, 0.3, 0.1), hairM, 0, 0.2, -0.54);
    for (const [x, z, h, r] of [[-0.4, 0.3, 0.42, 0.3], [0.05, 0.4, 0.5, -0.15], [0.45, 0.2, 0.36, -0.35], [-0.15, -0.2, 0.46, 0.1]]) {
      const tuft = add(head, rbox(0.42, h, 0.42, 0.08), hairM, x, 0.82, z);
      tuft.rotation.z = r; tuft.rotation.x = 0.25;
    }
    const fringe = add(head, rbox(1.3, 0.22, 0.25, 0.08), hairM, 0, 0.5, 0.56);
    fringe.rotation.x = -0.15;
  } else if (s.hairStyle === 'flat') {
    add(head, rbox(1.36, 0.36, 1.36, 0.14), hairM, 0, 0.56, 0);
    add(head, rbox(1.36, 0.7, 0.32, 0.12), hairM, 0, 0.28, -0.54);
    add(head, rbox(0.25, 0.55, 1.2, 0.08), hairM, -0.6, 0.3, -0.05);
    add(head, rbox(0.25, 0.55, 1.2, 0.08), hairM, 0.6, 0.3, -0.05);
  } else if (s.hairStyle === 'bun') {
    add(head, rbox(1.36, 0.4, 1.36, 0.14), hairM, 0, 0.56, 0);
    add(head, rbox(1.36, 1.0, 0.32, 0.12), hairM, 0, 0.1, -0.54);
    add(head, rbox(0.6, 0.5, 0.6, 0.22), hairM, 0, 0.95, -0.2);
  } else if (s.hairStyle === 'cap') {
    const capM = mat(s.capColor || '#c0392b');
    add(head, rbox(1.36, 0.42, 1.36, 0.16), capM, 0, 0.56, 0);
    add(head, rbox(1.2, 0.08, 0.6, 0.04), capM, 0, 0.42, 0.85);
  }

  // goggles + snorkel (Leo's gear)
  const gear = new THREE.Group(); head.add(gear);
  {
    const frameM = mat('#1d1f24', { roughness: 0.4 });
    const glassM = new THREE.MeshStandardMaterial({ color: '#9fe6ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
    // frame as bars so the eyes stay visible through the lenses
    add(gear, rbox(1.34, 0.1, 0.16, 0.04), frameM, 0, 0.42, 0.7);
    add(gear, rbox(1.34, 0.1, 0.16, 0.04), frameM, 0, -0.1, 0.7);
    add(gear, rbox(0.12, 0.62, 0.16, 0.04), frameM, -0.62, 0.16, 0.7);
    add(gear, rbox(0.12, 0.62, 0.16, 0.04), frameM, 0.62, 0.16, 0.7);
    add(gear, rbox(0.12, 0.5, 0.16, 0.04), frameM, 0, 0.16, 0.7);
    const glass = add(gear, rbox(1.2, 0.46, 0.04, 0.02), glassM, 0, 0.16, 0.76); glass.castShadow = false; glass.renderOrder = 3;
    add(gear, rbox(1.4, 0.14, 1.4, 0.05), frameM, 0, 0.16, -0.02);
    const tubeM = mat('#f2c230', { roughness: 0.35 });
    add(gear, rbox(0.16, 1.5, 0.16, 0.07), tubeM, 0.76, 0.55, 0.2);
    add(gear, rbox(0.16, 0.16, 0.5, 0.07), tubeM, 0.76, -0.2, 0.42);
    add(gear, rbox(0.3, 0.2, 0.2, 0.08), mat('#1d1f24'), 0.6, -0.28, 0.66);
  }
  gear.visible = !!s.gear;

  // arms
  const mkArm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 1.5, 1.82, 0); torso.add(sh);
    add(sh, rbox(0.98, 0.95, 0.98, 0.14), sleeveM, 0, -0.38, 0);
    add(sh, rbox(0.92, 1.12, 0.92, 0.16), s.gloves ? mat(s.gloves) : (s.longSleeve ? sleeveM : skinM), 0, -1.32, 0);
    const hand = new THREE.Group(); hand.position.set(0, -1.95, 0); sh.add(hand);
    return { sh, hand };
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // legs
  const mkLeg = (side) => {
    const hp = new THREE.Group(); hp.position.set(side * 0.5, 0, 0); hips.add(hp);
    add(hp, rbox(0.98, 1.7, 0.98, 0.12), pantsM, 0, -0.85, 0);
    add(hp, rbox(1.0, 0.4, 1.16, 0.14), shoeM, 0, -1.8, 0.06);
    return hp;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  const ch = {
    name: s.name, root, hips, torso, neck, head, face, gear, armL, armR, legL, legR,
    expr: { eyes: 'open', mouth: 'smile' },
    setGear(v) { gear.visible = v; },
    // pose: everything optional, angles in radians
    pose(p = {}) {
      hips.position.y = 2.0 + (p.hipY || 0);
      hips.rotation.set(p.lean || 0, 0, p.tilt || 0);
      torso.rotation.set(p.torsoX || 0, p.torsoY || 0, 0);
      neck.rotation.set(p.headX || 0, p.headY || 0, p.headZ || 0);
      armL.sh.rotation.set(p.aLx || 0, p.aLy || 0, -(p.aLz || 0) - 0.06);
      armR.sh.rotation.set(p.aRx || 0, p.aRy || 0, (p.aRz || 0) + 0.06);
      legL.rotation.set(p.lLx || 0, 0, -(p.lLz || 0));
      legR.rotation.set(p.lRx || 0, 0, p.lRz || 0);
    },
    // face: base expression + optional talking at time t + automatic blinking
    setFace(e, t = 0, talking = false, seed = 0) {
      const f = { ...e };
      if (talking) f.mouth = TALK_FRAMES[Math.floor(t * 11 + seed) % TALK_FRAMES.length];
      const bp = (t + seed * 0.37) % 3.7;
      if (bp < 0.12 && (f.eyes === 'open' || f.eyes === 'wide')) f.eyes = 'closed';
      faceMat.map = drawFace(f);
    },
  };
  ch.pose({});
  return ch;
}

// ---------------------------------------------------------------- canned motions
export const motion = {
  idle(t, k = 1) {
    const b = Math.sin(t * 1.6) * 0.03 * k;
    return { torsoX: b, aLz: 0.05 + b, aRz: 0.05 + b, headX: -b };
  },
  walk(t, speed = 1) {
    const w = Math.sin(t * 7 * speed);
    return { lLx: w * 0.7, lRx: -w * 0.7, aLx: -w * 0.6, aRx: w * 0.6, hipY: Math.abs(Math.cos(t * 7 * speed)) * 0.12, aLz: 0.08, aRz: 0.08 };
  },
  // vertical "treading water": slow scissor kicks, arms sculling
  tread(t, k = 1) {
    const w = Math.sin(t * 2.4);
    return {
      lLx: w * 0.35 * k, lRx: -w * 0.35 * k, lLz: 0.08, lRz: 0.08,
      aLz: 0.55 + Math.sin(t * 2.4 + 1) * 0.25 * k, aRz: 0.55 + Math.sin(t * 2.4 + 2.2) * 0.25 * k,
      aLx: -0.25, aRx: -0.25, torsoX: 0.05,
    };
  },
  // horizontal swimming (use with root rotation so body faces travel direction)
  swim(t, k = 1) {
    const w = Math.sin(t * 6);
    return {
      lean: 1.2, headX: -0.75,
      lLx: w * 0.45 * k, lRx: -w * 0.45 * k,
      aLx: -2.6 + Math.sin(t * 3) * 0.5, aRx: -2.6 + Math.sin(t * 3 + Math.PI) * 0.5, aLz: 0.2, aRz: 0.2,
    };
  },
  sitFloor(t) {
    const b = Math.sin(t * 1.4) * 0.03;
    return { hipY: -1.48, lLx: -1.2, lRx: -1.12, lLz: 0.12, lRz: 0.1, lean: -0.32 + b, aLx: 0.95, aRx: 0.9, aLz: 0.26, aRz: 0.26, headX: 0.22 };
  },
  sitChair(t) {
    const b = Math.sin(t * 1.4) * 0.02;
    return { lLx: -1.5, lRx: -1.5, lean: -0.05 + b, aLz: 0.08, aRz: 0.08, aLx: -0.4, aRx: -0.4 };
  },
};
