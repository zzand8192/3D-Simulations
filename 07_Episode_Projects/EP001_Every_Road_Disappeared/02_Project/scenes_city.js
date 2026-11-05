// City grid (NYC / Tokyo / London / São Paulo / rebuilt year-5), residential street, and highway.
// World rule: at `tv` every road surface (asphalt, markings, crosswalks) is physically gone; the natural ground
// below remains about a metre lower. Sidewalks, buildings, rail, lights and signs stay. Vehicles drop and stop.
import * as THREE from 'three';
import { rng, causticMaterial, gradientDome } from './env.js';
import { makeCharacter, motion, mergePose } from './character.js';
import * as V from './vehicles.js';
import * as P from './props.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const SKINS = ['#f1c9a5', '#e0ac7e', '#c68e6a', '#a86f4c', '#8d5a3b', '#f3d2b5', '#d9a47c', '#6e4630'];
const HAIRS = ['#1a120c', '#3b2414', '#7a4a22', '#c9a36a', '#8f8f8f', '#2a1a12'];
const BRIGHT = ['#2f6fe0', '#e94f6a', '#f4c542', '#3aa76d', '#ef7b2d', '#8e5bd6', '#27b3c9', '#ff7aa8', '#f2f2f2', '#d9412f', '#5b6b7a'];
const CARCOLS = ['#c0392b', '#2f6fe0', '#f2f2f2', '#2b2d31', '#8e9aa6', '#3aa76d', '#f2b230', '#6b4bb3', '#d35400'];
export function randomPerson(r, extra = {}) {
  const f = r() < 0.5, c = BRIGHT[Math.floor(r() * BRIGHT.length)], c2 = BRIGHT[Math.floor(r() * BRIGHT.length)];
  return { skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], lips: f,
    hairStyle: f ? ['long', 'ponytail', 'bun', 'curly'][Math.floor(r() * 4)] : ['short', 'spiky', 'buzz', 'curly', 'bald'][Math.floor(r() * 5)],
    top: { kind: r() < 0.2 ? 'hoodie' : r() < 0.3 ? 'long' : 'tee', color: c, trim: r() < 0.5 ? '#ffffff' : c2 },
    bottom: { color: ['#2b3a55', '#23252b', '#c2b29a', '#4a4f57', '#5d6b7a'][Math.floor(r() * 5)], length: r() < 0.25 ? 'short' : 'long' },
    shoes: r() < 0.7 ? '#f3f3f3' : '#2a2c31', cap: r() < 0.12, capColor: c2, ...extra };
}
export function person(scene, spec, x, y, z, ry = 0) { const c = makeCharacter(spec); c.root.position.set(x, y, z); c.root.rotation.y = ry; scene.add(c.root); return c; }
export function envFrom(renderer, dome) { const pm = new THREE.PMREMGenerator(renderer); const s = new THREE.Scene(); s.add(dome.clone()); const t = pm.fromScene(s, 0.04).texture; pm.dispose(); return t; }
export function sun(scene, color, intensity, dir, target = v3(0, 0, 0), area = 80, size = 4096) {
  const d = new THREE.DirectionalLight(color, intensity); d.position.copy(dir.clone().normalize().multiplyScalar(200)).add(target); d.target.position.copy(target); scene.add(d, d.target);
  d.castShadow = true; d.shadow.mapSize.set(size, size); Object.assign(d.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 1, far: 600 });
  d.shadow.bias = -0.0004; d.shadow.normalBias = 0.06; return d;
}
export function dirtMesh(w, d, cx, cz, H, seed = 1, base = '#8b6b4a') {
  const g = new THREE.PlaneGeometry(w, d, Math.round(w / 2.5), Math.round(d / 2.5)); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), c0 = new THREE.Color(base), c = new THREE.Color(), r = rng(seed);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x, z)); c.copy(c0).multiplyScalar(0.82 + r() * 0.12 + Math.sin(x * 0.3 + z * 0.21) * 0.06); c.offsetHSL(0, 0, (H(x, z) + 0.9) * 0.08); cols.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, causticMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.receiveShadow = true; return m;
}

