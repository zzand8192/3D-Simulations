// EP001 — What if every road disappeared? Shot list: cameras, acting and story beats (timing in cues.json).
import * as THREE from 'three';
import { seg, lerp, ease } from './env.js';
import { motion, mergePose } from './character.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix3 = (a, b, k) => a.clone().lerp(b, k);
const wpos = (o, dy = 0) => o.getWorldPosition(new THREE.Vector3()).add(v3(0, dy, 0));
const IO = ease.io;
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
function aim(cam, pos, target, fov = 50, shake = 0, t = 0) {
  cam.position.copy(pos);
  if (shake) cam.position.add(v3(Math.sin(t * 7.1) * shake, Math.sin(t * 5.3 + 1) * shake * 0.6, Math.cos(t * 6.2) * shake * 0.4));
  cam.lookAt(target);
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}

export function fadeAt(t) {
  if (t < 0.3) return 1 - t / 0.3;
  const dips = [[21.35, 21.6, 21.85], [37.05, 37.3, 37.55], [50.35, 50.6, 50.85], [64.25, 64.5, 64.75], [79.35, 79.6, 79.85], [87.95, 88.2, 88.45]];
  for (const [a, m, b] of dips) { if (t >= a && t <= m) return IO((t - a) / (m - a)); if (t > m && t <= b) return 1 - IO((t - m) / (b - m)); }
  if (t > 97.6) return IO((t - 97.6) / 1.4);
  return 0;
}

