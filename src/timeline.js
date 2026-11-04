// Shot list, camera moves, character performance and text cues.
import * as THREE from 'three';
import { seg, lerp, ease, rng } from './env.js';
import { motion } from './character.js';

export const DURATION = 47;

// ---------------------------------------------------------------- text cues
export const cues = {
  titles: [
    { start: 0.5, end: 5.9, text: 'What if humans could breathe underwater?' },
    { start: 42.3, end: 46.4, text: 'What if humans could breathe underwater?' },
  ],
  labels: [
    { start: 1.9, end: 6.1, k: 'THE FIRST HUMAN', v: 'DAY #1' },
    { start: 7.2, end: 12.6, k: 'DEPTH', v: '10 METERS' },
    { start: 22.2, end: 27.8, k: 'DEPTH', v: '200 METERS' },
    { start: 30.0, end: 34.3, k: 'UNDERWATER CITY', v: 'YEAR #25' },
  ],
  subs: [
    { start: 9.9, end: 12.9, who: 'max', text: 'Wait… I can actually breathe down here?' },
    { start: 15.3, end: 17.9, who: 'leo', text: 'Bro, why are you sitting down here?' },
    { start: 18.2, end: 19.9, who: 'max', text: 'I live here now.' },
    { start: 23.4, end: 25.9, who: 'leo', text: 'My snorkel is not helping.' },
    { start: 26.2, end: 28.4, who: 'max', text: 'It was never helping.' },
    { start: 35.3, end: 37.9, who: 'max', text: 'You know you don’t need that anymore, right?' },
    { start: 38.2, end: 40.1, who: 'leo', text: 'It’s part of my look now.' },
  ],
};

