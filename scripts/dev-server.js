// Server local pentru teste: servește public/ și rulează funcțiile din api/ cu o bază de date în memorie.
// Pornire: npm run dev  ->  http://localhost:8790  (parola locală: "test")
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as webpush from 'web-push';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 8790);

class MemRedis {
  constructor() { this.h = new Map(); }
  m(k) { if (!this.h.has(k)) this.h.set(k, new Map()); return this.h.get(k); }
  async hgetall(k) { const m = this.h.get(k); return m && m.size ? Object.fromEntries(m) : null; }
  async hget(k, f) { const m = this.h.get(k); return m && m.has(f) ? m.get(f) : null; }
  async hset(k, obj) { const m = this.m(k); for (const [f, v] of Object.entries(obj)) m.set(f, v); return Object.keys(obj).length; }
  async hdel(k, ...fs) { const m = this.h.get(k); let n = 0; if (m) for (const f of fs) if (m.delete(f)) n++; return n; }
}
globalThis.__T90_REDIS__ = new MemRedis();

// Valori doar pentru testul local. În Vercel le pui tu în Environment Variables.
process.env.APP_PASSWORD ||= 'test';
process.env.STEPS_TOKEN ||= 'local-steps-token';
process.env.CRON_SECRET ||= 'local-cron-secret';
if (!process.env.VAPID_PUBLIC_KEY) {
  const k = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = k.publicKey;
  process.env.VAPID_PRIVATE_KEY = k.privateKey;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
      const mod = await import(join(root, 'api', `${name}.js`));
      return await mod.default(req, res);
    }
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = normalize(join(root, 'public', path));
    if (!file.startsWith(join(root, 'public'))) { res.statusCode = 403; return res.end(); }
    const body = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch (e) {
    res.statusCode = e.code === 'ENOENT' || e.code === 'ERR_MODULE_NOT_FOUND' ? 404 : 500;
    res.end(res.statusCode === 404 ? 'Not found' : String(e));
  }
}).listen(PORT, () => console.log(`Tracker 90 local: http://localhost:${PORT} (parola: ${process.env.APP_PASSWORD})`));