export function makeShots(S, cues) {
  const T = cues.shots, TV = cues.tv;
  const talking = (who, t) => cues.subs.some((s) => s.who === who && t >= s.start + 0.05 && t <= s.end - 0.3);
  const face = (ch, e, t, seed = 0) => ch.setFace(e, t, talking(ch.name, t), seed);
  const shot = (name, o) => ({ name, start: T[name][0], end: T[name][1], ...o });
  const N = S.nyc.userData, G1 = S.gas.userData, G2 = S.gas2.userData;

  return [
    // ---------------------------------------------------------------- 1. a normal morning in New York
    shot('nycWide', {
      scene: S.nyc,
      update(lt, t, cam) {
        const k = IO(seg(lt, 0, 4.8));
        aim(cam, mix3(v3(4, 46, 130), v3(1, 24, 70), k), mix3(v3(0, 4, -60), v3(-1, 3, -10), k), 54);
      },
    }),
    // close on a tyre rolling over asphalt — the asphalt vanishes beneath it
    shot('tire', {
      scene: S.nyc, setup() { N.hideZone = [-40, 60]; },
      update(lt, t, cam) {
        const v = N.hero.v; const p = v.position;
        const o = v3(-2.6, 1.15, 8.2), tg = v3(-2.3, 0.5, 3.0);
        aim(cam, p.clone().add(o).add(v3(0, t > TV ? -0.4 * IO(seg(t, TV, TV + 0.2)) : 0, 0)), p.clone().add(tg), 46);
      },
    }),
    // wide reveal: the whole street is gone
    shot('reveal', {
      scene: S.nyc, setup() { N.hideZone = null; },
      update(lt, t, cam) {
        const p = N.actors.ped1; p.root.position.set(-13.4, 0.3, 17.5); p.root.rotation.y = Math.PI / 2 - 0.3;
        const look = IO(seg(t, 6.0, 6.5));
        p.pose(mergePose(motion.idle(t), { headX: 0.5 * look, torsoX: 0.12 * look, aLz: 0.4 * look, aRz: 0.4 * look, eL: -0.4, eR: -0.4 }));
        face(p, { eyes: 'wide', mouth: 'o', brows: 'up' }, t, 1);
        const k = IO(seg(lt, 0, 3.7));
        aim(cam, mix3(v3(-15.6, 5.4, 32), v3(-15.2, 6.2, 29), k), v3(-5, 2.4, 6), 54);
      },
    }),
    // ---------------------------------------------------------------- 2A. downtown: the driver steps out
    shot('downtown', {
      scene: S.nyc,
      update(lt, t, cam) {
        const d = N.actors.driver, car = N.driverCar;
        const out = IO(seg(t, 9.8, 10.9));
        d.root.position.copy(mix3(v3(-5.8, car.position.y + 0.1, -62.5), v3(-8.4, car.position.y + 0.05, -60.5), out));
        d.root.rotation.y = lerp(-Math.PI / 2, 0.35, IO(seg(t, 10.6, 11.0)));
        const gest = Math.sin(seg(t, 11.0, 13.4) * Math.PI);
        d.pose(mergePose(out > 0 && out < 1 ? motion.walk(t, 0.9) : motion.idle(t), { aLz: 0.2 + gest * 0.75, aRz: 0.2 + gest * 0.75, eL: -0.3 - gest * 0.6, eR: -0.3 - gest * 0.6, aLx: -0.5 * gest, aRx: -0.5 * gest }));
        face(d, { eyes: 'wide', mouth: 'open', brows: 'angry' }, t, 2);
        const k = IO(seg(lt, 0, 4.2));
        aim(cam, mix3(v3(-17, 4.4, -44), v3(-16, 4.8, -46.5), k), v3(-5, 4.6, -67), 52);
      },
    }),
    // 2B. residential street
    shot('suburb', {
      scene: S.suburb,
      update(lt, t, cam) {
        const o = S.suburb.userData.actors.owner, door = S.suburb.userData.house.userData.door;
        door.rotation.y = -1.7 * IO(seg(t, 13.95, 14.5));
        const step = IO(seg(t, 14.3, 15.0));
        o.root.position.copy(mix3(v3(0, 0.3, -11), v3(0, 0.9, -7.2), step)); o.root.rotation.y = 0;
        o.pose(mergePose(step > 0 && step < 1 ? motion.walk(t, 0.8) : motion.idle(t), { aLx: -0.8, eL: -1.2, headX: t > 15 ? 0.2 : 0 }));
        face(o, t < 14.9 ? { eyes: 'open', mouth: 'smile' } : { eyes: 'wide', mouth: 'o', brows: 'up' }, t, 3);
        const k = IO(seg(lt, 0, 3.8));
        aim(cam, mix3(v3(-11, 4.0, 25), v3(-9, 4.4, 22), k), v3(-0.5, 4.6, -6), 50);
      },
    }),
    // 2C. highway aerial
    shot('highway', {
      scene: S.highway,
      update(lt, t, cam) {
        const k = IO(seg(lt, 0, 4.0));
        aim(cam, mix3(v3(-230, 120, 380), v3(150, 95, 230), k), mix3(v3(-120, 0, 140), v3(110, 0, 40), k), 52);
      },
    }),
    // ---------------------------------------------------------------- 3. global breaking news
    shot('studio', {
      scene: S.studio, prerender: (R, t) => R.renderWall(t),
      update(lt, t, cam) {
        const a = S.studio.userData.actors.anchor;
        a.pose(mergePose(motion.sitChair(t), { aLx: -0.75, aRx: -0.75, eL: -0.95, eR: -0.95 + Math.sin(t * 2.2) * 0.1, aLz: 0.18, aRz: 0.18, headX: Math.sin(t * 2.4) * 0.03 }));
        face(a, { eyes: 'open', mouth: 'flat', brows: 'soft' }, t);
        const k = IO(seg(lt, 0, 7.3));
        aim(cam, v3(lerp(1.2, 0.5, k), lerp(4.4, 4.2, k), lerp(12.5, 10.0, k)), v3(0, lerp(3.9, 3.8, k), -2), 50);
      },
    }),
    shot('tokyo', {
      scene: S.tokyo,
      update(lt, t, cam) {
        const r = S.tokyo.userData.actors.reporter;
        r.pose(mergePose(motion.idle(t), { aRx: -1.2, eR: -1.55, aLx: -0.3 + Math.sin(t * 1.6) * 0.12, eL: -0.6 }));
        face(r, { eyes: 'open', mouth: 'flat', brows: 'soft' }, t, 4);
        aim(cam, v3(-15.8, 5.2, 42), v3(-12, 4.3, 10), 46, 0.06, t);
      },
    }),
    shot('london', { scene: S.london, update(lt, t, cam) { const k = IO(seg(lt, 0, 1.4)); aim(cam, mix3(v3(70, 80, 110), v3(55, 66, 80), k), v3(0, 0, -20), 54, 0.15, t); } }),
    shot('sao', { scene: S.sao, update(lt, t, cam) { const k = IO(seg(lt, 0, 1.5)); aim(cam, mix3(v3(-20, 110, 170), v3(-12, 96, 140), k), v3(0, 0, -60), 54, 0.15, t); } }),
    // ---------------------------------------------------------------- 4. Greg: Arizona gas station
    shot('gasIn', {
      scene: S.gas,
      update(lt, t, cam) {
        const { greg, cashier } = G1.actors, reg = G1.register;
        const turn = IO(seg(t, 42.4, 42.9)), go = seg(t, 42.6, 43.0);
        greg.root.position.set(-4.6 + go * 1.6, 0.3, -9.6); greg.root.rotation.y = lerp(Math.PI, Math.PI / 2, turn);
        const pay = Math.sin(seg(t, 41.5, 42.3) * Math.PI), take = IO(seg(t, 42.2, 42.5));
        G1.hand.s.visible = G1.hand.d.visible = take > 0.5; G1.sandwich.visible = G1.drink.visible = take <= 0.5;
        greg.pose(mergePose(go > 0 ? motion.walk(t, 0.9) : motion.idle(t), { aRx: -1.25 * pay - 0.7 * take, eR: -0.3 * pay - 0.9 * take, aRy: 0.35 * pay, aLx: -0.6 * take, eL: -1.0 * take, headX: 0.12, headY: t > 41.5 && t < 42.3 ? -0.3 : 0 }));
        face(greg, t < 39.6 ? { eyes: 'open', mouth: 'flat' } : { eyes: 'half', mouth: 'smile' }, t);
        reg.userData.drawer.position.z = 0.1 + IO(seg(t, 42.0, 42.25)) * 0.8;
        cashier.pose(mergePose(motion.idle(t, 1, 2), { aLx: -0.7, eL: -0.9, aRx: t > 41.7 ? -0.9 : -0.4, eR: -0.7 }));
        face(cashier, { eyes: 'open', mouth: 'smile' }, t, 5);
        const k = IO(seg(lt, 0, 5.7));
        aim(cam, mix3(v3(2.4, 5.6, -4.1), v3(1.6, 5.5, -4.3), k), v3(-5.6, 4.6, -12.2), 54);
      },
    }),
    shot('gasOut', {
      scene: S.gas,
      update(lt, t, cam) {
        const { greg } = G1.actors; G1.hand.s.visible = G1.hand.d.visible = true; G1.sandwich.visible = G1.drink.visible = false;
        const w = seg(t, 43.0, 44.6);
        greg.root.position.set(4.7, 0.3 + (w > 0.6 ? 0.2 : 0), lerp(-5.0, 4.5, w)); greg.root.rotation.y = 0;
        G1.store.userData.door.position.x = 4.7 + IO(seg(t, 43.0, 43.3)) * (1 - IO(seg(t, 44.3, 44.8))) * 3.4;
        greg.pose(mergePose(w > 0 && w < 1 ? motion.walk(t, 0.85) : motion.idle(t), { aRx: -0.6, eR: -0.9, aLx: -0.5, eL: -1.0, headX: t > 44.8 ? -0.08 : 0.05 }));
        face(greg, t < 44.9 ? { eyes: 'open', mouth: 'smile' } : { eyes: 'wide', mouth: 'small-o', brows: 'up' }, t);
        aim(cam, v3(7.5, 4.8, 21), v3(4.7, 4.6, 0), 46);
      },
    }),
    shot('gasPov', {
      scene: S.gas,
      update(lt, t, cam) {
        const { greg } = G1.actors; greg.root.position.set(4.7, 0.5, 4.5); greg.root.rotation.y = -0.35;
        greg.pose(mergePose(motion.idle(t), { aRx: -0.6, eR: -0.9, aLx: -0.5, eL: -1.0 }));
        aim(cam, mix3(v3(7.6, 6.6, -1.0), v3(7.2, 6.4, 0.2), IO(seg(lt, 0, 1.1))), v3(-70, 1, 34), 52);
      },
    }),
    shot('gasReact', {
      scene: S.gas,
      update(lt, t, cam) {
        const { greg } = G1.actors; greg.root.position.set(4.7, 0.5, 4.5); greg.root.rotation.y = 0;
        // look at the car, at the missing road, back at the car
        const lookCar1 = IO(seg(t, 46.6, 46.95)) * (1 - IO(seg(t, 47.2, 47.5))), lookRoad = IO(seg(t, 47.2, 47.5)) * (1 - IO(seg(t, 47.85, 48.15))), lookCar2 = IO(seg(t, 47.85, 48.15));
        const hy = lookCar1 * 1.0 + lookCar2 * 1.0 - lookRoad * 0.45;
        greg.pose(mergePose(motion.idle(t, 0.5), { aRx: -0.6, eR: -0.9, aLx: -0.5, eL: -1.0, headY: hy, torsoY: hy * 0.3, headX: lookRoad * 0.18 }));
        face(greg, lookCar2 > 0.5 ? { eyes: 'half', mouth: 'flat', brows: 'flat' } : { eyes: 'open', mouth: 'small-o', brows: 'up' }, t);
        aim(cam, mix3(v3(1.2, 5.0, 18.5), v3(1.8, 5.0, 16.0), IO(seg(lt, 0, 4.1))), v3(8.0, 4.4, 0.5), 50);
      },
    }),
    // ---------------------------------------------------------------- 5. DAY #3 — supply chains disrupted
    shot('grocery', {
      scene: S.grocery,
      update(lt, t, cam) {
        const { customer: c, employee: e } = S.grocery.userData.actors;
        c.root.rotation.y = yawTo(c.root.position, e.root.position); e.root.rotation.y = yawTo(e.root.position, c.root.position);
        c.pose(mergePose(motion.idle(t), { aLx: -0.3, eL: -0.6, aRx: t < 53.2 ? -0.9 : -0.2, eR: -0.6 }));
        e.pose(mergePose(motion.idle(t, 1, 1), t > 53.4 ? motion.shrug : {}));
        face(c, { eyes: 'open', mouth: 'frown', brows: 'worried' }, t, 1); face(e, { eyes: 'half', mouth: 'flat', brows: 'worried' }, t, 2);
        const k = IO(seg(lt, 0, 5));
        aim(cam, mix3(v3(1.0, 5.6, 14.5), v3(1.6, 5.4, 12.6), k), v3(5.8, 4.6, 1.2), 50);
      },
    }),
    shot('hospital', { scene: S.hospital, update(lt, t, cam) { const k = IO(seg(lt, 0, 3)); aim(cam, mix3(v3(46, 6, 46), v3(42, 7, 40), k), v3(12, 9, 2), 52); } }),
    shot('station', { scene: S.station, update(lt, t, cam) { const k = IO(seg(lt, 0, 3)); aim(cam, mix3(v3(-3.5, 7.2, 82), v3(-3, 7.0, 76), k), v3(3, 4.4, 0), 52); } }),
    shot('airport', { scene: S.airport, update(lt, t, cam) { const k = IO(seg(lt, 0, 2.9)); aim(cam, mix3(v3(46, 10, 118), v3(40, 11, 108), k), v3(-6, 8, 20), 54); } }),
    // ---------------------------------------------------------------- 6. MONTH #6 — a new transportation system
    shot('paving', {
      scene: S.build,
      update(lt, t, cam) {
        const fz = 20 - S.build.userData.paveLength(t);
        aim(cam, v3(-30, 34, fz + 66), v3(0, 0, fz + 6), 54);
      },
    }),
    shot('adapt', { scene: S.build, update(lt, t, cam) { const k = IO(seg(lt, 0, 2.5)); aim(cam, mix3(v3(38, 11, -6), v3(34, 10, -16), k), v3(4, 2, -76), 54); } }),
    shot('hub', { scene: S.hub, update(lt, t, cam) { const k = IO(seg(lt, 0, 4.9)); aim(cam, mix3(v3(22, 18, 84), v3(18, 15, 70), k), v3(0, 5, 10), 52, 0.05, t); } }),
    shot('worker', {
      scene: S.build,
      update(lt, t, cam) {
        const w = S.build.userData.actors.worker; w.root.position.set(9.4, 0.15, -40);
        const look = IO(seg(t, 76.6, 77.2));
        w.root.rotation.y = lerp(-Math.PI / 2, -Math.PI / 2 - 0.5, look);
        w.pose(mergePose(motion.idle(t), { aLz: 0.2, aRz: 0.2, headY: -0.15, eL: -1.3, eR: -1.3, aLx: -0.3, aRx: -0.3 }));
        face(w, { eyes: 'happy', mouth: 'grin', brows: 'up' }, t, 3);
        const k = IO(seg(lt, 0, 3.2));
        aim(cam, mix3(v3(-0.5, 4.6, -27), v3(0.5, 4.8, -29.5), k), v3(8.6, 4.6, -41), 50);
      },
    }),
    // ---------------------------------------------------------------- 7. Greg returns — month 6
    shot('gregBack', {
      scene: S.gas2,
      update(lt, t, cam) {
        const { greg } = G2.actors; const keys = G2.keys; keys.visible = t < 85.6;
        const walk = seg(t, 82.0, 84.4);
        greg.root.position.set(lerp(2, 13.0, walk), 0.5, lerp(8, 17.5, walk)); greg.root.rotation.y = lerp(0.2, 1.2, IO(seg(t, 81.9, 82.3)));
        if (t > 84.4) greg.root.rotation.y = lerp(1.2, 0.55, IO(seg(t, 84.4, 84.8)));
        const lift = Math.sin(seg(t, 80.3, 82.0) * Math.PI), pocket = IO(seg(t, 84.9, 85.6));
        greg.pose(mergePose(walk > 0 && walk < 1 ? motion.walk(t, 0.9) : motion.idle(t), { aRx: -0.8 * lift - 0.2 + pocket * 0.35, eR: -1.0 * lift - 0.4 * (1 - pocket), aRz: 0.06 + pocket * 0.05, headY: t > 84.4 ? 0.2 : 0 }));
        face(greg, t < 84.4 ? { eyes: 'happy', mouth: 'smile', brows: 'up' } : t < 85.8 ? { eyes: 'open', mouth: 'flat', brows: 'flat' } : { eyes: 'half', mouth: 'flat', brows: 'flat' }, t);
        const pan = IO(seg(t, 82.6, 84.2));
        aim(cam, mix3(v3(-1, 4.9, 33), v3(3, 4.8, 37), pan), mix3(v3(2.5, 4.5, 9), v3(13.8, 4.2, 19), pan), 50);
      },
    }),
    // ---------------------------------------------------------------- 8. YEAR #5 — the world rebuilt
    shot('year5', {
      scene: S.year5,
      update(lt, t, cam) {
        const W = S.year5.userData.actors.walker;
        const wz = -30 + (t - 88.2) * 3.2; W.root.position.set(-15.2, 0.3, wz); W.root.rotation.y = 0;
        W.pose(motion.walk(t, 0.85)); face(W, { eyes: 'open', mouth: 'smile' }, t, 7);
        if (t < 92.5) { const k = IO(seg(t, 88.2, 92.5)); aim(cam, v3(lerp(-40, 20, k), lerp(250, 220, k), lerp(300, 250, k)), v3(0, 0, -40), 54); }
        else if (t < 95.5) aim(cam, v3(-16.6, 4.8, wz + 13), v3(6, 13, wz - 16), 58);
        else { const k = IO(seg(t, 95.5, 99)); const p = mix3(v3(-16.6, 4.8, wz + 13), v3(0, 250, 140), k); p.x = lerp(-16.6, 0, IO(seg(t, 95.5, 96.5))); aim(cam, p, mix3(v3(6, 13, wz - 16), v3(0, 0, -140), k), 58); }
      },
    }),
  ];
}
