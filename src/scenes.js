// All sets for "What if every human could breathe underwater?"
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import {
  U, rng, causticMaterial, gradientDome, surfaceFromBelow, lightShafts, particles, terrain,
  rock, coral, kelp, school, bubbleEmitter, fish,
} from './env.js';
import { makeCharacter, motion, mergePose } from './character.js';
import * as P from './props.js';

// ---------------------------------------------------------------- cast: one spec per recurring person
export const CAST = {
  sam:      { name: 'sam', skin: '#d9a47c', hair: '#3b2414', hairStyle: 'short', top: { sleeves: 'none' }, bottom: { color: '#1f8fd8', length: 'short' }, shoes: 'none', glasses: true },
  mia:      { name: 'mia', skin: '#f1c9a5', hair: '#7a4a22', hairStyle: 'long', top: { sleeves: 'none', color: '#e94f6a' }, swimsuit: '#e94f6a', bottom: { color: '#e94f6a', length: 'short' }, shoes: 'none', lips: true },
  kai:      { name: 'kai', skin: '#8d5a3b', hair: '#140d09', hairStyle: 'curly', top: { sleeves: 'none' }, bottom: { color: '#f08a24', length: 'short' }, shoes: 'none' },
  guard:    { name: 'guard', skin: '#c98d62', hair: '#2a1a10', hairStyle: 'short', top: { color: '#d9412f', trim: '#ffffff', text: 'GUARD' }, bottom: { color: '#d9412f', length: 'short' }, shoes: 'none', cap: '#d9412f' },
  reporter: { name: 'reporter', skin: '#e8b48e', hair: '#2a1a12', hairStyle: 'long', top: { color: '#1f3a6b', trim: '#f4f4f4', sleeves: 'long' }, bottom: { color: '#2b2f3a' }, shoes: '#222222', lips: true },
  chairguy: { name: 'chairguy', skin: '#f0c39b', hair: '#8f8f8f', hairStyle: 'short', top: { sleeves: 'none' }, bottom: { color: '#2e9b5f', length: 'short' }, shoes: 'none', glasses: true },
  anchor:   { name: 'anchor', skin: '#c68e6a', hair: '#1e130d', hairStyle: 'bun', top: { color: '#16264a', trim: '#ffffff', sleeves: 'long' }, bottom: { color: '#16264a' }, shoes: '#111', lips: true },
  sci1:     { name: 'sci1', skin: '#f0c8a0', hair: '#5b4a3a', hairStyle: 'short', top: { color: '#9cc3e6', trim: '#9cc3e6' }, bottom: { color: '#30343c' }, shoes: '#222', coat: true },
  sci2:     { name: 'sci2', skin: '#a8704c', hair: '#120c08', hairStyle: 'ponytail', top: { color: '#3c3f46', trim: '#3c3f46' }, bottom: { color: '#30343c' }, shoes: '#222', coat: true, lips: true },
  volunteer:{ name: 'volunteer', skin: '#d9a27a', hair: '#2a1a12', hairStyle: 'spiky', top: { sleeves: 'none' }, bottom: { color: '#24324f', length: 'short' }, shoes: 'none' },
  ray:      { name: 'ray', skin: '#e9b98f', hair: '#c9a36a', hairStyle: 'spiky', top: { sleeves: 'none' }, bottom: { color: '#ff7aa8', length: 'short' }, shoes: 'none', glasses: true },
  dan:      { name: 'dan', skin: '#d29a6f', hair: '#3b2414', hairStyle: 'short', top: { color: '#2f6fe0', trim: '#f0a03a' }, bottom: { color: '#23252b' }, shoes: '#f3f3f3' },
  ava:      { name: 'ava', skin: '#f1c9a5', hair: '#3b2414', hairStyle: 'ponytail', top: { color: '#f4c542', trim: '#ffffff' }, bottom: { color: '#3a5a8a' }, shoes: '#f3f3f3', lips: true },
  owen:     { name: 'nb1', skin: '#e0ac7e', hair: '#1a120c', hairStyle: 'short', top: { color: '#3aa76d', trim: '#ffffff' }, bottom: { color: '#4a4f57' }, shoes: '#f3f3f3' },
  luis:     { name: 'nb2', skin: '#a86f4c', hair: '#140d09', hairStyle: 'short', top: { color: '#ef7b2d', trim: '#1f3a6b' }, bottom: { color: '#1f3a6b' }, shoes: '#f3f3f3', cap: '#1f3a6b' },
};
const SKINS = ['#f1c9a5', '#e0ac7e', '#c68e6a', '#a86f4c', '#8d5a3b', '#f3d2b5', '#d9a47c', '#6e4630'];
const HAIRS = ['#1a120c', '#3b2414', '#7a4a22', '#c9a36a', '#8f8f8f', '#2a1a12'];
const BRIGHT = ['#2f6fe0', '#e94f6a', '#f4c542', '#3aa76d', '#ef7b2d', '#8e5bd6', '#27b3c9', '#ff7aa8', '#f2f2f2', '#d9412f'];
export function randomPerson(r, kind = 'beach', extra = {}) {
  const female = r() < 0.5, c = BRIGHT[Math.floor(r() * BRIGHT.length)], c2 = BRIGHT[Math.floor(r() * BRIGHT.length)];
  const hairStyle = female ? ['long', 'ponytail', 'bun', 'curly'][Math.floor(r() * 4)] : ['short', 'spiky', 'short', 'curly', 'bald'][Math.floor(r() * 5)];
  const base = { skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], hairStyle, lips: female };
  if (kind === 'swim') return { ...base, top: { sleeves: 'none', color: c }, swimsuit: female ? c : undefined, bottom: { color: female ? c : c2, length: 'short' }, shoes: 'none', glasses: r() < 0.2, ...extra };
  return { ...base, top: { color: c, trim: r() < 0.5 ? '#ffffff' : c2 }, bottom: { color: r() < 0.5 ? '#2b3a55' : ['#23252b', '#c2b29a', '#4a4f57'][Math.floor(r() * 3)], length: r() < 0.4 ? 'short' : 'long' }, shoes: r() < 0.7 ? '#f3f3f3' : '#2a2c31', cap: r() < 0.15 ? c2 : undefined, ...extra };
}

// ---------------------------------------------------------------- helpers
function envFrom(renderer, dome) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene(); s.add(dome.clone());
  const t = pm.fromScene(s, 0.04).texture; pm.dispose(); return t;
}
function sun(scene, color, intensity, pos, target = new THREE.Vector3(), area = 40, size = 2048) {
  const d = new THREE.DirectionalLight(color, intensity);
  d.position.copy(pos).add(target); d.target.position.copy(target); scene.add(d, d.target);
  d.castShadow = true; d.shadow.mapSize.set(size, size);
  const c = d.shadow.camera; c.left = -area; c.right = area; c.top = area; c.bottom = -area; c.near = 1; c.far = 500;
  d.shadow.bias = -0.0004; d.shadow.normalBias = 0.05;
  return d;
}
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const pos = (o, v) => { o.position.copy(v); return o; };
function person(scene, spec, x, y, z, ry = 0) { const c = makeCharacter(spec); c.root.position.set(x, y, z); c.root.rotation.y = ry; scene.add(c.root); return c; }
function underwaterBase(renderer, { fogColor, density, top, mid, bottom, sunDir, envK = 0.8 }) {
  const scene = new THREE.Scene();
  scene.add(gradientDome({ top, mid, bottom, sunDir, sunColor: '#c9f7ff', sunSize: 0.2 }));
  scene.environment = envFrom(renderer, gradientDome({ top, mid, bottom })); scene.environmentIntensity = envK;
  scene.fog = new THREE.FogExp2(fogColor, density);
  return scene;
}

