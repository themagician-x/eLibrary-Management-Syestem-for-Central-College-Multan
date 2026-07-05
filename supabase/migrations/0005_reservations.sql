-- ============================================================
--  M5 · Reservations — hold queue, auto-ready on return, fulfil on issue
-- ============================================================

create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  status      text not null default 'waiting' check (status in ('waiting', 'ready', 'fulfilled', 'cancelled')),
  created_at  timestamptz not null default now(),
  ready_at    timestamptz
);

create index if not exists reservations_book_idx    on public.reservations (book_id);
create index if not exists reservations_student_idx on public.reservations (student_id);
create index if not exists reservations_active_idx  on public.reservations (status) where status in ('waiting', 'ready');

-- one active reservation per (book, student)
create unique index if not exists reservations_one_active
  on public.reservations (book_id, student_id) where status in ('waiting', 'ready');

alter table public.reservations enable row level security;
drop policy if exists "reservations_authenticated_all" on public.reservations;
create policy "reservations_authenticated_all" on public.reservations
  for all to authenticated using (true) with check (true);

-- ---------- reserve: validate and join the queue; return queue position ----------
create or replace function public.reserve_book(p_book_id uuid, p_student_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare v_status text; v_pos int;
begin
  if not exists (select 1 from books where id = p_book_id) then raise exception 'Book not found'; end if;
  select status into v_status from students where id = p_student_id;
  if v_status is null then raise exception 'Student not found'; end if;
  if v_status = 'blocked' then raise exception 'Student is blocked'; end if;

  if exists (select 1 from loans where book_id = p_book_id and student_id = p_student_id and returned_at is null) then
    raise exception 'That student already has this book on loan';
  end if;
  if exists (select 1 from reservations where book_id = p_book_id and student_id = p_student_id and status in ('waiting','ready')) then
    raise exception 'That student has already reserved this book';
  end if;

  insert into reservations (book_id, student_id) values (p_book_id, p_student_id);
  select count(*) into v_pos from reservations where book_id = p_book_id and status = 'waiting';
  return v_pos;
end $$;

grant execute on function public.reserve_book(uuid, uuid) to authenticated;

-- ---------- return_loan: also promote the next reservation to 'ready' ----------
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
  update books b set available_copies = least(b.total_copies, b.available_copies + 1) where b.id = v_book;

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

grant execute on function public.return_loan(uuid, numeric) to authenticated;

-- ---------- issue_book: also fulfil the student's reservation for that book ----------
create or replace function public.issue_book(
  p_book_id uuid, p_student_id uuid, p_days int default 14, p_max int default 3
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_available int; v_status text; v_current int; v_loan_id uuid;
begin
  select available_copies into v_available from books where id = p_book_id for update;
  if v_available is null then raise exception 'Book not found'; end if;
  if v_available < 1 then raise exception 'No copies available'; end if;

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

  update books set available_copies = available_copies - 1 where id = p_book_id;

  -- fulfil any active reservation this student had for the book
  update reservations set status = 'fulfilled'
    where book_id = p_book_id and student_id = p_student_id and status in ('waiting', 'ready');

  return v_loan_id;
end $$;

grant execute on function public.issue_book(uuid, uuid, int, int) to authenticated;
