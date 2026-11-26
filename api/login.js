import { send, readJson, checkPassword, setSession, clearSession } from '../lib/core.js';

// POST {password} -> pune cookie-ul de sesiune. DELETE -> ieșire din cont.
export default async function handler(req, res) {
  if (req.method === 'DELETE') { clearSession(res); return send(res, 200, { ok: true }); }
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  if (!process.env.APP_PASSWORD) return send(res, 500, { error: 'Lipsește variabila APP_PASSWORD în Vercel.' });
  const body = await readJson(req);
  if (!checkPassword(body?.password)) {
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'Parolă greșită.' });
  }
  setSession(res);
  return send(res, 200, { ok: true });
}
