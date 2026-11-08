// Low-poly props: umbrellas, towels, lifeguard tower, buildings, palms, chairs, subs, sandwich, phone...
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { causticMaterial, rng } from './env.js';

const M = (color, o = {}) => causticMaterial({ color, roughness: 0.7, ...o });
export const box = (w, h, d, m, r = 0) => {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o;
};
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

export function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// ---------------------------------------------------------------- beach
export function umbrella(r, c1, c2) {
  const g = new THREE.Group();
  const cone = new THREE.ConeGeometry(3.2, 1.1, 10, 1, true).toNonIndexed();
  const cols = []; const a = new THREE.Color(c1), b = new THREE.Color(c2);
  const n = cone.attributes.position.count;
  for (let i = 0; i < n; i++) { const f = Math.floor(i / 6); const c = f % 2 ? a : b; cols.push(c.r, c.g, c.b); }
  cone.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); cone.computeVertexNormals();
  const top = new THREE.Mesh(cone, causticMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide, flatShading: true }));
  top.position.y = 5.6; top.castShadow = true; g.add(top);
  g.add(at(box(0.12, 6, 0.12, M('#eeeeee')), 0, 3, 0));
  g.rotation.z = (r() - 0.5) * 0.18; g.rotation.y = r() * 6;
  return g;
}
export function towel(r, color, stripe) {
  const g = new THREE.Group();
  g.add(at(box(2.2, 0.06, 5, M(color, { roughness: 0.95 })), 0, 0.03, 0));
  g.add(at(box(2.22, 0.07, 0.4, M(stripe, { roughness: 0.95 })), 0, 0.035, 1.6));
  g.add(at(box(2.22, 0.07, 0.4, M(stripe, { roughness: 0.95 })), 0, 0.035, -1.6));
  g.rotation.y = (r() - 0.5) * 0.6;
  return g;
}
export function beachBall(s = 0.6) {
  const g = new THREE.SphereGeometry(s, 12, 8).toNonIndexed();
  const cols = []; const P = ['#ffffff', '#e8423b', '#f6c53a', '#2f7fe0'];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const c = new THREE.Color(P[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 6) % 4]); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, causticMaterial({ vertexColors: true, roughness: 0.4, flatShading: true })); m.castShadow = true; return m;
}
export function lifeguardTower() {
  const g = new THREE.Group();
  const wood = M('#c99a62'), white = M('#f4f1ea'), red = M('#d9412f');
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) g.add(at(box(0.3, 5.2, 0.3, wood), x, 2.6, z));
  g.add(at(box(4.4, 0.3, 4.4, wood), 0, 5.2, 0));
  const hut = at(box(3.6, 3.2, 3.2, white, 0.1), 0, 6.95, -0.4); g.add(hut);
  g.add(at(box(4.0, 0.25, 3.8, red, 0.08), 0, 8.65, -0.4));
  g.add(at(box(3.2, 1.0, 0.1, red), 0, 7.6, 1.22)); // red stripe front
  for (let i = 0; i < 6; i++) { const s = at(box(1.8, 0.12, 0.5, wood), 0, 0.5 + i * 0.85, 2.6 + i * 0.32); g.add(s); }
  g.add(at(box(4.4, 0.12, 0.12, white), 0, 6.2, 2.15)); // rail
  return g;
}
export function palm(r, h = 9) {
  const g = new THREE.Group(); const trunkM = M('#8a6845', { roughness: 0.9 }); let p = g;
  const lean = (r() - 0.5) * 0.12;
  for (let i = 0; i < h; i++) {
    const s = new THREE.Group(); s.position.y = i ? 1.4 : 0; s.rotation.z = lean;
    s.add(at(box(0.7 - i * 0.025, 1.4, 0.7 - i * 0.025, trunkM, 0.1), 0, 0.7, 0)); p.add(s); p = s;
  }
  const top = new THREE.Group(); top.position.y = 1.4; p.add(top);
  const leafM = M('#3f8a3c', { side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const lp = new THREE.Group(); lp.rotation.y = (i / 8) * Math.PI * 2 + r(); let q = lp;
    for (let k = 0; k < 4; k++) { const s = new THREE.Group(); s.position.x = k ? 1.4 : 0; s.rotation.z = -0.25; s.add(at(box(1.5, 0.07, 0.9 - k * 0.17, leafM), 0.75, 0, 0)); q.add(s); q = s; }
    top.add(lp);
  }
  return g;
}
const FACADES = ['#f1d9a8', '#f3b27a', '#e9e2cf', '#d98c5f', '#f6e7b0', '#cfd8d6', '#e8a07a'];
// ---------------------------------------------------------------- buildings (rebuilt)
// Facades tile ONE window bay at a fixed world size (BAY wide × FLOOR tall), so windows are the same size on
// every face of every building and never stretch. Textures are tiny, sharp, mipmapped and shared per colour.
const BAY = 7.2, FLOOR = 9.6; // 2.4 m bays, 3.2 m storeys (3 units = 1 m, people are 5.4 units = 1.8 m)
const TILE_CACHE = new Map();
function bayTexture(color, variant) {
  const key = color + '|' + variant;
  if (TILE_CACHE.has(key)) return TILE_CACHE.get(key);
  const t = canvasTex(64, 72, (g, W, H) => {
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, H - 6, W, 6);                       // floor line
    const wx = 14, wy = 14, ww = 36, wh = 40;
    g.fillStyle = '#f4f1ea'; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);                 // frame
    const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#9fbad0'); gr.addColorStop(0.5, '#4f6a82'); gr.addColorStop(1, '#34495c');
    g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);                                        // glass with sky reflection
    if (variant === 1) { g.fillStyle = '#e9e2cf'; g.fillRect(wx, wy, ww, wh * 0.45); }    // half-drawn blind
    if (variant === 2) { g.fillStyle = 'rgba(255,214,140,.55)'; g.fillRect(wx, wy + wh * 0.3, ww, wh * 0.7); } // warm interior
    g.fillStyle = '#f4f1ea'; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh * 0.42, ww, 3); // mullions
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(wx - 4, wy + wh + 3, ww + 8, 4);          // sill shadow
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  TILE_CACHE.set(key, t); return t;
}
const SHOP_TEX = (() => { let t = null; return () => t || (t = (() => { const x = canvasTex(64, 64, (g, W, H) => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, W, H); const gr = g.createLinearGradient(0, 8, 0, H); gr.addColorStop(0, '#7f9cb4'); gr.addColorStop(1, '#2f4152'); g.fillStyle = gr; g.fillRect(4, 8, W - 8, H - 12); g.fillStyle = '#2b2f36'; g.fillRect(W / 2 - 1.5, 8, 3, H - 12); }); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8; return x; })()); })();
const MAT_CACHE = new Map();
const matFor = (tex, key) => { if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, M('#ffffff', { map: tex, roughness: 0.75 })); return MAT_CACHE.get(key); };
// box geometry whose side-face UVs are in "bays" and "floors" (so a repeating tile keeps a fixed world size)
function tiledBox(w, h, d, bay = BAY, floor = FLOOR) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];             // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / bay, uv.getY(i) * dims[f][1] / floor); }
  return geo;
}
const PLAIN = new Map(); const plain = (c) => { if (!PLAIN.has(c)) PLAIN.set(c, M(c, { roughness: 0.85 })); return PLAIN.get(c); };
export function building(r, w, h, d, color) {
  color = color || FACADES[Math.floor(r() * FACADES.length)];
  // snap the size to whole bays/floors so windows end cleanly at corners and at the roof
  w = Math.max(2, Math.floor(w / BAY)) * BAY; d = Math.max(2, Math.floor(d / BAY)) * BAY;
  const shopH = 12.9, floors = Math.max(2, Math.round((h - shopH) / FLOOR)); h = shopH + floors * FLOOR; // 4.3 m ground floor
  const variant = Math.floor(r() * 3);
  const facade = matFor(bayTexture(color, variant), color + variant), roofM = plain('#d9d4c9');
  const g = new THREE.Group();
  const upper = new THREE.Mesh(tiledBox(w, floors * FLOOR, d), [facade, facade, roofM, roofM, facade, facade]);
  upper.position.y = shopH + floors * FLOOR / 2; upper.castShadow = upper.receiveShadow = true; g.add(upper);
  // ground-floor storefront band + a colour trim band
  const shopM = matFor(SHOP_TEX(), 'shop'), baseM = plain(color);
  const shop = new THREE.Mesh(tiledBox(w - 0.2, shopH, d - 0.2, BAY, shopH), [shopM, shopM, baseM, baseM, shopM, shopM]); shop.position.y = shopH / 2; shop.castShadow = shop.receiveShadow = true; g.add(shop);
  const trim = ['#2f6fe0', '#c9473a', '#3aa76d', '#2b2f36', '#f2b230', '#8e5bd6'][Math.floor(r() * 6)];
  g.add(at(box(w + 0.4, 1.2, d + 0.4, plain(trim)), 0, shopH, 0));
  // roof: parapet + rooftop details
  const par = plain('#e8e1d3');
  g.add(at(box(w + 0.6, 3.0, 0.6, par), 0, h + 1.5, d / 2), at(box(w + 0.6, 3.0, 0.6, par), 0, h + 1.5, -d / 2), at(box(0.6, 3.0, d, par), w / 2, h + 1.5, 0), at(box(0.6, 3.0, d, par), -w / 2, h + 1.5, 0));
  g.add(at(box(w - 0.2, 0.1, d - 0.2, roofM), 0, h + 0.05, 0));
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const kind = r();
    if (kind < 0.4) g.add(at(box(4.8, 3.6, 3.6, plain('#b9bfc6')), (r() - 0.5) * (w - 7), h + 1.8, (r() - 0.5) * (d - 7)));          // AC unit
    else if (kind < 0.7 && h > 60) { const tank = new THREE.Group(); tank.scale.setScalar(2.6); tank.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 10), plain('#8a6a45')), 0, 2.9, 0)); tank.add(at(new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 10), plain('#6b5038')), 0, 4.6, 0)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tank.add(at(box(0.15, 1.6, 0.15, plain('#555')), x, 0.8, z)); tank.position.set((r() - 0.5) * (w - 9), h, (r() - 0.5) * (d - 9)); g.add(tank); }
    else g.add(at(box(w * 0.3, 7.5, d * 0.3, plain('#cfc8bb')), (r() - 0.5) * w * 0.35, h + 3.75, (r() - 0.5) * d * 0.35)); // stair/elevator housing
  }
  g.userData.height = h;
  return g;
}
export function seagull() {
  const g = new THREE.Group(); const w = M('#f5f5f5'), gr = M('#9aa3ab');
  g.add(box(0.9, 0.22, 0.25, w, 0.08));
  const L = new THREE.Group(), R = new THREE.Group();
  L.add(at(box(0.35, 0.04, 1.0, gr), 0, 0, 0.5)); R.add(at(box(0.35, 0.04, 1.0, gr), 0, 0, -0.5));
  g.add(L, R); g.userData.wings = [L, R];
  return g;
}

