// EP003 models. Every builder returns a Group in its own natural unit (noted per builder);
// scenes_ep3.js scales each one by (render units per metre) x (metres per unit) every frame.
import * as THREE from 'three';
import { rng } from './env.js';

export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
export function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m); return m;
}
const sph = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
const cyl = (r1, r2, h, s = 8) => new THREE.CylinderGeometry(r1, r2, h, s);
function lumpy(geo, amp, seed = 1, freq = 3) { // displace vertices along normals with smooth noise
  const p = geo.attributes.position, v = new THREE.Vector3(), r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    const d = Math.sin(n.x * freq + ph[0]) * Math.cos(n.y * freq * 1.3 + ph[1]) + 0.6 * Math.sin(n.z * freq * 2.1 + ph[2] + n.x * 2) + 0.35 * Math.sin((n.x + n.y + n.z) * freq * 3.7 + ph[3]);
    v.addScaledVector(n, d * amp); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}
export function glowTexture(inner = 'rgba(255,255,255,1)', soft = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(soft * 0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = { t: null };
export function glow(color, opacity = 1) {
  GLOW.t ||= glowTexture();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW.t, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  return s;
}

// ---------------------------------------------------------------- city-scale (unit: metre)
export function pigeon() { // ~0.33 m tall
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const grey = M('#8d939c', { roughness: 0.8 }), dark = M('#5c616a', { roughness: 0.8 }), irid = M('#4d7a6c', { roughness: 0.35, metalness: 0.3, emissive: '#3b2a55', emissiveIntensity: 0.25 });
  mesh(sph(1), grey, 0, 0.16, 0, body).scale.set(0.085, 0.08, 0.15);
  for (const s of [-1, 1]) { const w = mesh(sph(1), dark, s * 0.07, 0.175, -0.03, body); w.scale.set(0.03, 0.065, 0.14); w.rotation.x = -0.15;
    for (const zz of [-0.05, -0.1]) mesh(new THREE.BoxGeometry(0.004, 0.02, 0.05), M('#2e3036'), s * 0.098, 0.18, zz, body); }
  const tail = mesh(new THREE.BoxGeometry(0.07, 0.012, 0.12), dark, 0, 0.15, -0.18, body); tail.rotation.x = -0.25;
  mesh(new THREE.BoxGeometry(0.072, 0.014, 0.025), M('#2e3036'), 0, 0.145, -0.235, body).rotation.x = -0.25;
  const neck = mesh(sph(1), irid, 0, 0.235, 0.085, body); neck.scale.set(0.05, 0.07, 0.05);
  const head = new THREE.Group(); head.position.set(0, 0.29, 0.11); body.add(head);
  mesh(sph(0.036), grey, 0, 0, 0, head);
  const beak = mesh(cyl(0.0035, 0.008, 0.028, 6), M('#3a3b3f'), 0, -0.006, 0.045, head); beak.rotation.x = Math.PI / 2;
  mesh(sph(0.008), M('#e8e6e0'), 0, 0.002, 0.03, head);
  for (const s of [-1, 1]) { mesh(sph(0.009), M('#f08a24', { roughness: 0.3 }), s * 0.026, 0.01, 0.012, head); mesh(sph(0.0045), M('#111', { roughness: 0.2 }), s * 0.032, 0.012, 0.015, head); }
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.03, 0.09, 0.0); g.add(leg); legs.push(leg);
    mesh(cyl(0.005, 0.004, 0.09), M('#d9737f'), 0, -0.045, 0, leg);
    for (const a of [-0.5, 0, 0.5]) { const toe = mesh(new THREE.BoxGeometry(0.004, 0.003, 0.035), M('#d9737f'), Math.sin(a) * 0.015, -0.088, Math.cos(a) * 0.015, leg); toe.rotation.y = a; }
  }
  g.userData = { body, head, legs };
  return g;
}
export function houseKey() { // ~0.056 m long, lying flat, blade along +x
  const g = new THREE.Group(), brass = M('#c9a43e', { metalness: 0.85, roughness: 0.32 });
  const bow = new THREE.Shape(); bow.absarc(0, 0, 0.0125, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(-0.004, 0, 0.0035, 0, Math.PI * 2, true); bow.holes.push(hole);
  const bowG = new THREE.ExtrudeGeometry(bow, { depth: 0.0022, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0005, bevelSegments: 2, curveSegments: 28 });
  const b = mesh(bowG, brass, 0, 0.0016, 0, g); b.rotation.x = -Math.PI / 2;
  const blade = new THREE.Shape(); blade.moveTo(0.008, -0.0035); const teeth = [0.004, 0.0015, 0.0035, 0.001, 0.003, 0.0015];
  let x = 0.012; blade.lineTo(x, -0.0035);
  for (const d of teeth) { blade.lineTo(x + 0.0025, -0.0035 - d); blade.lineTo(x + 0.005, -0.0035); x += 0.005; }
  blade.lineTo(0.046, -0.0035); blade.lineTo(0.048, 0.0); blade.lineTo(0.046, 0.0035); blade.lineTo(0.008, 0.0035); blade.lineTo(0.008, -0.0035);
  const bl = mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.0018, bevelEnabled: true, bevelSize: 0.0003, bevelThickness: 0.0003, bevelSegments: 1 }), brass, 0, 0.0016, 0, g); bl.rotation.x = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.03, 0.0004, 0.0008), M('#8f7426', { metalness: 0.8, roughness: 0.4 }), 0.03, 0.0035, 0.0, g);
  return g;
}
export function leaf(seed = 3) { // ~0.08 m dry leaf (unit: metre)
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.025, 0.02, 0.06, 0.025, 0.085, 0); s.bezierCurveTo(0.06, -0.022, 0.025, -0.02, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 12); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.abs(y) * 0.35 + Math.sin(x * 60) * 0.0015); }
  geo.computeVertexNormals();
  const m = mesh(geo, M('#a2753a', { side: THREE.DoubleSide, roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.0005;
  const g = new THREE.Group(); g.add(m); mesh(cyl(0.0007, 0.0007, 0.085, 4), M('#7d5a2b'), 0.042, 0.002, 0, g).rotation.z = Math.PI / 2; return g;
}
export function grassBlade(h, w, bend, color) { // unit: metre, grows up +y, bends toward +x
  const geo = new THREE.PlaneGeometry(w, h, 1, 10); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) + h / 2, k = y / h; p.setXYZ(i, p.getX(i) * (1 - k * 0.92) + bend * k * k * h, y, Math.sin(k * 3) * w * 0.4 * (p.getX(i) > 0 ? 1 : -1) * 0.2); }
  geo.computeVertexNormals();
  return mesh(geo, M(color, { side: THREE.DoubleSide, roughness: 0.75 }));
}
export function ladybug() { // unit: metre, ~7 mm long, faces +z
  const g = new THREE.Group(), red = M('#d2261c', { roughness: 0.18, metalness: 0.05 }), blk = M('#141414', { roughness: 0.35 });
  const shell = mesh(new THREE.SphereGeometry(0.0034, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.0008, -0.0004, g); shell.scale.set(0.95, 0.85, 1.05);
  const r = rng(8);
  for (const [x, z] of [[0, 0.0012], [0.0017, 0.0006], [-0.0017, 0.0006], [0.0015, -0.0016], [-0.0015, -0.0016], [0.0006, -0.0028], [-0.0006, -0.0028]]) {
    const y = Math.sqrt(Math.max(0, 0.0034 ** 2 - x * x - (z + 0.0004) ** 2)) * 0.85 + 0.0008;
    const sp = mesh(new THREE.CircleGeometry(0.0006 + r() * 0.0002, 12), blk, x * 0.95, y + 0.00003, z, g); sp.lookAt(x * 3, y * 3 + 0.004, z * 3);
  }
  const head = mesh(sph(0.0016), blk, 0, 0.0011, 0.0033, g); head.scale.set(1, 0.7, 0.8);
  for (const s of [-1, 1]) mesh(sph(0.0005), M('#f4f2ea'), s * 0.0009, 0.0015, 0.0038, g);
  const legs = [];
  for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1, zz = (i % 3 - 1) * 0.0014;
    const leg = new THREE.Group(); leg.position.set(s * 0.0022, 0.0009, zz); g.add(leg); legs.push(leg);
    const l = mesh(cyl(0.00018, 0.00012, 0.0026, 5), blk, s * 0.0011, -0.0004, 0, leg); l.rotation.z = s * 1.15; }
  g.userData.legs = legs; return g;
}
export function riceGrain(seed) { const m = mesh(lumpy(new THREE.SphereGeometry(1, 20, 12), 0.04, seed, 2), M('#efeadc', { roughness: 0.45, emissive: '#3a352a', emissiveIntensity: 0.12 })); m.scale.set(0.0011, 0.001, 0.0033); return m; }

