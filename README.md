# MBP Origination Engine

Automated outbound borrower origination for Max Benjamin Partners. Sends up to **120 new emails + 80 follow-ups per weekday**, spread automatically across **9:00 AM – 3:00 PM PT**, tracks replies in Gmail, and maintains a borrower database with a **day 3 / 7 / 14 / monthly** follow-up cadence.

## How it works

1. **Import** — Export contact lists from CoStar or Elementix as CSV and upload on the Import page. Duplicates are skipped automatically.
2. **Queue** — Every weekday at 8:30 AM PT, a cron job builds the day's queue: up to 120 borrowers who've never been emailed + up to 80 whose follow-up is due. Send times are spread across the 6-hour window with jitter.
3. **Send** — A cron job runs every 5 minutes during the window and sends due emails through your Gmail account via the Gmail API. Follow-ups send as replies in the same thread.
4. **Track** — An hourly cron checks tracked Gmail threads. When a borrower replies, they're marked RESPONDED and all pending follow-ups are cancelled.
5. **Cadence** — Initial → day 3 → day 7 → day 14 → every 30 days, until they respond, unsubscribe, or you mark them Dead/Client.

## Deploy to Railway (one-time, ~20 minutes)

Everything — app, Postgres, and the email scheduler — runs in a single Railway project.

### 1. Create the Railway project
1. Push this folder to a GitHub repo.
2. At [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo** → pick the repo.
3. In the same project: **+ New → Database → PostgreSQL**.
4. On the app service → Settings → Networking → **Generate Domain**. Note the URL (e.g. `https://mbp-origination.up.railway.app`).

### 2. Google OAuth credentials
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project.
2. Enable the **Gmail API** (APIs & Services → Library).
3. APIs & Services → OAuth consent screen → External → add yourself as a test user.
4. Credentials → Create Credentials → OAuth client ID → **Web application**.
5. Add authorized redirect URI: `https://YOUR-APP.up.railway.app/api/auth/google/callback`.
6. Copy the Client ID and Client Secret.

### 3. Environment variables
On the app service → Variables, add:
   - `DATABASE_URL` — set to the reference `${{Postgres.DATABASE_URL}}`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from Google Cloud
   - `APP_URL` — your Railway domain, e.g. `https://mbp-origination.up.railway.app`
   - `CRON_SECRET` — any long random string
   - `DASHBOARD_PASSWORD` — password to protect the dashboard

Redeploy after setting variables. Tables and starter templates are created automatically on deploy (`railway.json` pre-deploy command).

### 4. Connect Gmail
Open the app → click **Connect Gmail** → authorize with the MBP account that will send.

### 5. Go live
Import your first CSV, review the templates, and check Settings. Sending starts the next weekday morning.

## ⚠️ Deliverability — read this

You're sending cold email from your **primary domain**. To avoid landing in spam and damaging your domain reputation:

- **Keep Ramp-up mode ON** (default). It starts at ~40 emails/day and adds 20/week until you reach 200. Going straight to 200/day from a cold start **will** get you flagged.
- Verify **SPF, DKIM, and DMARC** are configured for your domain (Google Workspace Admin → check at [mxtoolbox.com](https://mxtoolbox.com)).
- Watch your reply and bounce rates on the dashboard. If bounces spike, pause and clean the list.
- Strongly consider moving volume to a secondary domain (e.g. `mbpcapital.co`) once you validate the system.
- CAN-SPAM: every email includes an unsubscribe link and unsubscribes are honored automatically. Your templates should include a physical mailing address — add it to your templates' signature.

## Scheduler

The schedule runs inside the app itself (`server.js`, via node-cron) — no external cron service needed. All times are **America/Los_Angeles**, so daylight saving is handled automatically: queue builds 8:30 AM PT weekdays, sends run every 5 min 9 AM–3:55 PM PT weekdays, replies checked hourly. The Railway service stays on 24/7, which is what keeps the scheduler alive.

## CSV format

The importer auto-maps common headers: First Name, Last Name, Email, Company/Owner, Phone, Property Address, Property Type, Loan Amount, Notes. A single "Name" column is split automatically. Only rows with a valid email import.

## Local development

```bash
npm install
cp .env.example .env   # fill in values
npx prisma db push
node prisma/seed.js
npm run dev
```