// ---------------------------------------------------------------- handheld & small props
export function sunglasses() {
  const g = new THREE.Group(); const m = M('#111', { roughness: 0.2, metalness: 0.5 });
  g.add(at(box(0.3, 0.16, 0.05, m, 0.04), -0.17, 0, 0), at(box(0.3, 0.16, 0.05, m, 0.04), 0.17, 0, 0), at(box(0.1, 0.04, 0.04, m), 0, 0.04, 0));
  g.add(at(box(0.03, 0.03, 0.42, m), -0.31, 0.04, -0.2), at(box(0.03, 0.03, 0.42, m), 0.31, 0.04, -0.2));
  return g;
}
export function megaphone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.14, 1.0, 12, 1, true), M('#f2f2f2', { side: THREE.DoubleSide }));
  c.rotation.x = Math.PI / 2; c.position.z = 0.5; g.add(c);
  g.add(at(box(0.12, 0.35, 0.12, M('#d9412f')), 0, -0.15, 0.1));
  return g;
}
export function microphone() {
  const g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.6, 8), M('#222')), 0, 0, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M('#333', { roughness: 0.9 })), 0, 0.36, 0));
  g.add(at(box(0.22, 0.18, 0.22, M('#1f6fd1')), 0, 0.12, 0));
  return g;
}
export function clipboard() {
  const g = new THREE.Group();
  g.add(box(0.6, 0.8, 0.04, M('#b8875a')));
  g.add(at(box(0.5, 0.65, 0.02, M('#fbfbf6')), 0, -0.04, 0.03));
  return g;
}
export function cup(color = '#e9573f') {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.42, 10), M(color)));
  const straw = at(box(0.03, 0.4, 0.03, M('#ffffff')), 0.05, 0.3, 0); straw.rotation.z = -0.2; g.add(straw);
  return g;
}
export function lawnChair(c1 = '#2f86c9', c2 = '#f4f1ea') {
  const g = new THREE.Group(); const al = M('#c9ced3', { metalness: 0.6, roughness: 0.35 });
  // seat + back (reclined) made of alternating webbing strips
  const seat = new THREE.Group(); seat.position.set(0, 1.3, 0); g.add(seat);
  for (let i = 0; i < 5; i++) seat.add(at(box(1.9, 0.06, 0.34, M(i % 2 ? c1 : c2)), 0, 0, -0.75 + i * 0.37));
  const back = new THREE.Group(); back.position.set(0, 1.3, -0.95); back.rotation.x = -0.75; g.add(back);
  for (let i = 0; i < 6; i++) back.add(at(box(1.9, 0.34, 0.06, M(i % 2 ? c1 : c2)), 0, 0.2 + i * 0.37, 0));
  for (const x of [-1, 1]) {
    g.add(at(box(0.08, 1.3, 0.08, al), x, 0.65, 0.8), at(box(0.08, 1.3, 0.08, al), x, 0.65, -0.9));
    g.add(at(box(0.08, 0.08, 1.4, al), x, 1.9, 0.05)); // armrest
    g.add(at(box(0.08, 0.6, 0.08, al), x, 1.6, 0.7));
  }
  return g;
}
export function sandwich() {
  const g = new THREE.Group();
  const parts = {
    bottom: at(box(1.0, 0.18, 0.8, M('#e6b872'), 0.06), 0, 0, 0),
    lettuce: at(box(1.1, 0.06, 0.9, M('#67b84a')), 0, 0.12, 0),
    tomato: at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 10), M('#e04a3a')), -0.2, 0.18, 0),
    tomato2: at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 10), M('#e04a3a')), 0.22, 0.18, 0.05),
    cheese: at(box(0.95, 0.05, 0.75, M('#f4c542')), 0, 0.24, 0),
    ham: at(box(0.9, 0.06, 0.72, M('#e99a9a')), 0, 0.29, 0),
    top: at(box(1.0, 0.2, 0.8, M('#e6b872'), 0.08), 0, 0.42, 0),
  };
  for (const k in parts) { parts[k].userData.home = parts[k].position.clone(); g.add(parts[k]); }
  g.userData.parts = parts;
  return g;
}
export function phone() {
  const g = new THREE.Group();
  g.add(box(0.42, 0.82, 0.06, M('#1c1c1e', { roughness: 0.3 }), 0.05));
  const screenTex = canvasTex(128, 256, (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#4b7bd8'); gr.addColorStop(1, '#a35fd0');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff'; c.font = '600 34px sans-serif'; c.textAlign = 'center'; c.fillText('9:41', W / 2, 62);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { c.fillStyle = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2'][(x + y) % 4]; c.fillRect(14 + x * 38, 110 + y * 40, 26, 26); }
  });
  const scr = at(new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.74), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })), 0, 0, 0.032);
  g.add(scr);
  return g;
}