// ============================================================= BEACH (sunny, crowded). Water line at z ≈ -6, sea level y = 0
export const beachHeight = (x, z) => {
  const dune = 0.12 + Math.sin(x * 0.08) * Math.cos(z * 0.07) * 0.22 + Math.max(0, z - 30) * 0.03;
  const k = THREE.MathUtils.smoothstep(z, -9, -3);
  return dune * k + Math.max(-14, Math.min(0, z + 6) * 0.35);
};
export function buildBeach(renderer) {
  const scene = new THREE.Scene();
  const sunDir = v3(0.45, 0.62, -0.65).normalize();
  const domeU = gradientDome({ top: '#2f6fc4', mid: '#bfe3f7', bottom: '#2a6f8f', sunDir, sunColor: '#fff2d2', sunSize: 0.03 });
  scene.add(domeU);
  scene.environment = envFrom(renderer, gradientDome({ top: '#5a8fd6', mid: '#d9eef8', bottom: '#b8a98a', sunDir })); scene.environmentIntensity = 0.75;
  scene.fog = new THREE.Fog('#cfe6f2', 120, 700);
  sun(scene, '#fff1dc', 3.0, sunDir.clone().multiplyScalar(150), v3(0, 0, 0), 55, 4096);
  scene.add(new THREE.HemisphereLight('#bcd9f5', '#c7a979', 0.9));

  // sand (sloping into the sea)
  const sg = new THREE.PlaneGeometry(420, 240, 210, 120); sg.rotateX(-Math.PI / 2); sg.translate(0, 0, 40);
  const pp = sg.attributes.position, cols = new Float32Array(pp.count * 3), dry = new THREE.Color('#e8cf9f'), wetC = new THREE.Color('#a88d63'), deep = new THREE.Color('#7f7a62'), tc = new THREE.Color();
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), z = pp.getZ(i); pp.setY(i, beachHeight(x, z));
    if (z > -3) tc.copy(dry).lerp(wetC, THREE.MathUtils.smoothstep(-z, -6, 3)); else tc.copy(wetC).lerp(deep, Math.min(1, (-3 - z) / 20));
    tc.multiplyScalar(0.94 + Math.sin(x * 1.3 + z * 0.7) * 0.03); cols.set([tc.r, tc.g, tc.b], i * 3);
  }
  sg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); sg.computeVertexNormals();
  const sand = new THREE.Mesh(sg, causticMaterial({ vertexColors: true, roughness: 0.95 })); sand.receiveShadow = true; scene.add(sand);

  // sea
  const seaG = new THREE.PlaneGeometry(1400, 900, 180, 110); seaG.rotateX(-Math.PI / 2); seaG.translate(0, 0, -455);
  const sp = seaG.attributes.position, base = Float32Array.from(sp.array), sc = new Float32Array(sp.count * 3);
  const shallowC = new THREE.Color('#47c4cf'), deepC = new THREE.Color('#0f5f8c');
  for (let i = 0; i < sp.count; i++) { tc.copy(shallowC).lerp(deepC, Math.min(1, Math.max(0, (-sp.getZ(i) - 6) / 60))); sc.set([tc.r, tc.g, tc.b], i * 3); }
  seaG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sea = new THREE.Mesh(seaG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9, envMapIntensity: 1.1 }));
  sea.receiveShadow = true; scene.add(sea);
  const foamM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, transparent: true, opacity: 0.7 });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(420, 1.6), foamM); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.12, -5.6); scene.add(foam);
  const foam2 = new THREE.Mesh(new THREE.PlaneGeometry(420, 0.8), foamM); foam2.rotation.x = -Math.PI / 2; foam2.position.set(0, 0.1, -12); scene.add(foam2);

  const r = rng(101);
  const updaters = [];
  // town & hotels behind the beach + on the left headland
  for (let i = 0; i < 16; i++) { const w = 10 + r() * 10, h = 14 + r() * 26; const b = P.building(r, w, h, 12); b.position.set(-150 + i * 20 + r() * 4, beachHeight(0, 78), 78 + r() * 8); scene.add(b); }
  for (let i = 0; i < 9; i++) { const w = 9 + r() * 8, h = 10 + r() * 22; const b = P.building(r, w, h, 10); b.position.set(-118 - r() * 30, 0, 50 - i * 14); b.rotation.y = Math.PI / 2; scene.add(b); }
  // promenade + palms + lamp posts
  const prom = P.box(400, 0.6, 10, causticMaterial({ color: '#cfc6b8', roughness: 0.8 })); prom.position.set(0, beachHeight(0, 62) + 0.3, 62); scene.add(prom);
  for (let i = 0; i < 14; i++) { const p = P.palm(r, 8 + Math.floor(r() * 4)); p.position.set(-130 + i * 20 + r() * 6, beachHeight(0, 56), 56 + r() * 4); scene.add(p); }
  for (let i = 0; i < 6; i++) { const p = P.palm(r, 7 + Math.floor(r() * 3)); p.position.set(-60 + r() * 120, beachHeight(0, 40), 38 + r() * 12); scene.add(p); }
  // distant headlands
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#6f8f7a', roughness: 1, flatShading: true }));
    m.scale.set(80 + r() * 60, 20 + r() * 25, 50); m.position.set(i < 2 ? -330 - i * 120 : 330 + (i - 2) * 140, -8, -380 - r() * 80); scene.add(m);
  }
  // sailboats on the horizon
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group(); b.add(P.box(5, 1, 1.6, causticMaterial({ color: '#f4f4f4' })));
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2, 7, 3), causticMaterial({ color: '#ffffff', flatShading: true })); sail.position.y = 4; b.add(sail);
    b.position.set(-160 + i * 110 + r() * 30, 0.4, -260 - r() * 120); scene.add(b);
  }

  // umbrellas, towels, and the crowd on the sand
  const umbCols = [['#e8423b', '#ffffff'], ['#2f7fe0', '#ffffff'], ['#f6c53a', '#2f7fe0'], ['#3aa76d', '#ffffff'], ['#ff7aa8', '#ffffff'], ['#ef7b2d', '#f6e7b0']];
  const crowd = [];
  for (let i = 0; i < 26; i++) {
    const x = -46 + (i % 13) * 7.2 + (r() - 0.5) * 3, z = 3 + Math.floor(i / 13) * 13 + r() * 6;
    if (Math.abs(x + 10) < 5 && z < 14) continue; // keep lifeguard tower clear
    if (x > -2 && x < 18 && z < 22) continue;       // camera lane toward the water
    const y = beachHeight(x, z);
    if (r() < 0.75) { const [a, b] = umbCols[Math.floor(r() * umbCols.length)]; const u = P.umbrella(r, a, b); u.position.set(x, y, z); scene.add(u); }
    const tw = P.towel(r, BRIGHT[Math.floor(r() * BRIGHT.length)], '#ffffff'); tw.position.set(x + 1.6, y, z + 0.6); scene.add(tw);
    const n = 1 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const c = person(scene, randomPerson(r, r() < 0.6 ? 'swim' : 'beach'), x + 1.6 + (k - 0.5) * 1.8, y, z + 0.5 + (r() - 0.5), r() < 0.5 ? 0.1 + r() * 0.4 : -0.2 - r() * 0.4);
      const kind = Math.floor(r() * 3), ph = r() * 6;
      crowd.push({ c, kind, ph });
    }
  }
  // walkers along the waterline
  for (let i = 0; i < 6; i++) {
    const c = person(scene, randomPerson(r, r() < 0.5 ? 'swim' : 'beach'), 0, 0, 0);
    crowd.push({ c, kind: 'walk', ph: r() * 6, z: -1.5 + r() * 4, x0: -60 + r() * 120, dir: r() < 0.5 ? 1 : -1, sp: 2 + r() });
  }
  // kids with a beach ball
  const ball = P.beachBall(0.55); scene.add(ball);
  const kids = [];
  for (let i = 0; i < 3; i++) { const c = person(scene, randomPerson(r, 'swim', { scale: 0.62 }), 0, 0, 0); kids.push(c); }
  // a sandcastle
  { const sc = causticMaterial({ color: '#d9bf8c', roughness: 1 }); const g = new THREE.Group();
    g.add(P.box(2.4, 0.9, 2.4, sc)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = P.box(0.6, 1.6, 0.6, sc); t.position.set(x, 0.8, z); g.add(t); }
    g.position.set(19, beachHeight(19, 1), 1); scene.add(g); }

  updaters.push((t) => {
    for (const p of crowd) {
      const { c, ph } = p;
      if (p.kind === 'walk') {
        const x = ((p.x0 + p.dir * p.sp * t + 80) % 160 + 160) % 160 - 80;
        c.root.position.set(x, beachHeight(x, p.z), p.z); c.root.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        c.pose(motion.walk(t, p.sp / 3.2, ph)); c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, ph);
      } else if (p.kind === 0) { c.pose(motion.lieBack()); c.setFace({ eyes: 'closed', mouth: 'smile' }, t, false, ph); }
      else if (p.kind === 1) { c.pose(motion.sitFloor(t, ph)); c.setFace({ eyes: 'open', mouth: 'smile' }, t, Math.sin(t * 0.5 + ph) > 0.6, ph); }
      else { c.pose(mergePose(motion.idle(t, 1, ph), { aRx: -0.4, eR: -1.6 })); c.setFace({ eyes: 'open', mouth: 'smile' }, t, Math.sin(t * 0.6 + ph) > 0.5, ph); }
    }
    // kids chase the ball
    const bx = 13 + Math.sin(t * 1.1) * 4, bz = 7 + Math.cos(t * 0.9) * 3, by = beachHeight(bx, bz) + 0.55 + Math.abs(Math.sin(t * 3.2)) * 3.2;
    ball.position.set(bx, by, bz); ball.rotation.set(t * 3, t * 2, 0);
    kids.forEach((k, i) => {
      const a = t * 1.1 + i * 2.1, x = 13 + Math.cos(a) * 3.6, z = 7 + Math.sin(a) * 3.2;
      k.root.position.set(x, beachHeight(x, z) + Math.abs(Math.sin(t * 6 + i)) * 0.4, z);
      k.root.rotation.y = Math.atan2(bx - x, bz - z);
      k.pose(mergePose(motion.walk(t, 1.6, i), { aLx: -2.6, aRx: -2.6, aLz: 0.3, aRz: 0.3 }));
      k.setFace({ eyes: 'happy', mouth: 'grin' }, t, false, i);
    });
  });

  // swimmers in the sea (water at chest height)
  const swimmers = [];
  for (let i = 0; i < 18; i++) {
    const x = -50 + r() * 100, z = -13 - r() * 22;
    if (Math.abs(x - 6) < 6 && z > -24) continue; // space for Sam & Mia
    const c = person(scene, randomPerson(r, 'swim'), x, 0, z, (r() - 0.5) * 2);
    const sx = r() < 0.25 ? (r() < 0.5 ? 1 : -1) : 0, sxb = r();
    swimmers.push({ c, ph: r() * 6, x, z, swimX: z < -24 ? sx : 0 });
  }
  updaters.push((t) => {
    for (const s of swimmers) {
      const { c, ph } = s;
      const x = s.swimX ? s.x + s.swimX * ((t * 1.6) % 30) : s.x;
      if (s.swimX) { c.root.position.set(x, -2.1, s.z); c.root.rotation.y = s.swimX > 0 ? Math.PI / 2 : -Math.PI / 2; c.pose(motion.swim(t, 1, ph)); }
      else { c.root.position.set(x, -3.6 + Math.sin(t * 1.3 + ph) * 0.18, s.z); c.pose(motion.tread(t, 0.8, ph)); }
      c.setFace(s.react ? s.react(t) : { eyes: 'open', mouth: 'smile' }, t, false, ph);
    }
  });

  // lifeguard tower + lifeguard
  const tower = P.lifeguardTower(); tower.position.set(-10, beachHeight(-10, 8), 8); scene.add(tower);
  const guard = person(scene, CAST.guard, -10, tower.position.y + 5.35, 8.6, Math.PI);
  const mega = P.megaphone(); mega.rotation.x = -Math.PI / 2; mega.position.set(0, -0.2, 0.1); guard.armR.hand.add(mega);

  // seagulls
  const gulls = [];
  for (let i = 0; i < 7; i++) { const g = P.seagull(); scene.add(g); gulls.push({ g, ph: r() * 6, R: 14 + r() * 20, h: 22 + r() * 14, cx: -20 + r() * 40, cz: -10 + r() * 20 }); }
  updaters.push((t) => {
    for (const { g, ph, R, h, cx, cz } of gulls) {
      const a = t * 0.35 + ph; g.position.set(cx + Math.cos(a) * R, h + Math.sin(t * 0.7 + ph) * 1.5, cz + Math.sin(a) * R);
      g.rotation.y = -a; const f = Math.sin(t * 7 + ph) * 0.6; g.userData.wings[0].rotation.x = f; g.userData.wings[1].rotation.x = -f;
    }
  });

  // named actors
  const actors = {
    sam: person(scene, CAST.sam, 6, -3.6, -16, 0.2),
    mia: person(scene, CAST.mia, 2.6, -3.6, -15.2, 0.5),
    kai: person(scene, CAST.kai, -14, -3.6, -13, 0.6),
    guard,
    reporter: person(scene, CAST.reporter, -26, beachHeight(-26, -1), -1, 0.15),
    chairguy: person(scene, CAST.chairguy, -22, -10, -30, 0),
  };
  const mic = P.microphone(); mic.rotation.x = Math.PI; mic.position.y = -0.1; actors.reporter.armR.hand.add(mic);
  const chair = P.lawnChair(); chair.scale.setScalar(0.9); chair.rotation.set(0, Math.PI / 2, 0); chair.position.set(0.55, -1.4, 0.2); actors.chairguy.armR.hand.add(chair);
  const shades = P.sunglasses(); shades.visible = false; scene.add(shades);

  const splash = bubbleEmitter(120); scene.add(splash);
  scene.userData.update = (t) => {
    for (let i = 0; i < sp.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      sp.setY(i, Math.sin(x * 0.07 + t * 0.9 + z * 0.02) * 0.16 + Math.sin(z * 0.15 + t * 1.5) * 0.14 + Math.sin((x - z) * 0.31 + t * 2.3) * 0.05);
    }
    sp.needsUpdate = true; seaG.computeVertexNormals();
    foam.position.z = -5.6 + Math.sin(t * 0.8) * 0.8; foamM.opacity = 0.55 + Math.sin(t * 0.8) * 0.2;
    foam2.position.z = -12 + Math.sin(t * 0.8 + 1.5) * 1.5;
    updaters.forEach((u) => u(t)); splash.userData.update(t);
  };
  Object.assign(scene.userData, { caustic: 0, exposure: 0.95, actors, splash, shades, swimmers, crowd, dome: domeU, sand });
  return scene;
}

