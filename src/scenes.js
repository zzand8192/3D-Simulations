// The four sets: dawn beach, sunlit reef, the deep, and the underwater city (year 25).
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import {
  U, rng, causticMaterial, gradientDome, surfaceFromBelow, lightShafts, particles, terrain,
  rock, coral, kelp, school, jellyfish, bubbleEmitter, fish,
} from './env.js';
import { makeCharacter } from './character.js';

// ------------------------------------------------------------- cast (shared, consistent between scenes)
export function makeCast() {
  const max = makeCharacter({
    name: 'max', skin: '#f3c79a', shirt: '#2e7dd1', stripe: '#f4f1e8', pants: '#27324a', shoes: '#f4f4f4',
    hair: '#5a3418', hairStyle: 'spiky',
  });
  const leo = makeCharacter({
    name: 'leo', skin: '#a9714b', shirt: '#e9772f', sleeve: '#d9692a', hood: true, longSleeve: true, pants: '#5d6470', shoes: '#2a2c31',
    hair: '#16110e', hairStyle: 'flat', gear: true,
  });
  return { max, leo };
}

function envFrom(renderer, dome) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene(); s.add(dome.clone());
  const rt = pm.fromScene(s, 0.04);
  pm.dispose();
  return rt.texture;
}

function sun(scene, color, intensity, pos, target = new THREE.Vector3(), shadow = true, area = 40) {
  const d = new THREE.DirectionalLight(color, intensity);
  d.position.copy(pos); d.target.position.copy(target);
  scene.add(d, d.target);
  if (shadow) {
    d.castShadow = true;
    d.shadow.mapSize.set(2048, 2048);
    const c = d.shadow.camera; c.left = -area; c.right = area; c.top = area; c.bottom = -area; c.near = 1; c.far = 400;
    d.shadow.bias = -0.0004; d.shadow.normalBias = 0.04; d.shadow.radius = 3;
  }
  return d;
}

