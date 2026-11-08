// EP003 world. Greg stays a fixed 5.4 render units tall at the origin; every layer of the world is scaled by
// K(tau) = 3 * 2^tau render units per metre around him, so the scale is exact at every frame.
// Layers are built in their natural unit (m, um, nm, pm, fm) and shown only around the seconds they matter.
import * as THREE from 'three';
import { rng, gradientDome, bubbleEmitter, ease, seg, lerp, clamp01 } from './env.js';
import { makeCharacter, GREG } from './character.js';
import { buildCity, randomPerson, envFrom } from './scenes_city.js';
import * as P from './props.js';
import * as Mo from './models.js';
import { K } from './clock.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const IO = ease.io;
const UM = 1e-6, NM = 1e-9, PM = 1e-12, FM = 1e-15;
const inWin = (tau, a, b) => tau >= a && tau <= b;
// local position (in `unit`) that lands on `spot` (render units) at second `ts`
const spotAt = (spot, ts, unit) => spot.clone().divideScalar(K(ts) * unit);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const path = (pts, k) => { const n = pts.length - 1, f = clamp01(k) * n, i = Math.min(n - 1, Math.floor(f)); return lerpV(pts[i], pts[i + 1], f - i); };

// ---------------------------------------------------------------- infinite-zoom sidewalk material
// Procedural concrete whose detail is chosen per pixel from the on-screen footprint, so zooming in by
// any factor keeps revealing finer aggregate and grit with no stretching or shimmer.
function zoomConcrete() {
  const m = new THREE.MeshStandardMaterial({ color: '#c9c4bb', roughness: 0.95 });
  m.userData.uK = { value: 3 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uK = m.userData.uK;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vZW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvZW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uK; varying vec3 vZW;
      float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      vec3 cellN(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(h21(i + g), h21(i + g + 17.1));
          vec2 r = g + o - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = h21(i + g + 3.7); } else if (d < d2) d2 = d; }
        return vec3(sqrt(d1), id, sqrt(d2) - sqrt(d1)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 rp = vZW.xz / uK + vec2(3.17, 7.41);                 // metres
        float fw = max(length(fwidth(rp)), 1e-12);                 // metres per pixel
        vec3 acc = vec3(0.0); float ws = 0.0;
        for (int i = 0; i < 26; i++) {
          float lam = 0.4 * exp2(-float(i));                        // feature size, metres
          float lp = log2(lam / fw);                                // feature size in pixels (log2)
          float w = exp(-pow(lp - 4.3, 2.0) / 3.0);
          if (w < 0.04) continue;
          vec3 c = cellN(rp / lam + float(i) * 11.7);
          float edge = smoothstep(0.0, 0.16, c.z);
          vec3 st = mix(vec3(0.70, 0.67, 0.62), vec3(0.84, 0.81, 0.76), c.y);
          if (c.y > 0.86) st = vec3(0.58, 0.50, 0.43);
          if (c.y < 0.07) st = vec3(0.42, 0.42, 0.44);
          if (c.y > 0.45 && c.y < 0.5) st = vec3(0.93, 0.92, 0.88);
          st *= mix(0.72, 1.0, edge) * (0.94 + 0.1 * (1.0 - c.x));
          acc += st * w; ws += w;
        }
        vec3 base = ws > 0.0 ? acc / ws : vec3(0.78, 0.75, 0.70);
        // slab joints every 1.5 m (fade out once they are wider than the screen)
        vec2 j = abs(fract(rp / 1.5 + 0.5) - 0.5) * 1.5; float jw = 0.004;
        float joint = 1.0 - smoothstep(jw, jw + fw * 1.5, min(j.x, j.y));
        base *= 1.0 - joint * 0.45;
        diffuseColor.rgb = base * 0.8;
      }`);
  };
  return m;
}
function dropletMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#eafcff', roughness: 0.03, metalness: 0.05, transparent: true, opacity: 0.35, depthWrite: false, envMapIntensity: 2.4 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.4);
      gl_FragColor = vec4(outgoingLight + vec3(0.4, 0.46, 0.5) * fr, diffuseColor.a * (0.22 + 0.78 * fr));`);
  };
  return m;
}
// two copies of a particle ball that keep expanding by 2^period and cross-fade: an endless zoom-in
function zoomDust({ n = 500, R = 30, color = '#ffffff', size = 0.3, period = 3, seed = 1 }) {
  const g = new THREE.Group(), copies = [];
  for (let c = 0; c < 2; c++) { const p = Mo.dotCloud(n, (r) => R * Math.cbrt(r()), color, size, seed + c * 13); g.add(p); copies.push(p); }
  g.userData.update = (tau, alpha, t = 0, flicker = 0) => {
    g.visible = alpha > 0.002;
    copies.forEach((p, c) => {
      const ph = (((tau / period) + c * 0.5) % 1 + 1) % 1, s = Math.pow(2, (ph - 0.5) * period);
      p.scale.setScalar(s); p.material.size = p.userData.baseSize * s;
      p.material.opacity = alpha * Math.sin(Math.PI * ph) * (1 - flicker * 0.5 * (1 + Math.sin(t * 23 + c * 2.1)));
    });
  };
  return g;
}

