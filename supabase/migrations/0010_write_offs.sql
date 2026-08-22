-- ============================================================
--  Lost & damaged — taking a copy out of the inventory
--
--  A fine on its own only settles the money; the shelf count stays wrong
--  because the copy is never coming back. A write-off is the inventory half:
--  it retires one copy (total_copies - 1), records why, and optionally raises
--  the replacement charge as a fine in the same step.
--
--  Availability stays derived (0009): retiring a copy that was on loan closes
--  the loan and drops the total, which cancel out; retiring a shelf copy drops
--  the total alone. Either way the number on the books page stays honest.
-- ============================================================

create table if not exists public.write_offs (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id)    on delete cascade,
  loan_id     uuid references public.loans(id)             on delete set null,
  student_id  uuid references public.students(id)          on delete set null,
  fine_id     uuid references public.fines(id)             on delete set null,
  reason      text not null check (reason in ('lost', 'damaged')),
  note        text,
  charge      numeric(10,2) not null default 0 check (charge >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists write_offs_book_idx    on public.write_offs (book_id);
create index if not exists write_offs_student_idx on public.write_offs (student_id);
create index if not exists write_offs_created_idx on public.write_offs (created_at desc);

alter table public.write_offs enable row level security;
drop policy if exists "write_offs_authenticated_all" on public.write_offs;
create policy "write_offs_authenticated_all" on public.write_offs
  for all to authenticated using (true) with check (true);

-- ---------- retire one copy ----------
--  p_loan_id set   → the copy is in a student's hands: close the loan, charge them
--  p_loan_id null  → a shelf copy: it must actually be on the shelf to retire it
create or replace function public.write_off_copy(
  p_book_id   uuid,
  p_loan_id   uuid    default null,
  p_reason    text    default 'lost',
  p_note      text    default null,
  p_charge    numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_on_loan int; v_student uuid; v_loan_book uuid;
  v_returned timestamptz; v_fine_id uuid; v_id uuid;
begin
  if p_reason not in ('lost', 'damaged') then
    raise exception 'Reason must be lost or damaged';
  end if;
  if p_charge < 0 then raise exception 'Charge cannot be negative'; end if;

  select total_copies into v_total from books where id = p_book_id for update;
  if v_total is null then raise exception 'Book not found'; end if;
  if v_total < 1 then raise exception 'No copies left to write off'; end if;

  if p_loan_id is not null then
    select book_id, student_id, returned_at
      into v_loan_book, v_student, v_returned
      from loans where id = p_loan_id for update;
    if v_loan_book is null then raise exception 'Loan not found'; end if;
    if v_loan_book <> p_book_id then raise exception 'That loan is for a different book'; end if;
    if v_returned is not null then raise exception 'That loan is already closed'; end if;

    -- the copy never comes back, so the loan ends here
    update loans set returned_at = now() where id = p_loan_id;
  else
    -- only retire a copy that is actually on the shelf, never one on loan
    v_on_loan := public.book_copies_on_loan(p_book_id);
    if v_total - v_on_loan < 1 then
      raise exception 'Every copy is on loan — write it off from the circulation list instead';
    end if;
  end if;

  -- one fewer copy owned (triggers from 0009 re-derive availability)
  update books set total_copies = v_total - 1 where id = p_book_id;

  if p_charge > 0 and v_student is not null then
    insert into fines (student_id, loan_id, amount, reason, note)
      values (v_student, p_loan_id, p_charge, p_reason,
              coalesce(p_note, initcap(p_reason) || ' book — replacement charge'))
      returning id into v_fine_id;
  end if;

  insert into write_offs (book_id, loan_id, student_id, fine_id, reason, note, charge)
    values (p_book_id, p_loan_id, v_student, v_fine_id, p_reason, p_note,
            case when v_student is null then 0 else p_charge end)
    returning id into v_id;

  return v_id;
end $$;

grant execute on function public.write_off_copy(uuid, uuid, text, text, numeric) to authenticated;

-- ---------- reporting ----------
create or replace view public.write_off_counts
  with (security_invoker = true) as
  select b.id,
         b.title,
         b.author,
         count(w.id)::int                                          as written_off,
         count(*) filter (where w.reason = 'lost')::int             as lost,
         count(*) filter (where w.reason = 'damaged')::int          as damaged,
         coalesce(sum(w.charge), 0)::numeric                        as charged
  from public.books b
  join public.write_offs w on w.book_id = b.id
  group by b.id, b.title, b.author;

grant select on public.write_off_counts to authenticated;
