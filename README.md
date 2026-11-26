# Tracker 90

Tracker personal pentru planul de 90 de zile (30 noiembrie 2026 – 28 februarie 2027). Îl instalezi pe iPhone ca aplicație și îți urmărește rutina, victoria zilei, pașii, greutatea, brandul și sprinturile. Îți trimite 3 notificări pe zi: rutina dimineața, mersul la prânz și bifatul seara.

- `public/` conține aplicația: o pagină, manifestul, service worker-ul și iconițele.
- `api/` conține funcțiile Vercel: login, date, configurare, pași, abonare la notificări și mementouri.
- `lib/core.js` e codul comun.

## Cum e configurată
- **Baza de date:** Upstash for Redis (Free, Frankfurt), conectată din Vercel. Variabilele `KV_REST_API_URL` și `KV_REST_API_TOKEN` le-a adăugat integrarea.
- **Parola:** ți-o alegi la prima deschidere a aplicației, iar pe server se păstrează doar amprenta ei.
- **Cheile:** cheile pentru notificări, codul pentru pași și codul pentru mementouri le generează aplicația singură, la prima pornire, și le ține în baza de date. Nu ai nimic de pus în Environment Variables.
- **Opțional:** poți fixa valorile din Vercel, care au prioritate: `APP_PASSWORD`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `STEPS_TOKEN`, `CRON_SECRET`, `VAPID_SUBJECT`. Iar `DISABLE_VERCEL_CRON=1` oprește cron-urile Vercel dacă folosești cron-job.org.

## Pe iPhone
1. Deschizi adresa aplicației în **Safari**.
2. Share → **Add to Home Screen**.
3. Deschizi **Tracker 90** de pe iconiță. Prima dată alegi parola; după aceea doar te loghezi.
4. La **Plan** → Notificări apeși **Pornește notificările**, apoi **Trimite o notificare de test**.

## Pașii automat din Health (Shortcuts)
În aplicație, la **Plan** → Pașii din Health → **Arată adresa și codul**, găsești adresa și valoarea pentru Authorization, fiecare cu buton de copiere. Apoi, în Shortcuts: Automation → **+** → Time of Day → **21:30**, Daily → **Run Immediately** → New Blank Automation, și adaugi acțiunile:

1. **Find Health Samples**: Type is **Steps**, Start Date is **Today**.
2. **Calculate Statistics**: **Sum**.
3. **Get Contents of URL**: adresa copiată, Method **POST**, Header `Authorization` cu valoarea copiată, Request Body **JSON** cu cheia `steps` (Number) = rezultatul de la Calculate Statistics.

Dacă în Health intră pași și din iPhone, și din brățară, suma îi poate număra de două ori. Atunci, la Find Health Samples, adaugi filtrul **Source is** și alegi o singură sursă.

## Notificări la oră fixă (opțional)
Pe planul gratuit, cron-urile din `vercel.json` pornesc oricând în ora respectivă: dimineața între 7 și 8, la prânz între 12 și 13, seara între 21 și 22. Orele sunt calculate pentru ora de iarnă a României.

Pentru ore exacte:
1. În aplicație, la Plan → Pașii din Health → „Opțional: mementouri la oră fixă”, iei cele 3 adrese.
2. Pe cron-job.org pui câte un job pentru fiecare adresă, la 07:00, 12:30 și 21:30, în fusul orar Europe/Bucharest.
3. În Vercel adaugi `DISABLE_VERCEL_CRON=1`.

Oricum ai face, primești cel mult o notificare pe moment al zilei.

## Dacă uiți parola
În Upstash, pe baza de date `tracker-90-db`, la Data Browser ștergi cheia `t90:auth`. La următoarea deschidere îți alegi o parolă nouă, iar datele rămân neatinse.

## Test local
```
npm install
npm run check   # verificările logicii de pe server
npm run dev     # http://localhost:8790, bază de date în memorie
```