// ---------------------------------------------------------------- vehicles & future city
export function miniSub(color = '#f2c230') {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3.6, 6, 14), M(color, { roughness: 0.35, metalness: 0.2 }));
  hull.rotation.z = Math.PI / 2; hull.castShadow = true; g.add(hull);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bff3ff', roughness: 0.05, transparent: true, opacity: 0.45, emissive: '#2a7fa0', emissiveIntensity: 0.3 }));
  glass.rotation.z = -Math.PI / 2; glass.position.x = 2.4; g.add(glass);
  g.add(at(box(1.8, 0.9, 1.2, M(color), 0.3), -0.2, 1.65, 0)); // hatch tower
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14), M('#555', { metalness: 0.6 })), -0.2, 2.15, 0));
  for (const s of [-1, 1]) { const f = at(box(1.4, 0.12, 1.2, M('#333')), -3.2, 0, s * 1.0); g.add(f); }
  g.add(at(box(0.9, 1.2, 0.12, M('#333')), -3.3, 0.5, 0));
  const prop = new THREE.Group(); prop.position.x = -3.95; g.add(prop);
  for (let i = 0; i < 3; i++) { const b = box(0.08, 0.9, 0.25, M('#888', { metalness: 0.7 })); b.rotation.x = (i / 3) * Math.PI * 2; b.position.y = 0; const p2 = new THREE.Group(); p2.rotation.x = (i / 3) * Math.PI * 2; b.position.y = 0.35; p2.add(b); prop.add(p2); }
  for (const s of [-0.7, 0.7]) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff6d8' })), 3.1, -0.6, s));
  g.userData.prop = prop;
  return g;
}
export function crane(h = 40, jib = 26) {
  const g = new THREE.Group(); const y = M('#f2b230', { metalness: 0.3, roughness: 0.5 });
  const mast = new THREE.Group(); g.add(mast);
  for (let i = 0; i < h / 2; i++) {
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) mast.add(at(box(0.15, 2, 0.15, y), x, i * 2 + 1, z));
    const d = at(box(0.1, 0.1, 1.7, y), 0.6, i * 2 + 1, 0); d.rotation.x = 0.8; mast.add(d);
    const d2 = at(box(1.7, 0.1, 0.1, y), 0, i * 2 + 1, 0.6); d2.rotation.z = 0.8; mast.add(d2);
  }
  const top = new THREE.Group(); top.position.y = h; g.add(top);
  top.add(at(box(jib, 0.9, 1.0, y), jib / 2 - 5, 0.5, 0));
  top.add(at(box(2, 2, 2, M('#e9e4da')), -1, -0.5, 0));
  const cable = at(box(0.06, 12, 0.06, M('#333')), jib - 8, -6, 0); top.add(cable);
  const load = at(box(5, 1.2, 1.2, M('#9aa3ab')), jib - 8, -12.5, 0); top.add(load);
  g.userData.top = top; g.userData.load = load; g.userData.cable = cable;
  return g;
}
export function routeMarkers(curve, n = 30, color = '#7ff6ff') {
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color });
  const geo = new THREE.SphereGeometry(0.35, 8, 6);
  for (let i = 0; i < n; i++) { const o = new THREE.Mesh(geo, m); o.position.copy(curve.getPointAt(i / n)); g.add(o); }
  return g;
}