// ============================================================= 1. BEACH AT DAWN
export function buildBeach(renderer) {
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.35, 0.09, -1).normalize();
  const dome = gradientDome({ top: '#2b4f7e', mid: '#f3b07a', bottom: '#1d3b55', sunDir, sunColor: '#ffcf8a', sunSize: 0.03 });
  scene.add(dome);
  scene.environment = envFrom(renderer, gradientDome({ top: '#4d6f9c', mid: '#f5c08d', bottom: '#6a6152', sunDir, sunColor: '#ffcf8a' }));
  scene.environmentIntensity = 0.7;
  scene.fog = new THREE.Fog('#d9a585', 220, 900);

  sun(scene, '#ffc890', 3.2, sunDir.clone().multiplyScalar(120), new THREE.Vector3(0, 0, 0), true, 30);
  scene.add(new THREE.HemisphereLight('#9fb8e0', '#6b5038', 0.55));
  const rim = new THREE.DirectionalLight('#ffd3a8', 1.2); rim.position.set(30, 20, 40); scene.add(rim);

  // sand
  const sand = terrain({ size: 260, seg: 120, color: '#d9b98c', amp: 0.35, seed: 2, causticK: false });
  sand.position.set(0, -0.15, 118); scene.add(sand);
  // wet sand strip
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), new THREE.MeshStandardMaterial({ color: '#8f7454', roughness: 0.25, metalness: 0.1 }));
  wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.12, -6); wet.receiveShadow = true; scene.add(wet);

  // sea with animated waves
  const seaG = new THREE.PlaneGeometry(900, 600, 140, 90); seaG.rotateX(-Math.PI / 2); seaG.translate(0, 0, -310);
  const base = Float32Array.from(seaG.attributes.position.array);
  const sea = new THREE.Mesh(seaG, new THREE.MeshStandardMaterial({ color: '#0e3f5c', roughness: 0.2, metalness: 0.1, envMapIntensity: 0.55 }));
  sea.position.y = 0.35; sea.receiveShadow = true; scene.add(sea);
  // foam line
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(400, 2.4), new THREE.MeshStandardMaterial({ color: '#fff4e6', roughness: 0.6, transparent: true, opacity: 0.75 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.5, -12.5); scene.add(foam);

  const r = rng(11);
  // palms
  const palm = (x, z, h, lean) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const trunkM = causticMaterial({ color: '#7a5a3a', roughness: 0.9 });
    let p = g;
    for (let i = 0; i < h; i++) {
      const s = new THREE.Group(); s.position.y = i ? 1.6 : 0; s.rotation.z = lean;
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.9 - i * 0.03, 1.6, 0.9 - i * 0.03, 2, 0.12), trunkM);
      m.position.y = 0.8; m.castShadow = true; s.add(m); p.add(s); p = s;
    }
    const top = new THREE.Group(); top.position.y = 1.6; p.add(top);
    const leafM = causticMaterial({ color: '#3f7d3a', roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const lp = new THREE.Group(); lp.rotation.y = (i / 7) * Math.PI * 2;
      let q = lp;
      for (let k = 0; k < 4; k++) {
        const s = new THREE.Group(); s.position.x = k ? 1.5 : 0; s.rotation.z = -0.22;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.9 - k * 0.15), leafM); m.position.x = 0.8; m.castShadow = true;
        s.add(m); q.add(s); q = s;
      }
      top.add(lp);
    }
    scene.add(g); return g;
  };
  palm(-16, 14, 9, 0.05); palm(19, 22, 10, -0.06); palm(-30, 30, 8, 0.07);
  for (let i = 0; i < 18; i++) { const k = rock(r, '#8b8076', 0.6 + r() * 1.6); k.position.set((r() - 0.5) * 90, 0, 6 + r() * 40); scene.add(k); }
  for (let i = 0; i < 6; i++) { const k = rock(r, '#5c5550', 2 + r() * 4); k.position.set((r() > 0.5 ? 1 : -1) * (40 + r() * 60), -0.5, -30 - r() * 60); scene.add(k); }

  // distant headland silhouettes
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#4c4a5e', roughness: 1, flatShading: true }));
    m.scale.set(60 + r() * 60, 18 + r() * 22, 30); m.position.set(-260 + i * 130, -6, -440 - r() * 40); scene.add(m);
  }

  const splash = bubbleEmitter(80); scene.add(splash);

  scene.userData.update = (t) => {
    const p = seaG.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      p.setY(i, Math.sin(x * 0.06 + t * 0.9) * 0.35 + Math.sin(z * 0.11 + t * 1.4) * 0.4 + Math.sin((x + z) * 0.2 + t * 2.2) * 0.12);
    }
    p.needsUpdate = true; seaG.computeVertexNormals();
    foam.position.z = -12.5 + Math.sin(t * 0.8) * 0.9; foam.material.opacity = 0.55 + Math.sin(t * 0.8) * 0.2;
    splash.userData.update(t);
  };
  scene.userData.caustic = 0;
  scene.userData.splash = splash;
  scene.userData.exposure = 1.0;
  return scene;
}

// ============================================================= underwater helpers
function underwaterBase(renderer, { fogColor, density, top, mid, bottom, sunDir }) {
  const scene = new THREE.Scene();
  const dome = gradientDome({ top, mid, bottom, sunDir, sunColor: '#bff6ff', sunSize: 0.2 });
  scene.add(dome);
  scene.environment = envFrom(renderer, gradientDome({ top, mid, bottom }));
  scene.environmentIntensity = 0.8;
  scene.fog = new THREE.FogExp2(fogColor, density);
  return scene;
}

