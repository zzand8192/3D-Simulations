// EP002 sets: cat CEO office, lion press conference, Australian zoo (Greg), dog park, pet store, vet,
// redesigned city extras, living room. Plus a dynamic leash and the episode cast.
import * as THREE from 'three';
import { rng, causticMaterial, gradientDome } from './env.js';
import { makeCharacter, motion, mergePose, GREG } from './character.js';
import { makeAnimal, addCollar } from './animals.js';
import * as V from './vehicles.js';
import * as P from './props.js';
import { randomPerson, person, envFrom, sun, tree } from './scenes_city.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const CM = (c, o = {}) => causticMaterial({ color: c, roughness: 0.7, ...o });
const put = (scene, ch, x, y, z, ry = 0) => { ch.root.position.set(x, y, z); ch.root.rotation.y = ry; scene.add(ch.root); return ch; };

// ---------------------------------------------------------------- cast
export const HUMANS = {
  tom: { name: 'tom', skin: '#e0ac7e', hair: '#5b3a22', hairStyle: 'short', top: { kind: 'tee', color: '#3a7bd5', trim: '#f0a03a' }, bottom: { color: '#2b3a55' } },
  kevin: { name: 'kevin', skin: '#c68e6a', hair: '#1a120c', hairStyle: 'short', top: { kind: 'long', color: '#f2f2f2', trim: '#f2f2f2' }, tie: '#2f6fe0', bottom: { color: '#3a3f4a' }, shoes: '#2a2c31' },
  stopped: { name: 'stopped', skin: '#f1c9a5', hair: '#7a4a22', hairStyle: 'ponytail', lips: true, top: { kind: 'tee', color: '#e94f6a', trim: '#ffffff' }, bottom: { color: '#2b3a55' } },
  patient: { name: 'patient', skin: '#a86f4c', hair: '#140d09', hairStyle: 'curly', beard: '#140d09', top: { kind: 'tee', color: '#f4c542', trim: '#ffffff' }, bottom: { color: '#4a4f57' } },
};
export const animal = {
  biscuit: () => makeAnimal('dog', 'none', { name: 'biscuit' }),
  police: () => makeAnimal('shepherd', 'police', { name: 'police' }),
  ceo: () => makeAnimal('cat', 'suit', { name: 'ceo' }),
  lion: () => makeAnimal('lion', 'leader', { name: 'lion' }),
  anchor: () => makeAnimal('fox', 'anchor', { name: 'anchor' }),
  keeper: () => makeAnimal('kangaroo', 'zookeeper', { name: 'keeper' }),
  vet: () => makeAnimal('ginger', 'vet', { name: 'vet' }),
  shopper: () => makeAnimal('cat', 'hoodie', { name: 'shopper' }),
  parkdog: () => makeAnimal('dog', 'casual', { name: 'parkdog', kind: { fur: '#3a2a22', fur2: '#8a6a50', earC: '#2a1c14' } }),
};
const CROWD_KINDS = [['dog', 'casual'], ['cat', 'suit'], ['bear', 'casual'], ['rabbit', 'hoodie'], ['pig', 'farmer'], ['fox', 'casual'], ['panda', 'none'], ['monkey', 'casual'], ['ginger', 'hoodie'], ['shepherd', 'police'], ['cow', 'farmer'], ['elephant', 'none'], ['lion', 'suit']];
const TOPS = ['#3aa76d', '#e94f6a', '#f4c542', '#2f6fe0', '#8e5bd6', '#ef7b2d', '#27b3c9', '#f2f2f2'];
export function randomAnimal(r, i = 0) {
  const [k, o] = CROWD_KINDS[Math.floor(r() * CROWD_KINDS.length)];
  const extra = o === 'casual' || o === 'hoodie' ? { spec: { top: { kind: o === 'hoodie' ? 'hoodie' : 'tee', color: TOPS[Math.floor(r() * TOPS.length)], trim: '#ffffff' } } } : {};
  return makeAnimal(k, o, extra);
}
// crowd factory: mostly animals, a few confused humans with collars
export const mixedCrowd = (share = 0.8) => (r, i) => (r() < share ? randomAnimal(r, i) : (() => { const h = makeCharacter(randomPerson(r)); if (r() < 0.6) addCollar(h, ['#c9473a', '#2f6fe0', '#3aa76d'][Math.floor(r() * 3)]); return h; })());