const STYLES = {
  nyc: { cols: ['#c9b79c', '#a65d3f', '#d7cfc0', '#8e8a84', '#b8a07e', '#e2d6c0', '#7d8a96'], h: [28, 110], sky: ['#3d7cc4', '#cfe4f2', '#a8b4bc'], sunDir: v3(-0.5, 0.75, 0.6) },
  tokyo: { cols: ['#e6e3dc', '#c9ccd1', '#b4bcc6', '#efe9dc', '#9aa5b1', '#d7d0c2'], h: [22, 70], sky: ['#4f86c9', '#dde9f2', '#b9c2c9'], sunDir: v3(0.4, 0.8, 0.5), signs: true },
  london: { cols: ['#9c5a40', '#b8704f', '#e8e0cf', '#8a4a35', '#d9cdb5', '#a9604a'], h: [12, 22], sky: ['#7d97b5', '#dfe5ea', '#b0b6bb'], sunDir: v3(0.3, 0.55, 0.6), chimneys: true },
  sao: { cols: ['#ece8df', '#d9d3c7', '#f2ede2', '#c9c3b7', '#e3d9c5'], h: [34, 90], sky: ['#3f7fc9', '#d6e8f4', '#b8bcae'], sunDir: v3(-0.3, 0.8, 0.4), balconies: true },
  rebuilt: { cols: ['#c9b79c', '#d7cfc0', '#9fb5c9', '#e2d6c0', '#a7c4d6', '#c3d4c8'], h: [30, 120], sky: ['#3f86d0', '#d8ecf7', '#b6c4cc'], sunDir: v3(-0.4, 0.55, 0.7) },
};

