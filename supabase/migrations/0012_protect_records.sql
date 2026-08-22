-- ============================================================
--  Refuse deletes that would erase money owed or a book in someone's hands.
--
--  loans and fines cascade from students, and loans cascade from books, so a
--  single delete could wipe an unpaid fine and a whole borrowing history with
--  no trace. The guard lives in the database rather than the server action so
--  it holds for the REST API, SQL console and scripts too — not just the one
--  button in the UI.
-- ============================================================

create or replace function public.guard_student_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_loans int; v_owed numeric;
begin
  select count(*) into v_loans
    from loans where student_id = old.id and returned_at is null;
  if v_loans > 0 then
    raise exception
      'Cannot delete %: they still have % book(s) on loan. Return or write them off first.',
      old.name, v_loans
      using errcode = 'restrict_violation';
  end if;

  select coalesce(sum(amount), 0) into v_owed
    from fines where student_id = old.id and status = 'unpaid';
  if v_owed > 0 then
    raise exception
      'Cannot delete %: they owe Rs % in unpaid fines. Collect or waive them first.',
      old.name, trim(to_char(v_owed, 'FM999999990.00'))
      using errcode = 'restrict_violation';
  end if;

  return old;
end $$;

drop trigger if exists students_guard_delete on public.students;
create trigger students_guard_delete
  before delete on public.students
  for each row execute function public.guard_student_delete();

create or replace function public.guard_book_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_out int;
begin
  select count(*) into v_out
    from loans where book_id = old.id and returned_at is null;
  if v_out > 0 then
    raise exception
      'Cannot delete “%”: % copy(ies) are still out with students. Return or write them off first.',
      old.title, v_out
      using errcode = 'restrict_violation';
  end if;
  return old;
end $$;

drop trigger if exists books_guard_delete on public.books;
create trigger books_guard_delete
  before delete on public.books
  for each row execute function public.guard_book_delete();
