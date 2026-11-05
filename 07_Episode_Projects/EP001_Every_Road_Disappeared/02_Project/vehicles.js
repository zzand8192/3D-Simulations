// Blocky vehicles and street furniture. Vehicles face +z; their origin is on the ground under the centre.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { causticMaterial } from './env.js';

const MC = new Map();
export const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, causticMaterial({ color: c, roughness: 0.6, ...o })); return MC.get(k); };
export const B = (w, h, d, m, r = 0) => { const o = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
export const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const GLASS = () => M('#25323f', { roughness: 0.15, metalness: 0.5 });
const glow = (c) => new THREE.MeshBasicMaterial({ color: c });
export function textTex(text, { w = 512, h = 128, bg = '#ffffff', fg = '#111111', font = '700 64px Arial, sans-serif', border = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = String(text).split('\n'); lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * parseInt(font.match(/(\d+)px/)[1]) * 1.1));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function wheel(r = 1.05, w = 0.8) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), M('#1d1e21', { roughness: 0.9 })); tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 8), M('#b8bec5', { metalness: 0.6, roughness: 0.3 })); hub.rotation.z = Math.PI / 2; g.add(hub);
  for (let i = 0; i < 4; i++) { const sp = B(w + 0.06, r * 0.9, 0.12, M('#8b9199', { metalness: 0.6 })); sp.rotation.x = (i / 4) * Math.PI; g.add(sp); }
  return g;
}
function addWheels(g, xs, zs, r, w) { const ws = []; for (const x of xs) for (const z of zs) { const wh = wheel(r, w); wh.position.set(x, r, z); g.add(wh); ws.push(wh); } g.userData.wheels = ws; g.userData.wheelR = r; }

