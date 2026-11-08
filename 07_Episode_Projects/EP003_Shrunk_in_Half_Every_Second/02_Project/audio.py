#!/usr/bin/env python3
"""EP003 sound design (no voices): one ambience per scale stage, a soft "whoomp" on every halving,
event sounds from cues.json, and a quiet evolving music bed.  Usage: audio.py cues.json out.wav"""
import json, sys, wave
import numpy as np

cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
SR = 44100
DUR = cues['duration']; N = int(SR * DUR)
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
T0, JUMP_AT = 4.0, 67.0


def band(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def norm(x): return x / (np.max(np.abs(x)) + 1e-9)
def noise(sec): return rng.standard_normal(int(sec * SR))
def tt(sec): return np.arange(int(sec * SR)) / SR
def env(n, a=0.01, r=0.1):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414; R[i:i + len(sig)] += sig * gain * r * 1.414
def bed(a, b, sig, gain, fade=0.6):
    n = int((b - a) * SR); sig = sig[:n] * env(n, fade, fade); add(sig, a, gain, 0)
    add(np.roll(sig, 900), a, gain * 0.0, 0)


# ---------------------------------------------------------------- beds
def city(sec, muffle):
    t = tt(sec)
    traffic = norm(band(noise(sec), 40, 700)) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 7))
    crowd = norm(band(noise(sec), 300, 2500)) * (0.6 + 0.4 * norm(band(noise(sec), None, 2)))
    x = traffic * 0.5 + crowd * 0.18
    for _ in range(4):  # distant horns / brakes
        s = rng.uniform(0, sec - 1); f = rng.uniform(320, 480); d = rng.uniform(0.25, 0.5); n = int(d * SR); tl = np.arange(n) / SR
        h = (np.sign(np.sin(2 * np.pi * f * tl)) * 0.4 + np.sin(2 * np.pi * f * 1.5 * tl) * 0.3) * env(n, 0.02, 0.1)
        i = int(s * SR); x[i:i + n] += band(h, 200, 1800)[: len(x[i:i + n])] * 0.12
    # progressively muffled and lowered as Greg shrinks (the world becomes huge and distant)
    out = np.zeros_like(x); seg_n = int(SR * 0.5)
    for k in range(0, len(x), seg_n):
        m = muffle[min(len(muffle) - 1, k * len(muffle) // len(x))]
        chunk = x[max(0, k - 2000): k + seg_n + 2000]
        fl = band(chunk, 20, 9000 * (1 - m) + 220 * m)
        out[k:k + seg_n] = fl[(k - max(0, k - 2000)):(k - max(0, k - 2000)) + seg_n][: len(out[k:k + seg_n])] * (1 - 0.35 * m)
    return out
def wind(sec):
    t = tt(sec); x = norm(band(noise(sec), 120, 1600)); return x * (0.45 + 0.55 * norm(band(noise(sec), None, 0.6)) ** 2) * 0.5
def water(sec):
    t = tt(sec); x = norm(band(noise(sec), 25, 320)) * (0.6 + 0.15 * np.sin(2 * np.pi * t / 4.5))
    for _ in range(int(sec * 5)):  # tiny bubbles
        s = rng.uniform(0, sec - 0.1); f = rng.uniform(900, 2600); n = int(0.06 * SR); tl = np.arange(n) / SR
        b = np.sin(2 * np.pi * f * tl * (1 + tl * 6)) * np.exp(-tl * 60); i = int(s * SR); x[i:i + n] += b[: len(x[i:i + n])] * 0.18
    return x
def drone(sec, f, bright=0.0):
    t = tt(sec); x = sum(np.sin(2 * np.pi * f * k * t + k) / k for k in (1, 2, 3, 5)) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 9))
    return x * 0.35 + norm(band(noise(sec), 3000, 9000)) * 0.08 * bright
def crackle(sec, rate=18):
    x = np.zeros(int(sec * SR))
    for _ in range(int(sec * rate)):
        i = int(rng.uniform(0, sec - 0.01) * SR); n = int(0.004 * SR); x[i:i + n] += rng.standard_normal(n) * np.exp(-np.arange(n) / 30) * rng.uniform(0.2, 1)
    return band(x, 1500, 9000)