// ---------------------------------------------------------------- leash: a sagging chain between two Object3Ds
export function makeLeash(scene, color = '#c9473a', n = 18) {
  const g = new THREE.Group(); scene.add(g);
  const geo = new THREE.BoxGeometry(0.07, 0.07, 1), m = CM(color, { roughness: 0.5 });
  const segs = []; for (let i = 0; i < n; i++) { const s = new THREE.Mesh(geo, m); s.castShadow = true; g.add(s); segs.push(s); }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Vector3();
  g.userData.update = (fromObj, toObj, sag = 0.8, fromOff = v3(0, -0.2, 0), toOff = v3(0, 0, 0)) => {
    fromObj.updateWorldMatrix(true, false); toObj.updateWorldMatrix(true, false);
    a.copy(fromOff).applyMatrix4(fromObj.matrixWorld); b.copy(toOff).applyMatrix4(toObj.matrixWorld);
    const pt = (u, out) => out.copy(a).lerp(b, u).add(v3(0, -sag * 4 * u * (1 - u), 0));
    for (let i = 0; i < n; i++) { pt(i / n, p); pt((i + 1) / n, q); const s = segs[i]; s.position.copy(p).add(q).multiplyScalar(0.5); s.lookAt(q); s.scale.z = p.distanceTo(q) + 0.02; }
  };
  return g;
}

function outdoor(renderer, { top = '#3d7cc4', mid = '#d4e8f4', bottom = '#9fb08a', sunDir = v3(0.5, 0.7, 0.6), area = 60, fog = 300, sunColor = '#fff2dc', k = 2.8 } = {}) {
  const scene = new THREE.Scene();
  scene.add(gradientDome({ top, mid, bottom, sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top, mid, bottom })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog(mid, fog * 0.4, fog * 2);
  const key = sun(scene, sunColor, k, sunDir, v3(0, 0, 0), area); scene.add(new THREE.HemisphereLight('#cfe3f7', '#7f8f60', 1.0));
  return { scene, key };
}
function interior(renderer, { wall = '#efe6d8', floor = '#9a7a5a', w = 40, d = 30, h = 14 } = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe3e6');
  scene.environment = envFrom(renderer, gradientDome({ top: '#ffffff', mid: '#efe9e0', bottom: '#9a8a7a' })); scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight('#fff6ea', '#8a7a6a', 1.3));
  const d1 = new THREE.DirectionalLight('#fff3e0', 1.3); d1.position.set(8, 20, 14); d1.castShadow = true; d1.shadow.mapSize.set(2048, 2048); Object.assign(d1.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25 }); scene.add(d1);
  const wm = CM(wall, { roughness: 0.9, side: THREE.BackSide }), fm = CM(floor, { roughness: 0.7, side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [wm, wm, wm, fm, wm, wm]); room.position.y = h / 2; room.receiveShadow = true; scene.add(room);
  return scene;
}