export function buildCity(renderer, opts = {}) {
  const st = STYLES[opts.style || 'nyc'], tv = opts.tv ?? -1, rebuilt = opts.style === 'rebuilt';
  const r = rng(opts.seed || 11);
  const scene = new THREE.Scene();
  const dome = gradientDome({ top: st.sky[0], mid: st.sky[1], bottom: st.sky[2], sunDir: st.sunDir.clone().normalize(), sunColor: '#fff2d6', sunSize: 0.03 });
  scene.add(dome);
  scene.environment = envFrom(renderer, gradientDome({ top: st.sky[0], mid: st.sky[1], bottom: '#8e8a80', sunDir: st.sunDir })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog(st.sky[1], 160, 700);
  const key = sun(scene, '#fff2dc', 2.9, st.sunDir, v3(0, 0, 0), 120, 4096);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#9a8f80', 0.95));

  const AV = opts.avenues || [-120, 0, 120], ST = opts.streets || [-240, -160, -80, 0, 80, 160], AW = opts.aw || 24, SW = opts.sw || 16, SIDE = 6;
  const X0 = -220, X1 = 220, Z0 = -320, Z1 = 240;
  const H = (x, z) => -0.95 + Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.22 + Math.sin(x * 0.47 + z * 0.31) * 0.09;
  // ground: dirt (always) + road group (asphalt + markings) that can vanish
  scene.add(dirtMesh(X1 - X0, Z1 - Z0, 0, (Z0 + Z1) / 2, H, 3));
  const roads = new THREE.Group(); scene.add(roads);
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), causticMaterial({ color: rebuilt ? '#4a4d52' : '#3e4146', roughness: 0.92 }));
  asphalt.rotation.x = -Math.PI / 2; asphalt.position.set(0, 0, (Z0 + Z1) / 2); asphalt.receiveShadow = true; roads.add(asphalt);
  const white = causticMaterial({ color: '#e9e9e2', roughness: 0.8 }), yellow = causticMaterial({ color: '#e8c33a', roughness: 0.8 }), green = causticMaterial({ color: '#3f9a5a', roughness: 0.8 });
  const stripe = (w, d, x, z, m) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); o.rotation.x = -Math.PI / 2; o.position.set(x, 0.03, z); o.receiveShadow = true; roads.add(o); };
  for (const ax of AV) {
    for (let z = Z0; z < Z1; z += 10) if (!ST.some((s) => Math.abs(z - s) < SW / 2 + 6)) { stripe(0.25, 5, ax - 6, z, white); stripe(0.25, 5, ax + 6, z, white); }
    stripe(0.25, Z1 - Z0, ax - 0.3, (Z0 + Z1) / 2, yellow); stripe(0.25, Z1 - Z0, ax + 0.3, (Z0 + Z1) / 2, yellow);
    if (rebuilt) { stripe(3, Z1 - Z0, ax - AW / 2 + 1.6, (Z0 + Z1) / 2, green); stripe(3, Z1 - Z0, ax + AW / 2 - 1.6, (Z0 + Z1) / 2, green); }
    for (const sz of ST) for (const side of [-1, 1]) for (let i = -5; i <= 5; i++) stripe(1.2, 4.2, ax + i * 2.1, sz + side * (SW / 2 + 2.6), white);
  }
  for (const sz of ST) for (let x = X0; x < X1; x += 10) if (!AV.some((a) => Math.abs(x - a) < AW / 2 + 6)) stripe(5, 0.25, x, sz, white);
  roads.visible = tv < 0 ? !!opts.roadsIntact : true;

  // blocks: raised sidewalk platforms with buildings
  const lots = [];
  const sideM = causticMaterial({ color: '#c4c0b8', roughness: 0.9 }), curbM = causticMaterial({ color: '#a19d95', roughness: 0.9 });
  const xs = [X0, ...AV, X1], zs = [Z0, ...ST, Z1];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const bx0 = xs[i] + (i ? AW / 2 : 0), bx1 = xs[i + 1] - (i + 1 < xs.length - 1 ? AW / 2 : 0);
    const bz0 = zs[j] + (j ? SW / 2 : 0), bz1 = zs[j + 1] - (j + 1 < zs.length - 1 ? SW / 2 : 0);
    const w = bx1 - bx0, d = bz1 - bz0, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
    const plat = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), [curbM, curbM, sideM, curbM, curbM, curbM]); plat.position.set(cx, 0.3 - 1.3, cz); plat.receiveShadow = true; plat.castShadow = true; scene.add(plat);
    // buildings around the block edge
    const inset = SIDE + (rebuilt ? 3 : 0);
    const edge = (ax, az, len, nx, nz) => { // walk along one block face; normal (nx,nz) points to the street
      let u = -len / 2 + inset;
      while (u < len / 2 - inset - 6) {
        const lw = Math.min(10 + r() * 14, len / 2 - inset - u); if (lw < 6) break;
        const h = st.h[0] + r() * (st.h[1] - st.h[0]) * (opts.style === 'nyc' && Math.hypot(cx, cz) > 150 ? 0.6 : 1);
        const depth = 14 + r() * 6;
        const b = P.building(r, lw, h, depth, st.cols[Math.floor(r() * st.cols.length)]);
        const px = ax + (nz !== 0 ? u + lw / 2 : 0) - nx * (inset + depth / 2), pz = az + (nx !== 0 ? u + lw / 2 : 0) - nz * (inset + depth / 2);
        b.position.set(px, 0.3, pz); b.rotation.y = Math.atan2(nx, nz); scene.add(b); lots.push(b);
        if (st.signs && r() < 0.6) { const sg = V.B(1.6, 6 + r() * 6, 0.4, causticMaterial({ color: BRIGHT[Math.floor(r() * BRIGHT.length)], emissive: '#ffffff', emissiveIntensity: 0.08 })); sg.position.set(lw / 2 - 1.2, 10 + r() * 8, depth / 2 + 0.6); b.add(sg); }
        if (st.chimneys) for (let k = 0; k < 2; k++) b.add(V.at(V.B(1.2, 2.6, 1.2, causticMaterial({ color: '#8a4a35' })), -lw / 4 + k * lw / 2, h + 1.3, 0));
        if (st.balconies) for (let y = 6; y < h - 4; y += 5) b.add(V.at(V.B(lw * 0.8, 0.3, 1.4, causticMaterial({ color: '#f4f2ec' })), 0, y, depth / 2 + 0.7));
        if (rebuilt && r() < 0.35) b.add(V.at(V.B(lw - 1, 0.8, depth - 1, causticMaterial({ color: '#5f9a4a' })), 0, h + 0.5, 0)); // green roof
        u += lw + 0.4;
      }
    };
    edge(cx, bz1, w, 0, 1); edge(cx, bz0, w, 0, -1); edge(bx1, cz, d, 1, 0); edge(bx0, cz, d, -1, 0);
    // street trees + lamps along the block edges near the middle of the city
    if (Math.abs(cx) < 140 && cz > -200) {
      for (let u = -w / 2 + 8; u < w / 2 - 6; u += rebuilt ? 9 : 16) for (const zz of [bz0 + 2.5, bz1 - 2.5]) {
        if (rebuilt || r() < 0.5) { const tr = tree(r, rebuilt ? 1.1 : 0.9); tr.position.set(cx + u, 0.3, zz); scene.add(tr); }
      }
    }
  }
  // traffic lights at the intersections of the main avenue
  const lights = [];
  for (const sz of ST) for (const ax of [AV[1]]) {
    for (const [sx, sz2, ry] of [[1, 1, Math.PI], [-1, -1, 0]]) {
      const tl = V.trafficLight(9); tl.position.set(ax + sx * (AW / 2 + 1.2), 0.3, sz + sz2 * (SW / 2 + 1.2)); tl.rotation.y = ry + (sx > 0 ? -Math.PI / 2 : Math.PI / 2) * 0; scene.add(tl); lights.push(tl);
      tl.rotation.y = sx > 0 ? Math.PI : 0;
    }
  }
  for (const sz of ST) for (const ax of AV) for (const [dx, dz] of [[1, 1], [-1, -1]]) { const l = V.streetLamp(); l.position.set(ax + dx * (AW / 2 + 1.5), 0.3, sz + dz * (SW / 2 + 9)); l.rotation.y = dx > 0 ? Math.PI : 0; scene.add(l); }

  // ---------------- traffic on the main avenue (lanes run along z) + cross street at z = 0
  const vehicles = [];
  const ax = AV[1];
  const laneXs = [ax - 9, ax - 3, ax + 3, ax + 9], dirs = [1, 1, -1, -1];
  if (!opts.noTraffic) laneXs.forEach((lx, li) => {
    const NC = opts.carsPerLane || 7, SPC = 364 / NC;
    for (let k = 0; k < NC; k++) {
      const kind = r() < 0.18 ? 'taxi' : r() < 0.3 ? 'suv' : r() < 0.4 ? 'hatch' : 'sedan';
      const v = k === 3 && li === 1 && !rebuilt && !opts.noBus ? V.bus(opts.busColor || '#2f6fe0', !!opts.doubleDecker) : V.car(kind === 'taxi' ? (opts.taxi || '#f2c230') : CARCOLS[Math.floor(r() * CARCOLS.length)], kind);
      scene.add(v);
      vehicles.push({ v, x: lx, z0: (-200 + k * SPC + r() * SPC * 0.35) * dirs[li], dir: dirs[li], speed: rebuilt ? 14 : 18 + r() * 4, ph: r() * 6, avenue: true });
    }
  });
  // cross-street cars waiting at the red light
  if (!opts.noTraffic) for (let k = 0; k < 3; k++) for (const side of [-1, 1]) {
    const v = V.car(CARCOLS[Math.floor(r() * CARCOLS.length)], r() < 0.3 ? 'suv' : 'sedan'); scene.add(v);
    vehicles.push({ v, x: ax + side * (AW / 2 + 9 + k * 13), z: side * 3.6, yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2, parked: true, ph: r() * 6 });
  }
  const T0 = opts.tStart || 0;
  function placeVehicles(t) {
    const tl = t - T0;
    for (const q of vehicles) {
      let x, z, yaw;
      if (q.parked) { x = q.x; z = q.z; yaw = q.yaw; }
      else {
        const gone = tv >= 0 && t >= tv;
        const d = tv >= 0 ? V.laneTravel(tl, tv - T0, q.speed) : (opts.stranded ? 0 : q.speed * tl);
        z = q.z0 + q.dir * d; z = ((z - Z0) % (Z1 - Z0 - 40) + (Z1 - Z0 - 40)) % (Z1 - Z0 - 40) + Z0 + 20; x = q.x; yaw = q.dir > 0 ? 0 : Math.PI;
        V.spinWheels(q.v, d);
      }
      const goneNow = (tv >= 0 && t >= tv) || (tv < 0 && !opts.roadsIntact);
      const drop = tv >= 0 ? THREE.MathUtils.smoothstep(t, tv, tv + 0.14) : goneNow ? 1 : 0;
      q.v.position.set(x, THREE.MathUtils.lerp(0, H(x, z) + 0.1, drop), z); q.v.rotation.y = yaw;
      const since = tv >= 0 ? t - tv : 9;
      const jolt = since > 0 && since < 1.2 ? Math.sin(since * 14) * Math.exp(-since * 4) * 0.06 : 0;
      q.v.userData.body.rotation.set(jolt + (goneNow ? Math.sin(x * 0.7 + z) * 0.02 : 0), 0, goneNow ? Math.cos(x + z * 0.5) * 0.025 : 0);
    }
  }
  // pedestrians on the sidewalks + a few crossing
  const peds = [];
  for (let i = 0; i < (opts.peds ?? 46); i++) {
    const side = r() < 0.5 ? -1 : 1, c = person(scene, randomPerson(r), 0, 0.3, 0);
    peds.push({ c, x: ax + side * (AW / 2 + 1.6 + r() * 3.2), z0: -150 + r() * 260, sp: (r() < 0.5 ? 1 : -1) * (2.8 + r()), ph: r() * 6, react: r(), stand: r() < 0.25 });
  }
  const crossers = [];
  if (!opts.noCrossers) for (let i = 0; i < 4; i++) { const c = person(scene, randomPerson(r), 0, 0, 0); crossers.push({ c, z: -SW / 2 - 2.6 + (i % 2) * 1.6, x0: ax - AW / 2 - 1 + (i < 2 ? 0 : AW + 2), dir: i < 2 ? 1 : -1, t0: 1.0 + i * 0.6, ph: r() * 6 }); }
  function placePeople(t) {
    const goneNow = (tv >= 0 && t >= tv) || (tv < 0 && !opts.roadsIntact);
    for (const p of peds) {
      const tl = t - T0; const stopT = tv >= 0 ? Math.min(tl, tv - T0 + 0.4) : (goneNow && !rebuilt ? 0 : tl);
      const z = ((p.z0 + p.sp * (p.stand ? 0 : stopT) + 170) % 300 + 300) % 300 - 170;
      const walking = !p.stand && !(goneNow && (tv < 0 || t > tv + 0.4));
      p.c.root.position.set(p.x, 0.3, z);
      if (walking) { p.c.root.rotation.y = p.sp > 0 ? 0 : Math.PI; p.c.pose(motion.walk(t, 0.85, p.ph)); p.c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, p.ph); }
      else if (goneNow && !rebuilt) {
        const toRoad = p.x > ax ? -Math.PI / 2 : Math.PI / 2;
        const k = tv >= 0 ? THREE.MathUtils.smoothstep(t, tv + 0.2 + p.react * 0.6, tv + 0.7 + p.react * 0.6) : 1;
        p.c.root.rotation.y = THREE.MathUtils.lerp(p.sp > 0 ? 0 : Math.PI, toRoad, k);
        const pose = p.react < 0.25 ? motion.handsOnHead : p.react < 0.5 ? motion.point : p.react < 0.7 ? mergePose(motion.lookDown, { aRx: -0.4, eR: -1.4 }) : motion.phone;
        p.c.pose(mergePose(motion.idle(t, 1, p.ph), k > 0.5 ? pose : {}, { headX: 0.35 * k }));
        p.c.setFace(k > 0.5 ? { eyes: 'wide', mouth: p.react < 0.4 ? 'o' : 'small-o', brows: 'up' } : { eyes: 'open', mouth: 'smile' }, t, k > 0.5 && Math.sin(t * 2 + p.ph) > 0.3, p.ph);
      } else { p.c.root.rotation.y = p.x > ax ? -Math.PI / 2 : Math.PI / 2; p.c.pose(motion.idle(t, 1, p.ph)); p.c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, p.ph); }
    }
    for (const c of crossers) {
      const tl = t - T0 - c.t0; const stopT = tv >= 0 ? Math.min(tl, tv - T0 - c.t0) : tl;
      const x = c.x0 + c.dir * Math.max(0, stopT) * 3.2; const onRoad = Math.abs(x - ax) < AW / 2;
      const y = onRoad ? (goneNow ? H(x, c.z) + 0.05 : 0) : 0.3;
      c.c.root.position.set(x, y, c.z); c.c.root.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (tl < 0) { c.c.pose(motion.idle(t)); }
      else if (!goneNow) c.c.pose(motion.walk(t, 0.85, c.ph));
      else { const s = t - tv; c.c.pose(mergePose(motion.idle(t), s < 0.6 ? { aLz: 0.9, aRz: 0.9, kL: 0.5, kR: 0.4, lLx: -0.4, hipY: -0.25 } : mergePose(motion.lookDown, { aRz: 0.3, aLz: 0.3 }))); }
      c.c.setFace(goneNow ? { eyes: 'wide', mouth: 'o', brows: 'up' } : { eyes: 'open', mouth: 'smile' }, t, false, c.ph);
    }
  }
  // the rebuilt city gets an elevated rail line over the avenue + a light-rail train
  let railTrain = null;
  if (rebuilt) {
    const conc = causticMaterial({ color: '#d7d4cc', roughness: 0.8 });
    const deck = V.B(9, 1.6, Z1 - Z0, conc); deck.position.set(ax + AW / 2 + 12, 24, (Z0 + Z1) / 2); scene.add(deck);
    for (let z = Z0 + 10; z < Z1; z += 30) { const p = V.B(2.2, 24, 2.2, conc); p.position.set(ax + AW / 2 + 12, 12, z); scene.add(p); }
    railTrain = V.train(4, '#e9edf1', '#2fb3c9'); scene.add(railTrain);
  }
  // street cyclist waiting at the corner
  const cyc = !opts.noCrossers ? { bike: V.bicycle('#e8423b'), rider: makeCharacter(randomPerson(rng(77), { cap: false, top: { kind: 'tee', color: '#3aa76d', trim: '#ffffff' }, hardhat: '#f4f4f4' })) } : null;
  if (cyc) { scene.add(cyc.bike, cyc.rider.root); }
  // a delivery truck turning the corner
  const truck = !opts.noTraffic && !rebuilt ? V.boxTruck('#f2f2f2', '#d35400') : null; if (truck) scene.add(truck);
  const turn = new THREE.CatmullRomCurve3([v3(ax - 80, 0, -3.6), v3(ax - 30, 0, -3.6), v3(ax - 9, 0, -6), v3(ax - 3, 0, -26), v3(ax - 3, 0, -90)]);

  const extras = [];
  scene.userData.update = (t) => {
    if (tv >= 0) roads.visible = t < tv;
    placeVehicles(t); placePeople(t);
    for (const tl of lights) tl.userData.set(V.lightCycle(t, opts.lightPhase || 0));
    if (cyc) {
      const goneNow = (tv >= 0 && t >= tv) || (tv < 0 && !opts.roadsIntact);
      const y = goneNow ? H(ax + AW / 2 + 1.5, 12) + 0.05 : 0;
      cyc.bike.position.set(ax + AW / 2 - 1.2, y, 12.5); cyc.bike.rotation.y = Math.PI;
      cyc.rider.root.position.set(ax + AW / 2 - 1.2, y + 0.2, 12.2); cyc.rider.root.rotation.y = Math.PI;
      cyc.rider.pose(mergePose({ hipY: -0.3, lLx: -0.2, kL: 0.3, lRz: 0.25, aLx: -1.0, aRx: -1.0, eL: -0.3, eR: -0.3, lean: 0.25 }, goneNow ? { headX: 0.45 } : {}));
      cyc.rider.setFace(goneNow ? { eyes: 'wide', mouth: 'o', brows: 'up' } : { eyes: 'open', mouth: 'flat' }, t, false, 2);
    }
    if (truck) {
      const d = tv >= 0 ? V.laneTravel(t - T0, tv - T0, 9) : 0; const u = Math.min(0.95, d / turn.getLength());
      const p = turn.getPointAt(u), tg = turn.getTangentAt(u); const goneNow = tv >= 0 && t >= tv;
      truck.position.set(p.x, goneNow ? H(p.x, p.z) + 0.1 : 0, p.z); truck.rotation.y = Math.atan2(tg.x, tg.z); V.spinWheels(truck, d);
    }
    if (railTrain) { const z = ((t * 26) % 520) - 300; railTrain.position.set(ax + AW / 2 + 12, 24.8, z); }
    extras.forEach((f) => f(t));
  };
  scene.userData.update(0);
  Object.assign(scene.userData, { H, roads, vehicles, peds, lights, ax, AW, SW, extras, key, exposure: 1.0, caustic: 0, dome });
  return scene;
}