def throb(sec, f=46):
    t = tt(sec); return np.sin(2 * np.pi * f * t) * (0.55 + 0.45 * np.sin(2 * np.pi * 1.1 * t) ** 8) * 0.8

S = cues['stages']
# city bed muffles with tau = t - T0
c0, c1 = 0.0, S['splash']
mu = [min(1.0, max(0.0, (tt_ - T0) / 9.0)) for tt_ in np.arange(c0, c1, 0.5)]
bed(c0, c1, city(c1 - c0, mu), 0.55, 0.3)
bed(10.0, S['splash'], wind(S['splash'] - 10.0), 0.28, 1.2)
bed(S['micro'][0], S['micro'][1] + 0.8, water(S['micro'][1] - S['micro'][0] + 0.8), 0.5, 0.15)
bed(S['molecular'][0] - 0.8, S['molecular'][1] + 0.8, drone(S['molecular'][1] - S['molecular'][0] + 1.6, 82, 0.6), 0.32, 1.0)
bed(S['atomic'][0] - 0.8, S['atomic'][1] + 0.6, drone(S['atomic'][1] - S['atomic'][0] + 1.4, 61, 1.0) * 0.8 + crackle(S['atomic'][1] - S['atomic'][0] + 1.4) * 0.6, 0.32, 1.0)
bed(S['nucleus'][0] - 0.5, S['nucleus'][1] + 0.5, throb(S['nucleus'][1] - S['nucleus'][0] + 1.0, 48), 0.4, 0.5)
bed(S['proton'][0] - 0.4, S['proton'][1], throb(S['proton'][1] - S['proton'][0] + 0.4, 38) * 0.7 + crackle(S['proton'][1] - S['proton'][0] + 0.4, 40) * 0.5, 0.36, 0.6)
bed(S['foam'][0], S['foam'][1], drone(S['foam'][1] - S['foam'][0], 41, 1.4) * 0.6 + crackle(S['foam'][1] - S['foam'][0], 70) * 0.35, 0.3, 0.8)

# ---------------------------------------------------------------- the halving "whoomp" on every second
def whoomp(n):
    d = 0.5; m = int(d * SR); tl = np.arange(m) / SR
    f0 = 210 * (1 + n / 70); f = f0 * np.exp(-tl * 4.2) + 38
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tl * 6) + 0.35 * np.sin(2 * ph) * np.exp(-tl * 9)
    air = band(rng.standard_normal(m), 600, 4000) * np.exp(-tl * 14) * 0.25
    tick = np.sin(2 * np.pi * 1800 * (1 + n / 60) * tl) * np.exp(-tl * 90) * 0.25
    return (body + air + tick) * env(m, 0.008, 0.15)
for n in range(1, 61): add(whoomp(n), T0 + n - 0.15, 0.36, 0)
for n in range(118, 124): add(whoomp(n - 55), JUMP_AT + (n - 117) - 0.15, 0.3, 0)

# ---------------------------------------------------------------- events
def stomp(g):
    m = int(0.9 * SR); tl = np.arange(m) / SR
    return (np.sin(2 * np.pi * 42 * tl) * np.exp(-tl * 7) + band(rng.standard_normal(m), 60, 500) * np.exp(-tl * 18) * 0.6) * env(m, 0.003, 0.2)
def coo(g):
    m = int(0.75 * SR); tl = np.arange(m) / SR; f = 330 + 60 * np.sin(np.pi * tl / 0.75) - 40 * tl
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * tl)); return band(x * np.sin(np.pi * tl / 0.75) ** 2, 150, 1400) * 0.9
def flutter(g):
    m = int(1.0 * SR); tl = np.arange(m) / SR; x = band(rng.standard_normal(m), 300, 3500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * tl))) * np.exp(-tl * 2.2); return x * 0.8
def skitter(g):
    m = int(1.2 * SR); x = np.zeros(m)
    for k in range(60): i = int(k / 60 * (m - 400)); x[i:i + 200] += rng.standard_normal(200) * np.exp(-np.arange(200) / 25) * rng.uniform(0.3, 1)
    return band(x, 2500, 10000) * 0.8