// ============================================================= 2. SUNLIT REEF (surface at y = 30)
export function buildReef(renderer) {
  const scene = underwaterBase(renderer, {
    fogColor: '#156a83', density: 0.017, top: '#5fc6dc', mid: '#17738c', bottom: '#082f40', sunDir: new THREE.Vector3(0.2, 1, -0.1),
  });
  sun(scene, '#e8fcff', 2.6, new THREE.Vector3(18, 120, 10), new THREE.Vector3(0, 0, 0), true, 34);
  scene.add(new THREE.HemisphereLight('#bfefff', '#4a5a50', 0.8));

  const floor = terrain({ size: 320, seg: 160, color: '#b9a57f', amp: 1.0, seed: 7, flatRadius: 14 });
  scene.add(floor);
  const surface = surfaceFromBelow({ y: 30, size: 600, strength: 0.7, color: '#a8ecfa' }); scene.add(surface);
  const shafts = lightShafts({ count: 18, area: 70, top: 30, length: 46, opacity: 0.12, center: new THREE.Vector3(0, 0, -6) }); scene.add(shafts);
  const snow = particles({ count: 1600, box: [70, 40, 70], center: new THREE.Vector3(0, 14, 0), size: 0.09, opacity: 0.55 }); scene.add(snow);

  const r = rng(21);
  const updaters = [];
  const place = (o, x, z, yOff = 0) => { o.position.set(x, floor.userData.heightAt(x, z) + yOff, z); scene.add(o); return o; };
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = 8 + r() * 46;
    place(coral(r, 0.8 + r() * 0.9), Math.cos(a) * d, Math.sin(a) * d - 8);
  }
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 10 + r() * 55;
    place(rock(r, ['#6f7a80', '#7f7466', '#5d6a6f'][i % 3], 0.8 + r() * 2.4), Math.cos(a) * d, Math.sin(a) * d - 6, -0.3);
  }
  // a few close-up coral clusters framing the "sitting spot"
  for (const [x, z, s] of [[-7, -3, 1.3], [6, -4, 1.5], [9, 2, 1.0], [-10, 3, 1.1], [3, -9, 1.6], [-4, -11, 1.4]]) place(coral(r, s), x, z);
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 80, z = -14 - r() * 40;
    const k = place(kelp(r, 12 + r() * 16, ['#4f8a3a', '#6a9a3c', '#3f7a4a'][i % 3]), x, z);
    updaters.push(k.userData.update);
  }
  // fish schools
  const schools = [
    school({ n: 14, seed: 31, size: 0.7, path: (t, v) => v.set(Math.cos(t * 0.25) * 16, 9 + Math.sin(t * 0.4) * 2, Math.sin(t * 0.25) * 10 - 6) }),
    school({ n: 9, seed: 32, size: 0.9, path: (t, v) => v.set(-20 + ((t * 2.6) % 60), 5 + Math.sin(t * 0.5) * 1.5, -9) }),
    school({ n: 20, seed: 33, size: 0.55, spread: 5, path: (t, v) => v.set(Math.sin(t * 0.18) * 24, 20 + Math.cos(t * 0.3) * 3, Math.cos(t * 0.18) * 18 - 10) }),
  ];
  schools.forEach((s) => { scene.add(s); updaters.push(s.userData.update); });

  // a single "curious" fish used for the gag in front of Leo's goggles
  const curious = fish(rng(77), 0.75, ['#ffcc33', '#2d2d2d']);
  scene.add(curious);

  const bubbles = bubbleEmitter(120); scene.add(bubbles);

  scene.userData.update = (t, camera) => {
    updaters.forEach((u) => u(t)); shafts.userData.update(t, camera); bubbles.userData.update(t);
  };
  scene.userData.caustic = 0.65;
  scene.userData.surfaceY = 30;
  scene.userData.bubbles = bubbles;
  scene.userData.curious = curious;
  scene.userData.floor = floor;
  scene.userData.exposure = 0.82;
  return scene;
}