// dip-to-black between sets
export function fadeAt(t) {
  const dips = [[6.15, 6.5, 6.85], [28.6, 29.0, 29.5], [46.2, 47, 99]];
  for (const [a, m, b] of dips) {
    if (t >= a && t <= m) return ease.io((t - a) / (m - a));
    if (t > m && t <= b) return 1 - ease.io((t - m) / (b - m));
  }
  return t < 0.35 ? 1 - t / 0.35 : 0;
}

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix3 = (a, b, k) => a.clone().lerp(b, k);
function aim(cam, pos, target, fov = 50) {
  cam.position.copy(pos); cam.lookAt(target);
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
const merge = (...ps) => Object.assign({}, ...ps);

// ---------------------------------------------------------------- shots
export function makeShots(S, cast, gear) {
  const { max, leo } = cast;
  const say = (who, t) => {
    const c = cues.subs.find((s) => s.who === who && t >= s.start + 0.05 && t <= s.end - 0.3);
    return !!c;
  };
  const face = (ch, e, t) => ch.setFace(e, t, say(ch.name, t), ch.name === 'leo' ? 5 : 0);

  return [
    // ---------------------------------------------------- 1. Beach, dawn. Low angle.
    {
      start: 0, end: 6.5, scene: S.beach,
      setup() {
        leo.root.visible = false; max.root.visible = true; gear.max.visible = false; gear.leo.visible = false;
        S.beach.userData.splash.userData.burst({ t0: 6.05, origin: v3(1.4, 0.6, -9), n: 30, spread: 2.4, rise: 4, size: 0.25, life: 1.2 });
      },
      update(lt, t, cam) {
        // stands looking out to sea, turns to camera, nods, then runs into the water
        let yaw = Math.PI, x = 1.4, z = 0, walk = 0;
        const turn = ease.io(seg(lt, 2.6, 3.3)), back = ease.io(seg(lt, 4.9, 5.3));
        yaw = lerp(Math.PI * 0.94, 0.12, turn); yaw = lerp(yaw, Math.PI * 1.02, back);
        const run = seg(lt, 5.15, 6.5);
        z = -ease.in(run) * 9; walk = run > 0 ? 1 : 0;
        max.root.position.set(x, 0, z); max.root.rotation.y = yaw;
        const nod = Math.sin(seg(lt, 3.6, 4.3) * Math.PI) * 0.22;
        let p = merge(motion.idle(lt), { headX: nod, headY: lt < 2.6 ? Math.sin(lt * 0.7) * 0.15 : 0 });
        if (walk) p = merge(p, motion.walk(lt, 1.25), { lean: 0.18 });
        if (lt > 3.4 && lt < 4.9) { const k = Math.sin(seg(lt, 3.4, 4.9) * Math.PI); p.aRx = -1.25 * k; p.aRz = 0.1; } // little "let's go" gesture
        max.pose(p);
        face(max, lt > 3.2 ? { eyes: 'open', mouth: 'smirk', brows: 'determined' } : { eyes: 'open', mouth: 'flat' }, t);
        const k = ease.io(seg(lt, 0, 6.5));
        aim(cam, v3(lerp(-2.4, -1.2, k), lerp(2.2, 2.6, k), lerp(16, 13.5, k)), v3(lerp(0.4, 0.8, k), lerp(4.4, 4.2, k), lerp(0, -1.5, k)), 54);
      },
    },
    // ---------------------------------------------------- 2. Plunge into the shallows, discovers breathing.
    {
      start: 6.5, end: 13, scene: S.reef,
      setup() {
        max.root.visible = true; leo.root.visible = false;
        const b = S.reef.userData.bubbles.userData;
        b.burst({ t0: 6.5, origin: v3(0, 29.5, 0), n: 60, spread: 4, rise: 2.2, size: 0.28, life: 2.6 });
        b.burst({ t0: 7.0, origin: () => max.head.getWorldPosition(new THREE.Vector3()), n: 14, spread: 0.6, rise: 2.6, size: 0.12, life: 2.4, stagger: 0.12 });
        b.burst({ t0: 9.15, origin: () => max.head.getWorldPosition(new THREE.Vector3()).add(v3(0.3, -0.2, 0.9)), n: 26, spread: 0.7, rise: 3.2, size: 0.2, life: 3, stagger: 0.03 });
      },
      update(lt, t, cam) {
        const dive = ease.out(seg(lt, 0, 1.2));
        const y = lerp(31, 22.5, dive) - seg(lt, 1.2, 6.5) * 2.2;
        max.root.position.set(0.3, y, 0);
        max.root.rotation.set(lerp(-0.5, 0, dive), 0.25, 0);
        let p;
        if (lt < 1.1) p = { aLx: -2.9, aRx: -2.9, aLz: 0.1, aRz: 0.1, lLx: 0.1, lRx: -0.1 };
        else if (lt < 2.7) p = merge(motion.tread(lt * 1.8, 1.4), { headY: Math.sin(lt * 3) * 0.25 });
        else {
          p = merge(motion.tread(lt, 0.8));
          const look = ease.io(seg(lt, 3.3, 3.8)) * (1 - ease.io(seg(lt, 5.6, 6.1)));
          p.aLx = lerp(p.aLx, -1.35, look); p.aRx = lerp(p.aRx, -1.35, look); p.aLz = lerp(p.aLz, -0.2, look); p.aRz = lerp(p.aRz, -0.2, look);
          p.headX = 0.32 * look;
        }
        max.pose(p);
        let e = { eyes: 'squeeze', mouth: 'puff' };
        if (lt > 2.65) e = { eyes: 'wide', mouth: 'o', brows: 'up' };
        if (lt > 3.2) e = { eyes: 'wide', mouth: 'small-o', brows: 'up' };
        if (lt > 5.9) e = { eyes: 'happy', mouth: 'grin', brows: 'up' };
        face(max, e, t);
        // the "first breath" bubbles come from the mouth
        const k = ease.io(seg(lt, 0, 6.5));
        const focus = max.root.position.clone().add(v3(0, 3.6, 0));
        aim(cam, v3(lerp(3.4, 2.4, k), lerp(14.5, 16.2, k), lerp(14, 11.5, k)), mix3(v3(0.3, 27, 0), focus, ease.io(seg(lt, 0.2, 1.6))), 50);
      },
    },
    // ---------------------------------------------------- 3. Sitting on the sea floor. Leo arrives.
    {
      start: 13, end: 21.5, scene: S.reef,
      setup() { max.root.visible = true; leo.root.visible = true; leo.setGear(true); },
      update(lt, t, cam) {
        const fl = S.reef.userData.floor.userData.heightAt;
        max.root.position.set(1.4, fl(1.4, 0) + 0.05, 0); max.root.rotation.set(0, -0.3, 0);
        let pm = motion.sitFloor(t);
        if (lt < 1.6) { const w = Math.sin(seg(lt, 0.3, 1.6) * Math.PI); pm.aRx = lerp(pm.aRx, -2.4, w); pm.aRz = lerp(pm.aRz, 0.3, w); }
        if (t > 18.2 && t < 20) pm = merge(pm, { headY: -0.25, headX: 0.1 });
        max.pose(pm);
        face(max, t > 18.1 ? { eyes: 'happy', mouth: 'smirk' } : { eyes: 'half', mouth: 'smile' }, t);

        // Leo swims in from the left, then treads water staring at Max
        const arrive = ease.out(seg(lt, 0, 2.3));
        const lp = mix3(v3(-17, 9, -5), v3(-2.9, 3.4, -0.6), arrive);
        lp.y += Math.sin(t * 1.3) * 0.15;
        leo.root.position.copy(lp);
        const settle = ease.io(seg(lt, 1.6, 2.6));
        leo.root.rotation.set(0, lerp(Math.PI / 2, 0.55, settle), 0);
        const sw = motion.swim(t), tr = motion.tread(t);
        const lpz = {};
        for (const k of new Set([...Object.keys(sw), ...Object.keys(tr)])) lpz[k] = lerp(sw[k] || 0, tr[k] || 0, settle);
        if (t > 19.9) { lpz.headY = 0.12; }
        if (t > 15.3 && t < 17.9) { const g = Math.sin(seg(t, 15.4, 17.6) * Math.PI); lpz.aRx = lerp(lpz.aRx, -1.4, g); lpz.aRz = lerp(lpz.aRz, -0.35, g); }
        leo.pose(lpz);
        let le = { eyes: 'open', mouth: 'flat' };
        if (t > 15.2) le = { eyes: 'open', mouth: 'flat', brows: 'worried' };
        if (t > 18.3) le = { eyes: 'half', mouth: 'flat', brows: 'flat' };
        if (t > 20.15) le = { eyes: 'wide', mouth: 'wobble', look: 0, brows: 'up' };
        face(leo, le, t);

        // the curious fish stops right in front of Leo's goggles
        const f = S.reef.userData.curious;
        const head = leo.head.getWorldPosition(new THREE.Vector3());
        const fwd = v3(Math.sin(leo.root.rotation.y), 0, Math.cos(leo.root.rotation.y));
        const stop = head.clone().add(fwd.clone().multiplyScalar(1.5)).add(v3(0, 0.15, 0));
        const fa = ease.out(seg(t, 19.6, 20.3));
        const fp = mix3(stop.clone().add(v3(9, 3, 4)), stop, fa);
        fp.y += Math.sin(t * 3) * 0.05;
        f.position.copy(fp);
        const toLeo = head.clone().sub(fp);
        f.rotation.set(0, Math.atan2(-toLeo.z, toLeo.x), 0);
        f.userData.tail.rotation.y = Math.sin(t * (fa < 1 ? 14 : 5)) * 0.45;
        f.visible = t > 19.4;

        const k = ease.io(seg(lt, 0, 8.5));
        aim(cam, v3(lerp(1.4, 0.8, k), lerp(5.6, 5.2, k), lerp(20, 17.5, k)), v3(-0.6, lerp(3.2, 3.4, k), 0), 50);
      },
    },
    // ---------------------------------------------------- 4. The deep: flashlights, jellyfish, darkness.
    {
      start: 21.5, end: 29, scene: S.deep,
      setup() {
        max.root.visible = true; leo.root.visible = true; leo.setGear(true); gear.max.visible = true; gear.leo.visible = true;
        const b = S.deep.userData.bubbles.userData;
        b.burst({ t0: 25.95, origin: () => leo.head.getWorldPosition(new THREE.Vector3()).add(v3(0.8, 1.4, 0.2)), n: 6, spread: 0.2, rise: 1.8, size: 0.14, life: 2.2, stagger: 0.15 });
      },
      update(lt, t, cam) {
        max.root.position.set(2.0, Math.sin(t * 1.1) * 0.25, 0); max.root.rotation.set(0, -0.25, 0);
        leo.root.position.set(-2.1, 0.3 + Math.sin(t * 1.1 + 1.4) * 0.25, 0.6); leo.root.rotation.set(0, 0.35, 0);
        const sweep = Math.sin(t * 0.7) * 0.25;
        max.pose(merge(motion.tread(t, 0.6), { aRx: -1.35 + sweep * 0.4, aRy: sweep, aRz: -0.05, headY: sweep * 0.5 + (t > 26 ? -0.45 : 0) }));
        const panic = t > 25.4 && t < 26.1 ? Math.sin(t * 40) * 0.08 : 0;
        leo.pose(merge(motion.tread(t + 1, 0.9), { aLx: -1.25 - sweep * 0.3, aLy: -sweep, aLz: -0.05, headZ: panic, headY: t > 23 && t < 26 ? 0.1 : 0.35 }));
        face(max, t > 26.1 ? { eyes: 'half', mouth: 'smirk' } : { eyes: 'open', mouth: 'flat' }, t);
        face(leo, t < 23.3 ? { eyes: 'wide', mouth: 'small-o', brows: 'worried' } : t < 26.2 ? { eyes: 'open', mouth: 'wobble', brows: 'worried' } : { eyes: 'half', mouth: 'flat', brows: 'flat' }, t);
        const k = ease.io(seg(lt, 0, 7.5));
        aim(cam, v3(lerp(0.8, 0.2, k), lerp(-5.5, -3.8, k), lerp(17.5, 14.5, k)), v3(0, lerp(3.4, 3.6, k), 0), 52);
      },
    },
    // ---------------------------------------------------- 5a. Establishing: the city, 25 years later.
    {
      start: 29, end: 34.6, scene: S.city,
      setup() { max.root.visible = true; leo.root.visible = true; leo.setGear(true); gear.max.visible = false; gear.leo.visible = false; },
      update(lt, t, cam) {
        const k = ease.io(seg(lt, 0, 5.6));
        // Max & Leo swim across the foreground, side by side
        const sx = lerp(-26, 18, seg(lt, 0, 5.6));
        for (const [ch, dz, dy, ph] of [[max, 0, 0, 0], [leo, -2.8, 1.2, 1.3]]) {
          ch.root.position.set(sx + (ch === leo ? -2.2 : 0), 47 + dy + Math.sin(t * 1.2 + ph) * 0.4, 58 + dz);
          ch.root.rotation.set(0, Math.PI / 2, 0);
          ch.pose(motion.swim(t + ph));
          face(ch, { eyes: 'happy', mouth: 'smile' }, t);
        }
        aim(cam, v3(lerp(-14, 4, k), lerp(64, 47, k), lerp(102, 82, k)), v3(lerp(-4, 8, k), lerp(26, 22, k), lerp(-10, 6, k)), 55);
      },
    },
    // ---------------------------------------------------- 5b. Rooftop terrace. Leo still wears the snorkel.
    {
      start: 34.6, end: 41.6, scene: S.city,
      setup() {
        max.root.visible = true; leo.root.visible = true; leo.setGear(true);
        const b = S.city.userData.bubbles.userData;
        b.burst({ t0: 40.75, origin: () => max.head.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.8, 0)), n: 12, spread: 0.8, rise: 2.4, size: 0.13, life: 2.2, stagger: 0.02 });
        b.burst({ t0: 39.3, origin: () => leo.head.getWorldPosition(new THREE.Vector3()).add(v3(0.8, 1.45, 0.2)), n: 8, spread: 0.15, rise: 2.2, size: 0.12, life: 2.2, stagger: 0.12 });
      },
      update(lt, t, cam) {
        const R = S.city.userData.roof;
        max.root.position.set(R.x - 3.2, R.y + 0.1, R.z + 0.4); max.root.rotation.set(0, 0.32, 0);
        leo.root.position.set(R.x + 3.2, R.y + 0.1, R.z + 0.4); leo.root.rotation.set(0, -0.32, 0);
        const sm = motion.sitChair(t);
        const bonk = seg(t, 40.7, 41.5);
        const jerk = bonk > 0 ? Math.sin(Math.min(1, bonk * 3) * Math.PI) : 0;
        max.pose(merge(sm, { headY: t > 37.9 && t < 40.6 ? -0.35 : -0.15, headZ: jerk * 0.3, headX: jerk * 0.2, aRx: t > 35.3 && t < 37.9 ? -1.3 : sm.aRx, aRz: t > 35.3 && t < 37.9 ? -0.35 : 0.08 }));
        // Leo proudly adjusts his snorkel, then sips his drink through it
        const adj = Math.sin(seg(t, 38.3, 39.6) * Math.PI);
        leo.pose(merge(sm, { headY: t < 38.1 ? 0.35 : 0.05, headX: -0.08 * adj, aRx: -2.5 * adj + sm.aRx * (1 - adj), aRz: 0.15 * adj }));
        face(max, bonk > 0 ? { eyes: 'squeeze', mouth: 'wobble' } : t > 37.9 ? { eyes: 'half', mouth: 'flat', brows: 'flat' } : { eyes: 'open', mouth: 'smile', brows: 'up' }, t);
        face(leo, bonk > 0.15 ? { eyes: 'happy', mouth: 'grin' } : t > 38.1 ? { eyes: 'happy', mouth: 'smirk' } : { eyes: 'open', mouth: 'smile' }, t);

        // a fish swims straight into Max's head
        const f = S.city.userData.bonkFish;
        const hp = max.head.getWorldPosition(new THREE.Vector3());
        const fa = seg(t, 39.9, 40.72);
        const fp = mix3(hp.clone().add(v3(-2.5, 7, 4)), hp.clone().add(v3(-0.4, 0.5, 0.7)), fa);
        if (t > 40.72) fp.add(v3(ease.out(seg(t, 40.72, 41.6)) * 1.5, ease.out(seg(t, 40.72, 41.6)) * 2.5, 0.5));
        f.position.copy(fp);
        f.rotation.set(t > 40.72 ? seg(t, 40.72, 41.6) * 6 : 0, t > 40.72 ? Math.PI : -0.9, t > 40.72 ? 0 : -0.9);
        f.userData.tail.rotation.y = Math.sin(t * 16) * 0.5;
        f.visible = t > 39.8;

        const k = ease.io(seg(lt, 0, 7));
        aim(cam, v3(R.x + lerp(1.0, 0.4, k), R.y + lerp(4.6, 4.4, k), R.z + lerp(21, 18.5, k)), v3(R.x + lerp(0.2, 0, k), R.y + 4.0, R.z), 48);
      },
    },
    // ---------------------------------------------------- 6. Final: looking up at the light. Title returns.
    {
      start: 41.6, end: 47.5, scene: S.city,
      setup() { max.root.visible = true; leo.root.visible = true; leo.setGear(true); S.city.userData.bonkFish.visible = false; },
      update(lt, t, cam) {
        const R = S.city.userData.roof;
        max.root.position.set(R.x - 6.2, R.y, R.z - 7.0); max.root.rotation.set(0, Math.PI - 0.12, 0);
        leo.root.position.set(R.x - 3.0, R.y, R.z - 6.8); leo.root.rotation.set(0, Math.PI + 0.15, 0);
        const point = ease.io(seg(lt, 1.0, 1.8)) * (1 - ease.io(seg(lt, 3.6, 4.4)));
        max.pose(merge(motion.idle(t), { headX: -0.45, headY: -0.15, aRx: -2.7 * point, aRz: 0.15 * point }));
        leo.pose(merge(motion.idle(t + 1), { headX: -0.4, headY: 0.2 }));
        face(max, { eyes: 'open', mouth: 'smile' }, t); face(leo, { eyes: 'open', mouth: 'smile' }, t);
        const k = ease.io(seg(lt, 0, 5.4));
        aim(cam, v3(R.x - 4.6, R.y + lerp(0.6, 1.0, k), R.z - lerp(22, 19, k)), v3(R.x - 4.6, R.y + lerp(6.6, 6.0, k), R.z - 7), 56);
      },
    },
  ];
}