// ---------------------------------------------------------------- cars
export function car(color = '#c0392b', kind = 'sedan') {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); g.userData.body = body;
  const L = kind === 'suv' ? 11.5 : 10.6, W = 5.0, tall = kind === 'suv' ? 0.4 : 0;
  body.add(at(B(W, 1.7 + tall, L, M(color, { roughness: 0.35, metalness: 0.25 }), 0.35), 0, 1.75 + tall / 2, 0));
  body.add(at(B(W - 0.6, 1.5 + tall * 0.5, kind === 'hatch' ? 6.2 : 5.6, GLASS(), 0.3), 0, 3.25 + tall, kind === 'hatch' ? -1.2 : -0.6));
  body.add(at(B(W - 0.4, 0.26, kind === 'hatch' ? 5.6 : 5.0, M(color, { roughness: 0.35, metalness: 0.25 }), 0.1), 0, 4.05 + tall * 1.25, kind === 'hatch' ? -1.3 : -0.6));
  for (const z of [L / 2 - 0.05, -L / 2 + 0.05]) body.add(at(B(W + 0.1, 0.5, 0.35, M('#2b2d31')), 0, 1.1, z));
  for (const x of [-1.6, 1.6]) { body.add(at(B(0.9, 0.4, 0.1, glow('#fff6d8')), x, 2.15, L / 2 + 0.02)); body.add(at(B(0.9, 0.35, 0.1, glow('#e0302a')), x, 2.15, -L / 2 - 0.02)); }
  if (kind === 'taxi') { body.add(at(B(1.8, 0.5, 0.9, M('#f7f3e3'), 0.1), 0, 4.45, -0.6)); body.add(at(B(W + 0.05, 0.25, L - 1, M('#1b1b1b')), 0, 2.2, 0)); }
  addWheels(g, [-W / 2 + 0.25, W / 2 - 0.25], [L / 2 - 2.0, -L / 2 + 2.0], 1.05, 0.8);
  for (const w of g.userData.wheels) body.parent.add(w);
  g.userData.len = L;
  return g;
}
export function ambulance() {
  const g = car('#f4f4f4', 'suv'); g.scale.set(1.05, 1.15, 1.25);
  const bar = new THREE.Group(); bar.position.set(0, 4.7, -0.6); g.userData.body.add(bar);
  const red = glow('#ff2a2a'), blue = glow('#2a6bff');
  const a = at(B(1.2, 0.35, 0.6, red), -0.8, 0, 0), b = at(B(1.2, 0.35, 0.6, blue), 0.8, 0, 0); bar.add(a, b);
  g.userData.body.add(at(B(5.1, 0.45, 10, M('#d9412f')), 0, 2.4, 0));
  g.userData.lights = [a, b];
  return g;
}
export function flash(v, t, ph = 0) { if (!v.userData.lights) return; const on = Math.floor(t * 6 + ph) % 2; v.userData.lights[0].visible = !!on; v.userData.lights[1].visible = !on; }
export function boxTruck(color = '#f2f2f2', cab = '#2f6fe0') {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); g.userData.body = body;
  body.add(at(B(5.4, 6.2, 13, M(color, { roughness: 0.5 }), 0.2), 0, 4.6, -2.6));
  body.add(at(B(5.2, 3.0, 4.6, M(cab, { roughness: 0.35, metalness: 0.2 }), 0.35), 0, 2.6, 6.2));
  body.add(at(B(4.8, 1.6, 2.6, GLASS(), 0.2), 0, 4.6, 6.5));
  body.add(at(B(5.2, 0.6, 18.6, M('#2b2d31')), 0, 1.2, -0.4));
  for (const x of [-1.7, 1.7]) body.add(at(B(0.9, 0.4, 0.1, glow('#fff6d8')), x, 2.0, 8.52));
  addWheels(g, [-2.35, 2.35], [6.0, -4.5, -7.6], 1.15, 0.9);
  g.userData.len = 19; return g;
}
export function bus(color = '#2f6fe0', double = false) {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); g.userData.body = body;
  const H = double ? 9.6 : 5.8;
  body.add(at(B(5.6, H, 26, M(color, { roughness: 0.4, metalness: 0.15 }), 0.4), 0, 1.2 + H / 2, 0));
  body.add(at(B(5.7, 1.5, 24, GLASS()), 0, 4.3, -0.6));
  if (double) body.add(at(B(5.7, 1.5, 24.6, GLASS()), 0, 8.4, 0));
  body.add(at(B(5.0, 2.6, 0.1, GLASS()), 0, 4.0, 13.02));
  body.add(at(B(5.62, 0.5, 26.02, M('#f2f2f2')), 0, double ? 6.3 : 2.4, 0));
  addWheels(g, [-2.55, 2.55], [8.5, -8.0], 1.2, 0.9);
  g.userData.len = 26; return g;
}
export function bicycle(color = '#e8423b') {
  const g = new THREE.Group(); const m = M(color, { metalness: 0.4, roughness: 0.4 });
  for (const z of [-1.7, 1.7]) { const w = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 6, 20), M('#1d1e21')); w.rotation.y = Math.PI / 2; w.position.set(0, 1.0, z); g.add(w); }
  const f1 = at(B(0.14, 0.14, 3.0, m), 0, 2.0, 0); g.add(f1); const f2 = at(B(0.14, 1.4, 0.14, m), 0, 1.5, -0.6); f2.rotation.x = 0.3; g.add(f2);
  const f3 = at(B(0.14, 1.5, 0.14, m), 0, 1.6, 1.4); f3.rotation.x = -0.3; g.add(f3);
  g.add(at(B(0.5, 0.15, 0.8, M('#222')), 0, 2.45, -0.8), at(B(1.6, 0.12, 0.12, M('#333')), 0, 2.6, 1.7));
  return g;
}
export function trafficLight(span = 9) { // pole on the corner with an arm over the road, and three lamps facing +z
  const g = new THREE.Group(); const pm = M('#3b4248', { metalness: 0.5, roughness: 0.5 });
  g.add(at(B(0.45, 11, 0.45, pm), 0, 5.5, 0)); g.add(at(B(span, 0.35, 0.35, pm), span / 2, 10.6, 0));
  const head = new THREE.Group(); head.position.set(span - 0.8, 9.0, 0); g.add(head);
  head.add(B(1.2, 3.4, 1.0, M('#26292d'), 0.15));
  const cols = ['#ff3b30', '#ffcc00', '#34c759'], lamps = [];
  cols.forEach((c, i) => { const on = glow(c), off = M('#3a3d41'); const l = at(new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), off), 0, 1.05 - i * 1.05, 0.52); l.userData = { on, off }; head.add(l); lamps.push(l); });
  const head2 = head.clone(); head2.position.set(0.5, 7.2, 0.4); head2.rotation.y = Math.PI / 2; g.add(head2);
  const lamps2 = head2.children.slice(1);
  g.userData.set = (state) => { // 0 red 1 yellow 2 green
    lamps.forEach((l, i) => { l.material = i === state ? l.userData.on : l.userData.off; });
    lamps2.forEach((l, i) => { const s2 = state === 2 ? 0 : 2; l.material = i === s2 ? lamps[i].userData.on : lamps[i].userData.off; });
  };
  g.userData.set(2);
  return g;
}
export const lightCycle = (t, ph = 0) => { const c = (t + ph) % 12; return c < 6 ? 2 : c < 8 ? 1 : 0; };
export function streetLamp() { const g = new THREE.Group(); const pm = M('#3b4248', { metalness: 0.5 }); g.add(at(B(0.3, 9, 0.3, pm), 0, 4.5, 0), at(B(2.4, 0.25, 0.25, pm), 1.1, 9, 0), at(B(1.0, 0.3, 0.6, glow('#fff1cf')), 2.2, 8.8, 0)); return g; }
export function cone() { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 10), M('#ff7a1a')); c.position.y = 0.7; c.castShadow = true; g.add(c, at(B(1.0, 0.12, 1.0, M('#ff7a1a')), 0, 0.06, 0), at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.2, 10), M('#f4f4f4')), 0, 0.8, 0)); return g; }
export function barrier(w = 6, sign = null) {
  const g = new THREE.Group(); const legM = M('#d9d9d9');
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) { const a = at(B(0.2, 3.4, 0.2, legM), x, 1.6, 0.4); a.rotation.x = -0.2; const b = at(B(0.2, 3.4, 0.2, legM), x, 1.6, -0.4); b.rotation.x = 0.2; g.add(a, b); }
  const stripe = textTex('', { w: 512, h: 64, bg: '#ffffff' }); { const c = stripe.image, x = c.getContext('2d'); x.fillStyle = '#ff6a00'; for (let i = -2; i < 16; i++) { x.beginPath(); x.moveTo(i * 40, 64); x.lineTo(i * 40 + 20, 64); x.lineTo(i * 40 + 44, 0); x.lineTo(i * 40 + 24, 0); x.fill(); } stripe.needsUpdate = true; }
  for (const y of [1.6, 2.8]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, 0.12), M('#ffffff', { map: stripe })), 0, y, 0));
  if (sign) { const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 2.2, 0.1), [M('#fff'), M('#fff'), M('#fff'), M('#fff'), M('#ffffff', { map: textTex(sign, { w: 768, h: 256, bg: '#ffffff', fg: '#111', font: '800 72px Arial, sans-serif', border: '#111' }) }), M('#fff')]); s.position.set(0, 4.5, 0.08); s.castShadow = true; g.add(s); g.add(at(B(0.2, 1.4, 0.2, legM), 0, 3.4, 0)); }
  return g;
}
export function signPost(text, { w = 4, h = 2.2, bg = '#1f6f3c', fg = '#ffffff', height = 8 } = {}) {
  const g = new THREE.Group(); g.add(at(B(0.25, height, 0.25, M('#7d858c', { metalness: 0.5 })), 0, height / 2, 0));
  const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [M(bg), M(bg), M(bg), M(bg), M('#ffffff', { map: textTex(text, { w: 512, h: Math.round(512 * h / w), bg, fg, font: '700 56px Arial, sans-serif' }) }), M(bg)]);
  s.position.set(0, height - h / 2, 0.15); s.castShadow = true; g.add(s); return g;
}

