#!/usr/bin/env python3
"""Procedural sound design for the video (no voices): ambience per shot, sound effects, and a soft music bed.

    python3 scripts/audio.py            -> output/audio.wav (stereo, 44.1 kHz)

Only needs numpy. Timings come from src/cues.json so audio stays in sync with the picture.
"""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cues = json.load(open(os.path.join(ROOT, 'src', 'cues.json')))
SR = 44100
DUR = cues['duration']
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)


def band(x, lo=None, hi=None, soft=0.15):
    """Zero-phase FFT band-pass with soft edges."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a=0.01, r=0.1):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414; R[i:i + len(sig)] += sig * gain * r * 1.414


def norm(x): return x / (np.max(np.abs(x)) + 1e-9)
def noise(sec): return rng.standard_normal(int(sec * SR))
def tt(sec): return np.arange(int(sec * SR)) / SR


# ---------------------------------------------------------------- ambience beds
def waves(sec):
    x = norm(band(noise(sec), 60, 900)); t = tt(sec)
    swell = 0.55 + 0.45 * np.clip(np.sin(2 * np.pi * t / 6.5) ** 3 + 0.3 * np.sin(2 * np.pi * t / 2.3), -1, 1)
    hiss = norm(band(noise(sec), 2500, 9000)) * np.clip(np.sin(2 * np.pi * t / 6.5 - 0.6), 0, 1) ** 4
    return x * swell * 0.55 + hiss * 0.12

def crowd(sec, k=1.0):
    x = norm(band(noise(sec), 300, 2600)); t = tt(sec)
    mod = 0.6 + 0.4 * norm(band(noise(sec), None, 3))
    babble = np.zeros_like(t)
    for _ in range(int(sec * 3)):  # short vowel-like murmurs
        st = rng.uniform(0, sec - 0.5); d = rng.uniform(0.15, 0.4); f = rng.uniform(140, 320)
        i = int(st * SR); n = int(d * SR); tl = np.arange(n) / SR
        v = (np.sin(2 * np.pi * f * tl) + 0.5 * np.sin(4 * np.pi * f * tl) + 0.3 * np.sin(6 * np.pi * f * tl)) * np.hanning(n)
        babble[i:i + n] += v * rng.uniform(0.2, 0.6)
    return (x * mod * 0.18 + band(babble, 200, 2000) * 0.1) * k

def underwater(sec, depth=1.0):
    x = norm(band(noise(sec), 20, 260)); t = tt(sec)
    return x * (0.5 + 0.12 * np.sin(2 * np.pi * t / 5)) * (0.45 + 0.25 * depth)

def room(sec, lo=80, hi=600, g=0.08): return norm(band(noise(sec), lo, hi)) * g

def hum(sec, f=55, g=0.05):
    t = tt(sec); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t)) * g

def machinery(sec):
    t = tt(sec); saw = sum(np.sin(2 * np.pi * 38 * k * t) / k for k in range(1, 9))
    return band(saw, None, 300) * 0.05 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t)) + norm(band(noise(sec), 400, 1400)) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * t))

# ---------------------------------------------------------------- one-shots
def bubble(f0=None):
    f0 = f0 or rng.uniform(500, 1400); d = rng.uniform(0.04, 0.09); t = tt(d)
    f = f0 * (1 + 2.2 * t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / (d * 0.35)) * 0.5

def bubble_burst(n=10, spread=0.5):
    out = np.zeros(int((spread + 0.2) * SR))
    for _ in range(n):
        b = bubble(); i = int(rng.uniform(0, spread) * SR); out[i:i + len(b)] += b * rng.uniform(0.4, 1)
    return out

def splash(size=1.0):
    d = 0.6 + 0.4 * size; x = band(noise(d), 600, 9000); t = tt(d)
    e = np.exp(-t / (0.12 * (0.6 + size))) * (1 - np.exp(-t / 0.004))
    return norm(x * e) * 0.6 * size

def gull():
    d = 0.55; t = tt(d); f = 1700 - 900 * (t / d) + 120 * np.sin(2 * np.pi * 9 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR; s = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    return band(s * np.hanning(len(t)) ** 0.5 * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)), 600, 5000) * 0.18

def beep(f=1000, d=0.09): t = tt(d); return np.sin(2 * np.pi * f * t) * env(len(t), 0.003, 0.03) * 0.12

def whoosh(d=0.8, lo=200, hi=3000):
    t = tt(d); x = band(noise(d), lo, hi); return norm(x) * np.sin(np.pi * t / d) ** 2 * 0.25

def sting():  # news intro: bright chord swell + low hit
    d = 2.6; t = tt(d); s = np.zeros_like(t)
    for f in (293.66, 369.99, 440.0, 587.33, 739.99):
        s += np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 5 * t)) / 5
    s *= np.minimum(1, t / 0.08) * np.exp(-t / 0.9)
    hit = np.sin(2 * np.pi * 70 * t * (1 - 0.3 * t)) * np.exp(-t / 0.25)
    return s * 0.35 + hit * 0.4

def tap(): d = 0.03; return band(noise(d), 1500, 6000) * env(int(d * SR), 0.001, 0.02) * 0.08

# ---------------------------------------------------------------- layout per shot
S = cues['shots']
def span(name): return S[name][0], S[name][1]
def bed(name, sig_fn, gain=1.0, xf=0.12):
    a, b = span(name); d = b - a + xf * 2
    x = sig_fn(d) * env(int(d * SR), xf, xf); add(x, max(0, a - xf), gain)

for nm in ('beach', 'surface', 'guard'):
    bed(nm, lambda d: waves(d) + crowd(d), 1.0)
for nm in ('cutA', 'reporter'):
    bed(nm, lambda d: waves(d) * 0.7 + crowd(d, 0.8), 0.8)
for nm, dep in (('dive', 0.6), ('spread', 0.6), ('school', 0.7), ('sandwich', 0.7), ('phone', 0.7)):
    bed(nm, lambda d, dep=dep: underwater(d, dep))
bed('studio', lambda d: room(d, 100, 500, 0.05) + hum(d, 60, 0.01))
bed('cutB', lambda d: underwater(d, 0.4) + room(d, 300, 2500, 0.06))
bed('lab', lambda d: room(d, 150, 1200, 0.07) + hum(d, 60, 0.03))
bed('chair', lambda d: underwater(d, 0.4))
bed('city', lambda d: underwater(d, 1.0) + machinery(d))
bed('tv', lambda d: room(d, 120, 700, 0.05) + underwater(d, 0.2) * 0.4)
bed('parking', lambda d: underwater(d, 0.9) + machinery(d) * 0.6)

# beach details
for t0 in np.arange(0.6, S['guard'][1], 2.3):
    if any(S[n][0] <= t0 < S[n][1] for n in ('beach', 'surface', 'guard')):
        add(gull(), t0 + rng.uniform(0, 1.2), rng.uniform(0.5, 1.0), rng.uniform(-0.8, 0.8))
for t0, sz, pan in ((5.32, 0.5, 0.3), (6.02, 1.0, 0), (11.0, 1.0, 0.2), (13.75, 0.7, -0.3), (18.85, 1.0, 0.1)):
    add(splash(sz), t0, 0.8, pan)
add(whoosh(1.6, 300, 2500), 3.9, 0.5)                       # title morph
# bubbles (match the visual bursts)
for t0, n, g in ((6.05, 30, 0.9), (6.5, 10, 0.6), (8.55, 26, 1.0), (10.4, 8, 0.7), (14.25, 20, 0.8), (14.75, 18, 0.9), (44.6, 8, 0.6), (49.05, 10, 0.6), (66.5, 6, 0.6)):
    add(bubble_burst(n, 0.6), t0, g, rng.uniform(-0.4, 0.4))
for nm in ('dive', 'spread', 'school', 'sandwich', 'phone', 'chair', 'city', 'parking'):
    a, b = span(nm)
    for t0 in np.arange(a, b, 0.7): add(bubble_burst(3, 0.3), t0 + rng.uniform(0, 0.5), 0.35, rng.uniform(-0.7, 0.7))
# crowd cheer when everyone discovers it
cheer = crowd(2.4, 1.0) * np.linspace(0.3, 1.5, int(2.4 * SR)) ** 1.2; add(cheer * env(len(cheer), 0.1, 0.6), 19.2, 1.2)
# news
add(sting(), S['studio'][0], 0.9)
add(whoosh(0.5, 800, 6000), S['cutA'][0] - 0.15, 0.5); add(whoosh(0.5, 800, 6000), S['cutB'][0] - 0.15, 0.5); add(whoosh(0.5, 800, 6000), S['reporter'][0] - 0.15, 0.5)
# lab monitor beeps at 72 bpm
for t0 in np.arange(S['lab'][0] + 0.2, S['lab'][1], 60 / 72): add(beep(), t0, 1.0, 0.4)
# phone taps
for t0 in np.arange(51.9, 53.3, 2 * np.pi / 13): add(tap(), t0, 1.0, 0.1)
# sub door + engine on the parking street
add(whoosh(0.6, 150, 1200), 63.6, 0.8)
for nm, t0 in (('city', 54.4), ('parking', 62.4)):
    a, b = span(nm); d = b - a; t = tt(d); add(band(noise(d), 300, 1800) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t)) * env(len(t), 0.5, 0.5), a, 0.8, 0.5)

# ---------------------------------------------------------------- music bed: soft pad + sparse plucks (D major)
chords = [(146.83, 185.0, 220.0), (123.47, 146.83, 185.0), (98.0, 146.83, 196.0), (110.0, 138.59, 164.81)]
music = np.zeros(N)
step = 4.0
for k, start in enumerate(np.arange(0, DUR, step)):
    ch = chords[k % 4]; d = step + 1.5; t = tt(d); s = np.zeros_like(t)
    for f in ch:
        for det in (-0.3, 0.3):
            s += sum(np.sin(2 * np.pi * (f + det) * h * t) / (h ** 1.6) for h in range(1, 6))
    s *= np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, (d - t) / 1.5))
    i = int(start * SR); n = min(len(s), N - i); music[i:i + n] += s[:n] * 0.02
    for j, f in enumerate((ch[2] * 2, ch[1] * 2, ch[0] * 4)):
        pt = tt(1.6); pl = (np.sin(2 * np.pi * f * pt) + 0.3 * np.sin(4 * np.pi * f * pt)) * np.exp(-pt / 0.5) * 0.035
        pi = int((start + j * 1.33) * SR); pn = min(len(pl), N - pi)
        if pn > 0 and start + j * 1.33 > 0.5: music[pi:pi + pn] += pl[:pn]
mt = np.arange(N) / SR
mgain = np.interp(mt, [0, 1, 21.3, 21.7, 26.9, 27.4, 35.2, 35.6, 54.2, 54.6, 66.8, 69.0, 70],
                       [0.6, 1.0, 1.0, 0.25, 0.25, 0.6, 0.6, 0.9, 0.9, 1.2, 1.3, 1.4, 0])
music = band(music, 60, 3500) * mgain
L += music; R += music

# ---------------------------------------------------------------- master
fade = np.ones(N); fi = int(0.4 * SR); fo = int(1.2 * SR); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = L / peak * 0.85, R / peak * 0.85
out = os.path.join(ROOT, 'output', 'audio.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())
print('wrote', out, f'{DUR}s')
