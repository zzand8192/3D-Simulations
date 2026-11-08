// Text layer: centered title that morphs into the upper-left label, small serif labels,
// speech bubbles over speakers' heads, and the fictional WORLD 24 broadcast graphics.
import * as THREE from 'three';
import { clamp01, ease } from './env.js';

const $ = (s) => document.querySelector(s);
const titleEl = $('#title'), labelEl = $('#label'), labelK = labelEl.querySelector('.k'), labelV = labelEl.querySelector('.v');
const bubbleHost = $('#bubbles'), newsEl = $('#news'), newsPlace = newsEl.querySelector('.place'), newsHead = newsEl.querySelector('.head'), ticker = newsEl.querySelector('.ticker span');
const W = 1080, H = 1920, SAFE = { l: 90, r: 990, t: 250, b: 1490 };

const fade = (t, a, b, fi = 0.5, fo = 0.5) => (t < a || t > b ? 0 : Math.min(ease.io((t - a) / fi), ease.io((b - t) / fo)));

let titleBuilt = false;
function title(t, c) {
  if (!titleBuilt) { titleEl.innerHTML = c.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' '); titleBuilt = true; }
  if (t > c.morph + 0.1) { titleEl.style.opacity = 0; return; }
  titleEl.style.opacity = 1;
  [...titleEl.children].forEach((w, i) => {
    const k = ease.out(clamp01((t - c.start - i * 0.12) / 0.8));
    w.style.opacity = k.toFixed(3); w.style.transform = `translateY(${((1 - k) * 18).toFixed(1)}px)`; w.style.filter = `blur(${((1 - k) * 6).toFixed(1)}px)`;
  });
  // morph: shrink toward the upper-left label position and dissolve into it
  const m = ease.io(clamp01((t - c.hold) / (c.morph - c.hold)));
  const x = -m * 300, y = -m * 560, s = 1 - m * 0.66;
  titleEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
  titleEl.style.opacity = (1 - ease.io(clamp01((m - 0.15) / 0.55))).toFixed(3);
}

function label(t, cues) {
  const lc = cues.labels.find((c) => t >= c.start && t <= c.end);
  if (!lc) { labelEl.style.opacity = 0; return; }
  if (labelK.textContent !== lc.k || labelV.textContent !== lc.v) { labelK.textContent = lc.k; labelV.textContent = lc.v; }
  const a = fade(t, lc.start, lc.end, 0.9, 0.5);
  labelEl.style.opacity = a.toFixed(3);
  labelEl.style.transform = `translateY(${((1 - a) * 8).toFixed(1)}px)`;
}

const pool = [];
const tmp = new THREE.Vector3();
function bubbles(t, cues, speakers, camera) {
  const active = cues.subs.filter((s) => t >= s.start && t <= s.end);
  while (pool.length < active.length) {
    const el = document.createElement('div'); el.className = 'bubble'; el.innerHTML = '<p></p><i></i>'; bubbleHost.appendChild(el); pool.push(el);
  }
  pool.forEach((el, i) => {
    const s = active[i];
    if (!s) { el.style.opacity = 0; return; }
    const p = el.firstChild;
    if (p.textContent !== s.text) p.textContent = s.text;
    const obj = speakers[s.who];
    let ax = W / 2, ay = 900;
    if (obj) {
      obj.getWorldPosition(tmp); tmp.y += obj.isMesh ? 2.2 : 0.75; tmp.project(camera);
      ax = (tmp.x * 0.5 + 0.5) * W; ay = (-tmp.y * 0.5 + 0.5) * H;
      if (tmp.z > 1) { ax = W / 2; ay = 700; }
    }
    const bw = el.offsetWidth || 400, bh = el.offsetHeight || 100;
    let x = Math.min(SAFE.r - bw, Math.max(SAFE.l, ax - bw / 2));
    let y = Math.min(SAFE.b - bh, Math.max(SAFE.t, ay - bh - 34));
    // keep the tail pointing at the speaker
    const tail = Math.min(bw - 34, Math.max(34, ax - x));
    el.lastChild.style.left = `${tail.toFixed(0)}px`;
    el.lastChild.style.display = ay > y + bh ? 'block' : 'none';
    const a = fade(t, s.start, s.end, 0.18, 0.25), pop = ease.out(clamp01((t - s.start) / 0.22));
    el.style.opacity = a.toFixed(3);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.86 + pop * 0.14).toFixed(3)})`;
    el.style.transformOrigin = `${tail}px 100%`;
  });
}

function news(t, cues) {
  const N = cues.news, i = N.findIndex((c) => t >= c.start && t < c.end);
  if (i < 0) { newsEl.style.opacity = 0; return false; }
  const n = N[i]; let a = i, b = i;
  while (a > 0 && Math.abs(N[a - 1].end - N[a].start) < 0.01) a--;
  while (b < N.length - 1 && Math.abs(N[b].end - N[b + 1].start) < 0.01) b++;
  const first = N[a].start, last = N[b].end;
  newsEl.style.opacity = fade(t, first, last, 0.35, 0.2).toFixed(3);
  if (newsPlace.textContent !== n.place) newsPlace.textContent = n.place;
  if (n.head && newsHead.textContent !== n.head) newsHead.textContent = n.head;
  ticker.style.transform = `translateX(${(-((t - first) * 120) % 2400).toFixed(1)}px)`;
  const bar = ease.out(clamp01((t - first) / 0.6));
  newsEl.querySelector('.bar').style.clipPath = `inset(0 ${((1 - bar) * 100).toFixed(1)}% 0 0)`;
  return true;
}

export function updateUI(t, cues, speakers, camera) {
  title(t, cues.title);
  label(t, cues);
  news(t, cues);
  bubbles(t, cues, speakers, camera);
}