// ============================================================= 3. THE DEEP (200 m)
export function buildDeep(renderer) {
  const scene = underwaterBase(renderer, {
    fogColor: '#04131f', density: 0.03, top: '#0d3550', mid: '#041622', bottom: '#01070c', sunDir: new THREE.Vector3(0, 1, 0),
  });
  scene.environmentIntensity = 0.25;
  scene.add(new THREE.HemisphereLight('#2a6f9a', '#020507', 0.35));
  const faint = new THREE.DirectionalLight('#5fb8e8', 0.25); faint.position.set(0, 100, 0); scene.add(faint);

  const shafts = lightShafts({ count: 6, area: 40, top: 40, length: 50, opacity: 0.035, color: '#7fd4ff' }); scene.add(shafts);
  const snow = particles({ count: 2200, box: [60, 40, 60], center: new THREE.Vector3(0, 0, 0), size: 0.08, opacity: 0.8, color: '#cfefff', seed: 13 }); scene.add(snow);

  const r = rng(41);
  const jellies = [];
  const jcol = ['#ff8fe0', '#7ff0ff', '#b48cff', '#7fffc4'];
  for (let i = 0; i < 16; i++) {
    const j = jellyfish(r, jcol[i % jcol.length], 0.5 + r() * 0.9);
    j.userData.base = new THREE.Vector3((r() - 0.5) * 50, (r() - 0.5) * 26, -6 - r() * 40);
    j.userData.ph2 = r() * 6.28;
    scene.add(j); jellies.push(j);
    if (i < 4) { const pl = new THREE.PointLight(jcol[i % jcol.length], 18, 14, 2); j.add(pl); }
  }
  // a big shy silhouette in the background (a whale shark-ish shape, made of blocks)
  const big = new THREE.Group();
  const bm = new THREE.MeshStandardMaterial({ color: '#0c2533', roughness: 1 });
  const bodyM = new THREE.Mesh(new RoundedBoxGeometry(26, 6, 6, 3, 2), bm); big.add(bodyM);
  const tail = new THREE.Mesh(new RoundedBoxGeometry(1, 9, 5, 2, 0.4), bm); tail.position.x = -14; big.add(tail);
  const fin = new THREE.Mesh(new RoundedBoxGeometry(5, 4, 0.8, 2, 0.3), bm); fin.position.set(2, 4.2, 0); fin.rotation.z = -0.4; big.add(fin);
  big.position.set(0, 8, -70); scene.add(big);

  const bubbles = bubbleEmitter(80); scene.add(bubbles);

  scene.userData.update = (t, camera) => {
    shafts.userData.update(t, camera);
    for (const j of jellies) {
      j.userData.update(t);
      j.position.copy(j.userData.base); j.position.y += Math.sin(t * 0.5 + j.userData.ph2) * 1.4; j.position.x += Math.sin(t * 0.2 + j.userData.ph2) * 1.2;
    }
    big.position.x = -60 + t * 3.2; tail.rotation.y = Math.sin(t * 1.2) * 0.3;
    bubbles.userData.update(t);
  };
  scene.userData.caustic = 0.0;
  scene.userData.bubbles = bubbles;
  scene.userData.exposure = 1.25;
  return scene;
}