export function tree(r, s = 1) {
  const g = new THREE.Group(); g.add(V.at(V.B(0.5, 4, 0.5, causticMaterial({ color: '#6b4f36' })), 0, 2, 0));
  const lm = causticMaterial({ color: ['#4f8a3c', '#5f9a46', '#3f7a3a'][Math.floor(r() * 3)], roughness: 0.9, flatShading: true });
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + r() * 0.8, 0), lm); b.position.set((r() - 0.5) * 1.6, 5 + i * 1.1, (r() - 0.5) * 1.6); b.castShadow = true; g.add(b); }
  g.scale.setScalar(s); return g;
}

// ============================================================= residential street (road already gone)
export function buildSuburb(renderer) {
  const scene = new THREE.Scene(); const r = rng(21);
  const sunDir = v3(0.5, 0.7, 0.6);
  scene.add(gradientDome({ top: '#3d7cc4', mid: '#d4e8f4', bottom: '#9fb08a', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#d9eef8', bottom: '#8a9a70' })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#d4e8f4', 120, 500);
  sun(scene, '#fff2dc', 2.8, sunDir, v3(0, 0, 0), 60);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#7f8f60', 1.0));
  const H = (x, z) => -0.95 + Math.sin(x * 0.17) * 0.18 + Math.cos(z * 0.6 + x * 0.05) * 0.08;
  scene.add(dirtMesh(400, 14, 0, 12, H, 5));                               // the strip where the street was
  const grass = causticMaterial({ color: '#6fa04f', roughness: 1 }), side = causticMaterial({ color: '#c4c0b8', roughness: 0.9 }), curb = causticMaterial({ color: '#a19d95' });
  for (const [z, d] of [[-14, 30], [38, 30]]) { const g = new THREE.Mesh(new THREE.BoxGeometry(400, 2.6, d), [curb, curb, grass, curb, curb, curb]); g.position.set(0, -1.0, z); g.receiveShadow = true; scene.add(g); }
  for (const z of [3.5, 20.5]) { const s = new THREE.Mesh(new THREE.BoxGeometry(400, 2.62, 5), [curb, curb, side, curb, curb, curb]); s.position.set(0, -0.99, z); s.receiveShadow = true; scene.add(s); }
  // houses facing the street (+z)
  const houses = [];
  const HC = ['#f1e6d6', '#cfdde6', '#e8d2b8', '#f4f1ea', '#d6c4e0', '#c9dfc3'];
  for (let i = -6; i <= 6; i++) {
    const g = new THREE.Group(); g.position.set(i * 22, 0.3, -16); scene.add(g); houses.push(g);
    const c = HC[(i + 7) % HC.length];
    g.add(V.at(V.B(16, 9, 12, causticMaterial({ color: c }), 0.2), 0, 4.5, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(11.5, 6, 4), causticMaterial({ color: '#6b4a3a', flatShading: true })); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75); roof.position.y = 12; roof.castShadow = true; g.add(roof);
    for (const x of [-4.8, 4.8]) { g.add(V.at(V.B(3, 3, 0.2, causticMaterial({ color: '#2a3b4c', roughness: 0.2 })), x, 5, 6.05), V.at(V.B(3.4, 0.3, 0.4, causticMaterial({ color: '#fff' })), x, 3.4, 6.1)); }
    g.add(V.at(V.B(5, 0.6, 3, causticMaterial({ color: '#b9b4aa' })), 0, 0.3, 7.5));             // porch step
    g.add(V.at(V.B(3, 0.2, 12, side), 0, 0.05, 13));                                               // walkway to sidewalk
    const doorPivot = new THREE.Group(); doorPivot.position.set(-1.25, 0, 6.05); g.add(doorPivot);
    doorPivot.add(V.at(V.B(2.5, 5.2, 0.25, causticMaterial({ color: ['#8e3b2b', '#2f4f8c', '#3a6b4a'][(i + 9) % 3] })), 1.25, 2.6, 0));
    g.userData.door = doorPivot;
    const mb = new THREE.Group(); mb.add(V.at(V.B(0.25, 3, 0.25, causticMaterial({ color: '#555' })), 0, 1.5, 0), V.at(V.B(1, 0.8, 1.4, causticMaterial({ color: '#2b2d31' }), 0.2), 0, 3.2, 0)); mb.position.set(i * 22 + 4, 0.3, 4.5); scene.add(mb);
    if (r() < 0.7) { const t = tree(r, 1.2); t.position.set(i * 22 + 9, 0.3, -2); scene.add(t); }
  }
  // parked cars stranded where the curbside used to be + a basketball hoop, bins
  for (let i = 0; i < 6; i++) { const v = V.car(CARCOLS[Math.floor(r() * CARCOLS.length)], r() < 0.4 ? 'suv' : 'sedan'); const x = -70 + i * 26 + r() * 6; v.position.set(x, H(x, 8) + 0.1, 8); v.rotation.y = Math.PI / 2; v.userData.body.rotation.z = 0.03; scene.add(v); }
  const owner = person(scene, { name: 'homeowner', skin: '#c68e6a', hair: '#1a120c', hairStyle: 'buzz', top: { kind: 'tee', color: '#8e5bd6', trim: '#ffffff' }, bottom: { color: '#5d6b7a' }, shoes: '#2a2c31', beard: '#2a1a12' }, 0, 0.3, -12);
  const mug = P.cup('#f2f2f2'); owner.armL.hand.add(mug); mug.position.set(0, -0.45, 0.2); mug.scale.setScalar(1.4);
  const neighbors = [];
  for (let i = 0; i < 4; i++) { const c = person(scene, randomPerson(r), -60 + i * 38 + r() * 8, 0.3, 3 + r() * 1.5, 0); neighbors.push({ c, ph: r() * 6, react: r() }); }
  scene.userData.update = (t) => {
    for (const n of neighbors) { n.c.root.rotation.y = 0; n.c.pose(mergePose(motion.idle(t, 1, n.ph), n.react < 0.5 ? motion.lookDown : motion.phone)); n.c.setFace({ eyes: 'wide', mouth: 'small-o', brows: 'up' }, t, false, n.ph); }
  };
  Object.assign(scene.userData, { H, actors: { owner }, house: houses[6], exposure: 1.0, caustic: 0 });
  return scene;
}

// ============================================================= highway aerial (road already gone)
export function buildHighway(renderer) {
  const scene = new THREE.Scene(); const r = rng(31);
  const sunDir = v3(-0.6, 0.6, 0.4);
  scene.add(gradientDome({ top: '#3d7cc4', mid: '#d8e9f2', bottom: '#a7b48a', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }));
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#d9eef8', bottom: '#8a9a70' })); scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#d8e9f2', 300, 1400);
  sun(scene, '#fff2dc', 2.6, sunDir, v3(0, 0, 0), 260, 4096);
  scene.add(new THREE.HemisphereLight('#cfe3f7', '#6f7f50', 1.0));
  const path = new THREE.CatmullRomCurve3([v3(-700, 0, 300), v3(-350, 0, 120), v3(-120, 0, 160), v3(60, 0, 40), v3(220, 0, -60), v3(420, 0, -40), v3(700, 0, -220)]);
  const pts = path.getSpacedPoints(400);
  const distToPath = (x, z) => { let m = 1e9; for (let i = 0; i < pts.length; i += 2) { const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  const hills = (x, z) => Math.sin(x * 0.006) * 18 + Math.cos(z * 0.008 + x * 0.002) * 14 + Math.sin(x * 0.02 + z * 0.015) * 3;
  const pathY = (x, z) => { let best = 1e9, y = 0; for (let i = 0; i < pts.length; i += 2) { const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2; if (d < best) { best = d; y = hills(pts[i].x, pts[i].z) * 0.4; } } return y; };
  // terrain: grass hills with a graded strip (bare earth) where the highway was; river crosses at x≈-260
  const g = new THREE.PlaneGeometry(1600, 1200, 220, 170); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
  const grassC = new THREE.Color('#7da05a'), dirtC = new THREE.Color('#9a7552'), riverZ = (x) => 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); const d = distToPath(x, z);
    const k = THREE.MathUtils.smoothstep(d, 16, 34);
    let y = THREE.MathUtils.lerp(pathY(x, z) - 1.2 + Math.sin(x * 0.3) * 0.2, hills(x, z), k);
    const river = Math.abs(x + 260) < 26 ? 1 - Math.abs(x + 260) / 26 : 0; y -= river * 14;
    p.setY(i, y);
    c.copy(grassC).lerp(dirtC, 1 - k).multiplyScalar(0.9 + Math.sin(x * 0.05 + z * 0.07) * 0.06); cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, causticMaterial({ vertexColors: true, roughness: 1, flatShading: true })); ground.receiveShadow = true; scene.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(50, 1200), new THREE.MeshStandardMaterial({ color: '#3f7f9a', roughness: 0.15, metalness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.set(-260, -8, 0); scene.add(water);
  const groundY = (x, z) => { const d = distToPath(x, z); const k = THREE.MathUtils.smoothstep(d, 16, 34); return THREE.MathUtils.lerp(pathY(x, z) - 1.2, hills(x, z), k); };
  // stranded vehicles along the strip (both directions), stopping short of the river
  for (let i = 0; i < 90; i++) {
    const u = 0.08 + i * 0.0095; if (u > 0.95) break; const q = path.getPointAt(u), tg = path.getTangentAt(u);
    if (Math.abs(q.x + 260) < 40) continue;
    const side = i % 2 ? 1 : -1, off = side * (5 + (i % 4 < 2 ? 0 : 6));
    const nx = -tg.z, nz = tg.x; const x = q.x + nx * off, z = q.z + nz * off;
    const v = r() < 0.15 ? V.boxTruck('#f2f2f2', CARCOLS[Math.floor(r() * CARCOLS.length)]) : V.car(CARCOLS[Math.floor(r() * CARCOLS.length)], r() < 0.4 ? 'suv' : 'sedan');
    v.position.set(x, groundY(x, z) + 0.1, z); v.rotation.y = Math.atan2(tg.x, tg.z) + (side < 0 ? Math.PI : 0) + (r() - 0.5) * 0.2; scene.add(v);
  }
  // emergency staging area beside the strip + responders, and cones/lights at the river edge
  const flashers = [], resp = [];
  const stage = path.getPointAt(0.52); const tg = path.getTangentAt(0.52);
  for (let i = 0; i < 4; i++) { const a = V.ambulance(); const x = stage.x + 40 + i * 13, z = stage.z + 30; a.position.set(x, groundY(x, z) + 0.1, z); a.rotation.y = 0.4; scene.add(a); flashers.push(a); }
  for (let i = 0; i < 8; i++) { const x = stage.x + 34 + (i % 4) * 12, z = stage.z + 16 + Math.floor(i / 4) * 6; const c = person(scene, randomPerson(r, { vest: '#f2e12a', hardhat: i % 2 ? '#f4f4f4' : null, top: { kind: 'long', color: '#1f3a6b', trim: '#1f3a6b' } }), x, groundY(x, z), z, -2.4 + r()); resp.push({ c, ph: r() * 6 }); }
  for (const side of [-1, 1]) { const x = -260 + side * 34; for (let k = -2; k <= 2; k++) { const cn = V.cone(); const z = path.getPointAt(0.21).z + k * 4; cn.position.set(x, groundY(x, z), z); cn.scale.setScalar(2); scene.add(cn); } const a = V.ambulance(); a.position.set(x + side * 14, groundY(x + side * 14, 150), 150); scene.add(a); flashers.push(a); }
  for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 1400, z = (r() - 0.5) * 1000; if (distToPath(x, z) < 40 || Math.abs(x + 260) < 40) continue; const t = tree(r, 2 + r() * 1.5); t.position.set(x, hills(x, z), z); scene.add(t); }
  scene.userData.update = (t) => {
    flashers.forEach((f, i) => V.flash(f, t, i));
    for (const { c, ph } of resp) { c.pose(mergePose(motion.idle(t, 1, ph), Math.sin(t + ph) > 0 ? motion.point : motion.phone)); c.setFace({ eyes: 'open', mouth: 'flat', brows: 'flat' }, t, Math.sin(t * 2 + ph) > 0.5, ph); }
  };
  Object.assign(scene.userData, { path, groundY, exposure: 1.0, caustic: 0 });
  return scene;
}
