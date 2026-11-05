// Text layer: centered title that morphs into the upper-left label, small serif labels,
// bottom subtitles for dialogue, and the fictional WORLD 24 broadcast graphics.
import * as THREE from 'three';
import { clamp01, ease } from './env.js';

const $ = (s) => document.querySelector(s);
const titleEl = $('#title'), labelEl = $('#label'), labelK = labelEl.querySelector('.k'), labelV = labelEl.querySelector('.v');
const newsEl = $('#news'), newsPlace = newsEl.querySelector('.place'), newsHead = newsEl.querySelector('.head'), ticker = newsEl.querySelector('.ticker span');
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

// subtitles near the bottom (this episode's dialogue treatment); the speaker's mouth animates in the 3D scene
const subEl = $('#subs');
function subtitles(t, cues, newsOn) {
  const active = cues.subs.filter((s) => t >= s.start && t <= s.end);
  if (!active.length) { subEl.style.opacity = 0; return; }
  const s = active[active.length - 1];
  const txt = `\u201C${s.text}\u201D`;
  if (subEl.firstChild.textContent !== txt) subEl.firstChild.textContent = txt;
  subEl.style.opacity = fade(t, s.start, s.end, 0.16, 0.22).toFixed(3);
  subEl.style.top = newsOn ? '1100px' : '1318px';
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
  const newsOn = news(t, cues);
  subtitles(t, cues, newsOn);
}
