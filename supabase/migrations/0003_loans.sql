-- ============================================================
--  M3 · Circulation — loans + atomic issue/return/renew functions
-- ============================================================

create table if not exists public.loans (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  issued_at   timestamptz not null default now(),
  due_at      timestamptz not null,
  returned_at timestamptz,
  renew_count smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists loans_open_idx    on public.loans (returned_at) where returned_at is null;
create index if not exists loans_book_idx     on public.loans (book_id);
create index if not exists loans_student_idx  on public.loans (student_id);
create index if not exists loans_due_idx      on public.loans (due_at);

alter table public.loans enable row level security;
drop policy if exists "loans_authenticated_all" on public.loans;
create policy "loans_authenticated_all" on public.loans
  for all to authenticated using (true) with check (true);

-- ---------- issue: check availability, block, limit, duplicates; decrement copies ----------
create or replace function public.issue_book(
  p_book_id uuid, p_student_id uuid, p_days int default 14, p_max int default 3
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_available int;
  v_status    text;
  v_current   int;
  v_loan_id   uuid;
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
  return v_loan_id;
end $$;

-- ---------- return: mark returned, restore a copy ----------
create or replace function public.return_loan(p_loan_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_book uuid; v_returned timestamptz;
begin
  select book_id, returned_at into v_book, v_returned from loans where id = p_loan_id for update;
  if v_book is null then raise exception 'Loan not found'; end if;
  if v_returned is not null then raise exception 'Already returned'; end if;
  update loans set returned_at = now() where id = p_loan_id;
  update books b set available_copies = least(b.total_copies, b.available_copies + 1) where b.id = v_book;
end $$;

-- ---------- renew: extend the due date ----------
create or replace function public.renew_loan(p_loan_id uuid, p_days int default 14, p_max_renews int default 2)
returns void
language plpgsql security definer set search_path = public as $$
declare v_returned timestamptz; v_renews int;
begin
  select returned_at, renew_count into v_returned, v_renews from loans where id = p_loan_id for update;
  if v_returned is not null then raise exception 'Loan already returned'; end if;
  if v_renews >= p_max_renews then raise exception 'Renewal limit reached (max %)', p_max_renews; end if;
  update loans
    set due_at = greatest(due_at, now()) + make_interval(days => p_days),
        renew_count = renew_count + 1
    where id = p_loan_id;
end $$;

grant execute on function public.issue_book(uuid, uuid, int, int) to authenticated;
grant execute on function public.return_loan(uuid) to authenticated;
grant execute on function public.renew_loan(uuid, int, int) to authenticated;
