-- ============================================================
--  M2 · Students — student records, photo storage, RLS
-- ============================================================

create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  roll_no     text unique,
  class_dept  text,
  email       text,
  phone       text,
  photo_url   text,
  status      text not null default 'active' check (status in ('active', 'blocked')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists students_created_idx on public.students (created_at desc);
create index if not exists students_search_idx on public.students
  using gin (to_tsvector('simple',
    coalesce(name,'') || ' ' || coalesce(roll_no,'') || ' ' || coalesce(email,'')));

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

alter table public.students enable row level security;

drop policy if exists "students_authenticated_all" on public.students;
create policy "students_authenticated_all" on public.students
  for all to authenticated using (true) with check (true);

-- ---------- student photo storage ----------
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

drop policy if exists "student_photos_read"   on storage.objects;
drop policy if exists "student_photos_insert" on storage.objects;
drop policy if exists "student_photos_update" on storage.objects;
drop policy if exists "student_photos_delete" on storage.objects;

create policy "student_photos_read" on storage.objects
  for select using (bucket_id = 'student-photos');
create policy "student_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'student-photos');
create policy "student_photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'student-photos');
create policy "student_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'student-photos');
