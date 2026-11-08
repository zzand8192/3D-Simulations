// EP003 text layer: centred title that shrinks into the upper-left counter, the size counter itself
// (SECOND / HEIGHT / SMALLER THAN), small captions, the time-jump card and colour flashes.
import { clamp01, ease } from './env.js';
import { T0, JUMP, second, heightText, thanText } from './clock.js';

const $ = (s) => document.querySelector(s);
const titleEl = $('#title'), counter = $('#counter'), secEl = $('#c-sec'), hEl = $('#c-h'), thanEl = $('#c-than');
const tagEl = $('#tag'), capEl = $('#caption'), cardEl = $('#card'), flashEl = $('#flash');
const fade = (t, a, b, fi = 0.5, fo = 0.5) => (t < a || t > b ? 0 : Math.min(ease.io((t - a) / fi), ease.io((b - t) / fo)));

let titleBuilt = false;
function title(t, c) {
  if (!titleBuilt) { titleEl.innerHTML = c.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' '); titleBuilt = true; }
  if (t > c.morph + 0.1) { titleEl.style.opacity = 0; return; }
  titleEl.style.opacity = 1;
  [...titleEl.children].forEach((w, i) => {
    const k = ease.out(clamp01((t - c.start - i * 0.14) / 0.8));
    w.style.opacity = k.toFixed(3); w.style.transform = `translateY(${((1 - k) * 18).toFixed(1)}px)`; w.style.filter = `blur(${((1 - k) * 6).toFixed(1)}px)`;
  });
  const m = ease.io(clamp01((t - c.hold) / (c.morph - c.hold)));
  titleEl.style.transform = `translate(${(-m * 290).toFixed(1)}px, ${(-m * 520).toFixed(1)}px) scale(${(1 - m * 0.62).toFixed(3)})`;
  titleEl.style.opacity = (1 - ease.io(clamp01((m - 0.15) / 0.55))).toFixed(3);
}

let last = { n: -1 };
function count(t, cues) {
  const c = cues.counter;
  const a = t < JUMP.in ? fade(t, c.show, c.hide, 0.6, 0.45) : fade(t, c.showAgain, c.end, 0.5, 0.8);
  counter.style.opacity = a.toFixed(3);
  if (a <= 0) return;
  const n = second(t);
  if (n !== last.n) { secEl.textContent = n; hEl.textContent = heightText(n); thanEl.textContent = thanText(n, cues.than); last.n = n; }
  // each new value eases in as Greg halves
  const flip = n >= JUMP.to ? JUMP.at + (n - JUMP.to) : T0 + n, k = n === 0 || n === JUMP.to ? 1 : ease.out(clamp01((t - flip) / 0.22));
  for (const el of [secEl, hEl, thanEl]) { el.style.opacity = (0.15 + 0.85 * k).toFixed(3); el.style.transform = `translateY(${((1 - k) * 10).toFixed(1)}px)`; }
}

function captions(t, cues) {
  const c = cues.captions.find((x) => t >= x.start && t <= x.end);
  capEl.style.opacity = c ? fade(t, c.start, c.end, 0.6, 0.6).toFixed(3) : 0;
  if (c && capEl.textContent !== c.text) capEl.textContent = c.text;
  const tg = t < JUMP.in ? cues.tag : cues.tag2;
  tagEl.style.opacity = (fade(t, tg.start, tg.end, 0.8, 0.4) * 0.8).toFixed(3); tagEl.textContent = tg.text;
  const j = cues.jumpCard; cardEl.style.opacity = fade(t, j.start, j.end, 0.35, 0.35).toFixed(3); cardEl.querySelector('.k').textContent = j.text;
}

export function updateUI(t, cues, flash) {
  title(t, cues.title);
  count(t, cues);
  captions(t, cues);
  flashEl.style.background = flash.c; flashEl.style.opacity = flash.a.toFixed(3);
}