function insectLeg(len, thick, mat) { // three-segment leg: returns { root, joints }
  const root = new THREE.Group(), a = new THREE.Group(), b = new THREE.Group(); root.add(a);
  mesh(cyl(thick, thick * 0.8, len * 0.45, 5), mat, 0, -len * 0.225, 0, a);
  b.position.y = -len * 0.45; a.add(b); mesh(cyl(thick * 0.8, thick * 0.4, len * 0.55, 5), mat, 0, -len * 0.275, 0, b);
  return { root, a, b };
}
export function ant() { // unit: metre, ~2.6 mm long, faces +z
  const g = new THREE.Group(), body = M('#2a1a12', { roughness: 0.3, metalness: 0.1 }), leg = M('#3a2418', { roughness: 0.4 });
  const gaster = mesh(sph(1), body, 0, 0.00045, -0.0009, g); gaster.scale.set(0.00042, 0.00038, 0.00058);
  mesh(sph(0.00012), body, 0, 0.0004, -0.0003, g);
  const thorax = mesh(sph(1), body, 0, 0.0004, 0.0001, g); thorax.scale.set(0.00018, 0.0002, 0.0004);
  const head = new THREE.Group(); head.position.set(0, 0.00048, 0.00068); g.add(head);
  const hm = mesh(sph(1), body, 0, 0, 0, head); hm.scale.set(0.00026, 0.00024, 0.00028);
  for (const s of [-1, 1]) {
    mesh(sph(0.00007), M('#0a0a0a', { roughness: 0.1 }), s * 0.00022, 0.00006, 0.00008, head);
    const m1 = mesh(cyl(0.00003, 0.00002, 0.0002, 4), body, s * 0.0001, -0.0001, 0.00028, head); m1.rotation.x = 1.3; m1.rotation.z = s * 0.4;
    const an = new THREE.Group(); an.position.set(s * 0.00012, 0.00012, 0.00018); head.add(an);
    const sc = mesh(cyl(0.000018, 0.000018, 0.0005, 4), leg, 0, 0.00025, 0, an); an.rotation.set(-0.5, 0, -s * 0.6);
    const fl = new THREE.Group(); fl.position.y = 0.0005; an.add(fl); mesh(cyl(0.000018, 0.000012, 0.0005, 4), leg, 0, 0.00025, 0, fl); fl.rotation.x = 1.6;
    head.userData['an' + s] = an;
  }
  const legs = [];
  for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1, k = i % 3;
    const L = insectLeg(0.0013, 0.00003, leg); L.root.position.set(s * 0.00012, 0.00035, 0.00028 - k * 0.00022); g.add(L.root);
    L.side = s; L.k = k; L.base = (k - 1) * 0.5; legs.push(L); }
  g.userData = { legs, head };
  return g;
}
export function poseInsectLegs(legs, t, speed, lift = 1) { // tripod gait; legs[] from ant()/dustMite()
  legs.forEach((L, i) => {
    const ph = t * speed + ((i % 3) + (i < 3 ? 0 : 1)) % 2 * Math.PI;
    const sw = Math.sin(ph) * 0.35, up = Math.max(0, Math.cos(ph)) * 0.35 * lift;
    L.root.rotation.set(0, L.base * L.side + sw * L.side, 0);
    L.a.rotation.set(0, 0, L.side * (1.1 - up));
    L.b.rotation.set(0, 0, -L.side * 1.5);
  });
}
export function dustMite() { // unit: metre, ~0.3 mm, faces +z
  const g = new THREE.Group(), skin = M('#e6d8b8', { roughness: 0.55, emissive: '#3d2f1c', emissiveIntensity: 0.15 }), legM = M('#d8c59c', { roughness: 0.6 });
  const body = mesh(lumpy(new THREE.SphereGeometry(1, 28, 18), 0.06, 4, 5), skin, 0, 0.00012, 0, g); body.scale.set(0.00011, 0.00008, 0.00015);
  const head = mesh(sph(1), skin, 0, 0.0001, 0.00015, g); head.scale.set(0.00004, 0.00003, 0.00004);
  const r = rng(12);
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, b = r() * 1.2; const hr = mesh(cyl(0.0000025, 0.000001, 0.00011, 3), legM);
    hr.position.set(Math.cos(a) * Math.sin(b) * 0.00011, 0.00012 + Math.cos(b) * 0.00008, Math.sin(a) * Math.sin(b) * 0.00015);
    hr.lookAt(hr.position.x * 3, hr.position.y * 3 - 0.0001, hr.position.z * 3); hr.rotateX(Math.PI / 2); g.add(hr); }
  const legs = [];
  for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, k = i % 4;
    const L = insectLeg(0.00016, 0.000012, legM); L.root.position.set(s * 0.00008, 0.0001, 0.0001 - k * 0.00007); g.add(L.root);
    L.side = s; L.k = k; L.base = (k - 1.5) * 0.45; legs.push(L); }
  g.userData.legs = legs; return g;
}
export function sandGrainGeos(n = 7) { // unit-radius irregular grains
  return Array.from({ length: n }, (_, i) => { const geo = lumpy(new THREE.IcosahedronGeometry(1, 2), 0.16, 30 + i, 2.2); geo.scale(1, 0.72, 0.9); return geo; });
}
export const SAND_COLS = ['#d9c7a3', '#c9b48e', '#e8e2d6', '#b39a7a', '#9a8f86', '#e3c9b0', '#7a706a', '#d8d2c6'];

