// Shot list: cameras, acting and story beats. Text timing lives in cues.json.
import * as THREE from 'three';
import { seg, lerp, ease } from './env.js';
import { motion, mergePose } from './character.js';
import { beachHeight } from './scenes.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix3 = (a, b, k) => a.clone().lerp(b, k);
const wpos = (o, dy = 0) => o.getWorldPosition(new THREE.Vector3()).add(v3(0, dy, 0));
function aim(cam, pos, target, fov = 50) { cam.position.copy(pos); cam.lookAt(target); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const IO = ease.io;

export function fadeAt(t) {
  if (t < 0.3) return 1 - t / 0.3;
  const dips = [[35.15, 35.4, 35.65], [42.95, 43.2, 43.45], [54.0, 54.4, 54.8]];
  for (const [a, m, b] of dips) { if (t >= a && t <= m) return IO((t - a) / (m - a)); if (t > m && t <= b) return 1 - IO((t - m) / (b - m)); }
  if (t > 68.9) return IO((t - 68.9) / 1.0);
  return 0;
}

export function makeShots(S, cues, R) {
  const T = cues.shots;
  const talking = (who, t) => cues.subs.some((s) => s.who === who && t >= s.start + 0.05 && t <= s.end - 0.35);
  const face = (ch, e, t, seed = 0) => ch.setFace(e, t, talking(ch.name, t), seed);
  const B = S.beach.userData, SH = S.shallows.userData, C = S.city.userData;
  const head = (ch) => ch.head;

  const shot = (name, o) => ({ name, start: T[name][0], end: T[name][1], ...o });
  return [
    // ------------------------------------------------ 1. crowded beach, title over; camera glides to the water
    shot('beach', {
      scene: S.beach,
      setup() { B.dome.material.uniforms.cTop.value.set('#2f6fc4'); B.dome.material.uniforms.cMid.value.set('#bfe3f7'); B.actors.sam.shades.visible = true; B.shades.visible = false;
        B.splash.userData.burst({ t0: 5.32, origin: v3(6.4, 0.1, -15.5), n: 14, spread: 0.8, rise: 2.2, size: 0.14, life: 0.9 }); },
      update(lt, t, cam) {
        const { sam, mia, kai } = B.actors;
        sam.root.position.set(6, -3.6 + Math.sin(t * 1.3) * 0.15, -16); sam.root.rotation.y = 0.15;
        mia.root.position.set(2.6, -3.6 + Math.sin(t * 1.3 + 1) * 0.15, -15.2); mia.root.rotation.y = 0.9;
        kai.root.position.set(-14, -3.6, -13);
        sam.pose(mergePose(motion.tread(t, 0.7), { headY: t < 4.6 ? -0.5 : 0, headX: t > 5.0 ? 0.35 : 0 }));
        mia.pose(motion.tread(t, 0.7, 1));
        face(sam, t < 5.0 ? { eyes: 'open', mouth: Math.sin(t * 2) > 0 ? 'smile' : 'talk' } : { eyes: 'wide', mouth: 'o', brows: 'up' }, t);
        face(mia, { eyes: 'happy', mouth: 'grin' }, t, 2);
        // sunglasses slip off and drop into the sea
        const drop = seg(t, 5.0, 5.4);
        sam.shades.visible = t < 5.0; B.shades.visible = t >= 5.0 && t < 5.6;
        if (t >= 5.0) { const hp = wpos(sam.head, 0.1); B.shades.position.set(hp.x + 0.3 * drop, lerp(hp.y, -0.3, ease.in(drop)), hp.z + 0.5 + drop * 0.4); B.shades.rotation.set(drop * 4, drop * 2, 0); }
        const k = IO(seg(lt, 2.4, 6));
        const p = mix3(v3(-6 + lt * 0.6, 21 - lt * 0.5, 44), v3(9.5, 3.0, -6.8), k); p.y += Math.sin(k * Math.PI) * 3;
        const g = mix3(v3(2, 1.5, -12), v3(5.6, 3.2, -16), k);
        aim(cam, p, g, lerp(48, 52, k));
      },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 2. underwater: he dives, picks them up, realizes he can breathe
    shot('dive', {
      scene: S.shallows,
      setup() { const b = SH.bubbles.userData; const sam = SH.actors.sam;
        b.burst({ t0: 6.05, origin: v3(1.5, 9.6, -1.5), n: 40, spread: 2.5, rise: 2.5, size: 0.2, life: 1.6 });
        b.burst({ t0: 6.5, origin: () => wpos(sam.head, -0.1), n: 12, spread: 0.4, rise: 2.4, size: 0.1, life: 2, stagger: 0.12 });
        b.burst({ t0: 8.55, origin: () => wpos(sam.head, -0.25).add(v3(0, 0, 0.45)), n: 26, spread: 0.5, rise: 3, size: 0.17, life: 2.6, stagger: 0.02 });
        b.burst({ t0: 10.4, origin: () => wpos(sam.head, -0.25).add(v3(0, 0, 0.45)), n: 8, spread: 0.3, rise: 2.4, size: 0.1, life: 2, stagger: 0.05 }); },
      update(lt, t, cam) {
        const sam = SH.actors.sam, H = SH.H, gy = H(0, 0.8);
        SH.actors.mia.root.visible = false;
        // glasses sink to the sand, then end up in his hand
        const sh = SH.shadesProp;
        if (t < 7.85) { const k = ease.out(seg(t, 6.0, 7.0)); sh.position.set(lerp(1.2, 0.35, k), lerp(9.2, gy + 0.12, k), lerp(-0.6, 1.1, k)); sh.rotation.set(lerp(1, 1.57, k), k * 3, 0); }
        else { const hp = wpos(sam.armR.hand, -0.25); sh.position.copy(hp); sh.rotation.set(0.3, 0.3 + Math.sin(t * 2) * 0.1, 0); }
        const dive = IO(seg(t, 6.3, 7.6));
        const pos = mix3(v3(2.4, 5.4, -2.2), v3(0.1, gy, 0), dive);
        sam.root.position.copy(pos);
        if (t < 7.5) {
          sam.root.rotation.set(dive > 0 && dive < 1 ? 0.65 * Math.sin(dive * Math.PI) : 0, lerp(-2.4, 0.3, IO(seg(t, 6.3, 7.4))), 0);
          sam.pose(t < 6.35 ? motion.tread(t, 1.2) : mergePose(motion.swim(t), { lean: lerp(1.38, 0.4, IO(seg(t, 7.0, 7.5))) }));
        } else {
          sam.root.rotation.set(0, 0.3, 0);
          const kneel = { hipY: -1.12, lLx: -0.05, lRx: 0.05, kL: 1.55, kR: 1.6, fL: -0.3, fR: -0.3, aLz: 0.15 };
          const reach = Math.sin(seg(t, 7.5, 8.2) * Math.PI);
          const lift = IO(seg(t, 7.9, 8.4)) * (1 - IO(seg(t, 9.3, 9.8)));
          const look = t > 8.9 ? Math.sin((t - 8.9) * 1.8) * 0.7 * (1 - seg(t, 10.3, 10.8)) : 0;
          sam.pose(mergePose(kneel, { torsoX: 0.5 * reach, headX: 0.35 * reach - 0.05, aRx: lerp(lerp(-0.2, -0.9, reach), -1.0, lift), eR: lerp(-0.2, -1.5, lift), aRz: 0.15, headY: look, aLx: -0.3, eL: -0.4 }));
        }
        let e = { eyes: 'open', mouth: 'puff' };
        if (t < 6.35) e = { eyes: 'squeeze', mouth: 'puff' };
        if (t > 8.5) e = { eyes: 'wide', mouth: 'o', brows: 'up' };
        if (t > 8.75) e = { eyes: 'wide', mouth: 'small-o', brows: 'up' };
        if (t > 10.6) e = { eyes: 'wide', mouth: 'smile', brows: 'up' };
        face(sam, e, t);
        const k = IO(seg(lt, 0, 2.2));
        aim(cam, mix3(v3(3.8, 3.4, 10.5), v3(3.0, 2.3, 7.8), IO(seg(lt, 0, 5))), mix3(v3(1.6, 7.6, -1.2), wpos(sam.root, 2.6).add(v3(0, 0.6, 0)), k), 52);
      },
      speakers: () => ({ sam: head(SH.actors.sam) }),
    }),
    // ------------------------------------------------ 3. surfacing: "Guys, you can breathe down there!"
    shot('surface', {
      scene: S.beach,
      setup() { B.splash.userData.burst({ t0: 11.02, origin: v3(6, 0.2, -16), n: 26, spread: 1.4, rise: 3, size: 0.18, life: 0.9 });
        B.splash.userData.burst({ t0: 13.75, origin: v3(2.8, 0.2, -15.4), n: 18, spread: 1.0, rise: 2.4, size: 0.15, life: 0.8 }); },
      update(lt, t, cam) {
        const { sam, mia, kai } = B.actors; sam.shades.visible = false; B.shades.visible = false;
        const up = ease.out(seg(t, 11.0, 11.45));
        sam.root.position.set(6, lerp(-7, -3.5, up) + Math.sin(t * 1.4) * 0.12, -16); sam.root.rotation.y = -0.45;
        const point = Math.sin(seg(t, 12.0, 13.6) * Math.PI);
        sam.pose(mergePose(motion.tread(t, 1.2), { aRx: lerp(-0.35, -2.2, point), eR: lerp(-0.4, -0.1, point), aRz: 0.2, headY: -0.25 }));
        face(sam, { eyes: 'wide', mouth: 'grin', brows: 'up' }, t);
        const duck = IO(seg(t, 13.55, 14.0));
        mia.root.position.set(2.6, -3.6 + Math.sin(t * 1.3 + 1) * 0.12 - duck * 5, -15.2); mia.root.rotation.y = 0.5;
        mia.pose(motion.tread(t, 0.8, 1));
        face(mia, t < 12.6 ? { eyes: 'open', mouth: 'flat', brows: 'worried' } : { eyes: 'half', mouth: 'smirk', brows: 'flat' }, t, 2);
        kai.root.position.set(8.8, -3.6 + Math.sin(t * 1.2) * 0.12, -19.5); kai.root.rotation.y = -0.6; kai.pose(motion.tread(t, 0.8, 2));
        face(kai, { eyes: 'open', mouth: 'small-o', brows: 'up' }, t, 4);
        aim(cam, v3(lerp(3.6, 3.9, lt / 3.2), 1.0, -6.2), v3(4.6, 1.6, -16.2), 58);
      },
      speakers: () => ({ sam: head(B.actors.sam) }),
    }),
    // ------------------------------------------------ 4. underwater again: Mia tries it; others follow
    shot('spread', {
      scene: S.shallows,
      setup() { const b = SH.bubbles.userData, mia = SH.actors.mia; SH.actors.mia.root.visible = true; SH.shadesProp.visible = false;
        b.burst({ t0: 14.25, origin: v3(-1.5, 9.6, 0.4), n: 30, spread: 1.6, rise: 2.4, size: 0.16, life: 1.4 });
        b.burst({ t0: 14.75, origin: () => wpos(mia.head, -0.2).add(v3(0, 0, 0.4)), n: 22, spread: 0.4, rise: 3, size: 0.15, life: 2.4, stagger: 0.02 }); },
      update(lt, t, cam) {
        const { sam, mia } = SH.actors;
        const d = ease.out(seg(t, 14.2, 15.0));
        mia.root.position.set(-1.6, lerp(6.4, 2.6, d) + Math.sin(t * 1.2) * 0.12, 0.6); mia.root.rotation.set(0, 0.45, 0);
        mia.pose(mergePose(motion.tread(t, 1, 1), t > 15.6 ? { aLz: 1.3, aRz: 1.3, eL: -0.3, eR: -0.3 } : {}));
        face(mia, t < 14.7 ? { eyes: 'squeeze', mouth: 'puff' } : t < 15.0 ? { eyes: 'wide', mouth: 'o', brows: 'up' } : { eyes: 'happy', mouth: 'grin', brows: 'up' }, t, 2);
        sam.root.position.set(1.6, 2.4 + Math.sin(t * 1.2 + 2) * 0.12, -0.6); sam.root.rotation.set(0, -0.55, 0);
        sam.pose(mergePose(motion.tread(t, 0.8), { aRx: -2.6, eR: -0.2, aRz: 0.3 }));
        face(sam, { eyes: 'happy', mouth: 'grin' }, t);
        aim(cam, mix3(v3(0.4, 3.2, 11.5), v3(0.2, 3.4, 9.6), IO(seg(lt, 0, 2.8))), v3(0, 4.6, 0), 56);
      },
      speakers: () => ({ mia: head(SH.actors.mia) }),
    }),
    // ------------------------------------------------ 5. lifeguard vs. swimmers
    shot('guard', {
      scene: S.beach,
      setup() { B.splash.userData.burst({ t0: 18.85, origin: v3(-6, 0.2, -13), n: 24, spread: 1.4, rise: 3, size: 0.18, life: 0.9 }); },
      update(lt, t, cam) {
        const { guard, kai, sam, mia } = B.actors;
        sam.root.position.y = -9; mia.root.position.y = -9;
        guard.root.rotation.y = Math.PI - 0.75;
        const shout = t < 20.3 ? IO(seg(t, 17.05, 17.4)) : 1 - IO(seg(t, 20.3, 20.7));
        guard.pose(mergePose(motion.idle(t), { aRx: -1.45 * shout, eR: -1.25 * shout, aRz: 0.1, aLx: -0.4 * shout, aLz: 0.5 * shout, eL: -0.2, torsoX: 0.08 * shout }));
        face(guard, t < 19.6 ? { eyes: 'open', mouth: 'shout', brows: 'angry' } : t < 20.3 ? { eyes: 'open', mouth: 'flat', brows: 'angry' } : { eyes: 'wide', mouth: 'o', brows: 'up' }, t);
        const pop = ease.out(seg(t, 18.85, 19.2));
        kai.root.position.set(-6, lerp(-7.5, -3.3, pop) + Math.sin(t * 1.5) * 0.1, -13); kai.root.rotation.y = 0.55;
        kai.pose(mergePose(motion.tread(t, 1.2, 2), { aLx: -2.9, aRx: -2.9, aLz: 0.35, aRz: 0.35, eL: -0.1, eR: -0.1 }));
        face(kai, { eyes: 'happy', mouth: 'shout' }, t, 4);
        for (const s of B.swimmers) s.react = t > 19.2 ? (tt) => ({ eyes: 'happy', mouth: 'grin' }) : null;
        if (t < 18.95) aim(cam, v3(-0.5, 3.0, 16.5), v3(-9.2, 9.6, 7.6), 46);
        else if (t < 20.35) aim(cam, v3(-3.0, 1.1, -5.4), v3(-6.3, 2.3, -13), 54);
        else aim(cam, v3(-4.2, 9.6, 14.2), v3(-9.6, 10.6, 8.4), 40);
      },
      speakers: () => ({ guard: head(B.actors.guard), swimmer: head(B.actors.kai) }),
    }),
    // ------------------------------------------------ 6. news studio
    shot('studio', {
      scene: S.studio, news: true,
      prerender(r, t) { r.renderWall(t); },
      update(lt, t, cam) {
        const a = S.studio.userData.actors.anchor;
        a.pose(mergePose(motion.sitChair(t), { aLx: -0.75, aRx: -0.75, eL: -0.95, eR: -0.95 + Math.sin(t * 2.2) * 0.12 * (talking('anchor', t) ? 1 : 0), aLz: 0.18, aRz: 0.18, headX: Math.sin(t * 2.4) * 0.03, headY: Math.sin(t * 0.7) * 0.05 }));
        face(a, { eyes: 'open', mouth: 'flat', brows: 'soft' }, t);
        const k = IO(seg(lt, 0, 5.4));
        aim(cam, v3(lerp(1.2, 0.5, k), lerp(4.6, 4.4, k), lerp(10.5, 8.6, k)), v3(0, lerp(5.3, 5.1, k), -2), 50);
      },
      speakers: () => ({ anchor: head(S.studio.userData.actors.anchor) }),
    }),
    // ------------------------------------------------ 7. news cut: another beach (Sydney), warm afternoon
    shot('cutA', {
      scene: S.beach, news: true,
      setup() { B.dome.material.uniforms.cTop.value.set('#3f6fb0'); B.dome.material.uniforms.cMid.value.set('#f7c99a'); },
      update(lt, t, cam) { B.actors.sam.root.position.y = -9; aim(cam, v3(36 - lt * 3, 15, 18), v3(4, 0, -14), 55); },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 8. news cut: public pool (Tokyo)
    shot('cutB', {
      scene: S.pool, news: true,
      update(lt, t, cam) { aim(cam, v3(2 + lt, 6.5, -6), v3(0, 2.2, -26), 56); },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 9. field reporter; a man walks out of the sea with a lawn chair
    shot('reporter', {
      scene: S.beach, news: true,
      setup() { B.dome.material.uniforms.cTop.value.set('#2f6fc4'); B.dome.material.uniforms.cMid.value.set('#bfe3f7'); },
      update(lt, t, cam) {
        const { reporter, chairguy } = B.actors;
        for (const p of B.crowd) if (p.kind === 'walk') p.c.root.visible = Math.abs(p.c.root.position.x + 25) > 9;
        reporter.pose(mergePose(motion.idle(t), { aRx: -1.25, eR: -1.55, aRz: 0.05, aLx: -0.3 + Math.sin(t * 1.6) * 0.15 * (talking('reporter', t) ? 1 : 0), eL: -0.6 }));
        face(reporter, { eyes: 'open', mouth: 'flat', brows: 'soft' }, t, 3);
        const w = seg(t, 28.2, 35.4);
        const x = lerp(-21.5, -22.8, w), z = lerp(-31, -8.5, w);
        chairguy.root.position.set(x, beachHeight(x, z), z); chairguy.root.rotation.y = 0.05;
        chairguy.pose(mergePose(motion.walk(t, 0.85), { aRx: -0.15, aRz: 0.3, eR: -0.1 }));
        face(chairguy, { eyes: 'open', mouth: 'smile' }, t, 5);
        const k = IO(seg(lt, 0, 7.2));
        aim(cam, v3(lerp(-25.6, -25.2, k), 4.7, lerp(10.5, 9.0, k)), v3(-24.8, 4.3, -6), 50);
      },
      speakers: () => ({ reporter: head(B.actors.reporter) }),
    }),
    // ------------------------------------------------ 10. the lab
    shot('lab', {
      scene: S.lab,
      update(lt, t, cam) {
        const { sci1, sci2, vol } = S.lab.userData.actors;
        const turn = IO(seg(t, 38.0, 38.5));
        sci1.root.rotation.y = lerp(yawTo(sci1.root.position, v3(-2, 0, -5)), yawTo(sci1.root.position, sci2.root.position), turn);
        sci2.root.rotation.y = lerp(yawTo(sci2.root.position, v3(6.0, 0, -1.4)), yawTo(sci2.root.position, sci1.root.position) + 0.4, turn);
        const shrug = Math.sin(seg(t, 40.3, 41.6) * Math.PI);
        sci1.pose(mergePose(motion.idle(t), { aLx: -0.9, eL: -1.2, aRz: 0.1 + shrug * 0.7, eR: -shrug * 1.4, aRx: -shrug * 0.4, headZ: shrug * 0.15, headY: t > 38.2 && t < 40.2 ? 0.4 : 0 }));
        sci2.pose(mergePose(motion.idle(t, 1, 2), { torsoX: t < 38.2 ? 0.25 : 0, aRx: -1.6, eR: -2.0, aRz: -0.1, aLx: -0.2, eL: -1.1, aLz: 0.3 }));
        face(sci1, t < 40.0 ? { eyes: 'open', mouth: 'flat', brows: 'up' } : { eyes: 'half', mouth: 'smirk', brows: 'flat' }, t);
        face(sci2, t < 38.2 ? { eyes: 'wide', mouth: 'small-o', brows: 'up' } : { eyes: 'open', mouth: 'frown', brows: 'worried' }, t, 2);
        if (t < 38.2) aim(cam, mix3(v3(13.5, 7.6, 14), v3(11.5, 7.0, 12), IO(seg(lt, 0, 2.8))), v3(1.4, 5.6, -2.4), 50);
        else aim(cam, mix3(v3(9.6, 5.6, 11.0), v3(8.8, 5.4, 9.4), IO(seg(t, 38.2, 43.2))), v3(4.4, 4.7, 2.2), 54);
      },
      speakers: () => ({ sci1: head(S.lab.userData.actors.sci1), sci2: head(S.lab.userData.actors.sci2) }),
    }),
    // ------------------------------------------------ 11. montage A: lawn chair at the bottom of the pool
    shot('chair', {
      scene: S.pool,
      setup() { const ray = S.pool.userData.actors.ray; S.pool.userData.bubbles.userData.burst({ t0: 44.6, origin: () => wpos(ray.armL.hand, 0.2), n: 8, spread: 0.15, rise: 2, size: 0.09, life: 2, stagger: 0.1 }); },
      update(lt, t, cam) {
        const ray = S.pool.userData.actors.ray; face(ray, t > 44.3 && t < 45 ? { eyes: 'closed', mouth: 'small-o' } : { eyes: 'closed', mouth: 'smile' }, t);
        aim(cam, mix3(v3(5.2, 2.2, 11.5), v3(4.2, 2.5, 9.6), IO(seg(lt, 0, 2.6))), v3(0.1, 2.8, 3.8), 50);
      },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 12. montage B: swimming to school
    shot('school', {
      scene: S.shallows,
      update(lt, t, cam) {
        let lead = 0;
        SH.students.forEach((s, i) => {
          const x = 38 + (lt - s.lag * 0.5) * 6.2; if (i === 0) lead = x;
          s.c.root.position.set(x, s.y + Math.sin(t * 1.4 + s.ph) * 0.2, s.z); s.c.root.rotation.set(0, Math.PI / 2, 0);
          s.c.pose(motion.swim(t, 1, s.ph)); s.c.setFace({ eyes: 'open', mouth: i === 1 ? 'grin' : 'smile' }, t, false, s.ph);
        });
        aim(cam, v3(lead - 6, 4.6, 13), v3(lead - 2, 5.0, -2), 52);
      },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 13. montage C: the sandwich
    shot('sandwich', {
      scene: S.shallows,
      update(lt, t, cam) {
        const dan = SH.actors.dan, sw = SH.sandwich, parts = sw.userData.parts;
        dan.root.position.set(-60, SH.H(-60, 0.9) + 0.25, 0.9); dan.root.rotation.y = 0.15;
        const lift = IO(seg(t, 48.4, 48.9)), drop = IO(seg(t, 50.9, 51.5));
        dan.pose(mergePose(motion.sitChair(t), { aRx: lerp(-0.5, -1.1, lift) + drop * 0.5, eR: lerp(-0.9, -1.5, lift) + drop * 0.6, aLx: -0.4, eL: -0.6, headX: 0.12 }));
        face(dan, t < 49.2 ? { eyes: 'happy', mouth: 'grin' } : t < 49.7 ? { eyes: 'wide', mouth: 'o', brows: 'up' } : { eyes: 'half', mouth: 'flat', brows: 'flat' }, t);
        sw.position.copy(wpos(dan.armR.hand, -0.2)).add(v3(0, 0, 0.25)); sw.rotation.set(0, 0.15, 0);
        const fl = Math.max(0, t - 49.05);
        const drift = { top: v3(0.25, 1.0, 0.2), lettuce: v3(-0.6, 0.55, 0.3), tomato: v3(-0.5, 0.75, 0.6), tomato2: v3(0.7, 0.65, 0.35), cheese: v3(0.5, 0.45, -0.3), ham: v3(-0.2, 0.8, -0.6) };
        for (const k in parts) {
          const p = parts[k]; p.position.copy(p.userData.home);
          if (drift[k]) { p.position.addScaledVector(drift[k], fl * 0.75); p.rotation.set(fl * 0.8 * drift[k].x, fl * 0.5, fl * 0.7 * drift[k].z); }
          else { p.scale.set(1, 1 - Math.min(0.45, fl * 0.3), 1); p.material.color.set(fl > 0.3 ? '#c49a5c' : '#e6b872'); }
        }
        aim(cam, mix3(v3(-57.4, 3.9, 8.6), v3(-58.2, 4.0, 7.2), IO(seg(lt, 0, 3.4))), v3(-60.2, 4.2, 0.6), 50);
      },
      speakers: () => ({ dan: head(SH.actors.dan) }),
    }),
    // ------------------------------------------------ 14. montage D: the touchscreen doesn't respond
    shot('phone', {
      scene: S.shallows,
      update(lt, t, cam) {
        const ava = SH.actors.ava;
        ava.root.position.set(0, 2.6 + Math.sin(t * 1.1) * 0.12, -60); ava.root.rotation.y = 0.1;
        const tap = t < 53.3 ? Math.max(0, Math.sin(t * 13)) : 0, shake = t > 53.3 && t < 53.9 ? Math.sin(t * 40) * 0.25 : 0;
        ava.pose(mergePose(motion.tread(t, 0.5), { aRx: -1.25 + shake, eR: -1.25, aRz: -0.15, aLx: -1.0, eL: -1.3 + tap * 0.25, aLz: -0.25, headX: 0.32 }));
        face(ava, t < 52.5 ? { eyes: 'open', mouth: 'flat' } : t < 53.3 ? { eyes: 'open', mouth: 'frown', brows: 'angry' } : { eyes: 'squeeze', mouth: 'wobble', brows: 'angry' }, t, 6);
        aim(cam, mix3(v3(1.8, 8.4, -53.6), v3(1.3, 8.1, -55.0), IO(seg(lt, 0, 2.6))), v3(0, 7.2, -60), 46);
      },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 15. YEAR 15: the settlement
    shot('city', {
      scene: S.city,
      update(lt, t, cam) {
        const k = IO(seg(lt, 0, 3.0));
        aim(cam, mix3(v3(-34, 74, 150), v3(-12, 54, 126), k), mix3(v3(0, 26, 0), v3(6, 20, -6), k), 56);
      },
      speakers: () => ({}),
    }),
    // ------------------------------------------------ 16. a living room watching the opening on TV
    shot('tv', {
      scene: S.apartment,
      prerender(r, t) { r.renderTV(t); },
      update(lt, t, cam) {
        const a = S.studio.userData.actors.anchor;
        a.pose(mergePose(motion.sitChair(t), { aLx: -0.75, aRx: -0.75, eL: -0.95, eR: -0.95, aLz: 0.18, aRz: 0.18 }));
        face(a, { eyes: 'open', mouth: 'smile', brows: 'soft' }, t);
        aim(cam, mix3(v3(1.6, 7.2, 17.5), v3(1.3, 6.8, 15.0), IO(seg(lt, 0, 5))), v3(1.0, 5.4, -5), 60);
      },
      speakers: () => ({ anchor: S.apartment.userData.tvScreen }),
    }),
    // ------------------------------------------------ 17. "You can't park there!"
    shot('parking', {
      scene: S.city,
      setup() { C.bubbles.userData.burst({ t0: 66.5, origin: () => wpos(C.actors.luis.head, 0.2), n: 6, spread: 0.2, rise: 1.6, size: 0.1, life: 1.8, stagger: 0.15 }); },
      update(lt, t, cam) {
        const { owen, luis } = C.actors, NZ = C.NZ, hy = C.hy, door = C.house.userData.door;
        door.position.x = lerp(-2.5, -5.1, IO(seg(t, 63.6, 64.0)));
        const out = IO(seg(t, 63.75, 64.4));
        if (t < 63.75) { owen.root.position.set(2.7, hy - 0.75, NZ + 3.4); owen.root.rotation.y = 0; }
        else { owen.root.position.copy(mix3(v3(-2.4, hy + 0.2, NZ + 3.8), v3(2.6, hy + 0.6, NZ + 6.6), out)); owen.root.rotation.y = lerp(0, 0.45, out); }
        const pointK = Math.sin(seg(t, 64.4, 66.2) * Math.PI);
        const look = seg(t, 67.4, 68.6);
        owen.pose(mergePose(t < 63.75 ? motion.idle(t) : motion.tread(t, 0.4), { aRx: lerp(-0.35, -1.55, pointK), eR: lerp(-0.4, -0.05, pointK), aRy: -0.6 * pointK, aRz: 0.1, headY: look > 0 ? Math.sin(look * Math.PI * 2) * 0.8 : (t < 63.75 ? -0.35 : 0.2) }));
        face(owen, t < 63.0 ? { eyes: 'open', mouth: 'flat' } : t < 66.9 ? { eyes: 'open', mouth: 'frown', brows: 'angry' } : { eyes: 'half', mouth: 'flat', brows: 'flat' }, t);
        luis.root.position.copy(mix3(v3(-5.5, hy + 0.3, NZ + 10.6), v3(1.4, hy + 0.3, NZ + 11.4), IO(seg(t, 63.4, 64.3)))); luis.root.position.y += Math.sin(t * 1.2) * 0.1; luis.root.rotation.y = yawTo(luis.root.position, owen.root.position);
        const wide = Math.sin(seg(t, 66.4, 68.3) * Math.PI);
        luis.pose(mergePose(motion.tread(t, 0.4, 1), { aLz: 0.4 + wide * 0.9, aRz: 0.4 + wide * 0.9, eL: -0.4, eR: -0.4, aLx: -0.4 * wide, aRx: -0.4 * wide }));
        face(luis, t < 66.3 ? { eyes: 'open', mouth: 'smile' } : { eyes: 'half', mouth: 'smirk', brows: 'up' }, t, 3);
        if (t < 63.7) aim(cam, mix3(v3(3.6, hy + 4.6, NZ + 15), v3(3.2, hy + 4.5, NZ + 12.5), IO(seg(lt, 0, 1.3))), v3(1.2, hy + 4.0, NZ + 5), 50);
        else if (t < 66.8) aim(cam, v3(11.5, hy + 4.4, NZ + 15.5), v3(1.8, hy + 3.6, NZ + 8.6), 52);
        else { const k = IO(seg(t, 66.8, 70)); aim(cam, mix3(v3(11.5, hy + 4.4, NZ + 15.5), v3(26, hy + 34, NZ + 64), k), mix3(v3(1.8, hy + 3.6, NZ + 8.6), v3(0, hy + 2, NZ + 4), k), lerp(52, 56, k)); }
      },
      speakers: () => ({ nb1: head(C.actors.owen), nb2: head(C.actors.luis) }),
    }),
  ];
}