// ============================================================= SHALLOWS (surface y = 10, sandy floor ~0)
export function buildShallows(renderer) {
  const scene = underwaterBase(renderer, { fogColor: '#1f8aa3', density: 0.016, top: '#8be4f2', mid: '#2593ad', bottom: '#0e4f66', sunDir: v3(0.3, 1, -0.2) });
  sun(scene, '#ecfdff', 2.6, v3(25, 120, 15), v3(0, 0, 0), 90, 4096);
  scene.add(new THREE.HemisphereLight('#c4f3ff', '#5a6a55', 0.9));
  const floor = terrain({ size: 360, seg: 180, color: '#d7c49c', amp: 0.55, seed: 3, flatRadius: 18 }); scene.add(floor);
  const H = floor.userData.heightAt;
  scene.add(surfaceFromBelow({ y: 10, size: 700, strength: 0.85, color: '#c8f7ff' }));
  const shafts = lightShafts({ count: 26, area: 150, top: 10, length: 26, opacity: 0.13 }); scene.add(shafts);
  scene.add(particles({ count: 1400, box: [150, 12, 150], center: v3(0, 5, 0), size: 0.06, opacity: 0.5 }));
  const r = rng(202); const updaters = [shafts.userData.update];
  const put = (o, x, z, y = 0) => { o.position.set(x, H(x, z) + y, z); scene.add(o); return o; };
  // seagrass, rocks, shells, starfish, a few corals
  const grassM = causticMaterial({ color: '#5f9a46', roughness: 0.8, side: THREE.DoubleSide });
  const blade = new THREE.BoxGeometry(0.12, 1, 0.03); blade.translate(0, 0.5, 0);
  const grass = new THREE.InstancedMesh(blade, grassM, 2600); const tmp = new THREE.Object3D(); const gph = [];
  for (let i = 0; i < 2600; i++) {
    const cx = (r() - 0.5) * 220, cz = (r() - 0.5) * 220; if (Math.hypot(cx, cz) < 7) { i--; continue; }
    tmp.position.set(cx, H(cx, cz), cz); tmp.scale.set(1, 0.8 + r() * 1.8, 1); tmp.rotation.set((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3); tmp.updateMatrix(); grass.setMatrixAt(i, tmp.matrix); gph.push(r() * 6);
  }
  grass.receiveShadow = true; scene.add(grass);
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 9 + r() * 90; put(rock(r, ['#8b8f8a', '#9a8f7c', '#7c8a8c'][i % 3], 0.5 + r() * 1.8), Math.cos(a) * d, Math.sin(a) * d, -0.2); }
  for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = 12 + r() * 80; put(coral(r, 0.7 + r() * 0.6), Math.cos(a) * d, Math.sin(a) * d); }
  const starM = causticMaterial({ color: '#f07a3a' });
  for (let i = 0; i < 14; i++) { const s = new THREE.Group(); for (let k = 0; k < 5; k++) { const a = P.box(0.6, 0.08, 0.16, starM); a.position.x = 0.3; const p = new THREE.Group(); p.rotation.y = k * 1.2566; p.add(a); s.add(p); } put(s, (r() - 0.5) * 60, (r() - 0.5) * 60, 0.05); }
  [school({ n: 16, seed: 41, size: 0.5, spread: 5, path: (t, v) => v.set(Math.cos(t * 0.2) * 14, 6 + Math.sin(t * 0.5), Math.sin(t * 0.2) * 9 - 10) }),
   school({ n: 10, seed: 42, size: 0.6, spread: 3, path: (t, v) => v.set(-30 + ((t * 2.4) % 70), 4.5, -14) }),
   school({ n: 14, seed: 43, size: 0.5, spread: 4, path: (t, v) => v.set(60 + Math.cos(t * 0.3) * 10, 6, Math.sin(t * 0.3) * 8 - 8) }),
   school({ n: 12, seed: 44, size: 0.55, spread: 4, path: (t, v) => v.set(-60 + Math.cos(t * 0.25) * 10, 6.5, Math.sin(t * 0.25) * 8 - 9) })]
    .forEach((s) => { scene.add(s); updaters.push(s.userData.update); });

  // ---- area A (0,0): Sam's dive and the crowd that follows
  const actors = {
    sam: person(scene, CAST.sam, 0, 5.4, 0), mia: person(scene, CAST.mia, -2, 5.4, 0),
  };
  const shadesProp = P.sunglasses(); scene.add(shadesProp);
  const crowdA = [];
  for (let i = 0; i < 12; i++) {
    const c = person(scene, randomPerson(r, 'swim'), 0, 0, 0);
    crowdA.push({ c, ph: r() * 6, x: -12 + r() * 24, z: -12 + r() * 9, mode: i < 5 ? 'surface' : i < 9 ? 'dive' : 'sit', t0: 14.5 + r() * 2 });
  }
  scene.userData.crowdA = crowdA;
  updaters.push((t) => {
    for (const p of crowdA) {
      const { c, ph } = p;
      if (p.mode === 'surface' || t < p.t0) { c.root.position.set(p.x, 5.4 + Math.sin(t * 1.3 + ph) * 0.15, p.z); c.root.rotation.set(0, ph, 0); c.pose(motion.tread(t, 0.8, ph)); c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, ph); continue; }
      const k = Math.min(1, (t - p.t0) / 1.6);
      if (p.mode === 'dive') { c.root.position.set(p.x, THREE.MathUtils.lerp(5.4, 2.0, k), p.z); c.root.rotation.set(0, ph, 0); c.pose(motion.tread(t, 1, ph)); c.setFace({ eyes: k < 1 ? 'squeeze' : 'wide', mouth: k < 1 ? 'puff' : 'grin', brows: 'up' }, t, false, ph); }
      else { c.root.position.set(p.x, THREE.MathUtils.lerp(5.4, H(p.x, p.z), k), p.z); c.root.rotation.set(0, ph * 0.3 - 0.2, 0); c.pose(k < 1 ? motion.tread(t, 1, ph) : motion.crossLegFloor(t, ph)); c.setFace({ eyes: 'happy', mouth: 'smile' }, t, false, ph); }
    }
  });

  // ---- area B (60,0): school route with a buoy line + sign
  { const signM = causticMaterial({ color: '#ffffff', map: P.canvasTex(512, 160, (g, W, Hh) => { g.fillStyle = '#1f6f8c'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#fff'; g.font = '600 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAYVIEW HIGH  →', W / 2, Hh / 2 + 4); }) });
    const sign = new THREE.Group(); sign.add(P.box(0.25, 5, 0.25, causticMaterial({ color: '#555' }))); sign.children[0].position.y = 2.5;
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.6, 0.15), [causticMaterial({ color: '#1f6f8c' }), causticMaterial({ color: '#1f6f8c' }), causticMaterial({ color: '#1f6f8c' }), causticMaterial({ color: '#1f6f8c' }), signM, causticMaterial({ color: '#1f6f8c' })]);
    board.position.y = 5.2; board.castShadow = true; sign.add(board); put(sign, 63, -3);
    const buoyM = causticMaterial({ color: '#f6c53a' }); for (let i = 0; i < 30; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), i % 2 ? buoyM : causticMaterial({ color: '#e8423b' })); b.position.set(40 + i * 1.6, 9.6, -4); scene.add(b); }
  }
  const students = [];
  for (let i = 0; i < 4; i++) {
    const c = person(scene, randomPerson(r, 'beach', { scale: 0.74, backpack: ['#e8423b', '#2f7fe0', '#3aa76d', '#8e5bd6'][i], bottom: { color: '#2b3a55', length: 'long' } }), 0, 0, 0);
    students.push({ c, ph: r() * 6, lag: i * 1.6, y: 4.2 + (i % 2) * 1.1, z: 1 - i * 0.9 });
  }
  scene.userData.students = students;
  // ---- area C (-60,0): Dan's sandwich
  const seatRock = rock(rng(9), '#8a8f8c', 1.0); seatRock.scale.set(1.6, 1.3, 1.4); put(seatRock, -60, 0, 0.0);
  actors.dan = person(scene, CAST.dan, -60, H(-60, 0), 0.9, 0.15);
  const sandwich = P.sandwich(); sandwich.scale.setScalar(0.6); scene.add(sandwich);
  // ---- area D (0,-60): Ava and her phone
  actors.ava = person(scene, CAST.ava, 0, 0, -60, 0);
  const phone = P.phone(); actors.ava.armR.hand.add(phone); phone.position.set(-0.05, -0.32, 0.12); phone.rotation.set(-1.2, 0.3, 0);

  const bubbles = bubbleEmitter(200); scene.add(bubbles);
  scene.userData.update = (t, cam) => {
    updaters.forEach((u) => u(t, cam)); bubbles.userData.update(t);
  };
  Object.assign(scene.userData, { caustic: 0.85, surfaceY: 10, exposure: 0.85, actors, bubbles, shadesProp, sandwich, phone, H });
  return scene;
}

