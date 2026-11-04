#!/usr/bin/env node
// Renders src/index.html frame by frame in headless Chromium and encodes a 1080x1920 MP4 with sound.
//
//   node scripts/render.mjs                          -> output/what-if-underwater.mp4
//   node scripts/render.mjs --workers 3              render segments in parallel, then join
//   node scripts/render.mjs --from 13 --to 21 --out output/clip.mp4 --no-audio
//   node scripts/render.mjs --stills 3,15,36         -> output/stills/*.png
//   node scripts/render.mjs --src projects/my-video --out output/my-video.mp4 --workers 3
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const SRC = resolve(ROOT, args.src || 'src');      // project folder (index.html, cues.json, ...)
const FPS = Number(args.fps || 30);
const OUT = resolve(ROOT, args.out || 'output/what-if-underwater.mp4');
const WORKERS = Number(args.workers || 1);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const p = join(SRC, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(SRC)) throw new Error('bad path');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render=1`;
const DURATION = JSON.parse(await readFile(join(SRC, 'cues.json'), 'utf8')).duration;

async function openPage() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(0);
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  await page.evaluate(() => window.warmup());
  const clip = { x: 0, y: 0, width: 1080, height: 1920 };
  return {
    browser,
    async frame(t, type = 'jpeg') {
      await page.evaluate((tt) => window.renderAt(tt), t);
      return page.screenshot({ clip, type, timeout: 0, ...(type === 'jpeg' ? { quality: 94 } : {}) });
    },
  };
}

// render frames [i0, i1) of the timeline into a silent mp4
async function renderSegment(i0, i1, file, tag) {
  const p = await openPage();
  const enc = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = i0; i < i1; i++) {
    const buf = await p.frame(i / FPS);
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if ((i - i0) % (FPS * 2) === 0) {
      const done = i - i0 + 1, el = (Date.now() - t0) / 1000;
      console.log(`[${tag}] frame ${done}/${i1 - i0}  t=${(i / FPS).toFixed(1)}s  eta ${((el / done) * (i1 - i - 1) / 60).toFixed(1)} min`);
    }
  }
  enc.stdin.end(); await new Promise((r) => enc.on('close', r));
  await p.browser.close();
}

if (args.stills) {
  const dir = resolve(ROOT, args.dir || 'output/stills'); await mkdir(dir, { recursive: true });
  const p = await openPage();
  for (const s of String(args.stills).split(',')) { const t = Number(s); await writeFile(join(dir, `t${t.toFixed(1).padStart(5, '0')}.png`), await p.frame(t, 'png')); console.log('still', t); }
  await p.browser.close();
} else {
  const from = Number(args.from || 0), to = Math.min(Number(args.to || DURATION), DURATION);
  const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
  const tmp = join(dirname(OUT), '.segments'); await mkdir(tmp, { recursive: true });
  const per = Math.ceil((f1 - f0) / WORKERS), segs = [];
  for (let w = 0; w < WORKERS; w++) { const a = f0 + w * per, b = Math.min(f1, a + per); if (a < b) segs.push({ a, b, file: join(tmp, `seg${w}.mp4`) }); }
  await Promise.all(segs.map((s, w) => renderSegment(s.a, s.b, s.file, `w${w}`)));
  await writeFile(join(tmp, 'list.txt'), segs.map((s) => `file '${s.file}'`).join('\n'));
  const video = join(tmp, 'video.mp4');
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', video], { stdio: 'inherit' });
  const audio = join(dirname(OUT), 'audio.wav');
  const audioScript = existsSync(join(SRC, 'audio.py')) ? join(SRC, 'audio.py') : join(ROOT, 'scripts', 'audio.py');
  if (!args['no-audio']) spawnSync('python3', [audioScript, join(SRC, 'cues.json'), audio], { stdio: 'inherit' });
  if (!args['no-audio'] && existsSync(audio)) {
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-ss', String(from), '-t', String(to - from), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  } else {
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  }
  await rm(tmp, { recursive: true, force: true });
  console.log('wrote', OUT);
}
server.close();