// pod house with an open front (door + window gaps) when `open` is true
export function podHouse(r, { color = '#e9eef0', accent = '#2fb3c9', open = false } = {}) {
  const g = new THREE.Group();
  const wall = M(color, { roughness: 0.6 }), trim = M(accent, { roughness: 0.5 });
  const W = 11, H = 7, D = 10;
  if (!open) {
    g.add(at(box(W, H, D, wall, 1.4), 0, H / 2, 0));
  } else {
    // shell without the front face, plus a front wall assembled around openings
    g.add(at(box(W, H, 0.5, wall, 0.2), 0, H / 2, -D / 2 + 0.25));
    g.add(at(box(0.5, H, D, wall, 0.2), -W / 2 + 0.25, H / 2, 0), at(box(0.5, H, D, wall, 0.2), W / 2 - 0.25, H / 2, 0));
    g.add(at(box(W, 0.5, D, wall, 0.2), 0, H - 0.25, 0), at(box(W, 0.4, D, M('#b48a5f')), 0, 0.2, 0));
    const fz = D / 2 - 0.25;
    // openings: door x∈[-3.9,-1.1] y∈[0,5]; window x∈[1.4,4.0] y∈[2.6,5.2]
    g.add(at(box(1.6, H, 0.5, wall, 0.1), -4.7, H / 2, fz));        // left of door
    g.add(at(box(2.5, H, 0.5, wall, 0.1), 0.15, H / 2, fz));           // between door & window
    g.add(at(box(1.5, H, 0.5, wall, 0.1), 4.75, H / 2, fz));         // right of window
    g.add(at(box(2.8, H - 5, 0.5, wall, 0.1), -2.5, 5 + (H - 5) / 2, fz)); // above door
    g.add(at(box(2.6, 2.6, 0.5, wall, 0.1), 2.7, 1.3, fz));            // below window
    g.add(at(box(2.6, H - 5.2, 0.5, wall, 0.1), 2.7, 5.2 + (H - 5.2) / 2, fz)); // above window
    // interior: warm light, a lamp, a plant, a picture
    const lamp = new THREE.PointLight('#ffcf8f', 30, 14, 2); lamp.position.set(0, 5.6, 0); g.add(lamp);
    g.add(at(box(2.4, 1.2, 1.4, M('#7a4f8f')), -2.5, 1.0, -3.5), at(box(1.4, 1.6, 0.2, M('#f0d48a')), 2.5, 4.2, -4.6));
  }
  // dome roof + porthole trim
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), M(accent, { roughness: 0.4 }));
  dome.scale.set(1.2, 0.55, 1.1); dome.position.y = H - 0.2; dome.castShadow = true; g.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.18, 6, 20), trim); ring.position.set(2.7, 3.9, D / 2 + 0.05); g.add(ring);
  if (!open) {
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), new THREE.MeshBasicMaterial({ color: '#ffd796' })); glow.position.set(2.7, 3.9, D / 2 + 0.02); g.add(glow);
    g.add(at(box(2.6, 4.8, 0.2, trim, 0.1), -2.5, 2.4, D / 2 + 0.02));
  } else {
    const glass = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), new THREE.MeshStandardMaterial({ color: '#cff6ff', transparent: true, opacity: 0.18, roughness: 0.05 }));
    glass.position.set(2.7, 3.9, D / 2 + 0.03); g.add(glass);
    const door = at(box(2.7, 4.9, 0.25, trim, 0.1), -2.5, 2.45, D / 2 + 0.15); g.add(door); g.userData.door = door;
  }
  // mailbox + coral front garden
  g.add(at(box(0.25, 2.2, 0.25, M('#444')), 5.8, 1.1, D / 2 + 3), at(box(0.8, 0.6, 1.0, M(accent), 0.1), 5.8, 2.4, D / 2 + 3));
  return g;
}
