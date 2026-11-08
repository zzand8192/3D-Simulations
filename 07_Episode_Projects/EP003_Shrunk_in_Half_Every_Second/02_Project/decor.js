// Background dressing so wide shots never show empty land or sky: skylines, hills, clouds, house rows,
// shops, park furniture, zoo buildings, and interior clutter (shelves, frames, windows, plants).
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { causticMaterial, rng } from './env.js';
import * as V from './vehicles.js';
import * as P from './props.js';
import { tree } from './scenes_city.js';

const CM = (c, o = {}) => causticMaterial({ color: c, roughness: 0.8, ...o });
const box = (w, h, d, c, r = 0, o = {}) => { const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), CM(c, o)); m.castShadow = m.receiveShadow = true; return m; };
const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

// soft low-poly clouds (no shadows), placed in a band around the origin
export function clouds(scene, seed = 1, { n = 14, radius = 380, y = [70, 130], spread = 1 } = {}) {
  const r = rng(seed), m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.25, fog: false });
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(), a = r() * Math.PI * 2 * spread, d = radius * (0.6 + r() * 0.5);
    for (let k = 0; k < 4 + Math.floor(r() * 3); k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(8 + r() * 10, 0), m); s.position.set((k - 2) * 12 + r() * 6, r() * 5, r() * 8); s.scale.y = 0.6; g.add(s); }
    g.position.set(Math.sin(a) * d, y[0] + r() * (y[1] - y[0]), -Math.abs(Math.cos(a) * d)); scene.add(g);
  }
}
// rolling hills on the horizon
export function hills(scene, seed = 2, { radius = 520, color = '#7f9a5a', n = 9, z = -1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), CM(color, { flatShading: true, roughness: 1 })); const a = (-0.6 + i / (n - 1) * 1.2) * Math.PI / 2; m.scale.set(110 + r() * 90, 30 + r() * 40, 60); m.position.set(Math.sin(a) * radius, -12, z * Math.cos(a) * radius); scene.add(m); }
}
// a distant skyline (simple towers, lit windows texture) on an arc behind the set
const SKY_COLS = ['#b8c4cf', '#c9d2da', '#a9b6c2', '#d6dbe0', '#9fb0bf'];
export function skyline(scene, seed = 3, { radius = 300, arc = 1.4, n = 46, h = [30, 140], z = -1, cols = SKY_COLS } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * arc, d = radius * (0.9 + r() * 0.25), w = 14 + r() * 18, hh = h[0] + r() * (h[1] - h[0]);
    const b = P.building(r, w, hh, 14, cols[Math.floor(r() * cols.length)]); b.position.set(Math.sin(a) * d, 0, z * Math.cos(a) * d); b.rotation.y = -a; scene.add(b);
  }
}
// a row of houses (used behind the main street and across it)
const HC = ['#f1e6d6', '#cfdde6', '#e8d2b8', '#f4f1ea', '#d6c4e0', '#c9dfc3', '#e9c9b0'];
export function houseRow(scene, seed, z, x0, x1, ry = 0, step = 22) {
  const r = rng(seed);
  for (let x = x0; x <= x1; x += step) {
    const g = new THREE.Group(); g.position.set(x + (r() - 0.5) * 4, 0, z); g.rotation.y = ry; scene.add(g);
    const w = 13 + r() * 5, h = 8 + r() * 3;
    g.add(at(box(w, h, 11, HC[Math.floor(r() * HC.length)], 0.2), 0, h / 2, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 5.5, 4), CM(['#6b4a3a', '#7a3b2b', '#4a5560'][Math.floor(r() * 3)], { flatShading: true })); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75); roof.position.y = h + 2.7; roof.castShadow = true; g.add(roof);
    for (const wx of [-w / 3, w / 3]) g.add(at(box(2.6, 2.6, 0.2, '#2a3b4c', 0, { roughness: 0.2 }), wx, h * 0.55, 5.55));
    g.add(at(box(2.2, 4.4, 0.2, ['#8e3b2b', '#2f4f8c', '#3a6b4a'][Math.floor(r() * 3)]), 0, 2.2, 5.55));
    if (r() < 0.7) { const t = tree(r, 1.1 + r() * 0.5); t.position.set(x + w / 2 + 3, 0, z + 4); scene.add(t); }
  }
}
export function bench(c = '#8a6a45') { const g = new THREE.Group(); g.add(at(box(5, 0.3, 1.4, c), 0, 1.4, 0), at(box(5, 1.2, 0.2, c), 0, 2.2, -0.6)); for (const x of [-2.2, 2.2]) g.add(at(box(0.25, 1.4, 1.2, '#3a3f46'), x, 0.7, 0)); return g; }
export function lamp() { return V.streetLamp(); }
export function bin() { const g = new THREE.Group(); g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.6, 2, 12), CM('#3a6b4a')), 0, 1, 0)); return g; }
export function planter(r) { const g = new THREE.Group(); g.add(at(box(2.4, 1.2, 2.4, '#b8a58a'), 0, 0.6, 0)); const t = tree(r, 0.5); t.position.y = 1.2; g.add(t); return g; }
export function shopRow(scene, seed, z, x0, x1, ry = 0) {
  const r = rng(seed), names = ['BONE APPÉTIT', 'PURRFECT CUTS', 'THE TALL GIRAFFE', 'HONEY & CO', 'NUT HOUSE', 'FETCH COFFEE', 'SCRATCH BAKERY'];
  let i = 0;
  for (let x = x0; x <= x1; x += 18) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const h = 12 + r() * 10, c = HC[Math.floor(r() * HC.length)];
    g.add(at(box(17, h, 10, c), 0, h / 2, 0), at(box(17.2, 1.2, 1.6, ['#c9473a', '#2fb3c9', '#3aa76d', '#f2b230', '#8e5bd6'][i % 5]), 0, 7.4, 5.4));
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.0), new THREE.MeshBasicMaterial({ map: V.textTex(names[i % names.length], { w: 768, h: 70, bg: '#1b1f24', fg: '#ffffff', font: '700 48px Georgia, serif' }) })); sg.position.set(0, 7.4, 6.22); g.add(sg);
    g.add(at(box(12, 4.6, 0.15, '#9fc4d6', 0, { roughness: 0.1, metalness: 0.3 }), 0, 3.6, 5.05));
    for (let y = 11; y < h - 2; y += 4) for (const wx of [-5, 0, 5]) g.add(at(box(2.4, 2.2, 0.2, '#2a3b4c', 0, { roughness: 0.2 }), wx, y, 5.05));
    i++;
  }
}
// zoo dressing: other enclosures, kiosks, signposts, balloons, a distant city
export function zooDressing(scene, seed = 9) {
  const r = rng(seed), wood = '#8a6a45';
  // kiosks & gift shop along the far side of the visitor path
  const kiosk = (x, z, c, name) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g); g.add(at(box(8, 6, 6, '#f1e6d6'), 0, 3, 0)); const aw = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 3), CM(c)); aw.position.set(0, 6.2, 3.6); aw.rotation.x = 0.3; g.add(aw); const sg = new THREE.Mesh(new THREE.PlaneGeometry(6, 1), new THREE.MeshBasicMaterial({ map: V.textTex(name, { w: 600, h: 100, bg: c, fg: '#ffffff', font: '700 60px Georgia, serif' }) })); sg.position.set(0, 7.2, 3.05); g.add(sg); g.add(at(box(8, 1.2, 1.2, '#8a6a45'), 0, 2.4, 3.6)); };
  kiosk(30, -24, '#c9473a', 'GIFT SHOP'); kiosk(30, -8, '#2fb3c9', 'ICE CREAM'); kiosk(30, 26, '#3aa76d', 'HUMAN FEED');
  // a second enclosure across the path (empty animal enclosure, now a lounge for animals)
  const rail = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); for (const y of [1.6, 3.2]) { const b = box(len, 0.25, 0.25, wood); b.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); b.rotation.y = -Math.atan2(z1 - z0, x1 - x0); scene.add(b); } for (let u = 0; u <= len; u += 3) scene.add(at(box(0.35, 4, 0.35, wood), x0 + (x1 - x0) * u / len, 2, z0 + (z1 - z0) * u / len)); };
  rail(40, -40, 40, 40); rail(40, -40, 80, -40);
  for (const [x, z, txt] of [[19, -30, 'EXIT  →'], [19, 34, '← PENGUINS'], [-34, 30, 'MORE HUMANS  →']]) { const s = V.signPost(txt, { w: 5, h: 1.4, bg: '#3f5a2a', height: 5 }); s.position.set(x, 0, z); s.rotation.y = -Math.PI / 2; scene.add(s); }
  for (let i = 0; i < 6; i++) { const b = bench(); b.position.set(22, 0, -36 + i * 13); b.rotation.y = -Math.PI / 2; scene.add(b); }
  for (let i = 0; i < 7; i++) { const l = lamp(); l.position.set(19, 0, -40 + i * 12); scene.add(l); }
  // balloons on a kiosk
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), CM(['#e8423b', '#f2c230', '#2f7fe0', '#3aa76d', '#ff7aa8', '#8e5bd6'][i], { roughness: 0.3 })); b.position.set(26 + (i % 3) * 0.9, 9 + Math.floor(i / 3) * 1.2, -12 + (i % 2)); scene.add(b); }
  // eucalyptus groves + rocks + water feature in the human enclosure
  for (let i = 0; i < 46; i++) { const x = -160 + r() * 320, z = -60 - r() * 140; const t = tree(r, 1.8 + r() * 1.4); t.position.set(x, 0, z); scene.add(t); }
  for (let i = 0; i < 30; i++) { const x = 45 + r() * 120, z = -100 + r() * 220; const t = tree(r, 1.6 + r()); t.position.set(x, 0, z); scene.add(t); }
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshStandardMaterial({ color: '#4f9fbf', roughness: 0.1, metalness: 0.2 })); pond.rotation.x = -Math.PI / 2; pond.position.set(-18, 0.05, 14); scene.add(pond);
  const hut = new THREE.Group(); hut.position.set(-22, 0, -14); scene.add(hut); hut.add(at(box(9, 5, 7, '#c9a46a'), 0, 2.5, 0)); const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 3.5, 4), CM('#7a5a3a', { flatShading: true })); roof.rotation.y = Math.PI / 4; roof.position.y = 6.7; hut.add(roof);
  const sw = V.signPost('HUMAN HABITAT\nFEEDING 3 PM', { w: 5, h: 2, bg: '#3f5a2a', height: 4.5 }); sw.position.set(-10, 0, 20); scene.add(sw);
  skyline(scene, 19, { radius: 420, n: 30, h: [40, 160], z: -1 });
  hills(scene, 21, { color: '#8fa86a' });
  clouds(scene, 23);
}
// dog park dressing
export function parkDressing(scene, seed = 31) {
  const r = rng(seed);
  for (let i = 0; i < 6; i++) { const b = bench(); b.position.set(-30 + i * 12, 0, -30 - (i % 2) * 6); scene.add(b); }
  for (let i = 0; i < 8; i++) { const l = lamp(); l.position.set(-40 + i * 11, 0, -26); scene.add(l); }
  // path + fence + playground
  const path = new THREE.Mesh(new THREE.PlaneGeometry(200, 5), CM('#d9c39a')); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.03, -24); scene.add(path);
  for (let x = -60; x <= 60; x += 3) scene.add(at(box(0.2, 2.2, 0.2, '#d9d9d9'), x, 1.1, -45));
  scene.add(at(box(120, 0.15, 0.15, '#d9d9d9'), 0, 2.1, -45));
  const pg = new THREE.Group(); pg.position.set(24, 0, -36); scene.add(pg);
  pg.add(at(box(6, 0.4, 6, '#f2b230'), 0, 4, 0)); for (const [x, z] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]]) pg.add(at(box(0.4, 4, 0.4, '#2f6fe0'), x, 2, z));
  const slide = box(2, 0.3, 8, '#e8423b'); slide.position.set(0, 2, 6.5); slide.rotation.x = 0.45; pg.add(slide);
  const bone = V.signPost('NO DOGS WITHOUT\nTHEIR HUMANS', { w: 5, h: 1.8, bg: '#3f5a2a', height: 4 }); bone.position.set(10, 0, -20); scene.add(bone);
  houseRow(scene, 33, -95, -140, 140, 0, 24);
  skyline(scene, 35, { radius: 380, n: 36, h: [40, 140] });
  clouds(scene, 37);
}
// suburban street dressing: back row of houses + across-the-street houses + lamps
export function streetDressing(scene, seed = 41) {
  houseRow(scene, 43, -44, -150, 150, 0, 22);
  houseRow(scene, 45, 46, -150, 150, Math.PI, 22);
  const r = rng(seed);
  for (let x = -140; x <= 140; x += 28) { const l = lamp(); l.position.set(x, 0.3, -0.6); scene.add(l); }
  hills(scene, 47, { color: '#7f9a5a' });
  clouds(scene, 49);
}
export function shopStreetDressing(scene, seed = 51) {
  shopRow(scene, 53, -8, -80, -24, 0); shopRow(scene, 55, -8, 24, 80, 0); shopRow(scene, 57, 34, -80, 80, Math.PI);
  const r = rng(seed);
  for (let x = -60; x <= 60; x += 16) { if (Math.abs(x) < 14) continue; const l = lamp(); l.position.set(x, 0, 8); scene.add(l); }
  for (let x = -50; x <= 50; x += 25) { if (Math.abs(x + 8) < 14) continue; const p = planter(r); p.position.set(x + 8, 0, 3); scene.add(p); }
  const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 14), CM('#3e4146', { roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 16); scene.add(road);
  for (let x = -120; x < 120; x += 10) { const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.25), CM('#e8c33a')); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.05, 16); scene.add(s); }
  skyline(scene, 59, { radius: 300, n: 30, h: [50, 150] });
  clouds(scene, 61);
}
export function podiumDressing(scene, seed = 71) {
  const r = rng(seed);
  for (const [x, c] of [[-26, '#b03a2e'], [-11, '#2f4f8c'], [11, '#2f4f8c'], [26, '#b03a2e']]) { const b = box(5, 16, 0.4, c); b.position.set(x, 13, -28.6); scene.add(b); const em = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), new THREE.MeshBasicMaterial({ color: '#c9a227' })); em.position.set(x, 16, -28.35); scene.add(em); }
  for (let i = 0; i < 18; i++) { const side = i % 2 ? 1 : -1, t = tree(r, 1.6 + r() * 0.6); t.position.set(side * (44 + r() * 30), 0, -60 + r() * 80); scene.add(t); }
  skyline(scene, 73, { radius: 260, n: 40, h: [40, 150], arc: 2.2 });
  for (let i = 0; i < 6; i++) { const l = lamp(); l.position.set(-30 + i * 12, 0, 30); l.rotation.y = Math.PI; scene.add(l); }
  for (let i = 0; i < 4; i++) { const v = V.bus(['#2f6fe0', '#f2f2f2'][i % 2]); v.position.set(-80 + i * 50, 0, 60); v.rotation.y = Math.PI / 2; scene.add(v); }
  clouds(scene, 75);
}
// interiors
export function bookshelf(r, w = 6, h = 8) {
  const g = new THREE.Group(); g.add(at(box(w, h, 0.6, '#6f5038'), 0, h / 2, -0.4)); for (let s = 0; s <= 4; s++) g.add(at(box(w, 0.2, 1.4, '#6f5038'), 0, 0.4 + s * (h / 4), 0)); for (const x of [-w / 2, w / 2]) g.add(at(box(0.2, h, 1.4, '#6f5038'), x, h / 2, 0));
  const cols = ['#c9473a', '#2f6fe0', '#f2c230', '#3aa76d', '#8e5bd6', '#e9e2cf', '#2b2d31'];
  for (let s = 0; s < 4; s++) { let x = -w / 2 + 0.4; while (x < w / 2 - 0.6) { const bw = 0.25 + r() * 0.3, bh = 1.0 + r() * 0.5; g.add(at(box(bw, bh, 1.0, cols[Math.floor(r() * cols.length)]), x + bw / 2, 0.5 + s * (h / 4) + bh / 2, 0.42)); x += bw + 0.05; } }
  return g;
}
export function frame(text, w = 3, h = 2.2, bg = '#cfe3f7') { const g = new THREE.Group(); g.add(box(w + 0.3, h + 0.3, 0.15, '#3a2e28')); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: V.textTex(text, { w: 300, h: Math.round(300 * h / w), bg, fg: '#2a1a12', font: '700 40px Georgia, serif' }) })); p.position.z = 0.09; g.add(p); return g; }
export function windowView(w = 8, h = 5) { const g = new THREE.Group(); g.add(box(w + 0.5, h + 0.5, 0.3, '#f4f1ea')); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: P.canvasTex(512, 320, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7fb2e5'); gr.addColorStop(0.7, '#dcecf7'); gr.addColorStop(0.7, '#8fbf62'); gr.addColorStop(1, '#6fa04f'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = '#4f8a3c'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(40 + i * 85, H * 0.66, 34, 0, 7); c.fill(); } c.fillStyle = '#f1e6d6'; c.fillRect(300, H * 0.45, 90, 70); c.fillStyle = '#7a3b2b'; c.beginPath(); c.moveTo(290, H * 0.45); c.lineTo(345, H * 0.3); c.lineTo(400, H * 0.45); c.fill(); }) })); p.position.z = 0.16; g.add(p); g.add(at(box(0.2, h, 0.2, '#f4f1ea'), 0, 0, 0.2)); return g; }
export function plant(r, s = 1) { const p = new THREE.Group(); p.add(at(box(1.4, 1.6, 1.4, '#e6e0d6'), 0, 0.8, 0)); for (let i = 0; i < 7; i++) { const l = box(0.25, 2.6, 0.05, '#3f8a3c'); l.position.y = 2.2; l.rotation.set((i % 2 - 0.5) * 0.7, i, (i - 3) * 0.15); p.add(l); } p.scale.setScalar(s); return p; }
