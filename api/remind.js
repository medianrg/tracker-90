import { send, query, hasToken, allDocs, todayLocal, hourLocal, weekdayLocal, reminderFor, sendToAll, markSent } from '../lib/core.js';

// Trimite mementoul potrivit orei: dimineața (rutina), la prânz (mersul), seara (bifatul).
// Pornit de cron-urile din vercel.json sau de un serviciu extern (cron-job.org) la ore exacte.
// Autorizare: cheia pentru mementouri (din aplicație, la Plan → Legături) ca ?key=... sau "Authorization: Bearer ...".
// Cron-ul Vercel e acceptat după user-agent; cel mult o notificare pe moment al zilei, deci nu se poate abuza.
export default async function handler(req, res) {
  const fromVercel = String(req.headers['user-agent'] || '').startsWith('vercel-cron');
  if (!(await hasToken(req, 'cron')) && !fromVercel) return send(res, 401, { error: 'Neautorizat.' });
  if (fromVercel && process.env.DISABLE_VERCEL_CRON === '1') return send(res, 200, { skipped: 'vercel-cron oprit' });
  const q = query(req);
  const h = hourLocal();
  const slot = ['morning', 'lunch', 'evening'].includes(q.slot) ? q.slot : h < 10 ? 'morning' : h < 17 ? 'lunch' : 'evening';
  const date = todayLocal();
  const msg = reminderFor(slot, await allDocs(), date, weekdayLocal());
  if (!msg) return send(res, 200, { skipped: 'nimic de trimis', slot, date });
  if (!(await markSent(date, slot))) return send(res, 200, { skipped: 'deja trimis azi', slot, date });
  const r = await sendToAll({ ...msg, url: '/' });
  return send(res, 200, { slot, date, ...r });
}
