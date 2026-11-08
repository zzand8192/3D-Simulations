// Studio, Arizona gas station (Greg), grocery, hospital, train station / transit hub, airport, road construction.
import * as THREE from 'three';
import { rng, causticMaterial, gradientDome } from './env.js';
import { makeCharacter, motion, mergePose, GREG } from './character.js';
import * as V from './vehicles.js';
import * as P from './props.js';
import { randomPerson, person, envFrom, sun, dirtMesh, tree } from './scenes_city.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const CM = (c, o = {}) => causticMaterial({ color: c, roughness: 0.7, ...o });

export const CAST = {
  greg: GREG,
  ped1: { name: 'ped1', skin: '#f1c9a5', hair: '#7a4a22', hairStyle: 'ponytail', lips: true, top: { kind: 'tee', color: '#f4c542', trim: '#ffffff' }, bottom: { color: '#2b3a55' } },
  driver: { name: 'driver', skin: '#8d5a3b', hair: '#140d09', hairStyle: 'buzz', beard: '#1a100a', top: { kind: 'long', color: '#5b6b7a', trim: '#5b6b7a' }, bottom: { color: '#23252b' }, shoes: '#2a2c31' },
  anchor: { name: 'anchor', skin: '#c68e6a', hair: '#1e130d', hairStyle: 'bun', lips: true, top: { kind: 'long', color: '#16264a', trim: '#16264a' }, bottom: { color: '#16264a' }, shoes: '#111' },
  reporter: { name: 'reporter', skin: '#f0cfae', hair: '#111111', hairStyle: 'long', lips: true, top: { kind: 'long', color: '#c9473a', trim: '#c9473a' }, bottom: { color: '#2b2f3a' }, shoes: '#222' },
  cashier: { name: 'cashier', skin: '#e8b48e', hair: '#9a9a9a', hairStyle: 'bun', lips: true, top: { kind: 'tee', color: '#3aa76d', trim: '#ffffff' }, apron: '#b03a2e', bottom: { color: '#2b2f3a' } },
  customer: { name: 'customer', skin: '#a86f4c', hair: '#2a1a12', hairStyle: 'curly', lips: true, top: { kind: 'tee', color: '#e94f6a', trim: '#ffffff' }, bottom: { color: '#3a5a8a' } },
  employee: { name: 'employee', skin: '#f3d2b5', hair: '#c9a36a', hairStyle: 'short', top: { kind: 'tee', color: '#f2f2f2', trim: '#2f6fe0' }, apron: '#2f6fe0', bottom: { color: '#23252b' } },
  worker: { name: 'worker', skin: '#c68e6a', hair: '#1a120c', hairStyle: 'short', beard: '#2a1a10', top: { kind: 'tee', color: '#5b6b7a', trim: '#5b6b7a' }, vest: '#ff7a1a', hardhat: '#f2c230', bottom: { color: '#3a5a8a' }, shoes: '#7a5a3a' },
};

// ============================================================= NEWS STUDIO (WORLD 24, fictional)
export function buildStudio(renderer, wallTexture, anchorFactory = null) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#050b18');
  scene.environment = envFrom(renderer, gradientDome({ top: '#1d3b78', mid: '#0b1a36', bottom: '#050b18' })); scene.environmentIntensity = 0.6;
  const key = new THREE.SpotLight('#fff3e4', 900, 60, 0.5, 0.6, 1.5); key.position.set(4, 14, 14); key.target.position.set(0, 4.5, 0); key.castShadow = true; scene.add(key, key.target);
  const fill = new THREE.PointLight('#8fb4ff', 120, 40, 1.6); fill.position.set(-8, 8, 8); scene.add(fill);
  const rim = new THREE.PointLight('#5fb0ff', 200, 30, 1.6); rim.position.set(0, 9, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#3a5a9a', '#0a0f1c', 0.6));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#0d1a33', roughness: 0.25, metalness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const panelTex = P.canvasTex(1024, 512, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e2a5c'); gr.addColorStop(1, '#06132b'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(120,180,255,.18)'; g.lineWidth = 2; for (let i = 0; i < 24; i++) { g.beginPath(); g.ellipse(W * 0.78, H * 0.5, 60 + i * 18, 40 + i * 12, 0, 0, 7); g.stroke(); } });
  const back = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 20, 48, 1, true, Math.PI * 0.72, Math.PI * 0.56), new THREE.MeshBasicMaterial({ map: panelTex, side: THREE.BackSide })); back.position.set(0, 10, 8); scene.add(back);
  for (let i = -4; i <= 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 16, 0.15), new THREE.MeshBasicMaterial({ color: '#3d8bff' })); const a = Math.PI + i * 0.12; s.position.set(Math.sin(a) * 21.5, 8, 8 + Math.cos(a) * 21.5); scene.add(s); }
  const frame = V.B(13.4, 7.8, 0.4, new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })); frame.position.set(0, 10.4, -4.2); scene.add(frame);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 7.2), new THREE.MeshBasicMaterial({ map: wallTexture, toneMapped: false })); wall.position.set(0, 10.4, -3.98); scene.add(wall);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), new THREE.MeshBasicMaterial({ map: V.textTex('LIVE  •  NEW YORK', { w: 512, h: 80, bg: '#c4161c', fg: '#ffffff', font: '700 44px Arial, sans-serif' }), toneMapped: false })); tag.position.set(-3.6, 7.15, -3.9); scene.add(tag);
  const deskM = new THREE.MeshStandardMaterial({ color: '#e9eef6', roughness: 0.25, metalness: 0.2 });
  const desk = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 2.9, 40, 1, true, -0.65, 1.3), deskM); desk.position.set(0, 1.45, -5.5); scene.add(desk);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 0.2, 40, 1, false, -0.7, 1.4), new THREE.MeshStandardMaterial({ color: '#1a2744', roughness: 0.2, metalness: 0.5 })); top.position.set(0, 2.95, -5.5); scene.add(top);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshBasicMaterial({ transparent: true, map: P.canvasTex(512, 128, (g) => { g.fillStyle = '#c4161c'; g.fillRect(0, 18, 120, 92); g.fillStyle = '#fff'; g.font = '800 64px sans-serif'; g.textBaseline = 'middle'; g.fillText('W24', 4, 66); g.fillStyle = '#16264a'; g.font = '700 54px sans-serif'; g.fillText('WORLD 24', 140, 66); }) }));
  logo.position.set(0, 1.6, 1.53); scene.add(logo);
  const anchor = anchorFactory ? anchorFactory() : person(scene, CAST.anchor, 0, 0.5, -1.4, 0);
  if (anchorFactory) { anchor.root.position.set(0, 0.5, -1.4); scene.add(anchor.root); }
  scene.add(V.at(V.B(2.2, 3.6, 0.5, new THREE.MeshStandardMaterial({ color: '#222' }), 0.15), 0, 3.0, -2.6));
  scene.add(V.at(V.B(0.9, 0.05, 1.2, new THREE.MeshStandardMaterial({ color: '#fafafa' })), 0.8, 3.08, 0.6));
  Object.assign(scene.userData, { actors: { anchor }, exposure: 1.0, caustic: 0, update() {} });
  return scene;
}