// ---------------------------------------------------------------- the world
export function buildWorld(renderer) {
  const scene = new THREE.Scene(), W = {};
  const sunDir = v3(-0.5, 0.75, 0.6).normalize();
  const dome = gradientDome({ top: '#3d7cc4', mid: '#cfe4f2', bottom: '#a8b4bc', sunDir, sunColor: '#fff2d6', sunSize: 0.03 }); scene.add(dome);
  const foam = foamDome(); scene.add(foam);
  const envCity = envFrom(renderer, gradientDome({ top: '#3d7cc4', mid: '#cfe4f2', bottom: '#8e8a80', sunDir }));
  const envDark = envFrom(renderer, gradientDome({ top: '#7fa0c8', mid: '#34405a', bottom: '#14161e' }));
  scene.environment = envCity; scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#cfe4f2', 160, 700);
  const key = new THREE.DirectionalLight('#fff2dc', 2.9); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.05;
  key.position.copy(sunDir).multiplyScalar(110); scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight('#cfe3f7', '#9a8f80', 0.95); scene.add(hemi);
  const rim = new THREE.DirectionalLight('#cfe6ff', 0); rim.position.set(12, 7, -6); scene.add(rim);
  Object.assign(W, { scene, dome, foam, envCity, envDark, key, hemi, rim, sunDir });

  // ---- Greg (GREG_v1), phone in his right hand
  const greg = makeCharacter(GREG); greg.root.rotation.y = -Math.PI / 2; scene.add(greg.root);
  const phone = P.phone(); phone.scale.setScalar(0.4); phone.position.set(0.0, -0.28, 0.1); phone.rotation.set(-0.9, 0, 0); greg.armR.hand.add(phone);
  Object.assign(W, { greg, phone });

  // ---- STAGE 1: the city (city units = render units at second 0)
  const city = buildCity(renderer, { style: 'nyc', roadsIntact: true, seed: 19, peds: 44, noCrossers: true });
  const C = city.userData, cityG = new THREE.Group(); scene.add(cityG);
  for (const c of [...city.children]) { if (c.isLight || c === C.dome) continue; cityG.add(c); }
  const G0 = v3(12.9, 0.3, 30); // Greg's spot: on the sidewalk by the curb, mid-block
  for (const q of C.vehicles) if (!q.parked && (q.x === 3 || q.x === 9)) q.v.visible = false; // keep the near lanes clear for the camera
  for (const p of C.peds) if (p.x > 0) p.x = Math.max(p.x, 14.4);
  let plat = null;
  cityG.traverse((o) => { if (o.isMesh && o.geometry?.parameters?.height === 2.6) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().translate(o.position); if (G0.x > b.min.x && G0.x < b.max.x && G0.z > b.min.z && G0.z < b.max.z) plat = o; } });
  const concrete = zoomConcrete(); if (plat) { plat.material = [...plat.material]; plat.material[2] = concrete; }
  const heroes = [0, 1, 2].map((i) => { const c = makeCharacter(randomPerson(rng(300 + i), i === 1 ? { top: { kind: 'tee', color: '#d9412f', trim: '#f4f4f4' } } : {})); cityG.add(c.root); return c; });
  Object.assign(W, { city, cityG, G0, plat, concrete, heroes });

  // ---- STAGE 1-2: the ground around Greg (unit: metre)
  const groundG = new THREE.Group(); scene.add(groundG);
  const crack = new THREE.Group(); groundG.add(crack);
  { const s = new THREE.Shape(), r = rng(5), pts = [];
    for (let i = 0; i <= 40; i++) { const x = -0.1 + i * 0.018; pts.push([x, 0.0185 + Math.sin(i * 1.7) * 0.0012 + (r() - 0.5) * 0.001, 0.0022 + r() * 0.0016]); }
    s.moveTo(pts[0][0], pts[0][1] - pts[0][2]); for (const [x, z, w] of pts) s.lineTo(x, z - w); for (const [x, z, w] of [...pts].reverse()) s.lineTo(x, z + w);
    const m = Mo.mesh(new THREE.ShapeGeometry(s), Mo.M('#3b3631', { roughness: 1 })); m.rotation.x = Math.PI / 2; m.position.y = 0.00004; m.receiveShadow = true; m.castShadow = false; crack.add(m);
    for (let i = 0; i < 40; i++) { const [x, z, w] = pts[i]; const pg = Mo.mesh(Mo.sandGrainGeos(1)[0], Mo.M(Mo.SAND_COLS[i % 8], { roughness: 0.9 })); const sz = 0.0006 + r() * 0.0012; pg.scale.set(sz, sz * 0.7, sz); pg.position.set(x + r() * 0.01, sz * 0.3, z + (r() < 0.5 ? -1 : 1) * (w + sz)); crack.add(pg); } }
  const weeds = new THREE.Group(); groundG.add(weeds);
  { const r = rng(9); const tufts = [[0.006, 0.0185, 26], [0.045, 0.019, 18], [0.022, -0.032, 16], [0.075, -0.012, 12]];
    for (const [tx, tz, n] of tufts) for (let i = 0; i < n; i++) { const h = 0.03 + r() * 0.1, w = 0.0018 + r() * 0.0022;
      const b = Mo.grassBlade(h, w, (r() - 0.3) * 0.25, ['#4f8a3a', '#5f9a44', '#3f7a32', '#6aa64c'][i % 4]); b.position.set(tx + (r() - 0.5) * 0.012, 0, tz + (r() - 0.5) * 0.006); b.rotation.y = r() * Math.PI * 2; weeds.add(b); } }
  const keyM = Mo.houseKey(); keyM.position.copy(spotAt(v3(-5, 0, 12), 7, 1)); keyM.rotation.y = 0.7; groundG.add(keyM);
  const leafM = Mo.leaf(); leafM.position.copy(spotAt(v3(15, 0, -4), 6, 1)); leafM.rotation.y = -0.5; groundG.add(leafM);
  const pigeon = Mo.pigeon(); groundG.add(pigeon);
  const bug = Mo.ladybug(); groundG.add(bug);
  const rice = [[10, -3, 0.4], [16, 4, 2.0], [7, 3.4, 1.1], [13, -6.5, 2.6]].map(([x, z, a], i) => { const g = Mo.riceGrain(40 + i); g.position.copy(spotAt(v3(x, 0, z), 9, 1)); g.position.y = 0.001; g.rotation.y = a; groundG.add(g); return g; });
  const antM = Mo.ant(); groundG.add(antM);
  const mite = Mo.dustMite(); groundG.add(mite);
  // sand grains: instanced, half-buried, kept off Greg's spot and out of the camera's corridor
  const sand = new THREE.Group(); groundG.add(sand);
  { const geos = Mo.sandGrainGeos(7), r = rng(17), per = geos.map(() => []);
    for (let i = 0; i < 420; i++) {
      const rad = 0.00008 + Math.pow(r(), 1.6) * 0.00055, a = r() * Math.PI * 2, d = 0.0002 + Math.pow(r(), 0.75) * 0.009;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (d < rad + 0.00022) continue;                       // Greg's spot
      if (x < 0.0002 && Math.abs(z) < rad + 0.0026 * Math.min(1, -x / 0.002 + 0.4)) continue; // camera corridor
      per[i % 7].push({ x, z, rad, ry: r() * 6, rx: (r() - 0.5) * 0.6, col: Mo.SAND_COLS[Math.floor(r() * 8)] });
    }
    const tmp = new THREE.Object3D(), col = new THREE.Color();
    per.forEach((list, gi) => { const im = new THREE.InstancedMesh(geos[gi], new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02 }), list.length);
      list.forEach((s, i) => { tmp.position.set(s.x, s.rad * 0.35, s.z); tmp.rotation.set(s.rx, s.ry, 0); tmp.scale.setScalar(s.rad); tmp.updateMatrix(); im.setMatrixAt(i, tmp.matrix); im.setColorAt(i, col.set(s.col)); });
      im.castShadow = im.receiveShadow = true; sand.add(im); }); }
  // dew droplet resting behind Greg's left (he backs into it)
  const DROP_R = 0.001, dropDir = v3(0.18, 0, -1).normalize();
  const drop = Mo.mesh(new THREE.SphereGeometry(DROP_R, 64, 40), dropletMaterial()); drop.castShadow = false;
  drop.position.copy(dropDir.clone().multiplyScalar(Math.sqrt(DROP_R ** 2 - 0.00035 ** 2) + 0.00011)); drop.position.y = 0.00035; drop.renderOrder = 2; groundG.add(drop);
  Object.assign(W, { groundG, crack, weeds, keyM, leafM, pigeon, bug, rice, antM, mite, sand, drop, dropDir });

  // ---- STAGE 3: inside the droplet (unit: micrometre)
  const microG = new THREE.Group(); scene.add(microG);
  const para = Mo.paramecium(); microG.add(para);
  const hairM = Mo.hair(); hairM.position.copy(spotAt(v3(10, -1, -2), 15, UM)); hairM.rotation.set(0.25, 0.75, 0.32); microG.add(hairM);
  const pol = Mo.pollen(); microG.add(pol);
  const flake = Mo.skinFlake(); flake.position.copy(spotAt(v3(15, -9, -12), 17, UM)); flake.rotation.set(0.5, 0.4, -0.3); microG.add(flake);
  const rbcs = [[9, 3, 7], [13, -3, -5], [6, 8, -9], [17, 6, 2], [-4, 3, 10]].map(([x, y, z], i) => { const c = Mo.redBloodCell(); c.userData.home = spotAt(v3(x, y, z), 18, UM); c.userData.ph = i * 1.7; microG.add(c); return c; });
  const yeasts = [[11, 2, -7], [7, -6, 9], [17, 9, 3]].map(([x, y, z], i) => { const c = Mo.yeast(i + 3); c.position.copy(spotAt(v3(x, y, z), 19, UM)); c.rotation.set(i, i * 2, 0.4); microG.add(c); return c; });
  const bacs = [['#7fb07a', [[-6, 6, 18], [14, 4, -12]], 22.6, 24.6], ['#b07fb0', [[18, -4, 10], [4, 2, -16]], 23.0, 25.2], ['#d9b45f', [[12, 9, -14], [-2, 5, 16]], 23.6, 25.8], ['#7fa8d9', [[-3, -2, 8], [-3, 3.2, -6]], 23.4, 25.0], ['#8fc47a', [[20, -8, -2], [6, -6, 14]], 22.4, 25.6]]
    .map(([c, pts, a, b], i) => { const m = Mo.bacterium(c, i); microG.add(m); m.userData.path = pts.map((p) => spotAt(v3(...p), 20, UM)); m.userData.win = [a, b]; return m; });
  const diatoms = [[18, 10, -14, 15.5], [-8, -9, 16, 16.2], [22, -6, 8, 17.0]].map(([x, y, z, ts], i) => { const d = Mo.diatom(i + 2); d.position.copy(spotAt(v3(x, y, z), ts, UM)); d.rotation.set(0.8 + i, i, 0.3); microG.add(d); return d; });
  const microDust = zoomDust({ n: 700, R: 26, color: '#d9fff4', size: 0.22, period: 3, seed: 41 }); scene.add(microDust);
  const bubbles = bubbleEmitter(70); scene.add(bubbles);
  Object.assign(W, { microG, para, hairM, pol, flake, rbcs, yeasts, bacs, diatoms, microDust, bubbles });

  // light waves (unit: nanometre)
  const waveG = new THREE.Group(); scene.add(waveG);
  const waves = [[700, '#ff4a3a', 22, [-30, 6, -10], 0.12], [700, '#ff6b4a', 22, [-30, -3, -14], -0.08], [700, '#ff3b30', 22, [-30, 11, 6], 0.2],
    [410, '#8a5cff', 23, [-30, 4, -12], -0.15], [410, '#7a4cff', 23, [-30, -5, 4], 0.1], [410, '#a07aff', 23, [-30, 10, -4], 0.05]]
    .map(([lam, col, ts, at, rz]) => { const w = Mo.lightWave(lam, 10, col); w.position.copy(spotAt(v3(...at), ts, NM)).add(v3(lam * 5, 0, 0)); w.rotation.z = rz; w.userData.ts = ts; waveG.add(w); return w; });
  Object.assign(W, { waveG, waves });

  // ---- STAGE 4: molecules (unit: nanometre)
  const molG = new THREE.Group(); scene.add(molG);
  const vir = [[9, 3, -7, 24, 0], [-2, 8, 12, 24, 1], [15, -5, 6, 24, 2], [6, 10, -2, 24, 0], [-5, -6, 10, 24, 1], [11, 6, 10, 25, 3], [16, -3, -9, 25, 3]]
    .map(([x, y, z, ts, kind], i) => { const v = kind === 3 ? Mo.virus('#8fb6e8', '#e8e8f2', 45, 80, 30 + i) : Mo.virus(['#d98a9a', '#9ad9b0', '#e0b070'][kind], ['#f2d06b', '#f2a0c0', '#9ad0ff'][kind], 50, 60, 10 + i);
      v.userData.home = spotAt(v3(x, y, z), ts, NM); v.userData.ph = i * 1.3; molG.add(v); return v; });
  const polio = [[8, 2, -6], [12, 7, 4], [6, -5, 8], [15, -2, -3], [10, 10, -8], [4, 8, 9]].map(([x, y, z], i) => { const v = Mo.icosaVirus(15); v.userData.home = spotAt(v3(x, y, z), 26, NM); v.userData.ph = i; molG.add(v); return v; });
  const ribo = Mo.ribosome(); ribo.position.copy(spotAt(v3(10, 1, -5), 27, NM)); ribo.rotation.set(0.2, 0.5, 0.1); molG.add(ribo);
  const abs = [[9, 4, -6], [6, -4, 9]].map(([x, y, z], i) => { const a = Mo.antibody(); a.userData.home = spotAt(v3(x, y, z), 28, NM); a.userData.ph = i * 2; molG.add(a); return a; });
  const hbs = [[9, 2, -6], [6, 7, 7], [13, -5, 3]].map(([x, y, z], i) => { const h = Mo.hemoglobin(); h.userData.home = spotAt(v3(x, y, z), 29, NM); h.userData.ph = i * 1.9; molG.add(h); return h; });
  const dnaM = Mo.dna(46); dnaM.position.copy(spotAt(v3(10, 4, -4), 30, NM)); dnaM.rotation.set(0.15, 0.3, 0.42); molG.add(dnaM);
  const sugars = [[6, 5, -6], [9, -3, 6], [4, 9, 5]].map(([x, y, z], i) => { const s = Mo.glucose(); s.userData.home = spotAt(v3(x, y, z), 31, NM); s.userData.ph = i; molG.add(s); return s; });
  // liquid water: instanced O and H, ~0.31 nm apart, jostling
  const waterSet = (() => {
    const r = rng(77), items = [];
    for (let i = 0; i < 2600 && items.length < 420; i++) { const p = v3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).multiplyScalar(1.6);
      if (p.length() > 1.6) continue; if (items.some((q) => q.p.distanceTo(p) < 0.3)) continue;
      const s = p.clone().multiplyScalar(K(33) * NM); // render position at second 33
      if (s.distanceTo(v3(0, 2.7, 0)) < 5.5) continue;                     // Greg
      if (s.x < 2 && Math.hypot(s.y - 3.5, s.z) < 7 + Math.max(0, -s.x) * 0.5) continue; // camera corridor
      items.push({ p, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), ph: r() * 6 }); }
    const og = new THREE.SphereGeometry(0.152, 20, 14), hg = new THREE.SphereGeometry(0.11, 16, 10);
    const Om = new THREE.InstancedMesh(og, Mo.M('#e0463c', { roughness: 0.3, emissive: '#5a120c', emissiveIntensity: 0.25 }), items.length);
    const Hm = new THREE.InstancedMesh(hg, Mo.M('#f4f4f4', { roughness: 0.3, emissive: '#444', emissiveIntensity: 0.2 }), items.length * 2);
    molG.add(Om, Hm); return { items, Om, Hm };
  })();
  const molDust = zoomDust({ n: 500, R: 30, color: '#9fb6ff', size: 0.16, period: 3, seed: 51 }); scene.add(molDust);
  Object.assign(W, { molG, vir, polio, ribo, abs, hbs, dnaM, sugars, waterSet, molDust });

  // ---- STAGE 5: the oxygen atom Greg drifts into (unit: picometre) and its nucleus (unit: femtometre)
  const atomG = new THREE.Group(); scene.add(atomG);
  const shell2 = Mo.dotCloud(2600, (r) => { const u = r(); return 65 * Math.pow(-Math.log(1 - u * 0.985), 0.85) * 0.55; }, '#8fd4ff', 2.2, 61);
  const shell1 = Mo.dotCloud(1100, (r) => 6.6 * -Math.log(1 - r() * 0.98) * 0.6, '#cfe9ff', 0.35, 62);
  atomG.add(shell2, shell1);
  const nucG = new THREE.Group(); scene.add(nucG);
  const nuc = Mo.nucleus(8, 8, 3); nucG.add(nuc);
  const nGlow = Mo.glow('#ffd9b0', 1); scene.add(nGlow);
  const away = v3(0.85, 0.18, -0.5).normalize();
  let target = null, best = -1e9;
  for (const n of nuc.userData.nucleons) { const d = n.userData.home.dot(away.clone().negate()); if (d > best) { best = d; target = n; } }
  target.material = nuc.userData.nucleons.find((n) => n.userData.isP).material; target.userData.isP = true;
  const nucMats = [...new Set(nuc.userData.nucleons.map((n) => n.material))]; nucMats.forEach((m) => { m.transparent = true; });
  const atomDust = zoomDust({ n: 400, R: 34, color: '#7fbfff', size: 0.14, period: 3, seed: 71 }); scene.add(atomDust);
  Object.assign(W, { atomG, shell1, shell2, nucG, nuc, nGlow, away, target, atomDust, nucMats });

  // ---- STAGE 6: inside a proton (unit: femtometre)
  const proG = new THREE.Group(); scene.add(proG);
  const quarks = [['#ff3b3b', v3(0.42, 0.2, -0.22)], ['#3bff6a', v3(0.3, -0.16, 0.24)], ['#3b7bff', v3(0.62, -0.05, -0.02)]].map(([c, p]) => { const g = Mo.glow(c, 0.9); g.userData.home = p; proG.add(g); return g; });
  const gluons = [0, 1, 2].map(() => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; proG.add(l); return l; });
  const seaDust = zoomDust({ n: 420, R: 30, color: '#ffd6f0', size: 0.18, period: 2.5, seed: 81 }); scene.add(seaDust);
  const foamDust = zoomDust({ n: 700, R: 30, color: '#b9c6ff', size: 0.07, period: 2.0, seed: 91 }); scene.add(foamDust);
  Object.assign(W, { proG, quarks, gluons, seaDust, foamDust });
  return W;
}

