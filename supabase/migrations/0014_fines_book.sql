-- ============================================================
--  Give every charge a book to point at.
--
--  A fine could only name a book through its loan, so a charge raised by hand
--  had nowhere to record one — "Rs 20, late" with no way to tell which book it
--  was for. Loans also disappear when a book is deleted, taking the reference
--  with them.
--
--  fines.book_id records it directly. The loan still carries the dates; this
--  carries the subject.
-- ============================================================

alter table public.fines
  add column if not exists book_id uuid references public.books(id) on delete set null;

create index if not exists fines_book_idx on public.fines (book_id);

-- anything already linked through a loan can be filled in from it
update public.fines f
   set book_id = l.book_id
  from public.loans l
 where f.loan_id = l.id
   and f.book_id is null;

-- ---------- the automatic late fee now records the book ----------
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
    insert into fines (student_id, loan_id, book_id, amount, reason, note)
      values (v_student, p_loan_id, v_book, v_amount, 'late', v_days || ' day(s) late');
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

-- ---------- so does the write-off charge ----------
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

    update loans set returned_at = now() where id = p_loan_id;
  else
    v_on_loan := public.book_copies_on_loan(p_book_id);
    if v_total - v_on_loan < 1 then
      raise exception 'Every copy is on loan — write it off from the circulation list instead';
    end if;
  end if;

  update books set total_copies = v_total - 1 where id = p_book_id;

  if p_charge > 0 and v_student is not null then
    insert into fines (student_id, loan_id, book_id, amount, reason, note)
      values (v_student, p_loan_id, p_book_id, p_charge, p_reason,
              coalesce(p_note, initcap(p_reason) || ' book — replacement charge'))
      returning id into v_fine_id;
  end if;

  insert into write_offs (book_id, loan_id, student_id, fine_id, reason, note, charge)
    values (p_book_id, p_loan_id, v_student, v_fine_id, p_reason, p_note,
            case when v_student is null then 0 else p_charge end)
    returning id into v_id;

  return v_id;
end $$;

grant execute on function public.return_loan(uuid, numeric) to authenticated;
grant execute on function public.write_off_copy(uuid, uuid, text, text, numeric) to authenticated;