// ============================================================= 4. THE UNDERWATER CITY — YEAR 25
export function buildCity(renderer) {
  const scene = underwaterBase(renderer, {
    fogColor: '#0c4d64', density: 0.0085, top: '#4ab4cc', mid: '#105a72', bottom: '#052433', sunDir: new THREE.Vector3(0.1, 1, 0.2),
  });
  sun(scene, '#dff9ff', 1.8, new THREE.Vector3(30, 140, 40), new THREE.Vector3(10, 0, 20), true, 70);
  scene.add(new THREE.HemisphereLight('#8fe6ff', '#123c46', 0.9));

  const floor = terrain({ size: 700, seg: 180, color: '#b9b08f', amp: 2, seed: 17, flatRadius: 90 }); scene.add(floor);
  const surface = surfaceFromBelow({ y: 140, size: 900, strength: 0.5 }); scene.add(surface);
  const shafts = lightShafts({ count: 22, area: 180, top: 140, length: 150, opacity: 0.07, center: new THREE.Vector3(0, 0, 0), seed: 8 }); scene.add(shafts);
  const snow = particles({ count: 2200, box: [120, 60, 120], center: new THREE.Vector3(10, 22, 20), size: 0.1, opacity: 0.5, seed: 14 }); scene.add(snow);

  const r = rng(51);
  const updaters = [];
  const windowsTex = (seed, lit = '#ffd89a') => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    const rr = rng(seed);
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 256; y += 20) for (let x = 8; x < 128; x += 20) {
      if (rr() < 0.62) { g.fillStyle = rr() < 0.8 ? lit : '#9ff3ff'; g.globalAlpha = 0.55 + rr() * 0.45; g.fillRect(x, y, 11, 12); }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const wallCols = ['#d7e3e6', '#b8cbd1', '#e6d8c3', '#9fb7c2', '#c9d6cf'];
  const tower = (x, z, w, h, d, seed) => {
    const g = new THREE.Group(); g.position.set(x, floor.userData.heightAt(x, z) - 0.5, z);
    const tex = windowsTex(seed); tex.repeat.set(Math.max(1, w / 6), Math.max(1, h / 12));
    const m = causticMaterial({ color: wallCols[seed % wallCols.length], roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.6 });
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.6), m); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
    // glass dome cap
    const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#bff6ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.4, emissive: '#5fdcf5', emissiveIntensity: 0.35 }));
    dome.position.y = h; g.add(dome);
    // glowing ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w, d) * 0.48, 0.18, 6, 24), new THREE.MeshBasicMaterial({ color: '#8ff4ff' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.62; ring.scale.set(w / Math.min(w, d) * 1.08, d / Math.min(w, d) * 1.08, 1); g.add(ring);
    scene.add(g); return g;
  };
  // city layout around the origin
  const towers = [];
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, d = 14 + r() * 80;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 30;
    if (Math.hypot(x - 14, z - 20) < 16) continue; // keep rooftop sightline clear
    const h = 14 + r() * 42 * (1 - d / 140);
    towers.push(tower(x, z, 7 + r() * 6, h, 7 + r() * 6, i + 3));
  }
  // big habitat domes
  for (const [x, z, s] of [[-30, -40, 22], [36, -62, 28], [-60, 10, 18], [50, 5, 16]]) {
    const dm = new THREE.Mesh(new THREE.SphereGeometry(s, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#c8fbff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, emissive: '#3fc6e0', emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    dm.position.set(x, floor.userData.heightAt(x, z) - 1, z); scene.add(dm);
    const frame = new THREE.Mesh(new THREE.SphereGeometry(s * 1.002, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9ff2ff', wireframe: true, transparent: true, opacity: 0.35 }));
    frame.position.copy(dm.position); scene.add(frame);
    // gardens inside
    for (let k = 0; k < 8; k++) { const c = coral(r, 1.4); const aa = r() * 6.28, dd = r() * s * 0.6; c.position.set(x + Math.cos(aa) * dd, dm.position.y + 0.5, z + Math.sin(aa) * dd); scene.add(c); }
  }
  // transit tubes between towers
  const tubeM = new THREE.MeshStandardMaterial({ color: '#d8fbff', roughness: 0.05, transparent: true, opacity: 0.3, emissive: '#4fd8f0', emissiveIntensity: 0.5, depthWrite: false });
  for (let i = 0; i < towers.length - 1; i += 3) {
    const a = towers[i].position, b = towers[(i + 5) % towers.length].position;
    const y = 10 + (i % 4) * 4;
    const p0 = new THREE.Vector3(a.x, y, a.z), p1 = new THREE.Vector3(b.x, y + 3, b.z);
    const curve = new THREE.CatmullRomCurve3([p0, p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, 4, 0)), p1]);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 1.1, 10, false), tubeM));
  }
  // street lamps
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 120, z = (r() - 0.5) * 120 - 20;
    const y = floor.userData.heightAt(x, z);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), causticMaterial({ color: '#3b4a50' })); pole.position.set(x, y + 2.5, z); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' })); bulb.position.set(x, y + 5.2, z); scene.add(bulb);
  }
  // kelp gardens
  for (let i = 0; i < 40; i++) {
    const x = (r() - 0.5) * 200, z = -60 - r() * 60;
    const k = kelp(r, 14 + r() * 20, ['#4f8a3a', '#6a9a3c', '#3f7a4a'][i % 3]);
    k.position.set(x, floor.userData.heightAt(x, z), z); scene.add(k); updaters.push(k.userData.update);
  }

  // ---- the rooftop terrace (Max & Leo hang out here). roof top at y = ROOF
  const ROOF = 18;
  const roofX = 14, roofZ = 20;
  const bld = new THREE.Group(); bld.position.set(roofX, 0, roofZ); scene.add(bld);
  {
    const tex = windowsTex(99); tex.repeat.set(3, 2);
    const m = causticMaterial({ color: '#dfe7e4', roughness: 0.65, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.5 });
    const b = new THREE.Mesh(new RoundedBoxGeometry(22, ROOF + 4, 18, 2, 0.6), m); b.position.y = (ROOF - 4) / 2; b.castShadow = b.receiveShadow = true; bld.add(b);
    const deck = new THREE.Mesh(new RoundedBoxGeometry(22.6, 0.6, 18.6, 2, 0.2), causticMaterial({ color: '#8b6a4a', roughness: 0.8 })); deck.position.y = ROOF; deck.receiveShadow = true; bld.add(deck);
    // railing
    const railM = causticMaterial({ color: '#e9f2f2', roughness: 0.4, metalness: 0.4 });
    for (const [w, d, x, z] of [[22, 0.25, 0, -9], [0.25, 18, -11, 0], [0.25, 18, 11, 0]]) {
      const rl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), railM); rl.position.set(x, ROOF + 2.6, z); bld.add(rl);
    }
    for (let i = -10; i <= 10; i += 2.5) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), railM); p.position.set(i, ROOF + 1.3, -9); bld.add(p); }
    // table + two stools + cups
    const wood = causticMaterial({ color: '#f2efe8', roughness: 0.5 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.25, 24), wood); top.position.set(0, ROOF + 2.9, 0); top.castShadow = true; bld.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.6, 10), wood); leg.position.set(0, ROOF + 1.6, 0); bld.add(leg);
    const stoolM = causticMaterial({ color: '#2f8f9d', roughness: 0.5 });
    for (const x of [-3.2, 3.2]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.4, 18), stoolM); s.position.set(x, ROOF + 1.7, 0.4); s.castShadow = true; bld.add(s);
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8), stoolM); sl.position.set(x, ROOF + 0.85, 0.4); bld.add(sl);
    }
    const cupM = causticMaterial({ color: '#ff7a5c', roughness: 0.4 });
    for (const x of [-0.8, 0.9]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 12), cupM); c.position.set(x, ROOF + 3.3, 0.5); c.castShadow = true; bld.add(c); }
    // potted coral + sea lantern
    for (const [x, z] of [[-9, -7], [9, -7], [-9, 7]]) { const c = coral(r, 1.2); c.position.set(x, ROOF + 0.3, z); bld.add(c); }
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a0' })); lan.position.set(8, ROOF + 3.4, -8.6); bld.add(lan);
    const pl = new THREE.PointLight('#ffcf8a', 40, 18, 2); pl.position.set(8, ROOF + 3.4, -7.6); bld.add(pl);
  }

  // citizens swimming around
  const citizens = [];
  const looks = [
    { skin: '#f1c27d', shirt: '#8e44ad', pants: '#2c3e50', hair: '#d4a24c', hairStyle: 'bun' },
    { skin: '#8d5524', shirt: '#27ae60', pants: '#34495e', hair: '#111', hairStyle: 'flat' },
    { skin: '#ffdbac', shirt: '#e74c3c', pants: '#1f2a36', hair: '#7a3e1d', hairStyle: 'spiky' },
    { skin: '#c68642', shirt: '#f1c40f', pants: '#3d3d3d', hairStyle: 'cap', capColor: '#2980b9', hair: '#222' },
    { skin: '#e0ac69', shirt: '#16a085', pants: '#2d3436', hair: '#2b1a10', hairStyle: 'bun' },
    { skin: '#f6d1b0', shirt: '#ff7aa8', pants: '#3a3f58', hair: '#e9e2d0', hairStyle: 'flat' },
    { skin: '#7a4b2a', shirt: '#3498db', pants: '#222831', hairStyle: 'cap', capColor: '#e67e22', hair: '#111' },
    { skin: '#f3c79a', shirt: '#95a5a6', pants: '#2c3e50', hair: '#3b2a1a', hairStyle: 'spiky' },
  ];
  for (let i = 0; i < 12; i++) {
    const c = makeCharacter({ ...looks[i % looks.length], name: 'citizen' + i });
    c.root.scale.setScalar(1);
    c.userData = { r: 18 + r() * 40, y: 8 + r() * 26, ph: r() * 6.28, sp: (0.06 + r() * 0.07) * (r() > 0.5 ? 1 : -1), cx: (r() - 0.5) * 30, cz: -20 + (r() - 0.5) * 30 };
    scene.add(c.root); citizens.push(c);
    c.setFace({ eyes: 'open', mouth: i % 3 ? 'smile' : 'grin' }, 0, false, i);
  }

  // fish everywhere
  const schools = [
    school({ n: 26, seed: 61, size: 0.7, spread: 6, path: (t, v) => v.set(Math.cos(t * 0.12) * 40, 28 + Math.sin(t * 0.3) * 4, Math.sin(t * 0.12) * 30 - 20) }),
    school({ n: 16, seed: 62, size: 0.9, spread: 4, path: (t, v) => v.set(-50 + ((t * 3.2) % 110), 16 + Math.sin(t * 0.4) * 2, 4) }),
    school({ n: 12, seed: 63, size: 0.6, spread: 3, path: (t, v) => v.set(14 + Math.cos(t * 0.35) * 14, 25 + Math.sin(t * 0.5) * 1.5, 18 + Math.sin(t * 0.35) * 10) }),
  ];
  schools.forEach((s) => { scene.add(s); updaters.push(s.userData.update); });
  // sea turtle gliding (blocky)
  const turtle = new THREE.Group();
  {
    const shell = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.2, 2.8, 3, 0.5), causticMaterial({ color: '#5b7f3b', roughness: 0.7 }));
    turtle.add(shell);
    const headT = new THREE.Mesh(new RoundedBoxGeometry(1, 0.7, 0.8, 2, 0.25), causticMaterial({ color: '#9fbf7a' })); headT.position.x = 2.2; turtle.add(headT);
    const fm = causticMaterial({ color: '#9fbf7a' });
    turtle.userData.fl = [];
    for (const [x, z] of [[1, 1.6], [1, -1.6], [-1.2, 1.3], [-1.2, -1.3]]) {
      const p = new THREE.Group(); p.position.set(x, 0, z * 0.9);
      const f = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.18, 1.2, 1, 0.08), fm); f.position.z = Math.sign(z) * 0.6; p.add(f);
      turtle.add(p); turtle.userData.fl.push(p);
    }
  }
  scene.add(turtle);

  const bubbles = bubbleEmitter(120); scene.add(bubbles);
  const bonkFish = fish(rng(88), 0.9, ['#3aa0ff', '#ffe14d']); scene.add(bonkFish);

  scene.userData.update = (t, camera) => {
    updaters.forEach((u) => u(t)); shafts.userData.update(t, camera); bubbles.userData.update(t);
    for (const c of citizens) {
      const d = c.userData, a = d.ph + t * d.sp * 2.2;
      c.root.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(t * 0.6 + d.ph) * 0.8, d.cz + Math.sin(a) * d.r);
      const dir = Math.sign(d.sp);
      c.root.rotation.set(0, -a + (dir < 0 ? Math.PI : 0), 0);
      const sw = { lean: 1.25, headX: -0.8, lLx: Math.sin(t * 5 + d.ph) * 0.4, lRx: -Math.sin(t * 5 + d.ph) * 0.4, aLx: -0.3, aRx: -0.3, aLz: 0.25, aRz: 0.25 };
      c.pose(sw);
      c.setFace({ eyes: 'open', mouth: 'smile' }, t, false, d.ph * 3);
    }
    const ta = t * 0.08;
    turtle.position.set(Math.cos(ta) * 30 + 10, 32 + Math.sin(t * 0.3) * 1, Math.sin(ta) * 22 - 4);
    turtle.rotation.y = -ta - Math.PI / 2;
    turtle.userData.fl.forEach((f, i) => { f.rotation.x = Math.sin(t * 1.8 + (i % 2) * Math.PI) * 0.5 * (i < 2 ? 1 : 0.5); });
  };
  scene.userData.caustic = 0.55;
  scene.userData.surfaceY = 140;
  scene.userData.bubbles = bubbles;
  scene.userData.roof = new THREE.Vector3(roofX, ROOF + 0.3, roofZ);
  scene.userData.bonkFish = bonkFish;
  scene.userData.exposure = 0.88;
  return scene;
}