function foamDome() { // flickering cellular "foam" behind everything, only used past the Planck length
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, transparent: true, fog: false,
    uniforms: { uTime: { value: 0 }, uA: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uTime, uA, uScale; varying vec3 vDir;
      float h(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){
        vec3 d = vDir * 9.0 * uScale; float t = uTime;
        float a = n3(d + vec3(t * 1.7, -t * 1.3, t)), b = n3(d * 2.3 - vec3(t * 2.9, t * 2.1, -t * 1.6)), c = n3(d * 5.1 + vec3(t * 4.0));
        float v = smoothstep(0.45, 0.9, a * 0.55 + b * 0.3 + c * 0.15) * 0.5;
        vec3 col = mix(vec3(0.05, 0.05, 0.12), vec3(0.45, 0.5, 0.95), v);
        gl_FragColor = vec4(col * v * 1.4, uA * clamp(v * 1.6, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -9; return m;
}

// ---------------------------------------------------------------- per-frame placement of the world
const LOOKS = [ // tau, dome top/mid/bottom, fog colour, fog near/far (render units; null = city fog scaled with tau), key, hemi sky/ground/intensity, exposure, env
  { tau: 0, dome: ['#3d7cc4', '#cfe4f2', '#a8b4bc'], fog: '#cfe4f2', near: null, far: null, key: ['#fff2dc', 2.9], hemi: ['#cfe3f7', '#9a8f80', 0.95], rim: 0, exp: 1.0, env: 0.7 },
  { tau: 13.5, dome: ['#3d7cc4', '#cfe4f2', '#a8b4bc'], fog: '#cfe4f2', near: null, far: null, key: ['#fff2dc', 2.9], hemi: ['#cfe3f7', '#9a8f80', 0.95], rim: 0, exp: 1.0, env: 0.7 },
  { tau: 13.62, dome: ['#5fb4bd', '#2a7f8a', '#0e3a44'], fog: '#2a7480', near: 30, far: 330, key: ['#f2fdff', 2.2], hemi: ['#c8f6ff', '#0f3a44', 1.1], rim: 1.2, exp: 1.05, env: 0.6 },
  { tau: 20.5, dome: ['#4f9fb0', '#22707e', '#0c3440'], fog: '#226a78', near: 30, far: 330, key: ['#f2fdff', 2.2], hemi: ['#c8f6ff', '#0f3a44', 1.1], rim: 1.2, exp: 1.05, env: 0.6 },
  { tau: 23.4, dome: ['#2c3c78', '#141c44', '#070a18'], fog: '#121a3e', near: 30, far: 360, key: ['#eef2ff', 2.2], hemi: ['#b9c8ff', '#141830', 1.0], rim: 1.5, exp: 1.05, env: 0.6 },
  { tau: 33.5, dome: ['#24305e', '#10163a', '#05070f'], fog: '#0e1434', near: 30, far: 380, key: ['#eef2ff', 2.1], hemi: ['#b9c8ff', '#141830', 0.95], rim: 1.5, exp: 1.05, env: 0.6 },
  { tau: 36, dome: ['#132a4a', '#0a1224', '#03050a'], fog: '#08101f', near: 40, far: 500, key: ['#e6f2ff', 2.0], hemi: ['#a9d4ff', '#0c1220', 0.9], rim: 1.6, exp: 1.05, env: 0.5 },
  { tau: 46.5, dome: ['#2a1630', '#120a18', '#040206'], fog: '#120a16', near: 40, far: 500, key: ['#ffe6d0', 2.0], hemi: ['#ffd0b0', '#140a10', 0.9], rim: 1.6, exp: 1.05, env: 0.5 },
  { tau: 51.8, dome: ['#46123a', '#1f0819', '#08020a'], fog: '#1f0819', near: 40, far: 500, key: ['#ffe9f2', 2.0], hemi: ['#ffc8e4', '#1a0614', 0.95], rim: 1.6, exp: 1.05, env: 0.5 },
  { tau: 60, dome: ['#3a0f3a', '#1a0718', '#060208'], fog: '#1a0718', near: 40, far: 500, key: ['#ffe9f2', 1.9], hemi: ['#ffc8e4', '#1a0614', 0.9], rim: 1.6, exp: 1.05, env: 0.5 },
  { tau: 117, dome: ['#0c0c1a', '#06060e', '#020205'], fog: '#06060e', near: 40, far: 600, key: ['#e6e8ff', 1.8], hemi: ['#b0b8ff', '#06060c', 0.8], rim: 1.4, exp: 1.0, env: 0.4 },
];
const col = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
function look(tau) {
  let i = 0; while (i < LOOKS.length - 2 && tau > LOOKS[i + 1].tau) i++;
  const a = LOOKS[i], b = LOOKS[i + 1], k = IO(clamp01((tau - a.tau) / Math.max(1e-3, b.tau - a.tau)));
  return { a, b, k, c: (f, j) => col(a[f][j], b[f][j], k), n: (f) => lerp(a[f], b[f], k) };
}

export function updateWorld(W, t, tau, cam) {
  const k = K(tau), city = tau < 13.62;
  // ---- look
  const L = look(tau);
  const u = W.dome.material.uniforms; u.cTop.value.copy(L.c('dome', 0)); u.cMid.value.copy(L.c('dome', 1)); u.cBot.value.copy(L.c('dome', 2)); u.useSun.value = city ? 1 : 0;
  W.scene.fog.color.copy(col(L.a.fog, L.b.fog, L.k));
  if (city) { W.scene.fog.near = 160 * Math.pow(2, tau); W.scene.fog.far = 700 * Math.pow(2, tau); }
  else { W.scene.fog.near = L.n('near'); W.scene.fog.far = L.n('far'); }
  W.key.color.copy(L.c('key', 0)); W.key.intensity = L.a.key[1] + (L.b.key[1] - L.a.key[1]) * L.k;
  W.key.position.copy(city ? W.sunDir : v3(-0.55, 0.8, 0.35).normalize()).multiplyScalar(110);
  W.hemi.color.copy(L.c('hemi', 0)); W.hemi.groundColor.copy(L.c('hemi', 1)); W.hemi.intensity = L.a.hemi[2] + (L.b.hemi[2] - L.a.hemi[2]) * L.k;
  W.rim.intensity = L.n('rim');
  W.scene.environment = city ? W.envCity : W.envDark; W.scene.environmentIntensity = L.n('env');
  W.exposure = L.n('exp');
  W.foam.material.uniforms.uTime.value = t; W.foam.material.uniforms.uA.value = tau >= 100 ? 1 : 0;

  // ---- city
  W.cityG.visible = city;
  if (city) {
    const s = Math.pow(2, tau); W.cityG.scale.setScalar(s); W.cityG.position.copy(W.G0).multiplyScalar(-s);
    W.city.userData.update(t);
    W.concrete.userData.uK.value = k;
    // hero pedestrians (city units, walking along the sidewalk behind Greg)
    const hero = (c, x, z0, sp, t0, ph) => { const z = z0 + (t - t0) * sp; c.root.position.set(x, 0.3, z); c.root.rotation.y = sp > 0 ? 0 : Math.PI; c.pose(motionWalk(t, ph)); c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, ph); c.root.visible = Math.abs(z - W.G0.z) < 60; };
    hero(W.heroes[0], 14.2, W.G0.z - 3.2 * 2.6, 3.2, 4.4, 0.3);   // passes Greg at t ~ 7.0
    hero(W.heroes[1], 13.85, W.G0.z + 2.9 * 3.5, -2.9, 4.7, 1.7); // passes Greg at t ~ 8.2, closest step
    hero(W.heroes[2], 15.6, W.G0.z - 3.0 * 4.6, 3.0, 4.0, 4.1);   // passes at t ~ 8.6
  }
  // ---- ground (metres)
  W.groundG.visible = city;
  if (city) {
    W.groundG.scale.setScalar(k);
    W.crack.visible = tau > 3; W.weeds.visible = tau > 3.5; W.keyM.visible = inWin(tau, 3.5, 10.5); W.leafM.visible = inWin(tau, 3, 9.5);
    W.sand.visible = tau > 6; W.drop.visible = tau > 8;
    // pigeon: walks in, pecks, looks at Greg, flies off (t 8.4 - 10.9)
    const pg = W.pigeon, pd = pg.userData; pg.visible = inWin(t, 7.6, 11.2);
    const pStop = spotAt(v3(92, 0, 20), 5.3, 1), pStart = pStop.clone().add(v3(0.1, 0, 0.5));
    const walkK = IO(seg(t, 7.8, 9.0)), fly = seg(t, 10.55, 11.2);
    pg.position.copy(lerpV(pStart, pStop, walkK)).add(v3(fly * 0.25, ease.in(fly) * 0.9, fly * 0.4));
    pg.rotation.y = walkK < 1 ? Math.atan2(pStop.x - pStart.x, pStop.z - pStart.z) : lerp(Math.atan2(pStop.x - pStart.x, pStop.z - pStart.z), Math.atan2(-pStop.x, -pStop.z), IO(seg(t, 9.0, 9.4)));
    const peck = Math.max(0, Math.sin(Math.PI * seg(t, 9.15, 9.45))) + Math.max(0, Math.sin(Math.PI * seg(t, 9.6, 9.9)));
    pd.body.rotation.x = peck * 0.5 + (walkK > 0 && walkK < 1 ? Math.sin(t * 14) * 0.04 : 0); pd.head.rotation.set(peck * 0.6, 0, t > 10.0 && t < 10.5 ? 0.45 : 0);
    pd.legs.forEach((l, i) => { l.rotation.x = walkK > 0 && walkK < 1 ? Math.sin(t * 14 + i * Math.PI) * 0.5 : 0; });
    // ladybug crawls across behind Greg (t 11.0 - 13.6)
    const lbPts = [v3(3, 0, 17), v3(6, 0, 4), v3(9, 0, -14)].map((p) => spotAt(p, 8, 1)); const lk = seg(t, 10.8, 13.8);
    W.bug.visible = inWin(t, 10.0, 14.5); W.bug.position.copy(path(lbPts, lk)); const ld = path(lbPts, lk + 0.01).sub(path(lbPts, lk)); W.bug.rotation.y = Math.atan2(ld.x, ld.z);
    W.bug.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 22 + i * 2.1) * 0.4; });
    W.rice.forEach((r) => { r.visible = inWin(tau, 6.5, 11.5); });
    // ant walks behind Greg, pauses to look at him (t 13.0 - 15.2)
    const aPts = [v3(20, 0, 30), v3(6, 0, 8.5), v3(4.2, 0, 5.8), v3(12, 0, -30)].map((p) => spotAt(p, 10, 1));
    const ak = t < 13.95 ? seg(t, 12.9, 13.95) / 3 : t < 14.45 ? 1 / 3 + seg(t, 13.95, 14.45) / 3 : 2 / 3 + seg(t, 14.45, 15.3) / 3;
    W.antM.visible = inWin(t, 12.6, 15.6); W.antM.position.copy(path(aPts, ak)); const adir = path(aPts, Math.min(1, ak + 0.01)).sub(path(aPts, ak));
    const paused = t > 13.95 && t < 14.45; W.antM.rotation.y = paused ? lerp(Math.atan2(adir.x, adir.z), Math.atan2(-W.antM.position.x, -W.antM.position.z), Math.sin(Math.PI * seg(t, 13.95, 14.45))) : Math.atan2(adir.x, adir.z);
    Mo.poseInsectLegs(W.antM.userData.legs, t, paused ? 0 : 26);
    const an = W.antM.userData.head.userData; an['an-1'].rotation.x = -0.5 + Math.sin(t * 9) * 0.25; an['an1'].rotation.x = -0.5 + Math.sin(t * 9 + 1) * 0.25;
    // dust mite comes in from the right (t 16.0 - 17.4)
    const mPts = [v3(16, 0, 14), v3(7, 0, 5), v3(3.6, 0, 2.2)].map((p) => spotAt(p, 13, 1)); const mk = seg(t, 15.9, 17.35);
    W.mite.visible = inWin(t, 15.4, 17.7); W.mite.position.copy(path(mPts, mk)); const md = path(mPts, Math.min(1, mk + 0.02)).sub(path(mPts, mk)); W.mite.rotation.y = Math.atan2(md.x, md.z) || W.mite.rotation.y;
    Mo.poseInsectLegs(W.mite.userData.legs, t, mk < 1 ? 14 : 0, 0.8);
  }
  // ---- micro (micrometres)
  const micro = inWin(tau, 13.62, 21.6);
  W.microG.visible = micro || inWin(tau, 13.62, 22.4);
  if (W.microG.visible) {
    W.microG.scale.setScalar(k * UM);
    const pk = seg(t, 17.7, 19.4), pPts = [v3(-8, 5, 24), v3(4, 3, 8), v3(12, 2, -14)].map((p) => spotAt(p, 14, UM));
    W.para.visible = inWin(tau, 13.62, 16.2); W.para.position.copy(path(pPts, pk)); const pdv = path(pPts, Math.min(1, pk + 0.01)).sub(path(pPts, pk)); W.para.rotation.y = Math.atan2(pdv.x, pdv.z); W.para.rotation.z = Math.sin(t * 2) * 0.15;
    W.para.userData.cilia.rotation.z = Math.sin(t * 18) * 0.012;
    W.hairM.visible = inWin(tau, 13.62, 17.2);
    W.pol.visible = inWin(tau, 13.8, 18.0); W.pol.position.copy(lerpV(spotAt(v3(5, 11, 10), 16, UM), spotAt(v3(7, 5, 5), 16, UM), seg(t, 19.0, 21.0))); W.pol.rotation.set(t * 0.2, t * 0.3, 0);
    W.flake.visible = inWin(tau, 14.8, 18.8); W.flake.rotation.z = -0.3 + t * 0.03;
    W.rbcs.forEach((c, i) => { c.visible = inWin(tau, 15.6, 19.6); const h = c.userData.home, ph = c.userData.ph;
      c.position.copy(h).add(v3(Math.sin(t * 0.5 + ph), Math.cos(t * 0.4 + ph), Math.sin(t * 0.3 + ph * 2)).multiplyScalar(0.6));
      c.rotation.set(t * 0.4 + ph, t * 0.25, ph);
      if (i === 4) { const bk = seg(t, 20.8, 22.0), back = seg(t, 22.0, 23.0); c.position.copy(lerpV(h, spotAt(v3(-0.6, 3.4, 2.3), 18, UM), IO(bk) * (1 - IO(back) * 0.7))); } });
    W.yeasts.forEach((y, i) => { y.visible = inWin(tau, 16.4, 20.6); y.rotation.y = t * 0.15 + i; });
    W.bacs.forEach((b) => { const [a, e] = b.userData.win; b.visible = inWin(t, a - 0.5, e + 0.5) && tau < 21.8; const bk = seg(t, a, e);
      b.position.copy(path(b.userData.path, bk)); const d = b.userData.path[1].clone().sub(b.userData.path[0]); b.rotation.y = Math.atan2(d.x, d.z); b.rotation.x = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      b.userData.flag.forEach((f, j) => { f.rotation.z = t * 20 + j; }); b.rotation.z = t * 4; });
    W.diatoms.forEach((d, i) => { d.visible = inWin(tau, 13.62, 18.2); d.rotation.y = t * 0.1 + i; });
  }
  W.microDust.position.set(0, 2.7, 0); W.microDust.userData.update(tau, (tau > 13.62 ? 0.75 : 0) * (1 - seg(tau, 22.5, 24)), t);
  W.bubbles.userData.update(t);
  // light waves
  W.waveG.visible = inWin(tau, 20.2, 24.6);
  if (W.waveG.visible) { W.waveG.scale.setScalar(k * NM); W.waves.forEach((w) => { const a = 1 - Math.min(1, Math.abs(tau - w.userData.ts) / 1.6); w.visible = a > 0; w.material.opacity = 0.6 * a; w.userData.update(t * 6); }); }
  // ---- molecules (nanometres)
  W.molG.visible = inWin(tau, 20.5, 35.8);
  if (W.molG.visible) {
    W.molG.scale.setScalar(k * NM);
    const bob = (o, amp = 0.05) => { const h = o.userData.home, ph = o.userData.ph; o.position.copy(h).addScaledVector(v3(Math.sin(t * 0.6 + ph), Math.cos(t * 0.5 + ph), Math.sin(t * 0.45 + ph * 2)), h.length() * amp); o.rotation.set(t * 0.2 + ph, t * 0.15 + ph, 0); };
    W.vir.forEach((v, i) => { v.visible = inWin(tau, 21.0, i < 5 ? 25.8 : 26.6); bob(v); });
    W.polio.forEach((v) => { v.visible = inWin(tau, 23.2, 27.8); bob(v); });
    W.ribo.visible = inWin(tau, 24.0, 28.6); W.ribo.rotation.y = 0.5 + t * 0.06;
    W.abs.forEach((a) => { a.visible = inWin(tau, 25.0, 29.6); bob(a, 0.03); });
    W.hbs.forEach((h) => { h.visible = inWin(tau, 26.0, 30.6); bob(h, 0.04); });
    W.dnaM.visible = inWin(tau, 26.8, 31.8); W.dnaM.rotation.y = 0.3 + t * 0.08;
    W.sugars.forEach((s) => { s.visible = inWin(tau, 28.0, 32.6); bob(s, 0.05); });
    // water: jostling molecules; the one Greg drifts into is replaced by the atom visual
    const ws = W.waterSet, tmp = new THREE.Object3D(), hq = new THREE.Vector3(), wv = inWin(tau, 29.5, 35.8);
    ws.Om.visible = ws.Hm.visible = wv;
    if (wv) { ws.items.forEach((w, i) => {
      const j = v3(Math.sin(t * 3.1 + w.ph), Math.sin(t * 2.7 + w.ph * 1.7), Math.sin(t * 3.4 + w.ph * 2.3)).multiplyScalar(0.035);
      const q = w.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(t * 1.3 + w.ph) * 0.6, t * 0.9 + w.ph, 0)));
      const pos = w.p.clone().add(j); tmp.position.copy(pos); tmp.quaternion.copy(q); tmp.scale.setScalar(1); tmp.updateMatrix(); ws.Om.setMatrixAt(i, tmp.matrix);
      for (let s = 0; s < 2; s++) { const a = (s ? 1 : -1) * (104.5 / 2) * Math.PI / 180; hq.set(Math.sin(a) * 0.12, -Math.cos(a) * 0.12, 0).applyQuaternion(q); tmp.position.copy(pos).add(hq); tmp.updateMatrix(); ws.Hm.setMatrixAt(i * 2 + s, tmp.matrix); }
    }); ws.Om.instanceMatrix.needsUpdate = ws.Hm.instanceMatrix.needsUpdate = true; }
  }
  W.molDust.position.set(0, 2.7, 0); W.molDust.userData.update(tau, 0.55 * seg(tau, 22.5, 24) * (1 - seg(tau, 33, 34.5)), t);

  // ---- the oxygen atom and its nucleus: placed in render space around Greg
  const chest = v3(0, 3.0, 0), nR = W.nuc.userData.R + 0.84;                                // nucleus radius in fm
  const rn = nR * k * FM;                                                                     // ... in render units
  const far = W.away.clone().multiplyScalar(Math.max(8.5, rn + 5.5)).add(chest);
  const near = chest.clone().sub(W.target.userData.home.clone().multiplyScalar(k * FM));     // target proton centred on Greg
  const inK = IO(seg(tau, 50.0, 52.0));
  const Cn = tau < 34.6 ? W.away.clone().multiplyScalar(8 + (34.6 - tau) * 1.5).add(v3(0, 4.5, 0)).add(chest.clone().multiplyScalar(0))
    : lerpV(lerpV(W.away.clone().multiplyScalar(8 + 0).add(v3(0, 4.5, 0)), far, IO(seg(tau, 34.6, 37.0))), near, inK);
  W.atomG.visible = inWin(tau, 32.6, 47);
  if (W.atomG.visible) { W.atomG.position.copy(Cn); W.atomG.scale.setScalar(k * PM);
    const a = seg(tau, 32.6, 33.6); W.shell2.material.opacity = 0.75 * a * (1 - seg(tau, 37.5, 39)); W.shell1.material.opacity = 0.9 * a * (1 - seg(tau, 40.5, 42.5));
    W.shell2.material.size = 2.2 * k * PM; W.shell1.material.size = 0.35 * k * PM; W.atomG.rotation.y = t * 0.15; }
  W.atomDust.position.set(0, 2.7, 0); W.atomDust.userData.update(tau, 0.45 * seg(tau, 36.5, 38) * (1 - seg(tau, 47, 49)), t);
  W.nucG.visible = inWin(tau, 44.5, 52.6);
  W.nGlow.visible = inWin(tau, 34.6, 52.6);
  if (W.nGlow.visible) { W.nGlow.position.copy(Cn); const gs = Math.max(1.2, rn * 3.2); W.nGlow.scale.setScalar(gs); W.nGlow.material.opacity = (tau < 36 ? seg(tau, 34.6, 36) : 1) * (1 - seg(tau, 50.6, 51.7)) * 0.9; }
  if (W.nucG.visible) { W.nucG.position.copy(Cn); W.nucG.scale.setScalar(k * FM);
    for (const n of W.nuc.userData.nucleons) { const ph = n.userData.ph; n.position.copy(n.userData.home).add(v3(Math.sin(t * 7 + ph), Math.sin(t * 6.3 + ph * 2), Math.sin(t * 7.7 + ph * 3)).multiplyScalar(n === W.target ? 0.02 : 0.08)); }
    const nf = 1 - seg(tau, 51.25, 51.85); W.nucMats.forEach((m) => { m.opacity = nf; m.depthWrite = nf > 0.98; }); W.nuc.visible = nf > 0.001; }
  // ---- inside the proton
  const inside = inWin(tau, 51.4, 60.5);
  W.proG.visible = inside;
  if (inside) {
    const Cp = Cn.clone().add(W.target.userData.home.clone().multiplyScalar(k * FM));
    W.proG.position.copy(Cp); W.proG.scale.setScalar(k * FM);
    const fadeIn = seg(tau, 51.4, 52.4);
    W.quarks.forEach((q, i) => { const h = q.userData.home; q.position.copy(h).add(v3(Math.sin(t * 1.3 + i * 2), Math.cos(t * 1.1 + i), Math.sin(t * 0.9 + i * 3)).multiplyScalar(0.06));
      q.scale.setScalar(0.42); q.material.opacity = fadeIn * 0.6 * (1 - seg(tau, 54.5, 58.5) * 0.75); });
    W.gluons.forEach((l, i) => { const a = W.quarks[i].position, b = W.quarks[(i + 1) % 3].position, p = l.geometry.attributes.position;
      const d = b.clone().sub(a), n1 = new THREE.Vector3(0, 1, 0).cross(d).normalize(), n2 = d.clone().cross(n1).normalize();
      for (let j = 0; j < 60; j++) { const s = j / 59, w = Math.sin(s * Math.PI) * 0.035; const pt = a.clone().lerp(b, s).addScaledVector(n1, Math.sin(s * 22 - t * 9 + i) * w).addScaledVector(n2, Math.cos(s * 19 - t * 7 + i) * w); p.setXYZ(j, pt.x, pt.y, pt.z); }
      p.needsUpdate = true; l.material.opacity = fadeIn * 0.75 * (1 - seg(tau, 55.5, 57.5)); });
  }
  W.seaDust.position.set(0, 2.7, 0); W.seaDust.userData.update(tau, 0.7 * seg(tau, 51.6, 52.6) * (tau < 61 ? 1 : 0), t, 0.6);
  W.foamDust.position.set(0, 2.7, 0); W.foamDust.userData.update(tau, tau >= 100 ? 0.55 : 0, t, 0.8);
}

function motionWalk(t, ph) { const w = Math.sin(t * 5.6 + ph), c = Math.cos(t * 5.6 + ph);
  return { lLx: w * 0.55, lRx: -w * 0.55, kL: Math.max(0, -c) * 0.8 + 0.08, kR: Math.max(0, c) * 0.8 + 0.08, aLx: -w * 0.45, aRx: w * 0.45, eL: -0.3, eR: -0.3, aLz: 0.1, aRz: 0.1, hipY: -Math.abs(c) * 0.06 }; }
