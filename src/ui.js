// Cinematic text layer: serif title, small informational labels, boxed dialogue.
// Everything is a pure function of time so frames render deterministically.
import { clamp01, ease } from './env.js';

const $ = (s) => document.querySelector(s);
const titleEl = $('#title'), labelEl = $('#label'), subEl = $('#sub');
const subP = subEl.querySelector('p'), labelK = labelEl.querySelector('.k'), labelV = labelEl.querySelector('.v');

function fadeInOut(t, a, b, fin = 0.5, fout = 0.5) {
  if (t < a || t > b) return 0;
  return Math.min(ease.io((t - a) / fin), ease.io((b - t) / fout));
}

let curTitle = null, curLabel = null, curSub = null;

export function updateUI(t, cues) {
  // ---- title: word-by-word soft reveal
  const tc = cues.titles.find((c) => t >= c.start && t <= c.end);
  if (tc !== curTitle) {
    curTitle = tc;
    titleEl.innerHTML = tc ? tc.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ') : '';
  }
  if (tc) {
    titleEl.style.opacity = 1;
    const out = ease.io((tc.end - t) / 0.7);
    [...titleEl.children].forEach((w, i) => {
      const k = ease.out(clamp01((t - tc.start - i * 0.14) / 0.75));
      w.style.opacity = (k * Math.min(1, out)).toFixed(3);
      w.style.transform = `translateY(${((1 - k) * 16).toFixed(2)}px)`;
      w.style.filter = `blur(${((1 - k) * 6 + (1 - Math.min(1, out)) * 4).toFixed(2)}px)`;
    });
  } else titleEl.style.opacity = 0;

  // ---- label: two short serif lines with a hairline, no box
  const lc = cues.labels.find((c) => t >= c.start && t <= c.end);
  if (lc !== curLabel) {
    curLabel = lc;
    if (lc) { labelK.textContent = lc.k; labelV.textContent = lc.v; labelEl.className = lc.side === 'right' ? 'right' : ''; }
  }
  if (lc) {
    const a = fadeInOut(t, lc.start, lc.end, 0.8, 0.6);
    labelEl.style.opacity = a.toFixed(3);
    labelEl.style.transform = `translateY(${((1 - a) * 10).toFixed(2)}px)`;
    labelV.style.letterSpacing = `${(0.14 + (1 - a) * 0.08).toFixed(3)}em`;
  } else labelEl.style.opacity = 0;

  // ---- dialogue: exact words in a subtle translucent box
  const sc = cues.subs.find((c) => t >= c.start && t <= c.end);
  if (sc !== curSub) {
    curSub = sc;
    if (sc) subP.textContent = `“${sc.text}”`;
  }
  if (sc) {
    const a = fadeInOut(t, sc.start, sc.end, 0.18, 0.22);
    subEl.style.opacity = a.toFixed(3);
    subEl.style.transform = `translateY(${((1 - a) * 6).toFixed(2)}px)`;
  } else subEl.style.opacity = 0;
}

// who is speaking right now (drives mouth animation)
export function speakerAt(t, cues) {
  const c = cues.subs.find((s) => t >= s.start + 0.05 && t <= s.end - 0.3);
  return c ? c.who : null;
}