// ---------------------------------------------------------------- aircraft, trains, machines
export function helicopter() {
  const g = new THREE.Group(); const w = M('#f4f4f4', { roughness: 0.4 }), r = M('#d9412f');
  g.add(at(B(5, 4.2, 9, w, 1.6), 0, 3.6, 0), at(B(4.4, 2.2, 3.5, GLASS(), 0.8), 0, 4.1, 3.6), at(B(5.05, 0.7, 8.4, r), 0, 3.0, 0));
  g.add(at(B(1.0, 1.2, 9, w, 0.3), 0, 4.4, -8.6), at(B(0.3, 2.6, 1.6, r), 0, 5.4, -12.8));
  for (const x of [-2.2, 2.2]) g.add(at(B(0.3, 0.3, 9, M('#555')), x, 0.3, 0.5));
  const rotor = new THREE.Group(); rotor.position.y = 6.2; g.add(rotor); g.add(at(B(0.6, 0.8, 0.6, M('#333')), 0, 5.9, 0));
  for (let i = 0; i < 4; i++) { const b = B(0.9, 0.12, 14, M('#2b2d31')); const p = new THREE.Group(); p.rotation.y = (i / 4) * Math.PI; p.add(b); rotor.add(p); }
  const tr = new THREE.Group(); tr.position.set(0.3, 5.6, -12.9); g.add(tr); for (let i = 0; i < 2; i++) { const b = B(0.08, 3.4, 0.4, M('#2b2d31')); b.rotation.x = i * Math.PI / 2; tr.add(b); }
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: textTex('+', { w: 128, h: 128, bg: '#ffffff', fg: '#d9412f', font: '900 120px Arial' }) })); cross.position.set(2.53, 4.6, -1.5); cross.rotation.y = Math.PI / 2; g.add(cross);
  g.userData.rotor = rotor; g.userData.tail = tr; return g;
}
export function airplane(stripe = '#2f6fe0') {
  const g = new THREE.Group(); const w = M('#f4f6f8', { roughness: 0.35 });
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(3, 44, 8, 16), w); fus.rotation.x = Math.PI / 2; fus.position.y = 6; fus.castShadow = true; g.add(fus);
  g.add(at(B(6.1, 0.8, 44, M(stripe)), 0, 6.4, 0));
  g.add(at(B(52, 0.6, 9, w, 0.2), 0, 4.8, 2), at(B(18, 0.4, 5, w, 0.1), 0, 7, -22), at(B(0.6, 9, 7, M(stripe), 0.2), 0, 11, -22));
  for (const x of [-10, 10]) g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.4, 6, 14), M('#c9ced3', { metalness: 0.4 })), x, 3.3, 4).rotateX(Math.PI / 2));
  for (const [x, z] of [[0, 18], [-4, 0], [4, 0]]) g.add(at(B(0.5, 2.2, 0.5, M('#555')), x, 1.2, z), at(wheel(0.7, 0.6), x, 0, z));
  for (let i = 0; i < 16; i++) for (const x of [-3.02, 3.02]) g.add(at(B(0.05, 0.6, 0.8, GLASS()), x, 7.0, -16 + i * 2.2));
  return g;
}
export function train(n = 4, color = '#c9ced3', stripe = '#2f6fe0') { // runs along +z, cars 22 long
  const g = new THREE.Group(); const cars = [];
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group(); c.position.z = -i * 23;
    c.add(at(B(5.6, 6.4, 22, M(color, { metalness: 0.4, roughness: 0.35 }), 0.5), 0, 4.6, 0));
    c.add(at(B(5.7, 1.8, 20, GLASS()), 0, 5.4, 0), at(B(5.66, 0.6, 22.02, M(stripe)), 0, 3.4, 0));
    for (const z of [-7, 7]) c.add(at(B(4.4, 1.2, 4, M('#2b2d31')), 0, 1.0, z));
    if (i === 0) c.add(at(B(5.0, 3.2, 0.2, GLASS()), 0, 5.6, 11.05));
    g.add(c); cars.push(c);
  }
  g.userData.len = n * 23; return g;
}
export function paver() {
  const g = new THREE.Group(); const y = M('#f2b230', { roughness: 0.5 });
  g.add(at(B(9, 3, 7, y, 0.3), 0, 2.6, 0), at(B(10, 1.0, 3, M('#2b2d31')), 0, 0.9, -4.5), at(B(3.2, 3, 3.6, GLASS(), 0.2), 2, 5.5, 1), at(B(3.6, 0.3, 4, y), 2, 7.1, 1));
  for (const x of [-3.8, 3.8]) g.add(at(B(1.4, 1.6, 7.4, M('#2b2d31'), 0.4), x, 0.8, 0.5));
  return g;
}
export function roller() {
  const g = new THREE.Group(); const y = M('#f2b230', { roughness: 0.5 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 6.4, 18), M('#8a9097', { metalness: 0.6 })); drum.rotation.z = Math.PI / 2; drum.position.set(0, 1.7, 3.2); g.add(drum);
  g.add(at(B(5.6, 2.6, 5.5, y, 0.3), 0, 2.4, -1.5), at(B(3.0, 2.6, 2.6, GLASS(), 0.2), 0, 4.9, -1.6), at(B(3.4, 0.3, 3, y), 0, 6.3, -1.6));
  g.userData.drum = drum; return g;
}
export function utilityCart(color = '#3aa76d') { const g = car(color, 'hatch'); g.scale.set(0.6, 0.65, 0.55); return g; }
export function barge() {
  const g = new THREE.Group(); g.add(at(B(14, 2.6, 46, M('#7a3b2b', { roughness: 0.6 }), 0.4), 0, 0.6, 0), at(B(6, 4, 6, M('#f2f2f2'), 0.3), 0, 3.6, -18));
  const cols = ['#2f6fe0', '#e8423b', '#3aa76d', '#f2b230', '#8e5bd6'];
  for (let i = 0; i < 12; i++) g.add(at(B(5.6, 2.6, 10, M(cols[i % 5], { roughness: 0.7 })), i % 2 ? 3 : -3, 3.3 + Math.floor(i / 8) * 2.6, -8 + (Math.floor(i / 2) % 4) * 10.5));
  return g;
}
export function suitcase(color = '#2f4f8c') { const g = new THREE.Group(); g.add(at(B(1.4, 1.9, 0.8, M(color, { roughness: 0.4 }), 0.15), 0, 0.95, 0), at(B(0.6, 1.0, 0.12, M('#333')), 0, 2.3, 0)); return g; }

// ---------------------------------------------------------------- vehicle helpers
export function spinWheels(v, dist) { const r = v.userData.wheelR || 1; for (const w of v.userData.wheels || []) w.rotation.x = dist / r; }
// motion along a lane until the road vanishes at tv, then a short skid to a stop
export function laneTravel(t, tv, speed, tau = 0.22) { if (t <= tv) return speed * t; const d = t - tv; return speed * tv + speed * tau * (1 - Math.exp(-d / tau)); }
