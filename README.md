# eLibrary-Management-Syestem-for-Central-College-Multan

A library management system for **Central College Multan** — a single-admin tool for
managing a physical book library: catalogue, student records, circulation, fines,
reservations, dashboard and reports.

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
| **M1** | Catalogue — books CRUD, covers, QR/barcode, CSV import ✅ |
| **M2** | Students — profiles with photo & history ✅ |
| **M3** | Circulation — issue / return / renew, overdue ✅ |
| **M4** | Fines — auto late fees, pay / waive ✅ |
| **M5** | Reservations — hold queue + auto-ready on return ✅ |
| **M7** | Dashboard, reports (CSV/PDF) & settings ✅ |

### Planned

- **In-app Notifications feed** — record the messages the library would send
  (issued / due-soon / overdue / fine / hold-ready) and show them in an in-app
  feed. No external email dependency. _(Replaces the earlier email + cron idea.)_

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

Next.js 16 · Tailwind CSS v4 · Supabase (Postgres · Auth · Storage) · Vercel
