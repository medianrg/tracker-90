import { send, readJson, isAuthed, saveSubscription, sendToAll } from '../lib/core.js';

// POST {subscription} -> salvează telefonul pentru notificări.
// POST {test: true} -> trimite o notificare de test.
export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: 'Nu ești logat.' });
  if (req.method !== 'POST') return send(res, 405, { error: 'Metodă nepermisă.' });
  const body = await readJson(req);
  if (body?.test) {
    const r = await sendToAll({ title: 'Test reușit', body: 'Notificările merg. Primul memento vine dimineață.', tag: 'test' });
    return send(res, r.error ? 500 : 200, r);
  }
  const sub = body?.subscription;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
    return send(res, 400, { error: 'Abonare invalidă.' });
  }
  await saveSubscription({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return send(res, 200, { ok: true });
}
