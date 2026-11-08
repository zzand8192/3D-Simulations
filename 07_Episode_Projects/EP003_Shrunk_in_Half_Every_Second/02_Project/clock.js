// EP003 clock: video time t -> Greg's shrink seconds, exact heights, counter text.
// Height = 1.8 / 2^n metres at second n. Each halving happens as a quick eased pulse centred on the
// second it belongs to, so between pulses the picture and the counter agree exactly.
import { ease, clamp01 } from './env.js';

export const T0 = 4.0;                 // video time of SECOND 0 (shrinking starts right after)
export const MAIN_END = 60;            // last second shown before the time jump
export const JUMP = { out: 64.55, black: 65.15, card: [65.2, 66.75], in: 66.55, at: 67.0, to: 117 };
export const LAST = 123;               // last second shown
export const DURATION = 75.0;
const PULSE_PRE = 0.15, PULSE_LEN = 0.45;

export const metres = (n) => 1.8 / Math.pow(2, n);
export const K = (tau) => 3 * Math.pow(2, tau);        // render units per metre (Greg is 5.4 units tall)

// pulsed shrink exponent for a run of seconds that starts at video time `start` with second `base`
function pulsed(t, start, base, cap) {
  const u = t - start + PULSE_PRE; const n = Math.floor(u);
  if (n < 1) return base;
  const v = base + (n - 1) + ease.io(clamp01((u - n) / PULSE_LEN));
  return Math.min(cap, v);
}
export function tauP(t) { // the exact exponent used for Greg's size relative to the world
  if (t < JUMP.in) return pulsed(t, T0, 0, MAIN_END);
  return pulsed(t, JUMP.at, JUMP.to, LAST);
}
export function inJumpSection(t) { return t >= JUMP.in; }
export function second(t) { // the integer shown by the counter
  if (t < JUMP.in) return Math.max(0, Math.min(MAIN_END, Math.floor(t - T0 + 1e-6)));
  return Math.max(JUMP.to, Math.min(LAST, JUMP.to + Math.floor(t - JUMP.at + 1e-6)));
}
// smoothly tracked exponent (the camera's zoom): exponential follower of tauP with a lag that shortens
// after the first seconds, so Greg visibly shrinks at first and the camera keeps zooming in afterwards
export function tauCam(t) {
  if (t >= JUMP.in) return JUMP.to + Math.min(1.5, Math.max(0, t - JUMP.at - 0.8)) * 0.9; // follows the first halvings, then lets Greg go
  const lag = (tt) => 0.55 + 0.75 * (1 - ease.io(clamp01((tt - T0 - 1.0) / 6)));
  const T = lag(t), N = 48, span = 5 * T; let acc = 0, w = 0;
  for (let i = 0; i <= N; i++) { const s = (i / N) * span, k = Math.exp(-s / T); acc += tauP(t - s) * k; w += k; }
  return acc / w;
}

// ---- formatting
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sig(v, n = 3) { // exact if it has <= 4 significant digits, else n significant digits
  for (let d = 1; d <= 4; d++) { const r = Number(v.toPrecision(d)); if (Math.abs(r - v) < Math.abs(v) * 1e-9) return String(r); }
  const r = Number(v.toPrecision(n)); let s = r.toPrecision(n);
  if (s.includes('e')) s = String(r);
  return s;
}
export function heightText(n) {
  const m = metres(n);
  if (n <= 34) {
    if (m >= 1) return `${sig(m)} m`;
    if (m >= 0.01) return `${sig(m * 100)} cm`;
    if (m >= 0.0002) return `${sig(m * 1000)} mm`;
    if (m >= 1e-6) return `${sig(m * 1e6)} µm`;
    return `${sig(m * 1e9)} nm`;
  }
  const e = Math.floor(Math.log10(m)), mant = m / Math.pow(10, e);
  return `${mant.toFixed(2)} × 10${String(e).split('').map((c) => SUP[c]).join('')} m`;
}
const REF = { H: 1.06e-10, p: 1.68e-15, planck: 1.616e-35 };
function ratio(ref, n, what) {
  const r = REF[ref] / metres(n);
  if (r < 2.5) return `HALF ${what}`;
  if (r < 100) return `1/${Math.round(r)} OF ${what}`;
  const s = Number(r.toPrecision(2)).toLocaleString('en-US');
  return `ABOUT 1/${s} OF ${what}`;
}
export function thanText(n, table) {
  if (table[n]) return table[n];
  if (n >= 36 && n <= 46) return ratio('H', n, 'A HYDROGEN ATOM');
  if (n >= 51 && n <= 60) return ratio('p', n, 'A PROTON');
  if (n >= 118) return ratio('planck', n, 'THE PLANCK LENGTH');
  return '—';
}