// ============================================================= CAT CEO OFFICE
export function buildOffice(renderer) {
  const scene = interior(renderer, { wall: '#e9e4dc', floor: '#6f5a48', w: 44, d: 30, h: 16 });
  // window wall with skyline
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 13), new THREE.MeshBasicMaterial({ map: P.canvasTex(1024, 340, (g, W, Hh) => { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#7fb2e5'); gr.addColorStop(1, '#dcecf7'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); const rr = rng(4); for (let i = 0; i < 40; i++) { const bw = 20 + rr() * 50, bh = 60 + rr() * 220, x = rr() * W; g.fillStyle = ['#9fb3c6', '#b8c6d2', '#8ea3b7'][i % 3]; g.fillRect(x, Hh - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = Hh - bh + 6; y < Hh - 4; y += 10) for (let xx = x + 4; xx < x + bw - 4; xx += 8) g.fillRect(xx, y, 4, 5); } }) }));
  sky.position.set(0, 7.5, -14.9); scene.add(sky);
  for (let x = -20; x <= 20; x += 5) scene.add(V.at(V.B(0.4, 14, 0.4, CM('#3a3f46')), x, 7, -14.6));
  const desk = new THREE.Group(); desk.position.set(0, 0, -6); scene.add(desk);
  desk.add(V.at(V.B(10, 0.4, 4, CM('#4a3426', { roughness: 0.4 })), 0, 3.3, 0), V.at(V.B(9.6, 3.1, 3.6, CM('#3a281e')), 0, 1.55, 0));
  desk.add(V.at(V.B(2.6, 1.6, 0.15, CM('#1b1f24')), -2.5, 4.5, -1.0), V.at(V.B(2.4, 1.4, 0.05, new THREE.MeshBasicMaterial({ color: '#8fc8ff' })), -2.5, 4.5, -0.9));
  const plate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.4), [CM('#c9a227'), CM('#c9a227'), CM('#c9a227'), CM('#c9a227'), CM('#fff', { map: V.textTex('CEO', { w: 256, h: 64, bg: '#c9a227', fg: '#1a1a1a', font: '700 44px Georgia, serif' }) }), CM('#c9a227')]); plate.position.set(2.6, 3.75, 1.2); desk.add(plate);
  const mug = new THREE.Group(); mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.7, 14), CM('#f2f2f2'))); mug.children[0].castShadow = true; scene.add(mug);
  const chair = V.at(V.B(3, 4.5, 0.6, CM('#1b1b1b'), 0.3), 0, 3.6, -9.2); scene.add(chair);
  const ceo = put(scene, animal.ceo(), 0, 0.85, -8.4, 0);
  const kevin = put(scene, makeCharacter(HUMANS.kevin), 3.4, 0, -1.4, -2.6);
  const papers = V.at(V.B(1.2, 0.08, 1.6, CM('#fafafa')), 3.4, 0, -1.4); scene.add(papers); papers.visible = false;
  for (const x of [-16, 16]) { const p = new THREE.Group(); p.add(V.at(V.B(1.6, 2, 1.6, CM('#e9e4dc')), 0, 1, 0)); for (let i = 0; i < 5; i++) { const l = V.B(0.2, 3, 0.05, CM('#3f8a3c')); l.position.y = 3.2; l.rotation.set((i % 2 - 0.5) * 0.6, i, (i - 2) * 0.15); p.add(l); } p.position.set(x, 0, -12); scene.add(p); }
  Object.assign(scene.userData, { actors: { ceo, kevin }, mug, exposure: 0.95, caustic: 0, update() {} });
  return scene;
}

