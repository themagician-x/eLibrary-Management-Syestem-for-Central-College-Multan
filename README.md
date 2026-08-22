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
- Configurable loan period with automatic fine calculation

## Roadmap

| Milestone | Ships |
|-----------|-------|
| **M0** | Foundation — Supabase wiring, admin login, app shell ✅ |
| **M1** | Catalogue — books CRUD, covers, QR/barcode, CSV import ✅ |
| **M2** | Students — profiles, borrowing history, printable library card ✅ |
| **M3** | Circulation — issue / return / renew, overdue ✅ |
| **M4** | Fines — auto late fees, pay / waive ✅ |
| **M5** | Reservations — hold queue + auto-ready on return ✅ |
| **M7** | Dashboard, reports & settings ✅ |

Since M7: lost/damaged write-offs with inventory tracking, per-action
confirmations, fine breakdowns showing how each amount was reached, a full
student record drawer, pagination, an in-app **Guide** for the librarian, and a
hardening pass (see **Security notes**).

There is **no notifications or email feature, and none is planned** — the
library works from the screen, and a book's status is read there rather than
pushed anywhere.

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
- `DATABASE_URL` — used only by `scripts/migrate.mjs`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the admin account the `scripts/` use. No
  script has a default: a missing value stops it rather than falling back to a
  password that could end up committed.
- `ALLOW_DESTRUCTIVE_TESTS` — set **only** on a disposable test project; see below.
- `NEXT_PUBLIC_SITE_URL` — the public origin, e.g. `https://library.aqeelahmed.dev`.
  Only needed behind a custom domain; without it the app uses the URL Vercel
  assigns.

`.env.local` is gitignored and must never be committed.

## Running the scripts

Every script reads its configuration from the env file, so run them with:

```bash
node --env-file=.env.local scripts/<name>.mjs
```

| Script | Does |
|---|---|
| `migrate.mjs` | Applies `supabase/migrations/*.sql` in order, tracked in a ledger table |
| `create-admin.mjs` | Creates or resets the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `seed-demo.mjs` | Wipes and reseeds demo data |
| `m*-e2e.mjs` | Milestone end-to-end suites |
| `responsive-audit.mjs` | Checks every page at 320–1536px for overflow and small tap targets |

> ⚠️ **The `m3`–`m7` suites delete every loan, fine and reservation** before they
> run. They refuse to start unless `ALLOW_DESTRUCTIVE_TESTS` matches the project
> ref in `NEXT_PUBLIC_SUPABASE_URL`. Never set that variable on production.

## Deploying

The app is a standard Next.js deployment on Vercel. Set every variable above
in **Project Settings → Environment Variables** — `.env.local` is not read in
production — and leave `ALLOW_DESTRUCTIVE_TESTS` **unset**, so a stray script
run can never wipe live loans, fines and reservations.

`robots.txt` returns `Disallow: /` and every page is served `noindex`. This is
an admin tool over student records and has no business in a search result; the
login gate is what protects it, this only keeps the deployment out of results.
The proxy deliberately lets `/robots.txt` through unauthenticated, since a
crawler redirected to `/login` would never read it.

## Security notes

- **Students have no photograph.** The field and its storage bucket were removed
  in migration `0011` — the bucket was public, so any photo was fetchable by URL
  without logging in. Records are identified by name and roll number, with an
  initials avatar.
- **Deletes are guarded in the database** (migration `0012`): a student who has
  books out or owes unpaid fines cannot be deleted, nor can a book whose copies
  are still on loan. The guard is a trigger, so it holds for the REST API and SQL
  console too, not just the UI.
- **Login backs off after repeated failures** (migration `0013`): three free
  attempts, then 30s, 1m, 2m, 5m, 15m, 30m, 1h. State is server-side, so
  clearing cookies does not reset it.
- CI runs typecheck, lint, build and `npm audit`, and fails if a Supabase key or
  a PDF is ever committed.

## Stack

Next.js 16 · Tailwind CSS v4 · Supabase (Postgres · Auth · Storage) · Vercel
