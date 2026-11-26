import { send, readJson, authState, checkPassword, setupPassword, setSession, clearSession } from '../lib/core.js';

// POST {password}            -> intrare în cont
// POST {password, setup:true} -> prima pornire: alegi parola (doar dacă nu există deja una)
// DELETE                     -> ieșire din cont pe telefonul ăsta
export default async function handler(req, res) {
  if (req.method === 'DELETE') { clearSession(res); return send(res, 200, { ok: true }); }
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  const body = await readJson(req);
  const pw = String(body?.password || '');
  const st = await authState();
  if (st.mode === 'unset') {
    if (!body?.setup) return send(res, 409, { error: 'Alege întâi o parolă.', setup: true });
    if (pw.length < 8) return send(res, 400, { error: 'Parola trebuie să aibă cel puțin 8 caractere.', setup: true });
    if (!(await setupPassword(pw))) return send(res, 409, { error: 'Parola a fost deja aleasă. Intră cu ea.' });
    await setSession(res);
    return send(res, 200, { ok: true, created: true });
  }
  if (!(await checkPassword(pw))) {
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'Parolă greșită.' });
  }
  await setSession(res);
  return send(res, 200, { ok: true });
}
