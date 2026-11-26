// Verificări rapide pentru logica de pe server: npm run check
import assert from 'node:assert/strict';
import { planInfo, reminderFor, zile, todayLocal, hourLocal, addDays, diffDays, DOC_ID, stepTarget } from '../lib/core.js';

assert.match(todayLocal(), /^\d{4}-\d{2}-\d{2}$/);
assert.ok(hourLocal() >= 0 && hourLocal() <= 23);
assert.equal(addDays('2026-11-30', 31), '2026-12-31');
assert.equal(diffDays('2026-11-30', '2027-02-28'), 90);
assert.equal(zile(1), 'o zi');
assert.equal(zile(5), '5 zile');
assert.equal(zile(21), '21 de zile');
assert.equal(zile(101), '101 zile');
assert.deepEqual([1, 2, 3, 5, 6, 9, 10, 13].map(stepTarget), [4000, 4000, 5500, 5500, 7000, 7000, 8500, 8500]);

for (const ok of ['settings', 'sprints', 'd-2026-12-01', 'w-3', 'w-0', 'w--1', 'i-1764150000000']) assert.ok(DOC_ID.test(ok), ok);
for (const bad of ['d-2026-1-1', 'x', 'w-100', 'i-12', '__proto__']) assert.ok(!DOC_ID.test(bad), bad);

const docs = {
  settings: { start: '2026-11-30', alterEgo: 'Arhitectul' },
  'd-2026-11-30': { winDone: true },
  'd-2026-12-01': { winDone: true },
  'd-2026-12-02': { winDone: true, walk: true },
};
let p = planInfo(docs, '2026-12-02');
assert.equal(p.day, 3); assert.equal(p.week, 1); assert.equal(p.streak, 3); assert.equal(p.target, 4000);
p = planInfo(docs, '2026-12-03'); // azi încă nebifat: seria rămâne 3
assert.equal(p.streak, 3);
p = planInfo(docs, '2026-12-04'); // ieri ratat: seria se rupe
assert.equal(p.streak, 0);

assert.equal(reminderFor('morning', docs, '2026-11-26', 'Thu'), null); // înainte de start: nimic
assert.match(reminderFor('morning', docs, '2026-12-02', 'Wed').body, /Arhitectul/);
assert.equal(reminderFor('lunch', docs, '2026-12-02', 'Wed'), null); // mersul e deja bifat
assert.match(reminderFor('lunch', docs, '2026-12-03', 'Thu').body, /4\.000/);
assert.match(reminderFor('evening', docs, '2026-12-03', 'Thu').body, /seria de 3 zile/);
assert.match(reminderFor('evening', docs, '2026-12-06', 'Sun').title, /Bilanțul/);
assert.equal(reminderFor('morning', docs, '2027-03-05', 'Fri'), null); // după cele 91 de zile

console.log('Toate verificările au trecut.');
