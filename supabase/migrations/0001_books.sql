-- ============================================================
--  M1 · Catalogue — books table, cover storage, RLS
--  Run in Supabase → SQL Editor (or via the migrate script).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- books ----------
create table if not exists public.books (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  author           text,
  isbn             text,
  publisher        text,
  published_year   smallint,
  category         text,
  language         text not null default 'English',
  description      text,
  cover_url        text,
  shelf            text,
  total_copies     smallint not null default 1 check (total_copies >= 0),
  available_copies smallint not null default 1 check (available_copies >= 0),
  barcode          text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists books_created_idx  on public.books (created_at desc);
create index if not exists books_category_idx on public.books (category);
create index if not exists books_search_idx   on public.books
  using gin (to_tsvector('simple',
    coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(isbn,'')));

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ---------- RLS (single admin: any authenticated user has full access) ----------
alter table public.books enable row level security;

drop policy if exists "books_authenticated_all" on public.books;
create policy "books_authenticated_all" on public.books
  for all to authenticated using (true) with check (true);

-- ---------- cover image storage ----------
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

drop policy if exists "book_covers_read"   on storage.objects;
drop policy if exists "book_covers_insert" on storage.objects;
drop policy if exists "book_covers_update" on storage.objects;
drop policy if exists "book_covers_delete" on storage.objects;

create policy "book_covers_read" on storage.objects
  for select using (bucket_id = 'book-covers');
create policy "book_covers_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'book-covers');
create policy "book_covers_update" on storage.objects
  for update to authenticated using (bucket_id = 'book-covers');
create policy "book_covers_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'book-covers');
