-- ============================================================
--  Availability is derived, never bookkept.
--
--  `books.available_copies` used to be maintained by hand: issue_book
--  decremented it, return_loan incremented it. Any loan row that disappeared
--  without going through return_loan (a direct delete, a cleared test fixture)
--  left the count permanently short — the shelf said 0 while a copy was
--  actually free, and nothing ever reconciled it.
--
--  Now the database owns the number: available = total - copies currently out,
--  recomputed by trigger whenever a loan or a book changes. The +1/-1 updates
--  are removed from the RPCs so nothing double-counts.
-- ============================================================

-- ---------- how many copies of a book are in students' hands ----------
create or replace function public.book_copies_on_loan(p_book_id uuid)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from loans
  where book_id = p_book_id and returned_at is null
$$;

-- ---------- books: derive availability on every write ----------
create or replace function public.books_derive_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.available_copies := greatest(0, new.total_copies - public.book_copies_on_loan(new.id));
  return new;
end $$;

drop trigger if exists books_derive_availability on public.books;
create trigger books_derive_availability
  before insert or update on public.books
  for each row execute function public.books_derive_availability();

-- ---------- loans: any change re-derives the affected book(s) ----------
create or replace function public.loans_sync_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.book_id is not null then
    update books set available_copies =
      greatest(0, total_copies - public.book_copies_on_loan(old.book_id))
      where id = old.book_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.book_id is not null then
    update books set available_copies =
      greatest(0, total_copies - public.book_copies_on_loan(new.book_id))
      where id = new.book_id;
  end if;
  return null;
end $$;

drop trigger if exists loans_sync_availability on public.loans;
create trigger loans_sync_availability
  after insert or update or delete on public.loans
  for each row execute function public.loans_sync_availability();

-- ---------- issue_book: same rules, no manual decrement ----------
create or replace function public.issue_book(
  p_book_id uuid, p_student_id uuid, p_days int default 14, p_max int default 3
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_on_loan int; v_status text; v_current int; v_loan_id uuid;
begin
  select total_copies into v_total from books where id = p_book_id for update;
  if v_total is null then raise exception 'Book not found'; end if;

  v_on_loan := public.book_copies_on_loan(p_book_id);
  if v_total - v_on_loan < 1 then raise exception 'No copies available'; end if;

  select status into v_status from students where id = p_student_id;
  if v_status is null then raise exception 'Student not found'; end if;
  if v_status = 'blocked' then raise exception 'Student is blocked'; end if;

  if exists (select 1 from loans where book_id = p_book_id and student_id = p_student_id and returned_at is null) then
    raise exception 'This book is already issued to that student';
  end if;

  select count(*) into v_current from loans where student_id = p_student_id and returned_at is null;
  if v_current >= p_max then raise exception 'Borrowing limit reached (max %)', p_max; end if;

  insert into loans (book_id, student_id, due_at)
    values (p_book_id, p_student_id, now() + make_interval(days => p_days))
    returning id into v_loan_id;

  -- fulfil any active reservation this student had for the book
  update reservations set status = 'fulfilled'
    where book_id = p_book_id and student_id = p_student_id and status in ('waiting', 'ready');

  return v_loan_id;
end $$;

-- ---------- return_loan: same rules, no manual increment ----------
create or replace function public.return_loan(p_loan_id uuid, p_fine_per_day numeric default 5)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_book uuid; v_returned timestamptz; v_due timestamptz; v_student uuid;
  v_days int; v_amount numeric := 0;
begin
  select book_id, returned_at, due_at, student_id
    into v_book, v_returned, v_due, v_student
    from loans where id = p_loan_id for update;
  if v_book is null then raise exception 'Loan not found'; end if;
  if v_returned is not null then raise exception 'Already returned'; end if;

  update loans set returned_at = now() where id = p_loan_id;

  v_days := ceil(extract(epoch from (now() - v_due)) / 86400.0);
  if v_days > 0 and p_fine_per_day > 0 then
    v_amount := v_days * p_fine_per_day;
    insert into fines (student_id, loan_id, amount, reason, note)
      values (v_student, p_loan_id, v_amount, 'late', v_days || ' day(s) late');
  end if;

  -- promote the head of the waiting queue for this book
  update reservations
    set status = 'ready', ready_at = now()
    where id = (
      select id from reservations
      where book_id = v_book and status = 'waiting'
      order by created_at asc limit 1
    );

  return v_amount;
end $$;

-- the superseded single-argument overload from 0003 would make return_loan(uuid)
-- ambiguous now that the 2-arg version defaults its second parameter
drop function if exists public.return_loan(uuid);

grant execute on function public.book_copies_on_loan(uuid) to authenticated;
grant execute on function public.issue_book(uuid, uuid, int, int) to authenticated;
grant execute on function public.return_loan(uuid, numeric) to authenticated;

-- ---------- one-off: reconcile every book that already drifted ----------
update books b
set available_copies = greatest(0, b.total_copies - public.book_copies_on_loan(b.id))
where b.available_copies is distinct from
      greatest(0, b.total_copies - public.book_copies_on_loan(b.id));