// ============================================================= ARIZONA GAS STATION
export function buildGasStation(renderer, { rebuilt = false } = {}) {
  const scene = new THREE.Scene(); const r = rng(rebuilt ? 61 : 60);
  const sunDir = v3(0.55, 0.7, 0.45);
  scene.add(gradientDome({ top: '#2f6fc4', mid: '#e9d9b8', bottom: '#c9a578', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#f0e2c4', bottom: '#b88a5a' })); scene.environmentIntensity = 0.8;
  scene.fog = new THREE.Fog('#ead9b6', 220, 1100);
  sun(scene, '#fff1d8', 3.2, sunDir, v3(4, 0, 6), 70, 4096);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#c49a6a', 0.9));
  const H = (x, z) => Math.sin(x * 0.03) * 0.6 + Math.cos(z * 0.04 + x * 0.01) * 0.5 + Math.sin(x * 0.2 + z * 0.17) * 0.12 - (Math.abs(z - 30) < 9 ? 0.9 : 0);
  // desert ground (the road strip at z≈30 is bare compacted earth)
  const g = new THREE.PlaneGeometry(1600, 1200, 200, 150); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color(), sand = new THREE.Color('#d6a86f'), strip = new THREE.Color('#9c7350');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x, z)); c.copy(Math.abs(z - 30) < 8 ? strip : sand).multiplyScalar(0.9 + Math.sin(x * 0.11 + z * 0.07) * 0.05 + (i % 7) * 0.006); cols.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, causticMaterial({ vertexColors: true, roughness: 1, flatShading: true })); ground.receiveShadow = true; scene.add(ground);
  // mesas & cacti
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(30 + r() * 40, 50 + r() * 50, 40 + r() * 50, 7), CM('#b8643c', { flatShading: true })); m.position.set(-600 + i * 150 + r() * 60, 10, -420 - r() * 200); scene.add(m); }
  const cactus = () => { const k = new THREE.Group(); const m = CM('#4f7a3c'); k.add(V.at(V.B(0.9, 6, 0.9, m, 0.3), 0, 3, 0)); k.add(V.at(V.B(0.7, 2.4, 0.7, m, 0.25), 1.1, 3.6, 0), V.at(V.B(1.2, 0.6, 0.6, m, 0.2), 0.6, 2.6, 0)); return k; };
  for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 500, z = -40 - r() * 300; const k = cactus(); k.position.set(x, H(x, z), z); k.scale.setScalar(0.8 + r()); scene.add(k); }
  for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 500, z = 60 + r() * 300; const k = cactus(); k.position.set(x, H(x, z), z); k.scale.setScalar(0.8 + r()); scene.add(k); }
  // new road (month 6)
  if (rebuilt) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(1600, 15), CM('#34373c', { roughness: 0.85 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.05, 30); road.receiveShadow = true; scene.add(road);
    for (let x = -800; x < 800; x += 12) { const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.3), CM('#e8c33a')); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.08, 30); scene.add(s); }
    for (const z of [23.2, 36.8]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1600, 0.3), CM('#f2f2f2')); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.08, z); scene.add(s); }
    const sign = V.barrier(7, 'ROAD CLOSED\nFINAL INSPECTION'); sign.position.set(16, 0, 21.5); sign.rotation.y = 0; scene.add(sign); scene.userData.sign = sign;
    for (let k = 0; k < 4; k++) { const cn = V.cone(); cn.position.set(9 + k * 5.5, 0, 22.5); scene.add(cn); }
  }
  // forecourt slab, store, canopy, pumps, price sign
  scene.add(V.at(V.B(70, 0.5, 34, CM('#cfcac0', { roughness: 0.95 })), 2, 0.0, 4));
  const store = new THREE.Group(); store.position.set(0, 0.25, -10); scene.add(store);
  const wallM = CM('#efe4cf'), trimM = CM('#b03a2e'), glass = new THREE.MeshStandardMaterial({ color: '#9fc4d6', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.25, depthWrite: false });
  // shell: back + sides + roof; front wall assembled around windows and a door at x∈[3,6.4]
  store.add(V.at(V.B(26, 10, 0.5, wallM), 0, 5, -7), V.at(V.B(0.5, 10, 14, wallM), -13, 5, 0), V.at(V.B(0.5, 10, 14, wallM), 13, 5, 0), V.at(V.B(27, 0.6, 15, wallM), 0, 10.2, 0));
  store.add(V.at(V.B(27.4, 1.6, 0.4, trimM), 0, 9.6, 7.45), V.at(V.B(0.4, 1.6, 15.4, trimM), -13.45, 9.6, 0), V.at(V.B(0.4, 1.6, 15.4, trimM), 13.45, 9.6, 0), V.at(V.B(27.4, 1.6, 0.4, trimM), 0, 9.6, -7.45));
  store.add(V.at(V.B(26, 2.0, 0.5, wallM), 0, 1.0, 7), V.at(V.B(26, 2.2, 0.5, wallM), 0, 8.0, 7));
  for (const [x0, x1] of [[-13, -12.4], [-1.2, 3], [6.4, 7.2], [12.4, 13]]) store.add(V.at(V.B(x1 - x0, 10, 0.5, wallM), (x0 + x1) / 2, 5, 7));
  for (const [x0, x1] of [[-12.4, -1.2], [7.2, 12.4]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 4.9), glass); w.position.set((x0 + x1) / 2, 4.45, 7); w.renderOrder = 5; store.add(w); }
  const door = V.at(V.B(3.3, 5.8, 0.12, glass), 4.7, 2.9, 7.1); door.renderOrder = 5; store.add(door); store.userData.door = door;
  const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: V.textTex('MESA STOP  ·  FOOD & FUEL', { w: 1024, h: 150, bg: '#b03a2e', fg: '#ffffff', font: '700 78px Arial, sans-serif' }) })); signBoard.position.set(-4, 9.6, 7.75); store.add(signBoard);
  // interior: floor, counter, register, shelves, fridges, lights
  store.add(V.at(V.B(25.5, 0.1, 13.5, CM('#e3ddd2')), 0, 0.05, 0));
  const counter = V.at(V.B(9, 3.4, 2.4, CM('#8a6a4a')), -6.5, 1.7, -2.6); store.add(counter);
  store.add(V.at(V.B(9.3, 0.25, 2.7, CM('#d9d4c9')), -6.5, 3.5, -2.6));
  const register = new THREE.Group(); register.position.set(-8.5, 3.6, -2.9); store.add(register);
  register.add(V.at(V.B(1.8, 0.8, 1.4, CM('#2b2d31')), 0, 0.4, 0), V.at(V.B(1.4, 1.0, 0.15, CM('#2b2d31')), 0, 1.3, -0.3));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: V.textTex('TOTAL\n$9.47', { w: 256, h: 170, bg: '#123a2a', fg: '#7dffb0', font: '700 54px monospace' }) })); scr.position.set(0, 1.3, -0.21); scr.rotation.y = Math.PI; register.add(scr);
  const drawer = V.at(V.B(1.6, 0.35, 1.2, CM('#4a4d52')), 0, -0.1, 0.1); register.add(drawer); register.userData.drawer = drawer;
  const items = [];
  const prodCols = ['#e8423b', '#2f6fe0', '#f2c230', '#3aa76d', '#ef7b2d', '#8e5bd6', '#f2f2f2'];
  for (let row = 0; row < 2; row++) { const sh = new THREE.Group(); sh.position.set(4 + row * 5, 0, -1); store.add(sh); sh.add(V.at(V.B(1.6, 5.4, 9, CM('#cfd6da')), 0, 2.7, 0)); for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 7; k++) for (const s of [-1, 1]) sh.add(V.at(V.B(0.6, 0.9, 0.9, CM(prodCols[(lv + k + row) % 7])), s * 1.1, 0.9 + lv * 1.3, -3.6 + k * 1.2)); }
  for (let k = 0; k < 3; k++) { const f = V.at(V.B(3.2, 7.5, 1.6, CM('#d9dee2', { metalness: 0.3 })), 2 + k * 3.4, 3.75, -6.1); store.add(f); store.add(V.at(V.B(2.8, 6.6, 0.1, new THREE.MeshBasicMaterial({ color: '#cbefff' })), 2 + k * 3.4, 3.9, -5.25)); }
  for (const x of [-7, 0, 7]) { store.add(V.at(V.B(4, 0.15, 0.8, new THREE.MeshBasicMaterial({ color: '#ffffff' })), x, 9.85, 0)); const pl = new THREE.PointLight('#fff4e0', 40, 18, 1.6); pl.position.set(x, 9, 0); store.add(pl); }
  const sandwich = P.sandwich(); sandwich.scale.setScalar(0.5); sandwich.position.set(-4.6, 3.75, -2.0); store.add(sandwich);
  const drink = P.cup('#d94a3a'); drink.scale.setScalar(1.4); drink.position.set(-3.6, 3.95, -2.0); store.add(drink);
  // canopy + pumps
  const can = new THREE.Group(); can.position.set(4, 0.25, 14); scene.add(can);
  can.add(V.at(V.B(34, 1.6, 14, CM('#f4f4f4')), 0, 11, 0), V.at(V.B(34.2, 0.8, 14.2, trimM), 0, 10.6, 0));
  for (const x of [-12, 12]) can.add(V.at(V.B(1, 10.3, 1, CM('#d9d9d9')), x, 5.2, 0));
  for (const x of [-12, 12]) { const pu = new THREE.Group(); pu.position.set(x * 0.55, 0, 0); can.add(pu); pu.add(V.at(V.B(2.2, 5, 1.6, CM('#e9eef1'), 0.15), 0, 2.5, 0), V.at(V.B(2.25, 1.2, 1.65, trimM), 0, 4.5, 0), V.at(V.B(1.2, 0.8, 0.05, new THREE.MeshBasicMaterial({ color: '#163a2a' })), 0, 3.3, 0.83), V.at(V.B(0.25, 1.6, 0.25, CM('#222')), 1.0, 2.4, 0.9)); }
  for (const x of [-12, 12]) for (const z of [-4, 4]) can.add(V.at(new THREE.PointLight('#fff4e0', 0, 10), x, 9.5, z));
  const pole = new THREE.Group(); pole.position.set(-26, 0, 20); scene.add(pole);
  pole.add(V.at(V.B(0.8, 16, 0.8, CM('#9aa1a8', { metalness: 0.5 })), 0, 8, 0));
  const ps = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 0.6), [CM('#b03a2e'), CM('#b03a2e'), CM('#b03a2e'), CM('#b03a2e'), CM('#fff', { map: V.textTex('MESA STOP\nREGULAR 3.89', { w: 512, h: 360, bg: '#b03a2e', fg: '#ffffff', font: '700 70px Arial, sans-serif' }) }), CM('#b03a2e')]); ps.position.y = 14; ps.castShadow = true; pole.add(ps);
  // Greg's car (teal hatchback) beside the store
  const gregCar = V.car('#2a7f8f', 'hatch'); gregCar.position.set(19, 0.25, -6); gregCar.rotation.y = Math.PI; scene.add(gregCar);
  // a stranded pickup on the strip, and tumbleweed
  if (!rebuilt) { const pu = V.car('#9a5a3a', 'suv'); pu.position.set(-60, H(-60, 31) + 0.1, 31); pu.rotation.y = Math.PI / 2; pu.userData.body.rotation.z = 0.04; scene.add(pu); }
  const actors = { greg: person(scene, CAST.greg, -4.6, 0.3, -9.6, Math.PI), cashier: person(scene, CAST.cashier, -6.4, 0.3, -15.5, 0) };
  const keys = V.at(V.B(0.35, 0.5, 0.1, CM('#d9d9d9', { metalness: 0.8 })), 0, -0.45, 0.25); actors.greg.armR.hand.add(keys); keys.visible = false;
  scene.userData.update = () => {};
  Object.assign(scene.userData, { H, actors, store, register, sandwich, drink, gregCar, keys, exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= GROCERY (DAY #3)
export function buildGrocery(renderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9ece8'); const r = rng(71);
  scene.environment = envFrom(renderer, gradientDome({ top: '#ffffff', mid: '#eef2f0', bottom: '#b9bfba' })); scene.environmentIntensity = 0.8;
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9bfba', 1.6));
  const d = new THREE.DirectionalLight('#ffffff', 1.0); d.position.set(10, 30, 20); d.castShadow = true; d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 }); scene.add(d);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), CM('#d9d6cf', { roughness: 0.4 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  scene.add(V.at(V.B(120, 20, 1, CM('#f1efe9')), 0, 10, -40), V.at(V.B(120, 1, 120, CM('#f7f7f4')), 0, 20, 0));
  for (let i = -3; i <= 3; i++) scene.add(V.at(V.B(1.2, 0.2, 40, new THREE.MeshBasicMaterial({ color: '#ffffff' })), i * 12, 19.4, -10));
  const prod = ['#e8423b', '#2f6fe0', '#f2c230', '#3aa76d', '#ef7b2d', '#8e5bd6', '#f2f2f2', '#c9473a', '#6fb8d9'];
  for (let a = -2; a <= 2; a++) {
    const sh = new THREE.Group(); sh.position.set(a * 11, 0, -12); scene.add(sh); sh.add(V.at(V.B(2.4, 8, 40, CM('#d0d5d8')), 0, 4, 0));
    for (let lv = 0; lv < 5; lv++) { for (const s of [-1, 1]) { sh.add(V.at(V.B(1.6, 0.15, 40, CM('#b9c0c4')), s * 1.6, 0.6 + lv * 1.6, 0)); for (let k = 0; k < 26; k++) { const empty = (Math.sin(k * 0.6 + a * 2 + lv) > 0.15 && Math.abs(a) <= 1); if (empty && r() < 0.92) continue; sh.add(V.at(V.B(1.2, 1.1, 1.2, CM(prod[(k + lv * 3 + a) % 9])), s * 1.6, 1.3 + lv * 1.6, -19 + k * 1.5)); } } }
  }
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), new THREE.MeshBasicMaterial({ map: V.textTex('DELIVERIES DELAYED\nTHANK YOU FOR YOUR PATIENCE', { w: 768, h: 200, bg: '#fff6d8', fg: '#7a2a1a', font: '700 52px Arial, sans-serif', border: '#c9473a' }) })); tag.position.set(5.5, 9.6, -2.6); scene.add(tag);
  const cust = person(scene, CAST.customer, 4.0, 0, 2, -0.5), emp = person(scene, CAST.employee, 7.6, 0, 0.8, -2.1);
  const basket = V.at(V.B(1.6, 1.0, 1.0, CM('#e8423b')), 0, -0.7, 0.3); cust.armL.hand.add(basket);
  const shoppers = [];
  for (let i = 0; i < 6; i++) { const c = person(scene, randomPerson(r), -18 + i * 7, 0, -6 - r() * 10, r() * 6); shoppers.push({ c, ph: r() * 6 }); }
  scene.userData.update = (t) => { for (const s of shoppers) { s.c.pose(mergePose(motion.idle(t, 1, s.ph), { aRx: -0.9, eR: -0.8, headX: 0.15 })); s.c.setFace({ eyes: 'open', mouth: 'frown' }, t, false, s.ph); } };
  Object.assign(scene.userData, { actors: { customer: cust, employee: emp }, exposure: 0.95, caustic: 0 });
  return scene;
}