// ============================================================= POOL (underwater view; surface y = 10)
export function buildPool(renderer) {
  const scene = underwaterBase(renderer, { fogColor: '#4fc3df', density: 0.018, top: '#c6f6ff', mid: '#58cde6', bottom: '#2a9fc0', sunDir: v3(0, 1, 0), envK: 1 });
  sun(scene, '#ffffff', 2.4, v3(10, 100, 20), v3(0, 0, 0), 40, 2048);
  scene.add(new THREE.HemisphereLight('#e6fbff', '#6fb7c9', 1.0));
  const tile = P.canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#7fd3ec'; g.fillRect(0, 0, W, H); g.strokeStyle = '#d6f4fb'; g.lineWidth = 6; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, H); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(W, i * 32); g.stroke(); } }, [8, 8]);
  const tileM = causticMaterial({ color: '#ffffff', map: tile, roughness: 0.4 });
  const W = 34, L = 70, D = 10.5;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, L), tileM); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  for (const [w, x, z, ry] of [[L, -W / 2, 0, Math.PI / 2], [L, W / 2, 0, -Math.PI / 2], [W, 0, -L / 2, 0], [W, 0, L / 2, Math.PI]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, D + 4), tileM); m.position.set(x, (D + 4) / 2, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m);
  }
  const laneM = causticMaterial({ color: '#1f4f8c' });
  for (let i = -2; i <= 2; i++) { const s = P.box(0.6, 0.02, L - 6, laneM); s.position.set(i * 6.5, 0.02, 0); scene.add(s); }
  scene.add(surfaceFromBelow({ y: D, size: 140, strength: 0.9, color: '#e6fdff' }));
  const r = rng(303);
  // ladder
  const steel = causticMaterial({ color: '#d9dde0', metalness: 0.8, roughness: 0.25 });
  for (const x of [-1, 1]) { const rail = P.box(0.18, 9, 0.18, steel); rail.position.set(W / 2 - 0.6, 6, 10 + x); scene.add(rail); }
  for (let i = 0; i < 4; i++) { const s = P.box(0.6, 0.12, 2, steel); s.position.set(W / 2 - 0.5, 4 + i * 1.8, 10); scene.add(s); }
  // Ray in his lawn chair
  const chair = P.lawnChair('#ff7aa8', '#ffffff'); chair.position.set(0, 0, 4); chair.rotation.y = 0.5; scene.add(chair);
  const ray = person(scene, CAST.ray, 0, 0, 4, 0.5);
  const drink = P.cup('#f6c53a'); ray.armL.hand.add(drink); drink.position.set(0, -0.3, 0.15);
  // public-pool crowd (for the "Tokyo" news cut), far end
  const crowd = [];
  for (let i = 0; i < 10; i++) { const x = -12 + (i % 5) * 6 + r() * 2, z = -22 - Math.floor(i / 5) * 6; const c = person(scene, randomPerson(r, 'swim'), x, 0, z, (r() - 0.5) * 1.2); crowd.push({ c, ph: r() * 6, sit: i % 3 !== 0 }); }
  const bubbles = bubbleEmitter(80); scene.add(bubbles);
  scene.userData.update = (t) => {
    ray.pose(mergePose(motion.lounge(t), { aLx: -0.6 + Math.sin(Math.max(0, Math.min(1, (t - 44.4) / 0.5)) * Math.PI) * -1.0, eL: -1.9, aLz: 0.3 }));
    for (const { c, ph, sit } of crowd) {
      if (sit) { c.root.position.y = 0; c.pose(motion.crossLegFloor(t, ph)); } else { c.root.position.y = 2.5 + Math.sin(t + ph) * 0.3; c.pose(motion.tread(t, 1, ph)); }
      c.setFace({ eyes: 'happy', mouth: 'grin' }, t, false, ph);
    }
    bubbles.userData.update(t);
  };
  Object.assign(scene.userData, { caustic: 0.6, surfaceY: D, exposure: 0.72, actors: { ray }, bubbles });
  return scene;
}

