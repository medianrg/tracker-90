import { send, readJson, hasToken, getDoc, setDoc, todayLocal, isDate } from '../lib/core.js';

// Primește pașii din automatizarea Shortcuts de pe iPhone.
// POST, header "Authorization: Bearer <STEPS_TOKEN>", corp JSON {"steps": 5432} (opțional "date": "2026-12-01").
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Folosește POST.' });
  if (!process.env.STEPS_TOKEN) return send(res, 500, { error: 'Lipsește variabila STEPS_TOKEN în Vercel.' });
  if (!hasToken(req, 'STEPS_TOKEN')) return send(res, 401, { error: 'Cod greșit.' });
  const body = await readJson(req);
  if (!body) return send(res, 400, { error: 'Corpul cererii nu e JSON.' });
  const cleaned = String(body.steps ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const steps = Math.round(parseFloat(cleaned));
  if (!Number.isFinite(steps) || steps < 0 || steps > 200000) return send(res, 400, { error: 'Număr de pași invalid.', primit: body.steps ?? null });
  const date = isDate(body.date) ? body.date : todayLocal();
  const id = 'd-' + date;
  const cur = (await getDoc(id)) || {};
  await setDoc(id, { ...cur, date, steps, stepsSource: 'health', stepsAt: new Date().toISOString() });
  return send(res, 200, { ok: true, date, steps });
}