// ============================================================= LION PRESS CONFERENCE
export function buildPodium(renderer) {
  const { scene } = outdoor(renderer, { sunDir: v3(-0.4, 0.75, 0.6) });
  const r = rng(12);
  scene.add(V.at(V.B(300, 1, 300, CM('#c4c0b8')), 0, -0.5, 0));
  const stone = CM('#e9e4d8', { roughness: 0.9 });
  for (let i = 0; i < 4; i++) scene.add(V.at(V.B(70, 0.8, 4, stone), 0, 0.4 + i * 0.8, -12 - i * 4));
  const hall = new THREE.Group(); hall.position.set(0, 3.2, -40); scene.add(hall);
  hall.add(V.at(V.B(76, 26, 20, stone), 0, 13, 0), V.at(new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 3, 3, 1, false, Math.PI / 2, Math.PI), stone), 0, 27.5, 10).rotateY(0));
  for (let x = -30; x <= 30; x += 7.5) hall.add(V.at(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 22, 14), stone), x, 11, 11.5));
  const pedi = new THREE.Mesh(new THREE.ConeGeometry(42, 9, 3, 1), stone); pedi.rotation.set(0, Math.PI / 2, 0); pedi.scale.set(0.35, 1, 1); pedi.position.set(0, 30, 12); hall.add(pedi);
  for (const [x, c] of [[-12, '#2f6fe0'], [12, '#d9412f'], [-20, '#3aa76d'], [20, '#f2c230']]) { const f = new THREE.Group(); f.add(V.at(V.B(0.3, 12, 0.3, CM('#d9d9d9', { metalness: 0.5 })), 0, 6, 0)); const fl = V.at(V.B(4, 2.6, 0.1, CM(c)), 2.1, 10.4, 0); f.add(fl); f.position.set(x, 3.2, -14); f.userData.flag = fl; scene.add(f); }
  const pod = new THREE.Group(); pod.position.set(0, 3.2, -10); scene.add(pod);
  pod.add(V.at(V.B(3.4, 4, 2, CM('#3a281e')), 0, 2, 0), V.at(new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: '#c9a227' })), 0, 2.6, 1.02));
  for (let i = 0; i < 5; i++) { const m = new THREE.Group(); m.add(V.at(V.B(0.08, 1.4, 0.08, CM('#333')), 0, 0.7, 0), V.at(V.B(0.3, 0.4, 0.3, CM(['#c4161c', '#2f6fe0', '#222', '#3aa76d', '#f2c230'][i])), 0, 1.5, 0)); m.position.set(-0.8 + i * 0.4, 3.4, 0.9); m.rotation.x = -0.25; pod.add(m); }
  const lion = put(scene, animal.lion(), 0, 3.6, -11.9, 0);
  const press = [];
  for (let i = 0; i < 16; i++) { const a = randomAnimal(r); let x = -16 + (i % 8) * 4.4 + r(), z = 6 + Math.floor(i / 8) * 4.5 + r(); if (Math.abs(x) < 4.5) x += Math.sign(x || 1) * 5; put(scene, a, x, 0, z, Math.PI + (r() - 0.5) * 0.4); const cam = V.at(V.B(0.8, 0.6, 0.9, CM('#222')), 0, -0.3, 0.3); if (i % 3 === 0) a.armR.hand.add(cam); press.push({ a, ph: r() * 6, cam: i % 3 === 0 }); }
  const flashes = []; for (let i = 0; i < 6; i++) { const f = new THREE.PointLight('#ffffff', 0, 14, 2); scene.add(f); flashes.push(f); }
  scene.userData.update = (t) => {
    press.forEach((p, i) => { p.a.pose(mergePose(motion.idle(t, 1, p.ph), p.cam ? { aRx: -1.4, eR: -1.2 } : { aRx: Math.sin(t * 2 + p.ph) > 0.6 ? -2.8 : -0.2 })); p.a.setFace({ eyes: 'open' }, t, Math.sin(t * 1.3 + p.ph) > 0.8, p.ph); p.a.wag(t, 0.5); });
    flashes.forEach((f, i) => { const pr = press[i * 2]; f.position.copy(pr.a.root.position).add(v3(0, 5, -1)); f.intensity = ((t * 3 + i * 0.37) % 1) < 0.06 ? 160 : 0; });
  };
  Object.assign(scene.userData, { actors: { lion }, exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= AUSTRALIAN ZOO (Greg)
export function buildZoo(renderer) {
  const { scene } = outdoor(renderer, { top: '#2f73c9', mid: '#e3ecf0', bottom: '#b9a07a', sunDir: v3(0.5, 0.8, 0.4), area: 70, sunColor: '#fff4dc', k: 3.0 });
  const r = rng(31);
  const grass = CM('#8fae5a', { roughness: 1 }), path = CM('#d9c39a', { roughness: 1 });
  scene.add(V.at(V.B(400, 1, 400, grass), 0, -0.5, 0));
  scene.add(V.at(V.B(8, 1.02, 200, path), 14, -0.49, 0));
  // enclosure (Greg's bench is inside) — wooden fence along x = 9 and z = -20, z = 24
  const wood = CM('#8a6a45', { roughness: 0.9 });
  const fence = new THREE.Group(); scene.add(fence);
  const rail = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); for (const y of [1.6, 3.2]) { const b = V.B(len, 0.25, 0.25, wood); b.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); b.rotation.y = -Math.atan2(z1 - z0, x1 - x0); fence.add(b); } for (let u = 0; u <= len; u += 3) { const p = V.B(0.35, 4, 0.35, wood); p.position.set(x0 + (x1 - x0) * u / len, 2, z0 + (z1 - z0) * u / len); fence.add(p); } };
  rail(9, -20, 9, 24); rail(-30, -20, 9, -20); rail(-30, 24, 9, 24);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 0.2), [wood, wood, wood, wood, CM('#fff', { map: V.textTex('HUMANS\nHOMO SAPIENS', { w: 640, h: 280, bg: '#3f5a2a', fg: '#f4ecd6', font: '700 64px Georgia, serif' }) }), wood]);
  sign.position.set(11.5, 5.2, 4); sign.rotation.y = Math.PI / 2; sign.castShadow = true; scene.add(sign); scene.add(V.at(V.B(0.35, 4, 0.35, wood), 11.5, 2, 4));
  const bench = new THREE.Group(); bench.position.set(-2, 0, 2); scene.add(bench);
  bench.add(V.at(V.B(6, 0.3, 1.6, wood), 0, 1.5, 0), V.at(V.B(6, 1.4, 0.25, wood), 0, 2.4, -0.75)); for (const x of [-2.6, 2.6]) bench.add(V.at(V.B(0.3, 1.5, 1.4, CM('#3a3f46')), x, 0.75, 0));
  for (let i = 0; i < 22; i++) { const t = tree(r, 1.6 + r()); const x = -60 + r() * 120, z = -80 + r() * 50; if (x > -32 && x < 20 && z > -24) continue; t.position.set(x, 0, z); scene.add(t); }
  for (let i = 0; i < 8; i++) { const rk = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + r() * 1.5, 0), CM('#b8a58a', { flatShading: true })); rk.position.set(-26 + r() * 30, 0.3, -16 + r() * 8); rk.castShadow = true; scene.add(rk); }
  const greg = put(scene, makeCharacter(GREG), -2, 0, 2.6, 0);
  const paper = new THREE.Group(); paper.add(V.B(1.4, 1.8, 0.04, CM('#f4f1e8', { map: P.canvasTex(256, 330, (g, W, Hh) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#1a1a1a'; g.font = '700 30px Georgia, serif'; g.fillText('THE DAILY', 50, 40); g.fillRect(16, 52, W - 32, 3); g.font = '700 22px Georgia'; g.fillText('Zoo visits up', 20, 90); for (let y = 110; y < Hh - 10; y += 12) g.fillRect(20, y, W - 40 - (y % 36), 4); }) })));
  greg.armR.hand.add(paper); paper.position.set(-0.55, -0.35, 0.35);
  const keeper = put(scene, animal.keeper(), 24, 0, 2, -Math.PI / 2);
  // human exhibits (inside) and animal visitors (outside the fence)
  const exhibits = [], visitors = [];
  for (let i = 0; i < 5; i++) { const h = makeCharacter(randomPerson(r)); put(scene, h, -24 + i * 5 + r() * 2, 0, -10 + r() * 6, r() * 6); exhibits.push({ h, ph: r() * 6, sit: i % 2 === 0 }); }
  for (let i = 0; i < 12; i++) { const a = randomAnimal(r); put(scene, a, 13 + (i % 3) * 2.4 + r(), 0, -14 + Math.floor(i / 3) * 8 + r() * 3, -Math.PI / 2 + (r() - 0.5) * 0.6); const cam = V.at(V.B(0.6, 0.5, 0.7, CM('#222')), 0, -0.3, 0.3); if (i % 2 === 0) a.armR.hand.add(cam); visitors.push({ a, ph: r() * 6, cam: i % 2 === 0 }); }
  const joey = put(scene, makeAnimal('kangaroo', 'none', { scale: 0.55 }), 14.5, 0, 9, -Math.PI / 2);
  scene.userData.update = (t) => {
    exhibits.forEach((e) => { e.h.pose(e.sit ? motion.sitFloor(t, e.ph) : mergePose(motion.idle(t, 1, e.ph), motion.shrug)); e.h.setFace({ eyes: 'half', mouth: 'flat', brows: 'flat' }, t, false, e.ph); });
    visitors.forEach((v) => { v.a.pose(mergePose(motion.idle(t, 1, v.ph), v.cam ? { aRx: -1.45, eR: -1.25 } : motion.point)); v.a.setFace({ eyes: 'happy' }, t, Math.sin(t * 1.1 + v.ph) > 0.7, v.ph); v.a.wag(t); });
    joey.pose(mergePose(motion.idle(t), { aRx: -1.4, eR: -1.2 })); joey.setFace({ eyes: 'wide' }, t); joey.wag(t, 0.3);
  };
  Object.assign(scene.userData, { actors: { greg, keeper }, paper, exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= DOG PARK (day 3)
export function buildDogPark(renderer) {
  const { scene } = outdoor(renderer, { sunDir: v3(0.3, 0.7, 0.6) });
  const r = rng(41);
  scene.add(V.at(V.B(400, 1, 400, CM('#7fae52', { roughness: 1 })), 0, -0.5, 0));
  for (let i = 0; i < 26; i++) { const t = tree(r, 1.4 + r()); const a = r() * 6.28, d = 45 + r() * 50; t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 20); scene.add(t); }
  const sign = V.signPost('HUMAN PARK\nOFF-LEASH AREA', { w: 6, h: 2.6, bg: '#3f5a2a', height: 6 }); sign.position.set(-9, 0, 4); scene.add(sign);
  const dogs = [put(scene, animal.parkdog(), -3, 0, 6, Math.PI - 0.5), put(scene, makeAnimal('dog', 'casual', { spec: { top: { kind: 'tee', color: '#e94f6a', trim: '#fff' } } }), 2.5, 0, 7, Math.PI + 0.4)];
  const humans = []; for (let i = 0; i < 4; i++) { const h = makeCharacter(randomPerson(r)); addCollar(h, ['#c9473a', '#2f6fe0', '#3aa76d', '#f2c230'][i]); put(scene, h, -4 + i * 2.6, 0, 0, Math.PI); humans.push({ h, ph: r() * 6 }); }
  const frisbee = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18), CM('#f2c230')); frisbee.castShadow = true; scene.add(frisbee);
  Object.assign(scene.userData, { dogs, humans, frisbee, exposure: 1.0, caustic: 0, update() {} });
  return scene;
}

// ============================================================= PET STORE window (day 3)
export function buildPetStore(renderer) {
  const { scene } = outdoor(renderer, { sunDir: v3(-0.4, 0.7, 0.7) });
  const r = rng(51);
  scene.add(V.at(V.B(200, 1, 200, CM('#c4c0b8')), 0, -0.5, 0));
  const shop = new THREE.Group(); shop.position.set(0, 0, -8); scene.add(shop);
  const wall = CM('#e8d2b8');
  shop.add(V.at(V.B(30, 3, 1, wall), 0, 1.5, 0), V.at(V.B(30, 5, 1, wall), 0, 13.5, 0), V.at(V.B(4, 16, 1, wall), -13, 8, 0), V.at(V.B(4, 16, 1, wall), 13, 8, 0));
  shop.add(V.at(V.B(31, 1.4, 1.6, CM('#2fb3c9')), 0, 11.2, 0.5));
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.2), new THREE.MeshBasicMaterial({ map: V.textTex('HAPPY HUMANS PET SHOP', { w: 1024, h: 88, bg: '#2fb3c9', fg: '#ffffff', font: '700 62px Georgia, serif' }) })); sg.position.set(0, 11.2, 1.32); shop.add(sg);
  const inside = V.at(V.B(22, 8, 10, CM('#f6f0e6', { side: THREE.BackSide })), 0, 7, -5.4); shop.add(inside);
  const pen = new THREE.Group(); pen.position.set(0, 3, -4); shop.add(pen);
  pen.add(V.at(V.B(18, 0.4, 6, CM('#c9b8a0')), 0, 0, 0));
  for (let x = -9; x <= 9; x += 1.5) pen.add(V.at(V.B(0.12, 1.6, 0.12, CM('#d9d9d9')), x, 0.8, 3));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false })); glass.position.set(0, 7, 0.55); glass.renderOrder = 5; shop.add(glass);
  const humans = []; for (let i = 0; i < 4; i++) { const h = makeCharacter(randomPerson(r)); addCollar(h, ['#c9473a', '#2f6fe0', '#3aa76d', '#f2c230'][i]); h.root.position.set(-6 + i * 4, 3.2, -11 + (i % 2) * 1.5); h.root.rotation.y = (r() - 0.5) * 0.6; scene.add(h.root); const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: V.textTex('ADOPT ME', { w: 256, h: 120, bg: '#fff6d8', fg: '#7a2a1a', font: '700 46px Arial' }) })); tag.position.set(-6 + i * 4, 3.9, -6.9); scene.add(tag); humans.push({ h, ph: r() * 6, sit: i % 2 === 1 }); }
  const shopper = put(scene, animal.shopper(), 2.2, 0, 4.0, Math.PI);
  const kit = put(scene, makeAnimal('ginger', 'casual', { scale: 0.6 }), 4.0, 0, 3.4, Math.PI);
  scene.userData.update = (t) => {
    humans.forEach((q, i) => { if (q.sit) { q.h.pose(motion.sitFloor(t, q.ph)); q.h.root.position.y = 3.2; } else q.h.pose(mergePose(motion.idle(t, 1, q.ph), i === 0 && t > 56.4 ? { aRx: -2.8, aRz: 0.3, eR: -0.2 + Math.sin(t * 10) * 0.4 } : {})); q.h.setFace(i === 0 ? { eyes: 'happy', mouth: 'grin' } : { eyes: 'half', mouth: 'flat' }, t, false, q.ph); });
    kit.pose(mergePose(motion.idle(t), { aRx: -1.6, eR: -0.3 })); kit.setFace({ eyes: 'wide' }, t); kit.wag(t);
  };
  Object.assign(scene.userData, { actors: { shopper }, exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= VET (day 3)
export function buildVet(renderer) {
  const scene = interior(renderer, { wall: '#dfeef0', floor: '#b9c4c6', w: 34, d: 26, h: 14 });
  const table = new THREE.Group(); scene.add(table);
  table.add(V.at(V.B(6, 0.4, 3, CM('#c9ced3', { metalness: 0.6, roughness: 0.3 })), 0, 3.2, 0), V.at(V.B(1, 3, 1, CM('#9aa1a8', { metalness: 0.5 })), 0, 1.5, 0));
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(4, 5.4), new THREE.MeshBasicMaterial({ map: V.textTex('HUMAN\nCARE\nGUIDE', { w: 300, h: 400, bg: '#ffffff', fg: '#2aa198', font: '700 64px Georgia, serif', border: '#2aa198' }) })); poster.position.set(-6, 7.5, -12.9); scene.add(poster);
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ map: V.textTex('GOOD\nHUMAN\n★★★★☆', { w: 300, h: 400, bg: '#fff6d8', fg: '#7a2a1a', font: '700 54px Georgia, serif' }) })); chart.position.set(5, 7, -12.9); scene.add(chart);
  const patient = put(scene, makeCharacter(HUMANS.patient), 0, 0.4, 0.4, 0); addCollar(patient, '#2f6fe0');
  const vet = put(scene, animal.vet(), 3.8, 0, 1.6, -1.8);
  const steth = new THREE.Group(); steth.add(V.at(V.B(0.3, 0.3, 0.12, CM('#c9ced3', { metalness: 0.7 })), 0, 0, 0)); vet.armR.hand.add(steth); steth.position.set(0, -0.4, 0.2);
  Object.assign(scene.userData, { actors: { patient, vet }, exposure: 0.95, caustic: 0, update() {} });
  return scene;
}