// ============================================================= NEWS STUDIO
export function buildStudio(renderer, wallTexture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050b18');
  scene.environment = envFrom(renderer, gradientDome({ top: '#1d3b78', mid: '#0b1a36', bottom: '#050b18' })); scene.environmentIntensity = 0.6;
  const key = new THREE.SpotLight('#fff3e4', 900, 60, 0.5, 0.6, 1.5); key.position.set(4, 14, 14); key.target.position.set(0, 4.5, 0); key.castShadow = true; scene.add(key, key.target);
  const fill = new THREE.PointLight('#8fb4ff', 120, 40, 1.6); fill.position.set(-8, 8, 8); scene.add(fill);
  const rim = new THREE.PointLight('#5fb0ff', 200, 30, 1.6); rim.position.set(0, 9, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#3a5a9a', '#0a0f1c', 0.6));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#0d1a33', roughness: 0.25, metalness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // back wall with glowing panels
  const panelTex = P.canvasTex(1024, 512, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e2a5c'); gr.addColorStop(1, '#06132b'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,180,255,.18)'; g.lineWidth = 2; for (let i = 0; i < 24; i++) { g.beginPath(); g.ellipse(W * 0.78, H * 0.5, 60 + i * 18, 40 + i * 12, 0, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(140,200,255,.12)'; for (let i = 0; i < 40; i++) g.fillRect(i * 26, H * 0.82, 14, 3);
  });
  const back = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 20, 48, 1, true, Math.PI * 0.72, Math.PI * 0.56), new THREE.MeshBasicMaterial({ map: panelTex, side: THREE.BackSide }));
  back.position.set(0, 10, 8); scene.add(back);
  for (let i = -4; i <= 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 16, 0.15), new THREE.MeshBasicMaterial({ color: '#3d8bff' })); const a = Math.PI * 1.0 + i * 0.12; s.position.set(Math.sin(a) * 21.5, 8, 8 + Math.cos(a) * 21.5); scene.add(s); }
  // video wall above the anchor
  const frame = P.box(13.4, 7.8, 0.4, new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })); frame.position.set(0, 10.4, -4.2); scene.add(frame);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 7.2), new THREE.MeshBasicMaterial({ map: wallTexture, toneMapped: false })); wall.position.set(0, 10.4, -3.98); scene.add(wall);
  const wallLabel = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), new THREE.MeshBasicMaterial({ map: P.canvasTex(512, 80, (g, W, H) => { g.fillStyle = '#c4161c'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = '700 46px sans-serif'; g.textBaseline = 'middle'; g.fillText('  LIVE  •  WORLDWIDE', 6, H / 2 + 2); }), toneMapped: false }));
  wallLabel.position.set(-3.6, 7.15, -3.9); scene.add(wallLabel);
  // desk
  const deskM = new THREE.MeshStandardMaterial({ color: '#e9eef6', roughness: 0.25, metalness: 0.2 });
  const desk = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 2.9, 40, 1, true, -0.65, 1.3), deskM); desk.position.set(0, 1.45, -5.5); desk.castShadow = true; scene.add(desk);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 0.2, 40, 1, false, -0.7, 1.4), new THREE.MeshStandardMaterial({ color: '#1a2744', roughness: 0.2, metalness: 0.5 })); top.position.set(0, 2.95, -5.5); scene.add(top);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshBasicMaterial({ transparent: true, map: P.canvasTex(512, 128, (g, W, H) => { g.fillStyle = '#c4161c'; g.fillRect(0, 18, 120, 92); g.fillStyle = '#fff'; g.font = '800 64px sans-serif'; g.textBaseline = 'middle'; g.fillText('W24', 4, 66); g.fillStyle = '#16264a'; g.font = '700 54px sans-serif'; g.fillText('WORLD 24', 140, 66); }) }));
  logo.position.set(0, 1.6, 1.53); scene.add(logo);
  const anchor = person(scene, CAST.anchor, 0, 0.45, -1.2, 0);
  const chair = P.box(1.6, 3.4, 0.4, new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5 }), 0.15); chair.position.set(0, 3.0, -2.2); scene.add(chair);
  const papers = P.box(0.9, 0.05, 1.2, new THREE.MeshStandardMaterial({ color: '#fafafa' })); papers.position.set(0.6, 3.08, 0.6); scene.add(papers);
  scene.userData.update = (t) => {};
  Object.assign(scene.userData, { caustic: 0, exposure: 1.0, actors: { anchor } });
  return scene;
}

