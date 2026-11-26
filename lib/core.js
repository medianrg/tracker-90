// Cod comun pentru funcțiile din /api: baza de date, login, date calendaristice, notificări.
// Toate cheile și parolele vin din variabilele de mediu din Vercel, niciodată din cod.
import { Redis } from '@upstash/redis';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import * as webpush from 'web-push';

export const TZ = 'Europe/Bucharest';
export const DEF_START = '2026-11-30';
export const TOTAL_DAYS = 91;
const DOCS = 't90:docs';
const SUBS = 't90:subs';
const SENT = 't90:sent';

// ---------- baza de date ----------
let client = null;
export function db() {
  if (globalThis.__T90_REDIS__) return globalThis.__T90_REDIS__; // doar pentru testele locale
  if (!client) client = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL/TOKEN sau KV_REST_API_URL/TOKEN
  return client;
}
const decode = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v;
};
export async function allDocs() {
  const raw = (await db().hgetall(DOCS)) || {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) { const d = decode(v); if (d !== null) out[k] = d; }
  return out;
}
export async function getDoc(id) { return decode(await db().hget(DOCS, id)); }
export async function setDoc(id, value) {
  if (value === null) await db().hdel(DOCS, id);
  else await db().hset(DOCS, { [id]: JSON.stringify(value) });
}
export const DOC_ID = /^(settings|sprints|d-\d{4}-\d{2}-\d{2}|w-(-?\d{1,2})|i-\d{10,16})$/;

// ---------- cereri și răspunsuri ----------
export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
export async function readJson(req) {
  try {
    const b = req.body;
    if (b !== undefined && b !== null) {
      if (typeof b === 'string') return b ? JSON.parse(b) : {};
      if (Buffer.isBuffer(b)) return b.length ? JSON.parse(b.toString('utf8')) : {};
      return b;
    }
  } catch { return null; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString('utf8');
  if (!s) return {};
  try { return JSON.parse(s); } catch { return null; }
}
export function query(req) {
  return Object.fromEntries(new URL(req.url || '/', 'http://local').searchParams);
}
function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const sha = (s) => createHash('sha256').update(String(s)).digest();
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return timingSafeEqual(sha(a), sha(b));
}
function bearer(req) {
  const h = String(req.headers.authorization || '');
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

// ---------- login ----------
const sessionToken = () =>
  createHmac('sha256', process.env.APP_PASSWORD || '').update('tracker90-session-v1').digest('base64url');
export function isAuthed(req) {
  if (!process.env.APP_PASSWORD) return false;
  return safeEqual(cookies(req).t90 || '', sessionToken());
}
export function setSession(res) {
  res.setHeader('Set-Cookie', `t90=${sessionToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
}
export function clearSession(res) {
  res.setHeader('Set-Cookie', 't90=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}
export function checkPassword(pw) {
  return !!process.env.APP_PASSWORD && safeEqual(String(pw || ''), process.env.APP_PASSWORD);
}
// Cheia pentru automatizarea din Shortcuts (pași) și pentru cron (notificări)
export function hasToken(req, envName) {
  const expected = process.env[envName];
  if (!expected) return false;
  return safeEqual(bearer(req) || query(req).key || '', expected);
}

// ---------- date calendaristice (ora României) ----------
export function todayLocal(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function hourLocal(d = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(d));
}
export function weekdayLocal(d = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d); // "Sun", "Mon"...
}
const utc = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
export const addDays = (s, n) => new Date(utc(s) + n * 864e5).toISOString().slice(0, 10);
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// ---------- logica planului (la fel ca în aplicație) ----------
export const stepTarget = (w) => (w <= 2 ? 4000 : w <= 5 ? 5500 : w <= 9 ? 7000 : 8500);
export function planInfo(docs, date) {
  const start = isDate(docs.settings?.start) ? docs.settings.start : DEF_START;
  const day = diffDays(start, date) + 1;
  const week = Math.floor((day - 1) / 7) + 1;
  let run = 0;
  const n = Math.min(TOTAL_DAYS, day);
  for (let i = 0; i < n; i++) {
    const s = addDays(start, i);
    if (docs['d-' + s]?.winDone) run++;
    else if (s !== date) run = 0;
  }
  return { start, day, week, target: stepTarget(week), streak: run, today: docs['d-' + date] || {} };
}
export const zile = (n) => {
  const r = Math.abs(n) % 100;
  return n === 1 ? 'o zi' : n >= 20 && (r === 0 || r >= 20) ? `${n} de zile` : `${n} zile`;
};
const fmt = (n) => Math.round(n).toLocaleString('ro-RO');

// Textul notificării pentru fiecare moment al zilei. null = nu trimitem nimic.
export function reminderFor(slot, docs, date, weekday) {
  const p = planInfo(docs, date);
  if (p.day < 1 || p.day > TOTAL_DAYS) return null;
  const ego = String(docs.settings?.alterEgo || '').trim();
  const t = p.today;
  if (slot === 'morning') {
    return {
      title: `Ziua ${p.day}`,
      body: `Rutina de 10 minute: respirație, viitorul scris, victoria zilei.${ego ? ` Azi ești ${ego}.` : ''}`,
      tag: 'morning',
    };
  }
  if (slot === 'lunch') {
    if (t.walk) return null;
    return { title: 'Mers la prânz', body: `20–30 de minute acum. Ținta de azi: ${fmt(p.target)} de pași.`, tag: 'lunch' };
  }
  if (slot === 'evening') {
    const sunday = weekday === 'Sun';
    let body;
    if (t.winDone) body = `Victoria e bifată. Seria ta: ${zile(p.streak)}. Mai lasă o notă scurtă.`;
    else if (p.streak > 0) body = `Ai făcut victoria zilei? Bifeaz-o, ca să nu se rupă seria de ${zile(p.streak)}.`;
    else body = 'Bifează victoria zilei și ce ai mai făcut azi. Durează 3 minute.';
    if (sunday) body += ' E duminică: copiază rezumatul săptămânii și trimite-l în proiect.';
    return { title: sunday ? 'Bilanțul săptămânii' : 'Bifează ziua', body, tag: 'evening' };
  }
  return null;
}

// ---------- notificări ----------
export function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const subject = process.env.VAPID_SUBJECT || (host ? `https://${host}` : 'mailto:tracker90@example.com');
  return { subject, publicKey, privateKey };
}
export async function saveSubscription(sub) {
  const id = createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 32);
  await db().hset(SUBS, { [id]: JSON.stringify(sub) });
  return id;
}
export async function sendToAll(payload) {
  const v = vapid();
  if (!v) return { sent: 0, removed: 0, failed: 0, error: 'Lipsesc cheile VAPID.' };
  const raw = (await db().hgetall(SUBS)) || {};
  let sent = 0, removed = 0, failed = 0;
  for (const [id, val] of Object.entries(raw)) {
    const sub = decode(val);
    if (!sub?.endpoint) continue;
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { vapidDetails: v, TTL: 4 * 3600, urgency: 'normal' });
      sent++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { await db().hdel(SUBS, id); removed++; }
      else failed++;
    }
  }
  return { sent, removed, failed };
}
export async function markSent(date, slot) {
  const field = `${date}:${slot}`;
  if (await db().hget(SENT, field)) return false;
  await db().hset(SENT, { [field]: Date.now() });
  return true;
}