// ============================================================= LIVING ROOM (year 3 ending)
export function buildLivingRoom(renderer) {
  const scene = interior(renderer, { wall: '#efe2cf', floor: '#9a6b45', w: 40, d: 30, h: 14 });
  scene.background = new THREE.Color('#efe2cf');
  const lamp = new THREE.PointLight('#ffc884', 140, 40, 1.6); lamp.position.set(-8, 9, 2); scene.add(lamp);
  const ext = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), CM('#9a6b45', { roughness: 0.7 })); ext.rotation.x = -Math.PI / 2; ext.position.set(0, -0.01, 30); ext.receiveShadow = true; scene.add(ext);
  const couchM = CM('#5d7fa3', { roughness: 0.95 });
  const couch = new THREE.Group(); couch.position.set(-3, 0, -6); scene.add(couch);
  couch.add(V.at(V.B(10, 1.4, 3.6, couchM, 0.3), 0, 1.0, 0), V.at(V.B(10, 3, 1, couchM, 0.3), 0, 2.4, -1.5), V.at(V.B(1, 2.2, 3.6, couchM, 0.3), -5, 1.5, 0), V.at(V.B(1, 2.2, 3.6, couchM, 0.3), 5, 1.5, 0));
  for (const x of [-2.4, 2.4]) couch.add(V.at(V.B(2.6, 1.6, 0.6, CM('#f2c230'), 0.25), x, 2.3, -0.9));
  const tv = new THREE.Group(); tv.position.set(-12, 4.4, 9); tv.rotation.y = Math.PI - 0.5; scene.add(tv);
  tv.add(V.B(7, 4, 0.3, CM('#111', { roughness: 0.3 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.6), new THREE.MeshBasicMaterial({ map: P.canvasTex(512, 280, (g, W, Hh) => { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#6fb7e8'); gr.addColorStop(1, '#7fbf62'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); g.fillStyle = '#c9473a'; g.beginPath(); g.ellipse(260, 180, 40, 30, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 28px Arial'; g.fillText('SQUIRREL TV', 20, 40); }), toneMapped: false })); scr.position.z = 0.16; tv.add(scr);
  scene.add(V.at(V.B(8, 2.4, 2, CM('#3a2e28')), -12, 1.2, 9.2));
  const door = new THREE.Group(); door.position.set(14, 0, 4); scene.add(door);
  door.add(V.at(V.B(0.3, 9, 5.2, CM('#e9e2d6')), 0.3, 4.5, 0));
  const leaf = new THREE.Group(); leaf.position.set(0, 0, -2.3); door.add(leaf); leaf.add(V.at(V.B(0.25, 8.2, 4.6, CM('#8e3b2b')), 0, 4.1, 2.3));
  scene.add(V.at(V.B(2.4, 0.06, 3.6, CM('#c9473a', { roughness: 1 })), 12, 0.03, 4)); // doormat
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.4, 16), CM('#c9473a')); bowl.position.set(9, 0.2, -10); scene.add(bowl);
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.8, 20), CM('#b9a07a')); bed.position.set(8, 0.4, -9); scene.add(bed);
  const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshBasicMaterial({ map: V.textTex('TOM', { w: 256, h: 74, bg: '#2f6fe0', fg: '#fff', font: '700 50px Arial' }) })); nameplate.position.set(8, 1.4, -11.3); scene.add(nameplate);
  const biscuit = put(scene, animal.biscuit(), -3, 0, -6, 0);
  const tom = put(scene, makeCharacter(HUMANS.tom), 11, 0, 3, -1.9); addCollar(tom);
  const leashProp = makeLeash(scene, '#c9473a');
  const hook = new THREE.Object3D(); hook.position.set(13.6, 5.0, 1.0); scene.add(hook);
  Object.assign(scene.userData, { actors: { biscuit, tom }, leash: leashProp, hook, doorLeaf: leaf, exposure: 1.0, caustic: 0, update() {} });
  return scene;
}

// ============================================================= city redesigned for every species (month 6) — extras added to a city
export function addSpeciesCity(scene, ax = 0) {
  const r = rng(61); const extras = [];
  // giant cat trees (towers with platforms), monkey rope bridges, elephant-height arches, ramps
  const sisal = CM('#c9a46a', { roughness: 1 }), plush = CM('#8e5bd6', { roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); const x = (i % 2 ? 1 : -1) * (24 + r() * 50), z = -180 + i * 60;
    g.add(V.at(new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 60, 12), sisal), 0, 30, 0));
    for (let k = 0; k < 4; k++) g.add(V.at(V.B(12, 1.6, 12, k % 2 ? plush : CM('#2fb3c9'), 0.6), (k % 2 ? 4 : -4), 14 + k * 13, 0));
    g.position.set(x, 0, z); scene.add(g);
  }
  const rope = CM('#8a6a45');
  for (let i = 0; i < 5; i++) { const z = -150 + i * 70, y = 30 + (i % 2) * 12; const b = V.B(70, 0.6, 3, rope); b.position.set(ax, y, z); scene.add(b); for (const s of [-1.6, 1.6]) { const rl = V.B(70, 0.2, 0.2, rope); rl.position.set(ax, y + 2, z + s); scene.add(rl); } }
  for (let i = 0; i < 4; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(14, 1.6, 8, 20, Math.PI), CM('#e9e4d8')); arch.position.set(ax, 0, -120 + i * 80); scene.add(arch); }
  const monkeys = []; for (let i = 0; i < 6; i++) { const m = makeAnimal('monkey', 'none'); scene.add(m.root); monkeys.push({ m, z: -150 + (i % 5) * 70, y: 30 + ((i % 5) % 2) * 12, ph: r() * 6 }); }
  extras.push((t) => monkeys.forEach((q) => { q.m.root.position.set(ax - 30 + ((t * 6 + q.ph * 20) % 60), q.y + 0.3, q.z); q.m.root.rotation.y = Math.PI / 2; q.m.pose(motion.walk(t, 1.2, q.ph)); q.m.wag(t); q.m.setFace({ eyes: 'happy' }, t); }));
  return extras;
}
