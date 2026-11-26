import { send, readJson, isAuthed, allDocs, setDoc, DOC_ID, todayLocal, vapid } from '../lib/core.js';

// GET -> toate datele. POST {id, value} -> salvează un document (value: null îl șterge).
export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Nu ești logat.' });
  if (req.method === 'GET') {
    const docs = await allDocs();
    return send(res, 200, { docs, today: todayLocal(), vapidPublicKey: vapid()?.publicKey || null });
  }
  if (req.method === 'POST') {
    const body = await readJson(req);
    const id = String(body?.id || '');
    if (!DOC_ID.test(id)) return send(res, 400, { error: 'Document necunoscut.' });
    const value = body.value === undefined ? null : body.value;
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) return send(res, 400, { error: 'Format greșit.' });
    if (value !== null && JSON.stringify(value).length > 50000) return send(res, 413, { error: 'Prea mare.' });
    await setDoc(id, value);
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Metodă nepermisă.' });
}
