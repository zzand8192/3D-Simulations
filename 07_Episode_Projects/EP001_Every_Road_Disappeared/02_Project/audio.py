#!/usr/bin/env python3
"""EP001 sound design (no voices): city, desert, interiors, transport, construction, music. Synced to cues.json.

    python3 scripts/audio.py            -> output/audio.wav (stereo, 44.1 kHz)

Only needs numpy. Timings come from src/cues.json so audio stays in sync with the picture.
"""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
cues = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'src', 'cues.json')))
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


# ---------------------------------------------------------------- EP001-specific sounds
def traffic(sec, k=1.0):
    t = tt(sec); eng = norm(band(noise(sec), 50, 400)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t)) * 0.35
    hiss = norm(band(noise(sec), 800, 4000)) * 0.08
    return (eng + hiss + crowd(sec, 0.6)) * k
def horn(f=420, d=0.45):
    t = tt(d); s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sign(np.sin(2 * np.pi * f * 1.26 * t)) * 0.5
    return band(s, 200, 3000) * env(len(t), 0.01, 0.08) * 0.12
def crunch(d=0.9):  # tyres + suspension dropping onto dirt
    t = tt(d); thud = np.sin(2 * np.pi * 55 * t * (1 - 0.4 * t)) * np.exp(-t / 0.12)
    grit = band(noise(d), 300, 5000) * np.exp(-t / 0.25)
    return thud * 0.7 + norm(grit) * 0.35
def skid(d=0.7): t = tt(d); return norm(band(noise(d), 1200, 5000)) * np.exp(-t / 0.3) * 0.25
def siren(sec, f0=700):
    t = tt(sec); f = f0 + 260 * np.sin(2 * np.pi * 0.35 * t); ph = 2 * np.pi * np.cumsum(f) / SR
    return band(np.sin(ph) + 0.3 * np.sin(2 * ph), 300, 3000) * 0.05
def wind(sec): t = tt(sec); return norm(band(noise(sec), 80, 900)) * (0.5 + 0.4 * np.sin(2 * np.pi * 0.11 * t) ** 2) * 0.35
def chime(): t = tt(1.2); return (np.sin(2 * np.pi * 1318 * t) + np.sin(2 * np.pi * 1046 * t) * (t > 0.25)) * np.exp(-t / 0.35) * 0.12
def ding(): t = tt(0.9); return (np.sin(2 * np.pi * 2093 * t) + 0.5 * np.sin(2 * np.pi * 3136 * t)) * np.exp(-t / 0.25) * 0.14 + band(noise(0.9), 2000, 6000) * np.exp(-t / 0.03) * 0.08
def rotor(sec): t = tt(sec); return norm(band(noise(sec), 60, 700)) * (0.4 + 0.6 * np.clip(np.sin(2 * np.pi * 9 * t), 0, 1) ** 2) * 0.5
def train_pass(sec): t = tt(sec); return norm(band(noise(sec), 60, 1500)) * (0.6 + 0.4 * np.clip(np.sin(2 * np.pi * 2.2 * t), 0, 1)) * 0.4
def train_horn(d=1.2): t = tt(d); return band(sum(np.sin(2 * np.pi * f * t) for f in (311, 370, 466)), 200, 2500) * env(len(t), 0.05, 0.3) * 0.12
def jet(sec): t = tt(sec); return norm(band(noise(sec), 100, 3000)) * np.minimum(1, t / (sec * 0.6)) * 0.5 + norm(band(noise(sec), 2000, 7000)) * np.minimum(1, t / sec) * 0.15
def machinery2(sec): t = tt(sec); saw = sum(np.sin(2 * np.pi * 46 * k * t) / k for k in range(1, 8)); return band(saw, None, 400) * 0.08 + norm(band(noise(sec), 300, 1500)) * 0.06 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))
def keys():
    out = np.zeros(int(0.5 * SR))
    for i in rng.integers(0, int(0.4 * SR), 6):
        n = np.hanning(900) * band(rng.standard_normal(900), 3000, 9000) * 0.15; out[i:i + 900] += n
    return out

S = cues['shots']
def span(name): return S[name][0], S[name][1]
def bed(name, fn, gain=1.0, xf=0.12):
    a, b = span(name); d = b - a + xf * 2; x = fn(d) * env(int(d * SR), xf, xf); add(x, max(0, a - xf), gain)
