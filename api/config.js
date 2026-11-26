import { send, isAuthed, secrets } from '../lib/core.js';

// GET -> adresele și codurile de care ai nevoie pe iPhone (automatizarea pentru pași, mementouri exacte).
// Doar pentru cine e logat.
export default async function handler(req, res) {
  if (!(await isAuthed(req))) return send(res, 401, { error: 'Nu ești logat.' });
  if (req.method !== 'GET') return send(res, 405, { error: 'Metodă nepermisă.' });
  const s = await secrets();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_PROJECT_PRODUCTION_URL || '');
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const base = `${proto}://${host}`;
  return send(res, 200, {
    stepsUrl: `${base}/api/steps`,
    stepsToken: s.stepsToken,
    remindUrls: ['morning', 'lunch', 'evening'].map((slot) => `${base}/api/remind?slot=${slot}&key=${s.cronKey}`),
  });
}