// ---------------------------------------------------------------- micro (unit: micrometre)
function translucent(color, opacity = 0.5, o = {}) { return new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.25, depthWrite: false, side: THREE.DoubleSide, ...o }); }
export function paramecium() { // ~200 um long along +z
  const g = new THREE.Group();
  const shell = mesh(lumpy(new THREE.SphereGeometry(1, 40, 24), 0.03, 7, 4), translucent('#cfe8c4', 0.45, { emissive: '#203a20', emissiveIntensity: 0.25 }), 0, 0, 0, g); shell.scale.set(32, 26, 100); shell.castShadow = false;
  const inner = M('#7fa86b', { roughness: 0.5 });
  mesh(sph(16), M('#9fb7d6', { roughness: 0.4 }), 4, 2, 6, g).scale.set(1, 0.8, 1.4);
  const r = rng(5);
  for (let i = 0; i < 16; i++) mesh(sph(3 + r() * 4, 10, 8), inner, (r() - 0.5) * 34, (r() - 0.5) * 26, (r() - 0.5) * 140, g);
  for (const z of [-58, 50]) mesh(sph(7, 12, 10), translucent('#e8fff0', 0.6), 6, 6, z, g);
  // cilia
  const pos = [], N = 900;
  for (let i = 0; i < N; i++) { const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1); const n = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.sin(v) * Math.sin(u), Math.cos(v));
    const p = new THREE.Vector3(n.x * 32, n.y * 26, n.z * 100); const q = p.clone().addScaledVector(new THREE.Vector3(n.x / 32, n.y / 26, n.z / 100).normalize(), 7); pos.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const cilia = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#e9ffe2', transparent: true, opacity: 0.55 })); g.add(cilia);
  g.userData.cilia = cilia; return g;
}
export function hair() { // 70 um wide, 4000 um long along +x
  const tex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#6a4a2f'; x.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 12; i++) { const gx = i * 22 + (i % 3) * 3; x.strokeStyle = 'rgba(30,18,10,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(gx, 0); for (let y = 0; y <= 64; y += 8) x.lineTo(gx + Math.sin(y * 0.3 + i) * 5, y); x.stroke();
      x.strokeStyle = 'rgba(200,160,120,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(gx + 3, 0); for (let y = 0; y <= 64; y += 8) x.lineTo(gx + 3 + Math.sin(y * 0.3 + i) * 5, y); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const g = new THREE.Group();
  const m = mesh(new THREE.CylinderGeometry(35, 35, 4000, 28, 1, true), M('#ffffff', { map: tex, roughness: 0.45 }), 0, 0, 0, g); m.rotation.z = Math.PI / 2;
  return g;
}
export function pollen() { // ~35 um diameter incl. spines
  const g = new THREE.Group(), y = M('#f0c23a', { roughness: 0.55, emissive: '#5a3d05', emissiveIntensity: 0.2 });
  mesh(lumpy(new THREE.SphereGeometry(13, 32, 20), 0.03, 9, 8), y, 0, 0, 0, g);
  const r = rng(21), n = 70;
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i;
    const d = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
    const sp = mesh(new THREE.ConeGeometry(1.6, 5 + r(), 6), y); sp.position.copy(d).multiplyScalar(14.5); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(sp); }
  return g;
}
export function skinFlake() { // a curled sheet of ~10 cells, each ~30 um across
  const g = new THREE.Group(), r = rng(31);
  for (let i = 0; i < 11; i++) {
    const s = new THREE.Shape(), cx = (i % 4) * 26 - 39 + (Math.floor(i / 4) % 2) * 13, cz = Math.floor(i / 4) * 23 - 23;
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + r() * 0.2, rr = 14 + r() * 3; k ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.5, bevelSegments: 1 });
    const m = mesh(geo, translucent(['#efdcc4', '#e9d2b6', '#f2e2cf'][i % 3], 0.75, { emissive: '#3a2a1a', emissiveIntensity: 0.1 }), cx, Math.pow(cx / 40, 2) * 10, cz, g);
    m.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.15, (r() - 0.5) * 0.1, r()); m.rotateY(cx * 0.01);
  }
  return g;
}
export function redBloodCell() { // biconcave disc (Evans-Fung profile), 7.8 um diameter, axis +y
  const R = 3.91, half = (k) => 0.5 * Math.sqrt(Math.max(0, 1 - k * k)) * (0.81 + 7.83 * k * k - 4.39 * k ** 4);
  const pts = [];
  for (let i = 0; i <= 28; i++) { const k = Math.min(0.999, i / 28); pts.push(new THREE.Vector2(Math.max(0.001, k * R), half(k) + 0.02)); }
  for (let i = 28; i >= 0; i--) { const k = Math.min(0.999, i / 28); pts.push(new THREE.Vector2(Math.max(0.001, k * R), -half(k) - 0.02)); }
  const geo = new THREE.LatheGeometry(pts.reverse(), 40); geo.computeVertexNormals();
  return mesh(geo, M('#c2382c', { roughness: 0.35, emissive: '#4a0a06', emissiveIntensity: 0.25 }));
}
export function yeast(seed = 1) { // ~5 um oval with a bud
  const g = new THREE.Group(), m = M('#eadcb4', { roughness: 0.5, emissive: '#3b3020', emissiveIntensity: 0.15 });
  mesh(lumpy(new THREE.SphereGeometry(2.5, 24, 16), 0.04, seed, 6), m, 0, 0, 0, g).scale.set(1, 1, 1.25);
  mesh(sph(1.1, 16, 12), m, 0, 0.6, 3.3, g);
  mesh(sph(1.0, 12, 10), M('#c7b48a'), 0.4, 0.3, 0.2, g);
  return g;
}
export function bacterium(color = '#7fb07a', seed = 1) { // rod 2 um x 0.6 um along +z, flagella trailing -z
  const g = new THREE.Group();
  const b = mesh(new THREE.CapsuleGeometry(0.32, 1.4, 6, 14), M(color, { roughness: 0.4, emissive: color, emissiveIntensity: 0.12 }), 0, 0, 0, g); b.rotation.x = Math.PI / 2;
  const flag = [];
  for (let f = 0; f < 3; f++) { const pts = []; for (let i = 0; i <= 30; i++) { const k = i / 30; pts.push(new THREE.Vector3(Math.sin(k * 14 + f * 2) * 0.18 + (f - 1) * 0.12, Math.cos(k * 14 + f * 2) * 0.18, -1.0 - k * 3.4)); }
    const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.03, 4), M('#d8e6d0', { roughness: 0.5 }), 0, 0, 0, g); flag.push(tube); }
  g.userData.flag = flag; return g;
}
export function diatom(seed = 1) { // glassy disc ~40 um
  const g = new THREE.Group(), r = rng(seed);
  const m = translucent('#bfe9e6', 0.45, { emissive: '#1e4a48', emissiveIntensity: 0.3, metalness: 0.2 });
  const d = mesh(new THREE.CylinderGeometry(20, 20, 6, 40, 1), m, 0, 0, 0, g); d.castShadow = false;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const rib = mesh(new THREE.BoxGeometry(18, 0.6, 0.8), M('#e4fbf8', { transparent: true, opacity: 0.6 }), Math.cos(a) * 10, 3.2, Math.sin(a) * 10, g); rib.rotation.y = -a; }
  mesh(sph(4, 12, 8), M('#c2a24a', { roughness: 0.5 }), 3, 0, 2, g).scale.set(1, 0.4, 1);
  return g;
}
export function lightWave(lambda, cycles, color) { // ribbon tracing a sine of wavelength `lambda` (unit: nm) along +x
  const N = cycles * 24, geo = new THREE.PlaneGeometry(lambda * cycles, lambda * 0.08, N, 1);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(geo, mat); m.userData.base = Float32Array.from(geo.attributes.position.array); m.userData.lambda = lambda;
  m.userData.update = (ph) => { const p = geo.attributes.position, b = m.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setY(i, b[i * 3 + 1] + Math.sin((x / lambda) * Math.PI * 2 - ph) * lambda * 0.22); } p.needsUpdate = true; };
  m.userData.update(0); return m;
}

