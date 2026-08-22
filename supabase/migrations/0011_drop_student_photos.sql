-- ============================================================
--  Drop student photos entirely.
--
--  The bucket was public and its read policy had no role check, so every
--  student's photograph was fetchable by anyone holding the URL. Rather than
--  gate it, the feature goes: a student record is identified well enough by
--  name and roll number, and the initials avatar already covers the visual.
--
--  Supabase forbids deleting from the storage tables in SQL, so the stored
--  images and the bucket itself are removed through the Storage API by
--  scripts/drop-student-photos.mjs — run that alongside this migration.
-- ============================================================

drop policy if exists "student_photos_read"   on storage.objects;
drop policy if exists "student_photos_insert" on storage.objects;
drop policy if exists "student_photos_update" on storage.objects;
drop policy if exists "student_photos_delete" on storage.objects;

alter table public.students drop column if exists photo_url;