// ============================================================= LAB
export function buildLab(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe6ea');
  scene.environment = envFrom(renderer, gradientDome({ top: '#ffffff', mid: '#e6eef2', bottom: '#9aa6ad' })); scene.environmentIntensity = 0.7;
  const s = sun(scene, '#ffffff', 1.4, v3(6, 30, 12), v3(0, 0, 0), 20, 2048);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a949a', 1.4));
  const wallM = causticMaterial({ color: '#e9eef1', roughness: 0.9 }), floorM = causticMaterial({ color: '#9aa6ad', roughness: 0.6 });
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 40), [wallM, wallM, wallM, floorM, wallM, wallM]); room.material = room.material.map((m) => { const c = m.clone(); c.side = THREE.BackSide; return c; });
  room.position.set(0, 8, 0); room.receiveShadow = true; scene.add(room);
  for (let i = -1; i <= 1; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 1.2), new THREE.MeshBasicMaterial({ color: '#ffffff' })); l.position.set(i * 9, 15.9, 0); scene.add(l); }
  // observation tank
  const tank = new THREE.Group(); tank.position.set(-2, 0, -5); scene.add(tank);
  const metal = causticMaterial({ color: '#5f6a72', metalness: 0.6, roughness: 0.35 });
  tank.add(pos(P.box(8.6, 1.2, 8.6, metal), v3(0, 0.6, 0)));
  tank.add(pos(P.box(8.6, 0.5, 8.6, metal), v3(0, 12.25, 0)));
  for (const [x, z] of [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]]) tank.add(pos(P.box(0.3, 11, 0.3, metal), v3(x, 6.7, z)));
  const water = new THREE.Mesh(new THREE.BoxGeometry(8.2, 10, 8.2), new THREE.MeshStandardMaterial({ color: '#4fc6e0', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, emissive: '#1a7f9a', emissiveIntensity: 0.25 }));
  water.position.y = 6.2; water.renderOrder = 4; tank.add(water);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(8.4, 11, 8.4), new THREE.MeshStandardMaterial({ color: '#e8fbff', transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0.1, depthWrite: false }));
  glass.position.y = 6.7; glass.renderOrder = 5; tank.add(glass);
  const vol = person(scene, CAST.volunteer, -2, 3.2, -5, 0.4);
  const pad = P.box(0.3, 0.3, 0.06, causticMaterial({ color: '#f2f2f2' })); pad.position.set(0.25, 1.3, 0.38); vol.torso.add(pad);
  const cable = P.box(0.05, 4, 0.05, causticMaterial({ color: '#222' })); cable.position.set(1.0, 9.5, -3.2); scene.add(cable);
  // monitors
  const monTex = P.canvasTex(512, 320, () => {}); const monCanvas = monTex.image; const mg = monCanvas.getContext('2d');
  const drawMon = (t) => {
    mg.fillStyle = '#071018'; mg.fillRect(0, 0, 512, 320);
    mg.fillStyle = '#5ef08a'; mg.font = '600 30px monospace'; mg.fillText('SpO₂', 24, 50); mg.font = '700 86px monospace'; mg.fillText('98%', 24, 136);
    mg.fillStyle = '#ffd166'; mg.font = '600 30px monospace'; mg.fillText('HR', 300, 50); mg.font = '700 86px monospace'; mg.fillText(String(72 + Math.round(Math.sin(t) * 2)), 300, 136);
    mg.fillStyle = '#7fd4ff'; mg.font = '600 24px monospace'; mg.fillText('SUBJECT 01 • SUBMERGED  ' + String(Math.floor(41 + t)).padStart(3, '0') + ' MIN', 24, 300);
    mg.strokeStyle = '#5ef08a'; mg.lineWidth = 3; mg.beginPath();
    for (let x = 0; x < 512; x += 2) { const ph = ((x / 512) * 3 + t * 1.2) % 1; let y = 220; if (ph > 0.42 && ph < 0.46) y = 220 - (ph - 0.42) * 2500; else if (ph >= 0.46 && ph < 0.5) y = 120 + (ph - 0.46) * 3000; x ? mg.lineTo(x, y) : mg.moveTo(x, y); }
    mg.stroke(); monTex.needsUpdate = true;
  };
  const deskM = causticMaterial({ color: '#cfd6da', roughness: 0.5 });
  const desk = P.box(6, 0.25, 2.6, deskM); desk.position.set(6.2, 3.1, -0.5); desk.rotation.y = -0.5; scene.add(desk);
  const deskLegs = P.box(5.6, 3, 2.2, causticMaterial({ color: '#b8c1c6' })); deskLegs.position.set(6.2, 1.5, -0.5); deskLegs.rotation.y = -0.5; scene.add(deskLegs);
  const screens = [];
  for (const [dx, dy] of [[-1.2, 0], [1.4, 0]]) {
    const m = new THREE.Group(); m.position.set(6.2 + dx * Math.cos(0.5), 4.7 + dy, -0.5 + dx * Math.sin(0.5) - 0.6); m.rotation.y = -0.5 + 0.35;
    m.add(P.box(2.6, 1.7, 0.15, causticMaterial({ color: '#1b1f24' })));
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: monTex, toneMapped: false })); sc.position.z = 0.08; m.add(sc);
    m.add(pos(P.box(0.15, 0.9, 0.15, causticMaterial({ color: '#333' })), v3(0, -1.2, -0.1)));
    scene.add(m); screens.push(m);
  }
  // shelves + equipment
  for (let i = 0; i < 3; i++) { const sh = P.box(8, 0.2, 1.5, deskM); sh.position.set(-12, 4 + i * 3, -19); scene.add(sh); for (let k = 0; k < 5; k++) { const b = P.box(0.8, 1.2, 0.8, causticMaterial({ color: ['#4f9fd8', '#f2f2f2', '#e8a93a', '#6fbf73'][k % 4] })); b.position.set(-15 + k * 1.6, 4.7 + i * 3, -19); scene.add(b); } }
  const sci1 = person(scene, CAST.sci1, 3.4, 0, 3.2, -2.6);
  const sci2 = person(scene, CAST.sci2, 6.0, 0, 1.6, -2.2);
  const board = P.clipboard(); board.position.set(0, -0.35, 0.12); board.rotation.x = -1.1; sci1.armL.hand.add(board);
  const bubbles = bubbleEmitter(60); scene.add(bubbles);
  for (let i = 0; i < 12; i++) bubbles.userData.burst({ t0: 35 + i * 0.7, origin: () => vol.head.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.3, 0.35)), n: 5, spread: 0.2, rise: 1.6, size: 0.1, life: 2.6, stagger: 0.12 });
  scene.userData.update = (t) => {
    drawMon(t);
    vol.root.position.y = 3.4 + Math.sin(t * 1.1) * 0.25; vol.root.rotation.y = 0.4 + Math.sin(t * 0.3) * 0.1;
    vol.pose(motion.tread(t, 0.6)); vol.setFace({ eyes: 'open', mouth: 'smile' }, t);
    bubbles.userData.update(t);
  };
  Object.assign(scene.userData, { caustic: 0, exposure: 0.95, actors: { sci1, sci2, vol }, screens });
  return scene;
}

// ============================================================= APARTMENT (watching the news, YEAR #15)
export function buildApartment(renderer, tvTexture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b4b63');
  scene.environment = envFrom(renderer, gradientDome({ top: '#f5e3c8', mid: '#c9b49a', bottom: '#5a4a3a' })); scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight('#ffe9cf', '#5a4a3a', 0.9));
  const lamp = new THREE.PointLight('#ffc884', 160, 40, 1.6); lamp.position.set(-6, 8, 3); lamp.castShadow = true; scene.add(lamp);
  const tvGlow = new THREE.PointLight('#8fc8ff', 60, 20, 1.6); tvGlow.position.set(5.6, 5, -2); scene.add(tvGlow);
  const wallM = causticMaterial({ color: '#efe2cf', roughness: 0.9 });
  // back wall with a round window (shape with a hole)
  const shape = new THREE.Shape(); shape.moveTo(-20, 0); shape.lineTo(20, 0); shape.lineTo(20, 14); shape.lineTo(-20, 14); shape.lineTo(-20, 0);
  const hole = new THREE.Path(); hole.absarc(-4.5, 7.5, 4.2, 0, Math.PI * 2, true); shape.holes.push(hole);
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), wallM); wall.position.z = -6; wall.receiveShadow = true; scene.add(wall);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.35, 10, 40), causticMaterial({ color: '#c9a36a', metalness: 0.6, roughness: 0.3 })); ring.position.set(-4.5, 7.5, -5.9); scene.add(ring);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallM); side.position.set(12, 7, 6); side.rotation.y = -Math.PI / 2; scene.add(side);
  const side2 = side.clone(); side2.position.x = -14; side2.rotation.y = Math.PI / 2; scene.add(side2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), causticMaterial({ color: '#9a6b45', roughness: 0.7 })); floor.rotation.x = -Math.PI / 2; floor.position.z = 6; floor.receiveShadow = true; scene.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), causticMaterial({ color: '#2f6f8c', roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.02, 3); scene.add(rug);
  // outside the window: the ocean, light rays, passing fish
  const outside = gradientDome({ top: '#5fd0e6', mid: '#14708c', bottom: '#073648', radius: 300 }); scene.add(outside);
  const fishes = school({ n: 10, seed: 71, size: 0.7, spread: 3, path: (t, v) => v.set(-16 + ((t * 2.2) % 26), 8 + Math.sin(t) * 0.5, -14) }); scene.add(fishes);
  const farTower = P.box(6, 30, 6, new THREE.MeshBasicMaterial({ color: '#0f5c74', fog: false })); farTower.position.set(-8, 0, -40); scene.add(farTower);
  // couch, couple, TV
  const couchM = causticMaterial({ color: '#d0673f', roughness: 0.9 });
  const couch = new THREE.Group(); couch.position.set(-3, 0, 0);
  couch.add(pos(P.box(8, 1.3, 3, couchM, 0.3), v3(0, 0.95, 0)), pos(P.box(8, 2.6, 0.9, couchM, 0.3), v3(0, 2.2, -1.3)),
    pos(P.box(0.9, 2, 3, couchM, 0.3), v3(-4, 1.4, 0)), pos(P.box(0.9, 2, 3, couchM, 0.3), v3(4, 1.4, 0)));
  couch.rotation.y = Math.PI; couch.position.set(1, 0, 6.5); scene.add(couch);
  const v1 = person(scene, randomPerson(rng(5), 'beach', { name: 'viewer1' }), -0.8, 0, 6.3, Math.PI + 0.2);
  const v2 = person(scene, randomPerson(rng(8), 'beach', { name: 'viewer2' }), 2.4, 0, 6.3, Math.PI + 0.1);
  const stand = P.box(5, 1.8, 1.6, causticMaterial({ color: '#3a2e28', roughness: 0.6 })); stand.position.set(5.6, 0.9, -4.6); scene.add(stand);
  const tv = new THREE.Group(); tv.position.set(5.6, 5.4, -5.6); scene.add(tv);
  tv.add(P.box(6.6, 3.9, 0.25, new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.3 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.55), new THREE.MeshBasicMaterial({ map: tvTexture, toneMapped: false })); screen.position.z = 0.14; tv.add(screen);
  const plant = new THREE.Group(); plant.add(P.box(1.2, 1.4, 1.2, causticMaterial({ color: '#e6e0d6' }))); for (let i = 0; i < 6; i++) { const l = P.box(0.25, 2.4, 0.05, causticMaterial({ color: '#3f8a3c' })); l.position.y = 1.8; l.rotation.set((i % 2 - 0.5) * 0.6, i, (i - 3) * 0.12); plant.add(l); } plant.position.set(-10, 0.7, -4); scene.add(plant);
  scene.userData.update = (t) => {
    fishes.userData.update(t);
    v1.pose(mergePose(motion.sitChair(t), { headY: -0.35 })); v2.pose(mergePose(motion.sitChair(t, 1), { headY: -0.2, aLx: -0.5 }));
    v1.setFace({ eyes: 'wide', mouth: 'small-o', brows: 'up' }, t, false, 1); v2.setFace({ eyes: 'open', mouth: 'smile' }, t, false, 3);
  };
  Object.assign(scene.userData, { caustic: 0, exposure: 0.95, actors: { v1, v2 }, tvScreen: screen });
  return scene;
}

