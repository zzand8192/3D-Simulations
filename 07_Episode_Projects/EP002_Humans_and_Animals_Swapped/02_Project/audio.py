#!/usr/bin/env python3
"""EP002 sound design (no voices): city, desert, interiors, transport, construction, music. Synced to cues.json.

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


def bark(f=420, d=0.22):
    t = tt(d); fm = f * (1 + 0.6 * np.exp(-t / 0.05)); ph = 2 * np.pi * np.cumsum(fm) / SR
    s = (np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.4) * np.exp(-t / 0.07)
    return band(s + band(noise(d), 400, 3000) * np.exp(-t / 0.05) * 0.4, 200, 4000) * 0.35
def birds(sec, k=1.0):
    out = np.zeros(int(sec * SR))
    for _ in range(int(sec * 2.5)):
        st = rng.uniform(0, sec - 0.4); d = rng.uniform(0.06, 0.18); t = tt(d); f0 = rng.uniform(2500, 5200)
        s = np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * rng.uniform(15, 40) * t)) / SR) * np.hanning(len(t))
        i = int(st * SR); out[i:i + len(s)] += s * rng.uniform(0.02, 0.06)
    return out * k
def crickets(sec):
    t = tt(sec); return np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * 0.7 * t) > -0.2) * 0.015
def smash(d=0.7):
    t = tt(d); s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / rng.uniform(0.05, 0.2)) for f in (2300, 3100, 4100, 5200, 6100))
    return (s * 0.12 + norm(band(noise(d), 2000, 9000)) * np.exp(-t / 0.08) * 0.4) * 0.8
def shutter(): t = tt(0.08); return band(noise(0.08), 2000, 8000) * np.exp(-t / 0.01) * 0.25
def thump(): t = tt(0.25); return np.sin(2 * np.pi * 70 * t * (1 - t)) * np.exp(-t / 0.06) * 0.5
def creak(d=0.7): t = tt(d); f = 300 + 120 * np.sin(2 * np.pi * 3 * t); return band(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 200, 2500) * np.hanning(len(t)) * 0.05
def tv_murmur(sec): t = tt(sec); return band(noise(sec), 300, 2500) * (0.5 + 0.5 * np.clip(np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t), 0, 1)) * 0.05

S = cues['shots']
def span(name): return S[name][0], S[name][1]
def bed(name, fn, gain=1.0, xf=0.12):
    a, b = span(name); d = b - a + xf * 2; x = fn(d) * env(int(d * SR), xf, xf); add(x, max(0, a - xf), gain)
for nm in ('opening', 'swap'): bed(nm, lambda d: birds(d) + wind(d) * 0.3 + traffic(d, 0.15))
for i, t0 in enumerate(np.arange(0.4, 5.0, 0.5)): add(keys() * 0.4, t0, 0.5)        # collar tags jingling while walking
add(bark(), 5.2, 0.8, 0.2); add(whoosh(1.6, 300, 2500), 3.0, 0.4); add(keys(), 7.25, 0.9)
bed('police', lambda d: traffic(d, 1.0)); add(horn(), 13.5, 0.4, -0.6)
bed('office', lambda d: room(d, 100, 800, 0.05) + hum(d, 60, 0.02) + traffic(d, 0.15)); add(smash(), 18.55, 1.0, 0.2)
bed('podium', lambda d: crowd(d, 1.0) + wind(d) * 0.2)
for t0 in np.arange(21.3, 25.5, 0.33): add(shutter(), t0 + rng.uniform(0, 0.2), 0.8, rng.uniform(-0.8, 0.8))
bed('studio', lambda d: room(d, 100, 500, 0.05) + hum(d, 60, 0.01)); add(sting(), S['studio'][0], 0.9)
for nm in ('tokyo', 'london'): bed(nm, lambda d: traffic(d, 0.9), 0.8); add(whoosh(0.5, 800, 6000), S[nm][0] - 0.15, 0.5)
for nm in ('zooRead', 'zooTalk', 'zooReveal'): bed(nm, lambda d: birds(d, 1.4) + crowd(d, 0.5) + wind(d) * 0.3)
for t0 in np.arange(41.2, 43.0, 0.36): add(thump(), t0, 0.8, 0.5)
for t0 in np.arange(47.6, 51.0, 0.7): add(shutter(), t0, 0.7, 0.6)
bed('dogpark', lambda d: birds(d) + wind(d) * 0.4 + crowd(d, 0.3)); add(whoosh(0.9, 400, 3000), 52.0, 0.5); add(bark(380), 54.3, 0.6, -0.3); add(bark(460), 54.6, 0.5, 0.3)
bed('petstore', lambda d: traffic(d, 0.4) + birds(d, 0.4))
bed('vet', lambda d: room(d, 150, 1200, 0.06) + hum(d, 60, 0.02))
for nm in ('aerial6', 'billboard'): bed(nm, lambda d: traffic(d, 0.6) + machinery2(d) * 0.3)
bed('living', lambda d: room(d, 100, 600, 0.04) + tv_murmur(d)); add(keys(), 85.4, 0.9); add(creak(), 86.8, 0.8)
bed('walkout', lambda d: crickets(d) + birds(d, 0.3) + wind(d) * 0.2); add(keys(), 88.0, 0.4)

# ---------------------------------------------------------------- music: playful pizzicato-ish → news tension → warm ending
music = np.zeros(N)
def pad(start, dur, chord, g=0.02):
    t = tt(dur + 1.5); s = np.zeros_like(t)
    for f in chord:
        for det in (-0.3, 0.3): s += sum(np.sin(2 * np.pi * (f + det) * h * t) / (h ** 1.6) for h in range(1, 6))
    s *= np.minimum(1, t / 1.0) * np.minimum(1, np.maximum(0, (dur + 1.5 - t) / 1.5)); i = int(start * SR); n = min(len(s), N - i)
    if n > 0: music[i:i + n] += s[:n] * g
def pluck(start, f, g=0.04):
    pt = tt(0.9); pl = (np.sin(2 * np.pi * f * pt) + 0.4 * np.sin(4 * np.pi * f * pt) + 0.2 * np.sin(6 * np.pi * f * pt)) * np.exp(-pt / 0.22) * g
    i = int(start * SR); n = min(len(pl), N - i)
    if n > 0: music[i:i + n] += pl[:n]
play = [(130.81, 164.81, 196.0), (146.83, 174.61, 220.0), (110.0, 130.81, 164.81), (98.0, 123.47, 146.83)]      # C Dm Am G
tense = [(110.0, 130.81, 164.81), (103.83, 130.81, 155.56), (98.0, 123.47, 146.83), (92.5, 116.54, 138.59)]
for k, st0 in enumerate(np.arange(0, DUR, 2.0)):
    ch = tense if 25 <= st0 < 38 else play
    if k % 2 == 0: pad(st0, 4.0, ch[(k // 2) % 4])
    for j in range(4):
        if st0 + j * 0.5 > 0.4: pluck(st0 + j * 0.5, ch[(k // 2) % 4][j % 3] * (2 if j % 2 else 4))
mt = np.arange(N) / SR
mgain = np.interp(mt, [0, 1, 5.0, 5.4, 7, 25.4, 25.8, 37.6, 38.0, 77, 87, 91, 93], [0.6, 0.9, 0.9, 0.3, 0.8, 0.9, 0.35, 0.4, 0.8, 0.8, 0.9, 1.2, 0])
music = band(music, 60, 4000) * mgain
L += music; R += music

fade = np.ones(N); fi = int(0.4 * SR); fo = int(1.4 * SR); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade
peak = max(np.max(np.abs(L)), np.max(np.abs(R))); L, R = L / peak * 0.85, R / peak * 0.85
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'output', 'audio.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())
print('wrote', out, f'{DUR}s')