// ============================================================= HOSPITAL helipad
export function buildHospital(renderer) {
  const scene = new THREE.Scene(); const r = rng(81); const sunDir = v3(-0.4, 0.7, 0.6);
  scene.add(gradientDome({ top: '#3d7cc4', mid: '#d4e8f4', bottom: '#a7b0a0', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#d9eef8', bottom: '#8e8a80' })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#d4e8f4', 150, 600);
  sun(scene, '#fff2dc', 2.8, sunDir, v3(0, 0, 0), 60);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#8f8a80', 1.0));
  const H = (x, z) => -0.9 + Math.sin(x * 0.2) * 0.15;
  scene.add(dirtMesh(300, 20, 0, 36, H, 9));
  scene.add(V.at(V.B(300, 1.2, 60, CM('#9fbf7f', { roughness: 1 })), 0, -0.6, -4));
  const b = new THREE.Group(); b.position.set(-10, 0, -34); scene.add(b);
  b.add(V.at(V.B(70, 30, 26, CM('#f1f3f4')), 0, 15, 0)); for (let y = 4; y < 28; y += 4.5) b.add(V.at(V.B(70.2, 1.8, 26.2, CM('#6f9fc4', { roughness: 0.2, metalness: 0.3 })), 0, y, 0));
  const plus = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: V.textTex('+', { w: 256, h: 256, bg: '#d9412f', fg: '#ffffff', font: '900 240px Arial' }) })); plus.position.set(26, 24, 13.2); b.add(plus);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.6, 32), new THREE.MeshStandardMaterial({ color: '#5a5f66', roughness: 0.8 })); pad.position.set(16, 0.3, 4); pad.receiveShadow = true; scene.add(pad);
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: V.textTex('H', { w: 256, h: 256, bg: '#5a5f66', fg: '#f4f4f4', font: '900 220px Arial', border: '#f2c230' }), transparent: true })); hm.rotation.x = -Math.PI / 2; hm.position.set(16, 0.62, 4); scene.add(hm);
  const heli = V.helicopter(); scene.add(heli);
  const workers = [];
  for (let i = 0; i < 5; i++) { const c = person(scene, randomPerson(r, { top: { kind: 'tee', color: '#2aa198', trim: '#2aa198' }, bottom: { color: '#2aa198' }, shoes: '#f3f3f3' }), -4 + i * 3.6, 0, 12 + (i % 2) * 2, 2.4); workers.push({ c, ph: r() * 6 }); }
  const carts = []; for (let i = 0; i < 2; i++) { const cart = new THREE.Group(); cart.add(V.at(V.B(2.4, 0.3, 4.2, CM('#e9eef1')), 0, 2.4, 0)); for (const x of [-1, 1]) for (const z of [-1.8, 1.8]) cart.add(V.at(V.B(0.15, 2.3, 0.15, CM('#9aa1a8')), x, 1.15, z)); cart.add(V.at(V.B(2.0, 1.2, 3.0, CM('#3a7bd5')), 0, 3.2, 0)); cart.position.set(2 + i * 6, 0, 10); scene.add(cart); carts.push(cart); }
  const amb = V.ambulance(); amb.position.set(-26, H(-26, 36) + 0.1, 36); amb.rotation.y = Math.PI / 2; scene.add(amb);
  scene.userData.update = (t) => {
    const lt = t - 55.6; const land = Math.min(1, Math.max(0, lt / 2.4));
    heli.position.set(16 + (1 - land) * 20, 0.6 + (1 - THREE.MathUtils.smootherstep(land, 0, 1)) * 38, 4 - (1 - land) * 18); heli.rotation.set(0, -0.7 + land * 0.4, (1 - land) * 0.08);
    heli.userData.rotor.rotation.y = t * 22; heli.userData.tail.rotation.x = t * 30;
    workers.forEach((w, i) => { const k = Math.min(1, Math.max(0, lt - 1.2 - i * 0.2) / 1.5); w.c.root.position.x = -4 + i * 3.6 + k * 6; w.c.pose(k > 0 && k < 1 ? motion.run(t, 0.8, w.ph) : mergePose(motion.idle(t, 1, w.ph), { aRx: -0.8, eR: -0.9, aLx: -0.8, eL: -0.9 })); w.c.setFace({ eyes: 'open', mouth: 'flat', brows: 'flat' }, t, Math.sin(t * 2 + w.ph) > 0.6, w.ph); });
    carts.forEach((c, i) => { c.position.x = 2 + i * 6 + Math.min(1, Math.max(0, lt - 1.4) / 1.5) * 6; });
    V.flash(amb, t);
  };
  Object.assign(scene.userData, { exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= TRAIN STATION / TRANSIT HUB
export function buildStation(renderer, { hub = false } = {}) {
  const scene = new THREE.Scene(); const r = rng(hub ? 92 : 91); const sunDir = v3(0.5, 0.65, 0.5);
  scene.add(gradientDome({ top: '#3d7cc4', mid: '#d4e8f4', bottom: '#a7b0a0', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#d9eef8', bottom: '#8e8a80' })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#d4e8f4', 200, 800);
  sun(scene, '#fff2dc', 2.8, sunDir, v3(0, 0, 0), 70);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#8f8a80', 1.0));
  scene.add(V.at(V.B(400, 1, 400, CM('#8f8a80', { roughness: 1 })), 0, -1.5, 0));
  for (const x of [-10, 10]) { scene.add(V.at(V.B(1, 0.4, 600, CM('#6b6f75', { metalness: 0.6 })), x - 2.4, -0.8, 0), V.at(V.B(1, 0.4, 600, CM('#6b6f75', { metalness: 0.6 })), x + 2.4, -0.8, 0)); for (let z = -300; z < 300; z += 3) scene.add(V.at(V.B(7, 0.3, 1, CM('#5a4a3a')), x, -1.0, z)); }
  const platM = CM('#c9c4b9', { roughness: 0.9 });
  scene.add(V.at(V.B(12, 1.6, 160, platM), 0, 0.3, 0), V.at(V.B(0.4, 0.05, 160, CM('#f2c230')), -5.6, 1.12, 0), V.at(V.B(0.4, 0.05, 160, CM('#f2c230')), 5.6, 1.12, 0));
  for (let z = -70; z <= 70; z += 14) scene.add(V.at(V.B(0.6, 10, 0.6, CM('#7d858c', { metalness: 0.5 })), 0, 6, z));
  scene.add(V.at(V.B(16, 0.6, 156, CM(hub ? '#e9eef1' : '#3a4a5a', { roughness: 0.5 })), 0, 11.2, 0));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4), new THREE.MeshBasicMaterial({ map: V.textTex(hub ? 'CENTRAL TRANSIT HUB\nRAIL · BIKE · CARGO' : 'ALL LINES · EXTRA SERVICE\nNEXT TRAIN 2 MIN', { w: 768, h: 264, bg: '#0d1830', fg: '#ffd27f', font: '700 56px monospace' }), toneMapped: false })); board.position.set(0, 8.6, 30); scene.add(board);
  const tr = V.train(6, hub ? '#e9edf1' : '#c9ced3', hub ? '#3aa76d' : '#2f6fe0'); tr.position.set(10, -0.7, 0); scene.add(tr);
  const cargo = hub ? V.train(8, '#8e6a4a', '#5a4a3a') : null; if (cargo) { cargo.position.set(-10, -0.7, 0); scene.add(cargo); }
  const crowd = [];
  for (let i = 0; i < (hub ? 34 : 44); i++) { const c = person(scene, randomPerson(r), (r() - 0.5) * 9, 1.1, -60 + r() * 120, r() < 0.7 ? Math.PI / 2 : r() * 6); crowd.push({ c, ph: r() * 6, walk: r() < 0.3, z0: c.root.position.z, sp: (r() < 0.5 ? 1 : -1) * 2.5 }); }
  const bikes = []; if (hub) for (let i = 0; i < 10; i++) { const b = V.bicycle(['#e8423b', '#2f6fe0', '#3aa76d'][i % 3]); b.position.set(-4.6, 1.1, 40 + i * 2.2); b.rotation.y = Math.PI / 2; b.scale.setScalar(0.8); scene.add(b); bikes.push(b); }
  scene.userData.update = (t) => {
    const lt = t - (hub ? 71.5 : 58.6);
    const arrive = hub ? 1 - Math.exp(-Math.max(0, lt) * 0.9) : 1 - Math.exp(-Math.max(0, lt) * 1.2);
    tr.position.z = THREE.MathUtils.lerp(-260, 60, arrive);
    if (cargo) cargo.position.z = 200 - lt * 14;
    for (const p of crowd) { const z = p.walk ? p.z0 + p.sp * lt : p.z0; p.c.root.position.z = z; if (p.walk) { p.c.root.rotation.y = p.sp > 0 ? 0 : Math.PI; p.c.pose(motion.walk(t, 0.8, p.ph)); } else p.c.pose(mergePose(motion.idle(t, 1, p.ph), Math.sin(p.ph) > 0.6 ? motion.phone : {})); p.c.setFace({ eyes: 'open', mouth: hub ? 'smile' : 'flat' }, t, Math.sin(t + p.ph) > 0.7, p.ph); }
  };
  Object.assign(scene.userData, { exposure: 1.0, caustic: 0, board });
  return scene;
}

// ============================================================= AIRPORT (DAY #3)
export function buildAirport(renderer) {
  const scene = new THREE.Scene(); const r = rng(101); const sunDir = v3(-0.5, 0.55, 0.6);
  scene.add(gradientDome({ top: '#3d7cc4', mid: '#e3e9ee', bottom: '#b0aa9a', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#e9eef2', bottom: '#8e8a80' })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#e3e9ee', 250, 1200);
  sun(scene, '#fff2dc', 2.7, sunDir, v3(0, 0, 10), 90);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#8f8a80', 1.0));
  const H = (x, z) => -0.9 + Math.sin(x * 0.1) * 0.2 + Math.cos(z * 0.2) * 0.1;
  scene.add(dirtMesh(500, 40, 0, 30, H, 13));
  scene.add(V.at(V.B(500, 1.2, 30, CM('#c9c4b9')), 0, -0.5, 0));
  scene.add(V.at(V.B(500, 1.2, 400, CM('#7f8a6f', { roughness: 1 })), 0, -1.2, -220));
  const term = new THREE.Group(); term.position.set(0, 0, -30); scene.add(term);
  term.add(V.at(V.B(160, 18, 30, CM('#e9eef1')), 0, 9, 0), V.at(V.B(160.4, 12, 30.4, CM('#6f9fc4', { roughness: 0.15, metalness: 0.4 })), 0, 8, 0.1), V.at(V.B(166, 2, 36, CM('#f4f4f4')), 0, 18.5, 0));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 3), new THREE.MeshBasicMaterial({ map: V.textTex('DEPARTURES', { w: 1024, h: 118, bg: '#0d1830', fg: '#ffffff', font: '700 84px Arial, sans-serif' }) })); sign.position.set(0, 16, 15.3); term.add(sign);
  const plane = V.airplane('#2f6fe0'); scene.add(plane);
  const plane2 = V.airplane('#c4161c'); plane2.position.set(70, -0.9, -80); plane2.rotation.y = -0.8; scene.add(plane2);
  const trav = [];
  for (let i = 0; i < 24; i++) { const c = person(scene, randomPerson(r), -60 + r() * 120, 0, 60 + r() * 30, Math.PI); const sc = V.suitcase(['#2f4f8c', '#c9473a', '#3aa76d', '#2b2d31'][i % 4]); scene.add(sc); trav.push({ c, sc, ph: r() * 6, x: c.root.position.x, z0: c.root.position.z, sp: 2.4 + r() }); }
  const stranded = []; for (let i = 0; i < 7; i++) { const v = i % 3 ? V.car(['#c0392b', '#2f6fe0', '#f2f2f2', '#2b2d31'][i % 4], 'sedan') : V.bus('#f2f2f2'); v.position.set(-90 + i * 30, H(-90 + i * 30, 36) + 0.1, 36 + (i % 2) * 6); v.rotation.y = Math.PI / 2; scene.add(v); }
  scene.userData.update = (t) => {
    const lt = t - 61.6;
    plane.position.set(-200 + lt * 70, -0.9 + Math.max(0, lt - 1.2) ** 1.6 * 6, -140); plane.rotation.set(0, Math.PI / 2, 0); plane.rotateX(-Math.min(0.25, Math.max(0, lt - 1.2) * 0.15));
    for (const p of trav) { const z = p.z0 - p.sp * lt * 2; const y = z > 15 && z < 50 ? H(p.x, z) : z <= 15 ? 0.1 : 0; p.c.root.position.set(p.x, y, z); p.c.root.rotation.y = Math.PI; p.c.pose(mergePose(motion.walk(t, 0.8, p.ph), { aRx: 0.2, eR: 0 })); p.sc.position.set(p.x + 1.2, y, z + 1.3); p.sc.rotation.set(-0.35, 0, 0); p.c.setFace({ eyes: 'open', mouth: 'frown', brows: 'flat' }, t, false, p.ph); }
  };
  Object.assign(scene.userData, { exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= ROAD CONSTRUCTION (MONTH #6)
export function buildConstruction(renderer) {
  const scene = new THREE.Scene(); const r = rng(111); const sunDir = v3(0.2, 0.8, 0.4);
  const dome = gradientDome({ top: '#3d7cc4', mid: '#dbe9f2', bottom: '#a7b48a', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }); scene.add(dome);
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#d9eef8', bottom: '#8a9a70' })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#dbe9f2', 260, 1100);
  const key = sun(scene, '#fff2dc', 3.0, sunDir, v3(0, 0, 0), 90);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#7f8f60', 1.0));
  const H = (x, z) => -0.9 + Math.sin(z * 0.08) * 0.12 + Math.cos(x * 0.5 + z * 0.03) * 0.06;
  scene.add(dirtMesh(18, 800, 0, -200, H, 17));
  scene.add(V.at(V.B(400, 1.2, 800, CM('#86a862', { roughness: 1 })), -209, -0.6, -200), V.at(V.B(400, 1.2, 800, CM('#86a862', { roughness: 1 })), 209, -0.6, -200));
  // fresh asphalt that grows toward -z
  const asphalt = new THREE.Mesh(new THREE.BoxGeometry(17, 1.0, 1), CM('#2f3236', { roughness: 0.8 })); asphalt.receiveShadow = true; scene.add(asphalt);
  const lineM = CM('#f2f2f2');
  const lines = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 1), CM('#e8c33a')); scene.add(lines);
  // side bike path + cyclists + utility carts, rail line with a cargo train, a river with a barge
  scene.add(V.at(V.B(4, 0.3, 800, CM('#3f9a5a')), 16, 0.1, -200));
  scene.add(V.at(V.B(8, 0.6, 800, CM('#7a6f62')), -30, -0.2, -200)); for (let z = -600; z < 200; z += 3) scene.add(V.at(V.B(6, 0.25, 0.9, CM('#5a4a3a')), -30, 0.2, z));
  for (const x of [-32.4, -27.6]) scene.add(V.at(V.B(0.6, 0.4, 800, CM('#6b6f75', { metalness: 0.6 })), x, 0.5, -200));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 1200), new THREE.MeshStandardMaterial({ color: '#3f7f9a', roughness: 0.15, metalness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.set(110, -0.2, -200); scene.add(water);
  const cargo = V.train(9, '#8e6a4a', '#5a4a3a'); cargo.position.x = -30; cargo.position.y = 0.4; scene.add(cargo);
  const bargeG = V.barge(); bargeG.position.set(110, 0, 0); scene.add(bargeG);
  const pav = V.paver(), rol = V.roller(); pav.rotation.y = Math.PI; rol.rotation.y = Math.PI; scene.add(pav, rol);
  const crew = []; for (let i = 0; i < 6; i++) { const c = person(scene, randomPerson(r, { vest: '#ff7a1a', hardhat: '#f2c230', top: { kind: 'tee', color: '#5b6b7a', trim: '#5b6b7a' }, shoes: '#7a5a3a' }), (i % 2 ? 1 : -1) * (10 + (i % 3)), 0, 0); crew.push({ c, ph: r() * 6, dz: 6 + i * 4 }); }
  const cyclists = []; for (let i = 0; i < 4; i++) { const b = V.bicycle(['#e8423b', '#2f6fe0', '#3aa76d', '#f2c230'][i]); const c = makeCharacter(randomPerson(r, { hardhat: '#f4f4f4' })); scene.add(b, c.root); cyclists.push({ b, c, z0: -40 - i * 30, ph: r() * 6 }); }
  const carts = []; for (let i = 0; i < 2; i++) { const u = V.utilityCart(['#3aa76d', '#f2f2f2'][i]); scene.add(u); carts.push(u); }
  const worker = person(scene, CAST.worker, 9.6, 0.15, -40, -1.6);
  const L0 = 20;
  scene.userData.paveLength = (t) => (t < 64.5 ? L0 : L0 + Math.min(1, (t - 64.5) / 4.5) ** 0.9 * 260);
  scene.userData.update = (t) => {
    const L = scene.userData.paveLength(t);
    asphalt.scale.z = L; asphalt.position.set(0, -0.45, -L / 2 + 20); lines.scale.z = L; lines.position.set(0, 0.06, -L / 2 + 20);
    const fz = 20 - L;
    pav.position.set(0, 0, fz - 5); rol.position.set(0, 0.05, fz + 16); rol.userData.drum.rotation.x = t * 3;
    for (const w of crew) { w.c.root.position.z = fz + w.dz; w.c.root.rotation.y = w.c.root.position.x > 0 ? -Math.PI / 2 : Math.PI / 2; w.c.pose(mergePose(motion.idle(t, 1, w.ph), { aRx: -0.9 + Math.sin(t * 6 + w.ph) * 0.3, eR: -0.8, torsoX: 0.25 })); w.c.setFace({ eyes: 'open', mouth: 'flat' }, t, false, w.ph); }
    // time-lapse sun sweep during the paving shot
    const k = Math.min(1, Math.max(0, (t - 64.5) / 4.5)); const a = -0.9 + k * 1.8;
    key.position.set(Math.sin(a) * 200, 160, Math.cos(a) * 120 + 60);
    cargo.position.z = 200 - ((t * 22) % 900);
    bargeG.position.z = 60 - t * 3;
    cyclists.forEach((q, i) => { const z = q.z0 + ((t * 9 + i * 40) % 160) - 80; q.b.position.set(16, 0.25, z); q.b.rotation.y = 0; q.c.root.position.set(16, 0.45, z - 0.3); q.c.root.rotation.y = 0; q.c.pose({ hipY: -0.3, lLx: -0.2 + Math.sin(t * 6 + i) * 0.4, lRx: -0.2 - Math.sin(t * 6 + i) * 0.4, kL: 0.6, kR: 0.6, aLx: -1.0, aRx: -1.0, eL: -0.3, eR: -0.3, lean: 0.3 }); q.c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, i); });
    carts.forEach((u, i) => { u.position.set(16 + i * 0.4, 0.25, -120 + ((t * 12 + i * 80) % 200)); u.rotation.y = 0; V.spinWheels(u, t * 12); });
  };
  Object.assign(scene.userData, { actors: { worker }, exposure: 1.0, caustic: 0, key });
  return scene;
}