// ---------------------------------------------------------------- molecular (unit: nanometre)
export function virus(color = '#d98a9a', spikeColor = '#f2d06b', R = 50, n = 60, seed = 3) { // R = body radius in nm
  const g = new THREE.Group();
  mesh(lumpy(new THREE.SphereGeometry(R, 32, 20), 0.025, seed, 7), M(color, { roughness: 0.5, emissive: color, emissiveIntensity: 0.12 }), 0, 0, 0, g);
  const sm = M(spikeColor, { roughness: 0.45, emissive: spikeColor, emissiveIntensity: 0.12 });
  for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i;
    const d = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
    const s = new THREE.Group(); s.position.copy(d).multiplyScalar(R); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(s);
    mesh(cyl(R * 0.03, R * 0.04, R * 0.22, 5), sm, 0, R * 0.11, 0, s); mesh(sph(R * 0.07, 8, 6), sm, 0, R * 0.25, 0, s); }
  return g;
}
export function icosaVirus(R = 15) { // poliovirus-like, nm
  const g = new THREE.Group();
  const geo = lumpy(new THREE.IcosahedronGeometry(R, 2), 0.05, 5, 9);
  mesh(geo, M('#8fc4d9', { roughness: 0.5, flatShading: true, emissive: '#1b3c4a', emissiveIntensity: 0.25 }), 0, 0, 0, g);
  return g;
}
export function blob(R, color, seed, freq = 5, amp = 0.12) { return mesh(lumpy(new THREE.SphereGeometry(R, 28, 18), amp, seed, freq), M(color, { roughness: 0.55, emissive: color, emissiveIntensity: 0.12 })); }
export function ribosome() { // ~25 nm
  const g = new THREE.Group();
  g.add(Object.assign(blob(10, '#c9a0dc', 2), {})); g.children[0].scale.set(1.15, 0.9, 1);
  const s = blob(7, '#f0c27a', 6); s.position.set(2, 10, 1); g.add(s);
  const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push(new THREE.Vector3(-40 + k * 80, 7 + Math.sin(k * 9) * 3, Math.cos(k * 7) * 3)); }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.7, 6), M('#7fd1b9', { emissive: '#2c6b5a', emissiveIntensity: 0.3 }), 0, 0, 0, g);
  return g;
}
export function antibody() { // Y shape ~12 nm
  const g = new THREE.Group(), a = '#7fb3e6', b = '#e6a37f';
  const put = (x, y, r, c, s) => { const m = blob(r, c, s, 6, 0.1); m.position.set(x, y, 0); g.add(m); };
  put(0, -3.5, 1.9, a, 1); put(0, -0.8, 1.9, b, 2); put(0, -6.1, 1.7, a, 3);
  for (const s of [-1, 1]) { put(s * 2.0, 1.7, 1.7, a, 4 + s); put(s * 3.7, 3.9, 1.7, b, 6 + s); put(s * 5.0, 5.9, 1.4, a, 8 + s); }
  return g;
}
export function hemoglobin() { // ~6 nm, four subunits with heme discs
  const g = new THREE.Group(), cols = ['#e06666', '#e69a9a', '#e06666', '#e69a9a'];
  [[-1.4, 1, 1], [1.4, 1, -1], [-1.4, -1, -1], [1.4, -1, 1]].forEach(([x, y, z], i) => { const m = blob(1.9, cols[i], 20 + i, 6, 0.12); m.position.set(x, y, z * 0.9); g.add(m);
    const h = mesh(cyl(0.6, 0.6, 0.15, 10), M('#7a1d14', { emissive: '#ff5533', emissiveIntensity: 0.25 }), x * 1.5, y * 1.4, z * 1.6, g); h.rotation.set(1, i, 0.5); });
  return g;
}
const ATOM = { C: ['#555a62', 0.17], O: ['#e0463c', 0.152], H: ['#f2f2f2', 0.11], N: ['#3f63d6', 0.155], P: ['#f08c2a', 0.18] };
export function atomBall(el, scale = 0.45) { return mesh(sph(ATOM[el][1] * scale, 18, 12), M(ATOM[el][0], { roughness: 0.35, emissive: ATOM[el][0], emissiveIntensity: 0.1 })); }
export function dna(bp = 40) { // B-DNA along +y: 2 nm diameter, 0.34 nm rise, 10.5 bp per turn (unit: nm)
  const g = new THREE.Group(), r = rng(4), pairCols = [['#3f7be0', '#f2c230'], ['#3aa76d', '#e0463c']];
  const back = M('#f08c2a', { roughness: 0.35, emissive: '#7a3a08', emissiveIntensity: 0.2 }), sug = M('#e8d9b0', { roughness: 0.4 });
  const ball = sph(0.24, 12, 8), sball = sph(0.17, 10, 8), rod = cyl(0.12, 0.12, 1, 8);
  for (let i = 0; i < bp; i++) {
    const y = (i - bp / 2) * 0.34, a = i * (Math.PI * 2 / 10.5);
    const p1 = new THREE.Vector3(Math.cos(a), y, Math.sin(a)), p2 = new THREE.Vector3(Math.cos(a + 2.4), y, Math.sin(a + 2.4)); // minor/major groove offset
    mesh(ball, back, p1.x, p1.y, p1.z, g); mesh(ball, back, p2.x, p2.y, p2.z, g);
    mesh(sball, sug, p1.x * 0.82, p1.y + 0.1, p1.z * 0.82, g); mesh(sball, sug, p2.x * 0.82, p2.y + 0.1, p2.z * 0.82, g);
    const [c1, c2] = pairCols[Math.floor(r() * 2)][r() < 0.5 ? 'slice' : 'reverse']();
    const mid = p1.clone().lerp(p2, 0.5);
    for (const [from, c] of [[p1, c1], [p2, c2]]) { const len = from.distanceTo(mid) * 0.85, m = mesh(rod, M(c, { roughness: 0.4, emissive: c, emissiveIntensity: 0.15 }));
      m.scale.set(1, len, 1); m.position.copy(from.clone().multiplyScalar(0.8).lerp(mid, 0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), mid.clone().sub(from).normalize()); g.add(m); }
  }
  return g;
}
export function glucose() { // ~0.9 nm ring, ball and stick (unit: nm)
  const g = new THREE.Group(), stick = M('#cfcfcf', { roughness: 0.4 });
  const ring = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * 0.15, (i % 2 ? 0.025 : -0.025), Math.sin(a) * 0.15).multiplyScalar(1.6)); }
  const bond = (a, b) => { const m = mesh(cyl(0.012, 0.012, 1, 6), stick); m.scale.y = a.distanceTo(b); m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(m); };
  ring.forEach((p, i) => { const a = atomBall(i === 0 ? 'O' : 'C'); a.position.copy(p); g.add(a); bond(p, ring[(i + 1) % 6]);
    if (i) { const o = p.clone().multiplyScalar(1.55).add(new THREE.Vector3(0, i % 2 ? 0.12 : -0.12, 0)); const ox = atomBall('O'); ox.position.copy(o); g.add(ox); bond(p, o);
      const h = atomBall('H'); h.position.copy(o.clone().multiplyScalar(1.25)); g.add(h); bond(o, h.position); } });
  return g;
}
export function water(spacefill = 1) { // H2O, unit nm, O at origin, H at 104.5 deg, 0.096 nm bonds
  const g = new THREE.Group();
  const O = mesh(sph(0.152 * spacefill, 24, 16), M('#e0463c', { roughness: 0.3, emissive: '#5a120c', emissiveIntensity: 0.25 }), 0, 0, 0, g);
  const hm = M('#f4f4f4', { roughness: 0.3, emissive: '#444', emissiveIntensity: 0.2 });
  for (const s of [-1, 1]) { const a = s * (104.5 / 2) * Math.PI / 180; mesh(sph(0.11 * spacefill, 20, 12), hm, Math.sin(a) * 0.12, -Math.cos(a) * 0.12, 0, g); }
  g.userData.O = O; return g;
}

