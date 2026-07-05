# eLibrary-Management-Syestem-for-Central-College-Multan

A library management system for **Central College Multan** — a single-admin tool for
managing a physical book library: catalogue, student records, circulation, fines,
reservations, and automated email.

Built with **Next.js 16** (App Router), **Tailwind CSS v4**, and **Supabase**
(Postgres · Auth · Storage), deployed on **Vercel**.

## Scope

- **Single admin** login (no student accounts, no roles)
- **Students** are records the admin manages, not logins
- **Physical books** only (no e-books)
- 14-day loan period with automatic fine calculation

## Roadmap

| Milestone | Ships |
|-----------|-------|
| **M0** | Foundation — Supabase wiring, admin login, app shell ✅ |
| **M1** | Catalogue — books CRUD, covers, QR/barcode, CSV import |
| **M2** | Students — profiles with photo & history |
| **M3** | Circulation — issue / return / renew, overdue |
| **M4** | Fines — auto late fees, pay / waive |
| **M5** | Reservations — hold queue + notify |
| **M6** | Emails + Cron — issue / due / overdue reminders |
| **M7** | Dashboard, reports & settings |

## Getting started

```bash
npm install
cp .env.example .env.local     # then paste your Supabase keys
npm run dev                    # http://localhost:3000
```

### Environment variables

See `.env.example`. Copy it to `.env.local` and fill in your Supabase project
values from **Dashboard → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, server-only, never commit

`.env.local` is gitignored and must never be committed.

## Stack

Next.js 16 · Tailwind v4 · Supabase · Resend (email, M6) · Vercel Cron (reminders, M6)