TV = cues.get('tv', 5.35)
# city before / after
a, b = 0, S['reveal'][1]
pre = traffic(TV + 0.2) * env(int((TV + 0.2) * SR), 0.3, 0.05); add(pre, 0, 1.0)
add(crunch(), TV, 1.0); add(skid(), TV - 0.02, 0.8)
for i in range(6): add(crunch(0.6) * 0.5, TV + 0.05 + i * 0.07, 0.4, rng.uniform(-0.8, 0.8))
post = (crowd(b - TV, 1.3) + wind(b - TV) * 0.4) * env(int((b - TV) * SR), 0.3, 0.12); add(post, TV, 1.0)
for t0 in (TV + 0.6, TV + 1.1, TV + 1.9, TV + 3.0): add(horn(rng.uniform(380, 480)), t0, 0.9, rng.uniform(-0.7, 0.7))
for t0 in (0.8, 2.1, 3.3, 4.4): add(horn(rng.uniform(380, 500), 0.25), t0, 0.5, rng.uniform(-0.8, 0.8))
add(whoosh(1.6, 300, 2500), 2.4, 0.4)
bed('downtown', lambda d: crowd(d, 1.0) + wind(d) * 0.3 + siren(d) * 0.6)
for t0 in (10.2, 12.4): add(horn(430), t0, 0.7, -0.5)
bed('suburb', lambda d: wind(d) * 0.5 + crowd(d, 0.3)); add(whoosh(0.4, 400, 2000), 13.95, 0.5)
bed('highway', lambda d: wind(d) * 0.8 + siren(d, 650) + siren(d, 820) * 0.7)
# news
for nm in ('studio',): bed(nm, lambda d: room(d, 100, 500, 0.05) + hum(d, 60, 0.01))
add(sting(), S['studio'][0], 0.9)
for nm in ('tokyo', 'london', 'sao'): bed(nm, lambda d: crowd(d, 0.9) + wind(d) * 0.4 + siren(d) * 0.4, 0.8); add(whoosh(0.5, 800, 6000), S[nm][0] - 0.15, 0.5)
# Greg — gas station
bed('gasIn', lambda d: room(d, 100, 700, 0.05) + hum(d, 60, 0.03)); add(ding(), 42.05, 1.0, -0.3)
add(chime(), 43.05, 0.8)
for nm in ('gasOut', 'gasPov', 'gasReact'): bed(nm, lambda d: wind(d) * 0.9, 0.9)
# day 3
bed('grocery', lambda d: crowd(d, 0.7) + hum(d, 60, 0.03) + room(d, 200, 1500, 0.04))
bed('hospital', lambda d: rotor(d) * np.linspace(1.0, 0.6, int(d * SR)) + wind(d) * 0.3)
bed('station', lambda d: crowd(d, 1.0) + train_pass(d) * np.linspace(0.2, 1.0, int(d * SR))); add(train_horn(), S['station'][0] + 0.4, 0.8, 0.4)
bed('airport', lambda d: crowd(d, 0.6) + jet(d))
# month 6
bed('paving', lambda d: machinery2(d) + wind(d) * 0.3)
for t0 in np.arange(64.8, 69.0, 0.9): add(beep(1200, 0.12), t0, 0.6, 0.3)
bed('adapt', lambda d: train_pass(d) * 0.7 + wind(d) * 0.4)
bed('hub', lambda d: crowd(d, 1.0) + train_pass(d) * 0.5)
bed('worker', lambda d: machinery2(d) * 0.4 + wind(d) * 0.4)
bed('gregBack', lambda d: wind(d) * 0.8); add(keys(), 80.3, 1.0); add(keys(), 85.1, 0.8)
# year 5
bed('year5', lambda d: crowd(d, 0.6) + wind(d) * 0.4); add(train_pass(4.0) * env(int(4 * SR), 1.0, 1.5), 92.3, 0.9, 0.4)

# ---------------------------------------------------------------- music: tension → light → hopeful
music = np.zeros(N)
def pad(start, dur, chord, g=0.02):
    t = tt(dur + 1.5); s = np.zeros_like(t)
    for f in chord:
        for det in (-0.3, 0.3): s += sum(np.sin(2 * np.pi * (f + det) * h * t) / (h ** 1.6) for h in range(1, 6))
    s *= np.minimum(1, t / 1.0) * np.minimum(1, np.maximum(0, (dur + 1.5 - t) / 1.5))
    i = int(start * SR); n = min(len(s), N - i)
    if n > 0: music[i:i + n] += s[:n] * g
def pluck(start, f, g=0.035):
    pt = tt(1.6); pl = (np.sin(2 * np.pi * f * pt) + 0.3 * np.sin(4 * np.pi * f * pt)) * np.exp(-pt / 0.5) * g
    i = int(start * SR); n = min(len(pl), N - i)
    if n > 0: music[i:i + n] += pl[:n]
calm = [(146.83, 185.0, 220.0), (123.47, 146.83, 185.0), (98.0, 146.83, 196.0), (110.0, 138.59, 164.81)]   # D Bm G A
tense = [(110.0, 130.81, 164.81), (103.83, 130.81, 155.56), (98.0, 123.47, 146.83), (92.5, 116.54, 138.59)]
hope = [(130.81, 164.81, 196.0), (110.0, 130.81, 164.81), (87.31, 130.81, 174.61), (98.0, 123.47, 196.0)]    # C Am F G
for k, st0 in enumerate(np.arange(0, DUR, 4.0)):
    ch = calm if st0 < 5 or 37 <= st0 < 50 else tense if st0 < 37 or st0 < 64 else hope
    if 79 <= st0 < 88: ch = calm
    pad(st0, 4.0, ch[k % 4])
    for j, f in enumerate((ch[k % 4][2] * 2, ch[k % 4][1] * 2, ch[k % 4][0] * 4)):
        if st0 + j * 1.33 > 0.5: pluck(st0 + j * 1.33, f)
mt = np.arange(N) / SR
mgain = np.interp(mt, [0, 1, 5.2, 5.5, 9, 21.4, 21.8, 37.0, 37.5, 50.5, 64.5, 71.5, 76.4, 88, 96, 99], [0.6, 0.9, 0.9, 0.2, 0.7, 0.9, 0.3, 0.35, 0.8, 0.8, 1.0, 0.4, 1.0, 1.1, 1.3, 0])
music = band(music, 60, 3500) * mgain
L += music; R += music

# ---------------------------------------------------------------- master
fade = np.ones(N); fi = int(0.4 * SR); fo = int(1.4 * SR); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade
peak = max(np.max(np.abs(L)), np.max(np.abs(R))); L, R = L / peak * 0.85, R / peak * 0.85
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'output', 'audio.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())
print('wrote', out, f'{DUR}s')