// ---------------------------------------------------------------- atomic & beyond
export function dotCloud(n, radial, color, size, seed = 1) { // probability-density style cloud (Points); radial(r()) -> radius
  const r = rng(seed), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = radial(r);
    pos[i * 3] = s * Math.cos(a) * d; pos[i * 3 + 1] = u * d; pos[i * 3 + 2] = s * Math.sin(a) * d; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  GLOW.t ||= glowTexture();
  const mat = new THREE.PointsMaterial({ color, size, map: GLOW.t, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.userData.baseSize = size; return p;
}
export function nucleus(Z = 8, N = 8, seed = 2) { // unit: fm, nucleons ~1.7 fm, packed in a ball of radius ~1.2 A^(1/3)
  const g = new THREE.Group(), r = rng(seed), A = Z + N, R = 1.15 * Math.cbrt(A), nucleons = [];
  const pm = M('#e0523f', { roughness: 0.35, emissive: '#ff6a3d', emissiveIntensity: 0.35 }), nm = M('#9aa6b8', { roughness: 0.35, emissive: '#6f86b0', emissiveIntensity: 0.25 });
  const pts = [];
  while (pts.length < A) { const p = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).multiplyScalar(R - 0.7); if (p.length() > R - 0.7) continue; if (pts.every((q) => q.distanceTo(p) > 1.05)) pts.push(p); }
  pts.sort((a, b) => b.z - a.z);
  pts.forEach((p, i) => { const isP = i % 2 === 0; const m = mesh(sph(0.84, 24, 16), isP ? pm : nm, p.x, p.y, p.z, g); m.userData = { home: p.clone(), ph: r() * 6, isP }; nucleons.push(m); });
  g.userData.nucleons = nucleons; g.userData.R = R; return g;
}
