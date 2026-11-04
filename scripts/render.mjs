#!/usr/bin/env node
// Renders src/index.html frame-by-frame in headless Chromium and encodes a 1080x1920 MP4.
//
//   node scripts/render.mjs                         -> output/what-if-underwater.mp4
//   node scripts/render.mjs --fps 24 --from 6 --to 13 --out output/clip.mp4
//   node scripts/render.mjs --stills 3,10,17,25      -> output/stills/*.png
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const FPS = Number(args.fps || 30);
const OUT = resolve(ROOT, args.out || 'output/what-if-underwater.mp4');
const AUDIO = args['no-audio'] ? false : true;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const p = join(SRC, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(SRC)) throw new Error('bad path');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render=1`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate(() => window.warmup());
const DURATION = await page.evaluate(() => window.DURATION);

const clip = { x: 0, y: 0, width: 1080, height: 1920 };
async function frame(t, type = 'jpeg') {
  await page.evaluate((tt) => window.renderAt(tt), t);
  return page.screenshot({ clip, type, ...(type === 'jpeg' ? { quality: 94 } : {}) });
}

if (args.stills) {
  const dir = resolve(ROOT, args.dir || 'output/stills');
  await mkdir(dir, { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  for (const s of String(args.stills).split(',')) {
    const t = Number(s);
    await writeFile(join(dir, `t${t.toFixed(1).padStart(5, '0')}.png`), await frame(t, 'png'));
    console.log('still', t);
  }
} else {
  const from = Number(args.from || 0), to = Math.min(Number(args.to || DURATION), DURATION);
  const n = Math.round((to - from) * FPS);
  await mkdir(dirname(OUT), { recursive: true });
  const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (AUDIO) {
    // quiet underwater ambience bed: filtered brown noise with a slow swell
    ff.push('-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.5:duration=${(to - from).toFixed(2)}:seed=7,lowpass=f=420,highpass=f=40,tremolo=f=0.15:d=0.5,volume=0.55,afade=t=in:d=1,afade=t=out:st=${Math.max(0, to - from - 1.5).toFixed(2)}:d=1.5`);
  }
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart');
  if (AUDIO) ff.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  ff.push(OUT);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frame(from + i / FPS);
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % FPS === 0) {
      const el = (Date.now() - t0) / 1000, eta = (el / (i + 1)) * (n - i - 1);
      process.stdout.write(`frame ${i}/${n}  ${(from + i / FPS).toFixed(1)}s  eta ${eta.toFixed(0)}s\n`);
    }
  }
  enc.stdin.end();
  await new Promise((r) => enc.on('close', r));
  console.log('wrote', OUT);
}
await browser.close();
server.close();
