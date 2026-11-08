// Shared environment building blocks: caustic-lit materials, gradient skies,
// light shafts, drifting particles, fish, kelp, coral, jellyfish, bubbles.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const U = {
  time: { value: 0 },
  caustic: { value: 0 },          // caustic strength for the active scene
  causticScale: { value: 0.16 },
  causticTint: { value: new THREE.Color('#bff4ff') },
  surfaceY: { value: 30 },
};

// deterministic PRNG
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ease = {
  io: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)),
  out: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3)),
  in: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x),
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;

// ------------------------------------------------------------- caustics
const CAUSTIC_GLSL = /* glsl */`
uniform float uTime;
uniform float uCaustic;
uniform float uCausticScale;
uniform vec3 uCausticTint;
uniform float uSurfaceY;
varying vec3 vCWorld;
varying vec3 vCNormal;
float causticPat(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
`;

export function causticMaterial(params) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time;
    sh.uniforms.uCaustic = U.caustic;
    sh.uniforms.uCausticScale = U.causticScale;
    sh.uniforms.uCausticTint = U.causticTint;
    sh.uniforms.uSurfaceY = U.surfaceY;
    sh.vertexShader = 'varying vec3 vCWorld;\nvarying vec3 vCNormal;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      #ifdef USE_INSTANCING
        vCWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vCNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
      #else
        vCWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vCNormal = normalize(mat3(modelMatrix) * objectNormal);
      #endif`);
    sh.fragmentShader = CAUSTIC_GLSL + sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `if (uCaustic > 0.0) {
         float up = clamp(vCNormal.y * 0.8 + 0.35, 0.0, 1.0);
         vec2 cp = vCWorld.xz * uCausticScale + vec2(vCWorld.y * 0.05);
         float cs = causticPat(mod(cp, 6.2831853) * 1.0 + 30.0, uTime * 0.55);
         float depthK = exp(-max(uSurfaceY - vCWorld.y, 0.0) * 0.018);
         outgoingLight += diffuseColor.rgb * uCausticTint * min(cs, 2.0) * uCaustic * up * depthK;
       }
       #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'caustic';
  return m;
}

// ------------------------------------------------------------- sky / water gradient dome
export function gradientDome({ top, mid, bottom, sunDir = null, sunColor = '#ffd9a0', sunSize = 0.02, radius = 900, horizon = 0.0 }) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cTop: { value: new THREE.Color(top) }, cMid: { value: new THREE.Color(mid) }, cBot: { value: new THREE.Color(bottom) },
      sunDir: { value: sunDir ? sunDir.clone().normalize() : new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(sunColor) }, useSun: { value: sunDir ? 1 : 0 }, sunSize: { value: sunSize },
      horizon: { value: horizon }, uTime: U.time,
    },
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform vec3 cTop, cMid, cBot, sunDir, sunColor; uniform float useSun, sunSize, horizon, uTime;
      varying vec3 vDir;
      void main(){
        float y = vDir.y - horizon;
        vec3 c = y > 0.0 ? mix(cMid, cTop, pow(smoothstep(0.0, 0.85, y), 0.7)) : mix(cMid, cBot, smoothstep(0.0, 0.6, -y));
        if (useSun > 0.5) {
          float d = max(dot(normalize(vDir), sunDir), 0.0);
          c += sunColor * (pow(d, 600.0 * (0.02 / sunSize)) * 6.0 + pow(d, 24.0) * 0.55 + pow(d, 4.0) * 0.18);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ------------------------------------------------------------- water surface seen from below
export function surfaceFromBelow({ y = 30, size = 700, color = '#bdf3ff', strength = 1.0 }) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: U.time, cCol: { value: new THREE.Color(color) }, k: { value: strength } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, k; uniform vec3 cCol; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return sin(p.x*0.21+uTime*0.9)*0.5 + sin(p.y*0.27-uTime*0.7)*0.5 + sin((p.x+p.y)*0.13+uTime*1.3)*0.6 + sin((p.x-p.y)*0.41+uTime*1.7)*0.25; }
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float n = h(vW.xz);
        float rip = smoothstep(0.6, 1.4, abs(n));
        vec3 c = cCol * (0.75 + 0.6 * rip);
        float a = (1.0 - smoothstep(0.15, 1.0, r)) * (0.55 + 0.35 * rip) * k;
        gl_FragColor = vec4(c, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), mat);
  m.rotation.x = Math.PI / 2; m.position.y = y; m.renderOrder = -5;
  return m;
}

// ------------------------------------------------------------- volumetric-looking light shafts
export function lightShafts({ count = 14, area = 80, top = 30, length = 70, color = '#d8fbff', opacity = 0.16, seed = 3, center = new THREE.Vector3() }) {
  const r = rng(seed);
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: U.time, cCol: { value: new THREE.Color(color) }, op: { value: opacity } },
    vertexShader: /* glsl */`varying vec2 vUv; varying float vSeed; attribute float seed; void main(){ vUv = uv; vSeed = 0.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, op; uniform vec3 cCol; varying vec2 vUv;
      void main(){
        float edge = pow(sin(3.14159 * vUv.x), 2.2);
        float fall = pow(vUv.y, 1.6);
        float flick = 0.75 + 0.25 * sin(uTime * 0.8 + vUv.x * 9.0);
        gl_FragColor = vec4(cCol, edge * fall * op * flick);
      }`,
  });
  for (let i = 0; i < count; i++) {
    const w = 2 + r() * 6;
    const g = new THREE.PlaneGeometry(w, length, 1, 1);
    g.translate(0, -length / 2, 0);
    const m = new THREE.Mesh(g, mat.clone());
    m.material.uniforms.uTime = U.time;
    m.material.uniforms.op.value = opacity * (0.5 + r());
    m.position.set(center.x + (r() - 0.5) * area, top, center.z + (r() - 0.5) * area);
    m.userData = { tilt: (r() - 0.5) * 0.25 + 0.18, ph: r() * 6.28, sp: 0.2 + r() * 0.3 };
    group.add(m);
  }
  group.userData.update = (t, camera) => {
    for (const m of group.children) {
      // billboard around the vertical axis, keep a slight slant like real sunbeams
      const dx = camera.position.x - m.position.x, dz = camera.position.z - m.position.z;
      m.rotation.set(0, Math.atan2(dx, dz), 0);
      m.rotateZ(m.userData.tilt + Math.sin(t * m.userData.sp + m.userData.ph) * 0.03);
      m.material.uniforms.op.value = m.material.uniforms.op.value; // keep
    }
  };
  return group;
}

// ------------------------------------------------------------- marine snow / dust
export function particles({ count = 1600, box = [80, 50, 80], center = new THREE.Vector3(), color = '#e6fbff', size = 0.12, opacity = 0.65, seed = 9 }) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * box[0]; pos[i * 3 + 1] = (r() - 0.5) * box[1]; pos[i * 3 + 2] = (r() - 0.5) * box[2];
    ph[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.time, cCol: { value: new THREE.Color(color) }, sz: { value: size }, op: { value: opacity }, box: { value: new THREE.Vector3(...box) } },
    vertexShader: /* glsl */`
      uniform float uTime, sz; uniform vec3 box; attribute float ph; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + box.y*0.5 - uTime * (0.25 + fract(ph) * 0.35), box.y) - box.y*0.5;
        p.x += sin(uTime * 0.3 + ph) * 0.6; p.z += cos(uTime * 0.25 + ph * 1.3) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = sz * 1000.0 / -mv.z;
        vA = smoothstep(120.0, 10.0, -mv.z) * (0.4 + 0.6 * fract(ph * 7.3));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 cCol; uniform float op; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(cCol, (1.0 - d*2.0) * op * vA); }`,
  });
  const p = new THREE.Points(g, mat);
  p.position.copy(center); p.frustumCulled = false;
  return p;
}

// ------------------------------------------------------------- bubbles (deterministic emitters)
const bubbleGeo = new THREE.SphereGeometry(1, 12, 8);
const bubbleMat = new THREE.MeshStandardMaterial({ color: '#e8fdff', roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.55, emissive: '#7fdcf0', emissiveIntensity: 0.25 });
export function bubbleEmitter(max = 60) {
  const mesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, max);
  mesh.frustumCulled = false;
  const tmp = new THREE.Object3D();
  const bursts = []; // {t0, origin:Vector3|fn, n, spread, rise, size, life}
  mesh.userData.burst = (b) => bursts.some((x) => x.t0 === b.t0) || bursts.push({ n: 8, spread: 0.6, rise: 3, size: 0.12, life: 2.5, ...b });
  mesh.userData.update = (t) => {
    let k = 0;
    for (const b of bursts) {
      const age = t - b.t0;
      if (age < 0 || age > b.life + b.n * (b.stagger || 0)) continue;
      const o = typeof b.origin === 'function' ? b.origin(b.t0) : b.origin;
      const r = rng(Math.floor(b.t0 * 1000) + 7);
      for (let i = 0; i < b.n && k < max; i++) {
        const a = age - i * (b.stagger || 0);
        const rr = r(), r2 = r(), r3 = r();
        if (a < 0 || a > b.life) continue;
        const s = b.size * (0.5 + rr) * (1 - Math.pow(a / b.life, 4));
        tmp.position.set(
          o.x + (r2 - 0.5) * b.spread + Math.sin(a * 6 + i) * 0.12,
          o.y + a * b.rise * (0.7 + rr * 0.6),
          o.z + (r3 - 0.5) * b.spread + Math.cos(a * 5 + i) * 0.12);
        tmp.scale.setScalar(Math.max(s, 0.001));
        tmp.updateMatrix(); mesh.setMatrixAt(k++, tmp.matrix);
      }
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
  };
  return mesh;
}

// ------------------------------------------------------------- terrain (sea floor / sand)
export function terrain({ size = 300, seg = 160, color = '#d8c39a', amp = 1.2, seed = 4, flatRadius = 0, flatCenter = new THREE.Vector2(), causticK = true, roughness = 0.95 }) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; const r = rng(seed);
  const o1 = r() * 100, o2 = r() * 100;
  const cols = new Float32Array(p.count * 3); const base = new THREE.Color(color); const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let h = Math.sin(x * 0.05 + o1) * Math.cos(z * 0.045 + o2) * 2.2 + Math.sin(x * 0.17 + z * 0.11) * 0.5 + Math.sin(x * 0.6 + z * 0.9) * 0.08;
    const d = Math.hypot(x - flatCenter.x, z - flatCenter.y);
    h *= amp * (flatRadius > 0 ? THREE.MathUtils.smoothstep(d, flatRadius * 0.6, flatRadius * 1.6) * 0.85 + 0.15 : 1);
    p.setY(i, h);
    const v = 0.9 + Math.sin(x * 0.31 + z * 0.23) * 0.04 + (h * 0.02);
    tmp.copy(base).multiplyScalar(v); cols.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, (causticK ? causticMaterial : (o) => new THREE.MeshStandardMaterial(o))({ color: '#ffffff', vertexColors: true, roughness }));
  m.receiveShadow = true;
  m.userData.heightAt = (x, z) => {
    let h = Math.sin(x * 0.05 + o1) * Math.cos(z * 0.045 + o2) * 2.2 + Math.sin(x * 0.17 + z * 0.11) * 0.5;
    const d = Math.hypot(x - flatCenter.x, z - flatCenter.y);
    return h * amp * (flatRadius > 0 ? THREE.MathUtils.smoothstep(d, flatRadius * 0.6, flatRadius * 1.6) * 0.85 + 0.15 : 1);
  };
  return m;
}

// ------------------------------------------------------------- rocks, coral, kelp
export function rock(r, color = '#6f7378', s = 1) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    v.multiplyScalar(0.8 + r() * 0.35); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, causticMaterial({ color, roughness: 0.9, flatShading: true }));
  m.scale.set(s * (1 + r()), s * (0.6 + r() * 0.6), s * (1 + r()));
  m.rotation.y = r() * 6.28; m.castShadow = m.receiveShadow = true;
  return m;
}

const CORAL = ['#ff7a5c', '#ffb347', '#f25f8b', '#c86bfa', '#ffd166', '#5ad1c3', '#ff9fb2'];
export function coral(r, s = 1) {
  const g = new THREE.Group();
  const col = CORAL[Math.floor(r() * CORAL.length)];
  const m = causticMaterial({ color: col, roughness: 0.75, emissive: col, emissiveIntensity: 0.06 });
  const kind = Math.floor(r() * 3);
  if (kind === 0) { // branching blocks
    const branch = (parent, depth, len) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.35 * s, len * s, 0.35 * s, 2, 0.1 * s), m);
      b.position.y = len * s / 2; b.castShadow = true;
      const pivot = new THREE.Group(); pivot.add(b); parent.add(pivot);
      if (depth > 0) for (let i = 0; i < 2; i++) {
        const c = new THREE.Group(); c.position.y = len * s; c.rotation.set((r() - 0.5) * 1.2, r() * 6, (r() - 0.5) * 1.2);
        pivot.add(c); branch(c, depth - 1, len * 0.75);
      }
      return pivot;
    };
    branch(g, 2, 1.4);
  } else if (kind === 1) { // brain coral
    const b = new THREE.Mesh(new THREE.SphereGeometry(1.1 * s, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), causticMaterial({ color: col, roughness: 0.9, flatShading: true }));
    b.scale.y = 0.8; b.castShadow = true; g.add(b);
  } else { // tube sponges
    for (let i = 0; i < 4; i++) {
      const h = (1 + r() * 2) * s;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.32 * s, h, 7, 1, true), causticMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide }));
      t.position.set((r() - 0.5) * 1.1 * s, h / 2, (r() - 0.5) * 1.1 * s); t.castShadow = true; g.add(t);
    }
  }
  return g;
}

export function kelp(r, height = 18, color = '#4f8a3a') {
  const root = new THREE.Group();
  const segs = Math.round(height / 1.4);
  const m = causticMaterial({ color, roughness: 0.7, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.05 });
  const stemG = new THREE.BoxGeometry(0.16, 1.4, 0.16); stemG.translate(0, 0.7, 0);
  const leafG = new RoundedBoxGeometry(0.9, 1.25, 0.06, 1, 0.03); leafG.translate(0.42, 0.62, 0);
  let parent = root; const joints = [];
  for (let i = 0; i < segs; i++) {
    const j = new THREE.Group(); if (i > 0) j.position.y = 1.4;
    j.add(new THREE.Mesh(stemG, m));
    const leaf = new THREE.Mesh(leafG, m); leaf.rotation.set(0, r() * 6.28, 0.5 * (r() > 0.5 ? 1 : -1)); j.add(leaf);
    parent.add(j); joints.push(j); parent = j;
  }
  const ph = r() * 6.28;
  root.userData.update = (t) => {
    joints.forEach((j, i) => {
      j.rotation.z = Math.sin(t * 0.9 + ph + i * 0.35) * 0.06;
      j.rotation.x = Math.cos(t * 0.7 + ph + i * 0.3) * 0.05;
    });
  };
  return root;
}

// ------------------------------------------------------------- fish
const FISH_COLORS = [
  ['#ffcc33', '#ffffff'], ['#ff8a2a', '#ffffff'], ['#3aa0ff', '#ffe14d'], ['#9d6bff', '#ffd1f0'], ['#e8f3ff', '#5aa9ff'], ['#ff5c7a', '#ffe3a1'],
];
const fishBody = new RoundedBoxGeometry(1, 0.62, 0.3, 2, 0.12);
const fishTail = new THREE.BoxGeometry(0.06, 0.5, 0.45); fishTail.translate(0, 0, 0);
const fishFin = new THREE.BoxGeometry(0.04, 0.3, 0.3);
const eyeG = new THREE.BoxGeometry(0.1, 0.13, 0.04);
export function fish(r, s = 1, palette = null) {
  const [c1, c2] = palette || FISH_COLORS[Math.floor(r() * FISH_COLORS.length)];
  const g = new THREE.Group();
  const body = new THREE.Mesh(fishBody, causticMaterial({ color: c1, roughness: 0.4 }));
  body.castShadow = true; g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.32), causticMaterial({ color: c2, roughness: 0.4 }));
  stripe.position.x = 0.1; g.add(stripe);
  const tailPivot = new THREE.Group(); tailPivot.position.x = -0.5; g.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.05), body.material); tail.position.x = -0.22; tailPivot.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.04), body.material); fin.position.set(0, 0.38, 0); fin.rotation.z = -0.3; g.add(fin);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#111' });
  const white = new THREE.MeshBasicMaterial({ color: '#fff' });
  for (const z of [0.16, -0.16]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.02), white); w.position.set(0.3, 0.07, z); g.add(w);
    const e = new THREE.Mesh(eyeG, eyeM); e.position.set(0.33, 0.07, z * 1.08); g.add(e);
  }
  g.scale.setScalar(s);
  g.userData.tail = tailPivot;
  g.userData.ph = r() * 6.28;
  return g;
}

// a school of fish orbiting a path function
export function school({ n = 12, seed = 5, path, spread = 3, size = 0.8, palette = null, speed = 1 }) {
  const r = rng(seed);
  const group = new THREE.Group();
  const members = [];
  const pal = palette || FISH_COLORS[Math.floor(r() * FISH_COLORS.length)];
  for (let i = 0; i < n; i++) {
    const f = fish(r, size * (0.8 + r() * 0.4), pal);
    f.userData.off = new THREE.Vector3((r() - 0.5) * spread, (r() - 0.5) * spread * 0.5, (r() - 0.5) * spread);
    f.userData.lag = r() * 0.6;
    group.add(f); members.push(f);
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  group.userData.update = (t) => {
    for (const f of members) {
      const tt = t * speed - f.userData.lag;
      path(tt, a); path(tt + 0.05, b);
      f.position.copy(a).add(f.userData.off);
      f.position.y += Math.sin(t * 2 + f.userData.ph) * 0.15;
      const dx = b.x - a.x, dz = b.z - a.z, dy = b.y - a.y;
      f.rotation.set(0, Math.atan2(-dz, dx), Math.atan2(dy, Math.hypot(dx, dz)));
      f.userData.tail.rotation.y = Math.sin(t * 12 + f.userData.ph) * 0.5;
    }
  };
  return group;
}

// ------------------------------------------------------------- jellyfish
export function jellyfish(r, color = '#ff8fe0', s = 1) {
  const g = new THREE.Group();
  const bellM = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, transparent: true, opacity: 0.55, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(1 * s, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), bellM);
  g.add(bell);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  core.position.y = 0.25 * s; g.add(core);
  const tents = [];
  const tm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const piv = new THREE.Group(); piv.position.set(Math.cos(a) * 0.6 * s, 0, Math.sin(a) * 0.6 * s);
    const len = (2.5 + r() * 2.5) * s;
    const tg = new THREE.BoxGeometry(0.05 * s, len, 0.05 * s); tg.translate(0, -len / 2, 0);
    piv.add(new THREE.Mesh(tg, tm)); g.add(piv); tents.push(piv);
  }
  const ph = r() * 6.28;
  g.userData.update = (t) => {
    const p = Math.sin(t * 2.2 + ph);
    bell.scale.set(1 + p * 0.1, 1 - p * 0.12, 1 + p * 0.1);
    tents.forEach((tp, i) => { tp.rotation.x = Math.sin(t * 1.6 + ph + i) * 0.2; tp.rotation.z = Math.cos(t * 1.3 + ph + i) * 0.2; });
  };
  return g;
}

// ------------------------------------------------------------- additive light cone (flashlight beam)
export function beamCone({ length = 22, radius = 5, color = '#fff4d6', opacity = 0.22 }) {
  const g = new THREE.ConeGeometry(radius, length, 32, 1, true);
  g.translate(0, -length / 2, 0); g.rotateX(-Math.PI / 2); // apex at origin, opens toward +z
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { cCol: { value: new THREE.Color(color) }, op: { value: opacity }, len: { value: length } },
    vertexShader: /* glsl */`varying float vZ; varying vec3 vN; varying vec3 vV;
      void main(){ vZ = position.z; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform vec3 cCol; uniform float op, len; varying float vZ; varying vec3 vN; varying vec3 vV;
      void main(){ float k = 1.0 - clamp(vZ / len, 0.0, 1.0); float rim = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(cCol, op * k * k * rim); }`,
  });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 5;
  return m;
}
