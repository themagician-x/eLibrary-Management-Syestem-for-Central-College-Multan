-- ============================================================
--  M4 · Fines — fines table + automatic late fee on return
-- ============================================================

create table if not exists public.fines (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  loan_id     uuid references public.loans(id) on delete set null,
  amount      numeric(10,2) not null check (amount >= 0),
  reason      text not null check (reason in ('late', 'lost', 'damaged')),
  status      text not null default 'unpaid' check (status in ('unpaid', 'paid', 'waived')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists fines_student_idx on public.fines (student_id);
create index if not exists fines_status_idx  on public.fines (status);
create index if not exists fines_created_idx  on public.fines (created_at desc);

drop trigger if exists fines_set_updated_at on public.fines;
create trigger fines_set_updated_at
  before update on public.fines
  for each row execute function public.set_updated_at();

alter table public.fines enable row level security;
drop policy if exists "fines_authenticated_all" on public.fines;
create policy "fines_authenticated_all" on public.fines
  for all to authenticated using (true) with check (true);

-- ---------- return_loan now auto-creates a late fine ----------
drop function if exists public.return_loan(uuid);

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

  -- late fee if returned after the due date
  v_days := ceil(extract(epoch from (now() - v_due)) / 86400.0);
  if v_days > 0 and p_fine_per_day > 0 then
    v_amount := v_days * p_fine_per_day;
    insert into fines (student_id, loan_id, amount, reason, note)
      values (v_student, p_loan_id, v_amount, 'late', v_days || ' day(s) late');
  end if;

  return v_amount; -- fine charged (0 if on time)
end $$;

grant execute on function public.return_loan(uuid, numeric) to authenticated;
