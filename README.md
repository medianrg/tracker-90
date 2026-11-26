# Tracker 90

Tracker personal pentru planul de 90 de zile (30 noiembrie 2026 – 28 februarie 2027). Îl instalezi pe iPhone ca aplicație și îți urmărește rutina, victoria zilei, pașii, greutatea, brandul și sprinturile. Îți trimite 3 notificări pe zi: rutina dimineața, mersul la prânz și bifatul seara.

- `public/` conține aplicația: o pagină, manifestul, service worker-ul și iconițele.
- `api/` conține funcțiile Vercel: login, date, pași, abonare la notificări și mementouri.
- `lib/core.js` e codul comun. Toate secretele vin din variabilele de mediu, nimic nu e scris în cod.

## Instalare

### 1. Importul în Vercel
În Vercel: Add New → Project, alegi repository-ul `tracker-90` și apeși Deploy. Nu schimbi nimic la setări: Vercel servește `public/` și transformă singur fișierele din `api/` în funcții.

### 2. Baza de date
În proiect, la **Storage**, adaugi **Upstash for Redis** pe planul **Free** și îl conectezi la proiect. Vercel adaugă singur variabilele de conectare.

### 3. Variabilele de mediu
La Settings → Environment Variables pui variabilele de mai jos. Valorile nu le trimiți nicăieri, nici măcar în chat.

| Variabilă | Ce pui |
|---|---|
| `APP_PASSWORD` | parola ta pentru aplicație (lungă) |
| `VAPID_PUBLIC_KEY` | cheia publică, din comanda de mai jos |
| `VAPID_PRIVATE_KEY` | cheia privată, din comanda de mai jos |
| `STEPS_TOKEN` | un cod lung, inventat, pentru automatizarea cu pași |
| `CRON_SECRET` | un cod lung, inventat, pentru mementouri |

Cheile pentru notificări le generezi pe calculatorul tău:

```
npx web-push generate-vapid-keys
```

Pentru cele două coduri lungi:

```
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Rulezi a doua comandă de două ori, câte o dată pentru fiecare cod. Apoi, la Deployments, dai **Redeploy** la ultimul deploy, ca să intre variabilele în vigoare.

### 4. Pe iPhone
1. Deschizi adresa aplicației (`https://…vercel.app`) în **Safari**.
2. Share → **Add to Home Screen**.
3. Deschizi **Tracker 90** de pe iconiță și te loghezi cu parola.
4. La tab-ul **Plan** → Notificări, apeși **Pornește notificările** și accepți.
5. Apeși **Trimite o notificare de test**.

### 5. Pașii automat din Health (Shortcuts)
În aplicația Shortcuts: Automation → **+** → Time of Day → **21:30**, Daily → **Run Immediately** → Next → New Blank Automation. Apoi adaugi acțiunile:

1. **Find Health Samples**: Type is **Steps**, Start Date is **Today**.
2. **Calculate Statistics**: **Sum** of Health Samples.
3. **Get Contents of URL**:
   - URL: `https://ADRESA-TA.vercel.app/api/steps`
   - Method: **POST**
   - Headers: `Authorization` = `Bearer ` urmat de valoarea din `STEPS_TOKEN`
   - Request Body: **JSON**, cheia `steps` (Number) = rezultatul de la Calculate Statistics

Testezi apăsând pe automatizare și apoi pe butonul de rulare. În aplicație, la Pași, apare „Din Health”.

Dacă în Health intră pași și din iPhone, și din brățară, suma îi poate număra de două ori. Atunci, la Find Health Samples, adaugi filtrul **Source is** și alegi o singură sursă.

### 6. (Opțional) Notificări la oră fixă
Pe Vercel gratuit, cron-urile din `vercel.json` pornesc oricând în ora respectivă: dimineața între 7 și 8, la prânz între 12 și 13, seara între 21 și 22. Orele sunt calculate pentru ora de iarnă a României.

Pentru ore exacte:
1. Faci un cont gratuit pe cron-job.org și 3 joburi, în fusul orar Europe/Bucharest:
   - `https://ADRESA-TA.vercel.app/api/remind?slot=morning` la 07:00
   - `…?slot=lunch` la 12:30
   - `…?slot=evening` la 21:30
2. La fiecare job pui header-ul `Authorization: Bearer ` urmat de valoarea din `CRON_SECRET`.
3. În Vercel adaugi `DISABLE_VERCEL_CRON` = `1`, ca să nu primești notificările de două ori.

## Test local
```
npm install
npm run check   # verificările logicii de pe server
npm run dev     # http://localhost:8790, parola locală: test, bază de date în memorie
```