// ============================================================= UNDERWATER CITY + NEIGHBORHOOD (YEAR #15)
export function buildCity(renderer) {
  const scene = underwaterBase(renderer, { fogColor: '#0c4d64', density: 0.0085, top: '#4ab4cc', mid: '#105a72', bottom: '#052433', sunDir: v3(0.1, 1, 0.2) });
  sun(scene, '#dff9ff', 1.8, v3(30, 140, 40), v3(0, 0, 60), 110, 4096);
  scene.add(new THREE.HemisphereLight('#8fe6ff', '#123c46', 0.9));
  const floor = terrain({ size: 760, seg: 190, color: '#b9b08f', amp: 1.4, seed: 17, flatRadius: 120 }); scene.add(floor);
  const H = floor.userData.heightAt;
  scene.add(surfaceFromBelow({ y: 140, size: 900, strength: 0.5 }));
  const shafts = lightShafts({ count: 24, area: 200, top: 140, length: 150, opacity: 0.07, seed: 8 }); scene.add(shafts);
  scene.add(particles({ count: 2200, box: [140, 60, 140], center: v3(0, 22, 60), size: 0.1, opacity: 0.5, seed: 14 }));
  const r = rng(51); const updaters = [shafts.userData.update];
  const windowsTex = (seed) => P.canvasTex(128, 256, (g) => { const rr = rng(seed); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256); for (let y = 8; y < 256; y += 20) for (let x = 8; x < 128; x += 20) if (rr() < 0.62) { g.fillStyle = rr() < 0.8 ? '#ffd89a' : '#9ff3ff'; g.globalAlpha = 0.55 + rr() * 0.45; g.fillRect(x, y, 11, 12); } g.globalAlpha = 1; });
  const wallCols = ['#d7e3e6', '#b8cbd1', '#e6d8c3', '#9fb7c2', '#c9d6cf'];
  const towers = [];
  const tower = (x, z, w, h, d, seed) => {
    const g = new THREE.Group(); g.position.set(x, H(x, z) - 0.5, z);
    const tex = windowsTex(seed); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, w / 6), Math.max(1, h / 12));
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.6), causticMaterial({ color: wallCols[seed % wallCols.length], roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.5 }));
    b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bff6ff', roughness: 0.05, transparent: true, opacity: 0.4, emissive: '#5fdcf5', emissiveIntensity: 0.35 }));
    dome.position.y = h; g.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w, d) * 0.5, 0.18, 6, 24), new THREE.MeshBasicMaterial({ color: '#8ff4ff' })); ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.62; ring.scale.set(w / Math.min(w, d) * 1.08, d / Math.min(w, d) * 1.08, 1); g.add(ring);
    scene.add(g); towers.push(g); return g;
  };
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 90; const x = Math.cos(a) * d, z = Math.sin(a) * d - 40; if (z > 30) continue; tower(x, z, 7 + r() * 6, 14 + r() * 42 * (1 - d / 150), 7 + r() * 6, i + 3); }
  for (const [x, z, s] of [[-34, -50, 22], [40, -72, 28], [-66, 0, 18], [56, -5, 16]]) {
    const dm = new THREE.Mesh(new THREE.SphereGeometry(s, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c8fbff', roughness: 0.05, transparent: true, opacity: 0.22, emissive: '#3fc6e0', emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    dm.position.set(x, H(x, z) - 1, z); scene.add(dm);
    const fr = new THREE.Mesh(new THREE.SphereGeometry(s * 1.002, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9ff2ff', wireframe: true, transparent: true, opacity: 0.35 })); fr.position.copy(dm.position); scene.add(fr);
    for (let k = 0; k < 8; k++) { const c = coral(r, 1.4); const aa = r() * 6.28, dd = r() * s * 0.6; c.position.set(x + Math.cos(aa) * dd, dm.position.y + 0.5, z + Math.sin(aa) * dd); scene.add(c); }
  }
  // research station with dish
  { const st = new THREE.Group(); st.position.set(70, H(70, 30), 30);
    st.add(pos(P.box(16, 6, 10, causticMaterial({ color: '#e8eef0' }), 1.2), v3(0, 3, 0)));
    st.add(pos(new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), causticMaterial({ color: '#f26b3a' })), v3(-3, 6, 0)));
    const mast = P.box(0.4, 9, 0.4, causticMaterial({ color: '#999' })); mast.position.set(5, 10, 0); st.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), causticMaterial({ color: '#f4f4f4', side: THREE.DoubleSide })); dish.position.set(5, 14.5, 0); dish.rotation.x = -2.2; st.add(dish);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff5050' })); beacon.position.set(5, 15, 0); st.add(beacon); st.userData.beacon = beacon;
    scene.add(st); updaters.push((t) => { beacon.visible = Math.sin(t * 4) > 0; }); }
  // construction site: frame + crane
  { const site = new THREE.Group(); site.position.set(-40, H(-40, 25), 25); scene.add(site);
    const beam = causticMaterial({ color: '#c97a3a', metalness: 0.3 });
    for (let lv = 0; lv < 6; lv++) for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, -6], [0, 6]]) { const b = P.box(0.5, 4, 0.5, beam); b.position.set(x, lv * 4 + 2, z); site.add(b); }
    for (let lv = 1; lv <= 6; lv++) for (const [w, d, x, z] of [[12.5, 0.5, 0, -6], [12.5, 0.5, 0, 6], [0.5, 12.5, -6, 0], [0.5, 12.5, 6, 0]]) { const b = P.box(w, 0.4, d, beam); b.position.set(x, lv * 4, z); site.add(b); }
    const cr = P.crane(46, 30); cr.position.set(12, 0, -4); site.add(cr);
    updaters.push((t) => { cr.userData.top.rotation.y = Math.sin(t * 0.12) * 0.6; });
    for (let i = 0; i < 3; i++) { const w = makeCharacter(randomPerson(r, 'beach', { cap: '#f2b230', top: { color: '#ef7b2d', trim: '#f2f2f2' } })); w.root.position.set(-4 + i * 4, 12 + i * 4, 6.4); site.add(w.root); updaters.push((t) => { w.pose(mergePose(motion.tread(t, 0.7, i), { aRx: -1.4 + Math.sin(t * 3 + i) * 0.3, eR: -0.6 })); }); }
  }
  // transit tubes
  const tubeM = new THREE.MeshStandardMaterial({ color: '#d8fbff', roughness: 0.05, transparent: true, opacity: 0.3, emissive: '#4fd8f0', emissiveIntensity: 0.5, depthWrite: false });
  for (let i = 0; i < towers.length - 1; i += 4) {
    const a = towers[i].position, b = towers[(i + 7) % towers.length].position; const y = 10 + (i % 4) * 4;
    const p0 = v3(a.x, y, a.z), p1 = v3(b.x, y + 3, b.z);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p0.clone().lerp(p1, 0.5).add(v3(0, 4, 0)), p1]), 30, 1.1, 10, false), tubeM));
  }
  // submarine routes (marked lanes) + traffic
  const routes = [
    new THREE.CatmullRomCurve3([v3(-140, 30, 20), v3(-60, 34, 40), v3(0, 32, 30), v3(60, 36, 10), v3(140, 34, -10)]),
    new THREE.CatmullRomCurve3([v3(120, 22, 90), v3(40, 24, 70), v3(-20, 20, 60), v3(-120, 24, 80)]),
    new THREE.CatmullRomCurve3([v3(-100, 46, -60), v3(-20, 50, -30), v3(40, 48, -50), v3(120, 52, -80)]),
  ];
  routes.forEach((c, i) => scene.add(P.routeMarkers(c, 40, i === 1 ? '#ffd27f' : '#7ff6ff')));
  const traffic = [];
  const subCols = ['#f2c230', '#ffffff', '#e8423b', '#2fb3c9', '#f2c230', '#8e5bd6'];
  for (let i = 0; i < 9; i++) { const s = P.miniSub(subCols[i % subCols.length]); s.scale.setScalar(0.9); scene.add(s); traffic.push({ s, route: routes[i % 3], off: (i * 0.37) % 1, sp: 0.018 + (i % 3) * 0.004, dir: i % 2 ? 1 : -1 }); }
  updaters.push((t) => {
    for (const q of traffic) {
      let u = (q.off + t * q.sp * q.dir) % 1; if (u < 0) u += 1;
      const p = q.route.getPointAt(u), tg = q.route.getTangentAt(u).multiplyScalar(q.dir);
      q.s.position.copy(p).add(v3(0, 0, (q.dir > 0 ? 2.5 : -2.5)));
      q.s.rotation.set(0, Math.atan2(-tg.z, tg.x), 0); q.s.userData.prop.rotation.x = t * 12;
    }
  });
  // citizens swimming around
  const citizens = [];
  for (let i = 0; i < 16; i++) { const c = makeCharacter(randomPerson(r, r() < 0.5 ? 'beach' : 'swim')); scene.add(c.root); citizens.push({ c, R: 18 + r() * 50, y: 8 + r() * 30, ph: r() * 6.28, sp: (0.06 + r() * 0.07) * (r() > 0.5 ? 1 : -1), cx: (r() - 0.5) * 40, cz: -20 + (r() - 0.5) * 40 }); }
  updaters.push((t) => {
    for (const d of citizens) {
      const a = d.ph + t * d.sp * 2.2;
      d.c.root.position.set(d.cx + Math.cos(a) * d.R, d.y + Math.sin(t * 0.6 + d.ph) * 0.8, d.cz + Math.sin(a) * d.R);
      d.c.root.rotation.set(0, -a + (d.sp < 0 ? Math.PI : 0), 0); d.c.pose(motion.swim(t, 0.8, d.ph)); d.c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, d.ph);
    }
  });
  [school({ n: 26, seed: 61, size: 0.7, spread: 6, path: (t, v) => v.set(Math.cos(t * 0.12) * 40, 28 + Math.sin(t * 0.3) * 4, Math.sin(t * 0.12) * 30 - 20) }),
   school({ n: 16, seed: 62, size: 0.9, spread: 4, path: (t, v) => v.set(-50 + ((t * 3.2) % 110), 16 + Math.sin(t * 0.4) * 2, 4) })].forEach((s) => { scene.add(s); updaters.push(s.userData.update); });
  for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 220, z = -90 - r() * 60; const k = kelp(r, 14 + r() * 20, ['#4f8a3a', '#6a9a3c', '#3f7a4a'][i % 3]); k.position.set(x, H(x, z), z); scene.add(k); updaters.push(k.userData.update); }

  // ---------------- neighborhood street (around z = 100)
  const NZ = 100;
  const street = new THREE.Mesh(new THREE.PlaneGeometry(160, 9), causticMaterial({ color: '#8f948f', roughness: 0.9 })); street.rotation.x = -Math.PI / 2; street.position.set(0, H(0, NZ) + 0.08, NZ + 13); street.receiveShadow = true; scene.add(street);
  const houses = [];
  const accents = ['#2fb3c9', '#f26b3a', '#3aa76d', '#8e5bd6', '#f2c230', '#e94f6a'];
  for (let i = -5; i <= 5; i++) {
    for (const side of [1, -1]) {
      const x = i * 15, z = side > 0 ? NZ : NZ + 26;
      const open = i === 0 && side > 0;
      const h = P.podHouse(r, { accent: accents[(i + 5 + (side > 0 ? 0 : 3)) % accents.length], color: ['#e9eef0', '#f1e6d6', '#dfe9e4'][(i + 6) % 3], open });
      h.position.set(x, H(x, z), z); if (side < 0) h.rotation.y = Math.PI; scene.add(h); houses.push(h);
      if (open) scene.userData.house = h;
      for (let k = 0; k < 3; k++) { const c = coral(r, 0.7); c.position.set(x - 4 + k * 3, H(x, z), z + side * 7.5); scene.add(c); }
    }
    const lampP = P.box(0.3, 7, 0.3, causticMaterial({ color: '#3b4a50' })); lampP.position.set(i * 15 + 7.5, H(0, NZ) + 3.5, NZ + 8.5); scene.add(lampP);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' })); bulb.position.set(i * 15 + 7.5, H(0, NZ) + 7.2, NZ + 8.5); scene.add(bulb);
  }
  const house = scene.userData.house;
  const hy = house.position.y;
  // the offending submarine, parked across Owen's door
  const parked = P.miniSub('#f2c230'); parked.position.set(-2.0, hy + 2.0, NZ + 7.4); parked.rotation.y = Math.PI; scene.add(parked);
  const owen = person(scene, CAST.owen, 2.7, hy, NZ + 3.2, 0);
  const luis = person(scene, CAST.luis, 4.6, hy + 0.4, NZ + 10.5, -2.4);
  const keys = P.box(0.25, 0.35, 0.06, causticMaterial({ color: '#d9d9d9', metalness: 0.8 })); keys.position.set(0, -0.35, 0.1); luis.armR.hand.add(keys);
  const passers = [];
  for (let i = 0; i < 5; i++) { const c = makeCharacter(randomPerson(r, 'beach')); scene.add(c.root); passers.push({ c, ph: r() * 6, y: 6 + r() * 10, z: NZ + 10 + r() * 8, sp: (2 + r() * 2) * (i % 2 ? 1 : -1) }); }
  updaters.push((t) => {
    parked.userData.prop.rotation.x = 0;
    for (const p of passers) { const x = ((p.ph * 20 + t * p.sp) % 120 + 180) % 120 - 60; p.c.root.position.set(x, hy + p.y, p.z); p.c.root.rotation.set(0, p.sp > 0 ? Math.PI / 2 : -Math.PI / 2, 0); p.c.pose(motion.swim(t, 0.8, p.ph)); p.c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, p.ph); }
  });

  const bubbles = bubbleEmitter(120); scene.add(bubbles);
  scene.userData.update = (t, cam) => { updaters.forEach((u) => u(t, cam)); bubbles.userData.update(t); };
  Object.assign(scene.userData, { caustic: 0.5, surfaceY: 140, exposure: 0.9, actors: { owen, luis }, bubbles, parked, NZ, hy });
  return scene;
}