def splash(g):
    m = int(1.6 * SR); tl = np.arange(m) / SR
    burst = band(rng.standard_normal(m), 400, 7000) * np.exp(-tl * 5) * 0.8
    bloop = np.sin(2 * np.pi * np.cumsum(500 * np.exp(-tl * 3) + 90) / SR) * np.exp(-tl * 2.5) * 0.7
    return burst + band(bloop, 60, 2000)
def swish(g):
    m = int(1.1 * SR); tl = np.arange(m) / SR; return band(rng.standard_normal(m), 200, 1800) * np.sin(np.pi * tl / 1.1) ** 3 * 0.7
def bump(g):
    m = int(0.4 * SR); tl = np.arange(m) / SR; return np.sin(2 * np.pi * 120 * tl * (1 - tl)) * np.exp(-tl * 14) * 0.9
def shimmer(g):
    m = int(2.4 * SR); tl = np.arange(m) / SR
    return sum(np.sin(2 * np.pi * f * tl + k) * np.exp(-tl * (1.5 + k * 0.4)) for k, f in enumerate([1320, 1760, 1980, 2640, 3520])) * 0.18
def rumble(g):
    m = int(2.5 * SR); tl = np.arange(m) / SR; return (band(rng.standard_normal(m), 20, 140) * 2.5 + np.sin(2 * np.pi * 33 * tl) * 0.6) * np.sin(np.pi * tl / 2.5) ** 2 * 0.6
KIND = dict(stomp=stomp, coo=coo, flutter=flutter, skitter=skitter, splash=splash, swish=swish, bump=bump, shimmer=shimmer, rumble=rumble)
for e in cues['sfx']: add(KIND[e['kind']](e['g']), e['t'], e['g'] * 0.7, 0.0)
# title morph whoosh
m = int(1.2 * SR); tl = np.arange(m) / SR; add(band(rng.standard_normal(m), 400, 5000) * np.sin(np.pi * tl / 1.2) ** 2 * 0.35, cues['title']['hold'] - 0.2, 0.6)

# ---------------------------------------------------------------- music: slow pad + sparse plucks, darker as Greg goes smaller
def pad_chord(freqs, sec):
    t = tt(sec); x = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs))
    return x * np.sin(np.pi * t / sec) ** 1.5
CH = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]]
step = 4.0; music = np.zeros(N)
for k, t0 in enumerate(np.arange(0, DUR, step)):
    oct_ = 1.0 if t0 < 20 else 0.75 if t0 < 45 else 0.5
    sig = pad_chord([f * oct_ for f in CH[k % 4]], step * 1.5); i = int(t0 * SR); n = min(len(sig), N - i); music[i:i + n] += sig[:n] * 0.05
    for j in range(2):
        pt = t0 + 1.0 + j * 2.0
        if pt < DUR - 1:
            f = CH[k % 4][(j + k) % 3] * 2 * oct_; mm = int(1.4 * SR); tl = np.arange(mm) / SR
            pl = (np.sin(2 * np.pi * f * tl) + 0.4 * np.sin(4 * np.pi * f * tl)) * np.exp(-tl * 3.2) * env(mm, 0.004, 0.2)
            ii = int(pt * SR); nn = min(mm, N - ii); music[ii:ii + nn] += pl[:nn] * 0.035
tt_all = np.arange(N) / SR
gain = np.clip(tt_all / 1.5, 0, 1) * (1 - np.clip((tt_all - 64.6) / 0.6, 0, 1) * (tt_all < 66.6)) * np.clip(1 - (tt_all - 73.2) / 1.6, 0, 1)
music = band(music, 60, 5000) * gain
L += music; R += np.roll(music, 220)
# master: quiet during the black time-jump card, fade out at the end
master = np.ones(N); jb = (tt_all > 65.1) & (tt_all < 66.6); master[jb] = 0.35
master *= np.clip(1 - (tt_all - 74.0) / 0.95, 0, 1)
L *= master; R *= master
mx = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9; L /= mx / 0.9; R /= mx / 0.9
data = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(OUT, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('wrote', OUT, f'{DUR:.0f}s')
