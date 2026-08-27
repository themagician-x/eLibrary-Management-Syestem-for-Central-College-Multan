-- ============================================================
--  When a fine was actually collected.
--
--  Reports can now be asked for a period — "how much was collected in
--  August" — and the fines table could not answer it. It recorded that a
--  charge is `paid`, and `updated_at`, but updated_at moves on any write:
--  editing a note, waiving, correcting an amount. Summing by it would
--  credit August with money taken in June.
--
--  paid_at records the moment the status became `paid`, and is cleared if a
--  charge is later moved back to unpaid or waived, so "collected" always means
--  money actually taken. It is maintained by a trigger rather than by the
--  action that marks a fine paid: the REST endpoint and the SQL console can
--  both change a status, and a rule in one code path would not hold for them.
-- ============================================================

alter table public.fines
  add column if not exists paid_at timestamptz;

create or replace function public.fines_track_payment()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- a charge created already settled keeps an explicit paid_at if one was given
    if new.status = 'paid' then
      new.paid_at := coalesce(new.paid_at, now());
    else
      new.paid_at := null;
    end if;
  else
    if new.status = 'paid' and old.status is distinct from 'paid' then
      new.paid_at := now();
    elsif new.status <> 'paid' then
      -- unpaid again, or waived: no money was collected
      new.paid_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists fines_track_payment on public.fines;
create trigger fines_track_payment
  before insert or update on public.fines
  for each row execute function public.fines_track_payment();

-- Charges already settled before this column existed: updated_at is the best
-- record of when the status last changed, so it is the closest available
-- answer. Approximate for those rows, exact for everything paid from now on.
update public.fines
   set paid_at = updated_at
 where status = 'paid' and paid_at is null;

create index if not exists fines_paid_at_idx on public.fines (paid_at desc)
  where paid_at is not null;

create index if not exists loans_issued_idx   on public.loans (issued_at desc);
create index if not exists loans_returned_idx on public.loans (returned_at desc)
  where returned_at is not null;

-- ------------------------------------------------------------
--  Most borrowed, within a period
-- ------------------------------------------------------------

-- The book_loan_counts view is all-time and cannot be filtered by date, and
-- PostgREST cannot group. Null bounds mean "no limit on that side", so the
-- same function answers the all-time question too.
create or replace function public.top_books_between(
  p_from  timestamptz default null,
  p_to    timestamptz default null,
  p_limit int         default 8
)
returns table (book_id uuid, title text, author text, loan_count bigint)
language sql stable security definer set search_path = public as $$
  select b.id, b.title, b.author, count(*)::bigint
  from loans l
  join books b on b.id = l.book_id
  where (p_from is null or l.issued_at >= p_from)
    and (p_to   is null or l.issued_at <  p_to)
  group by b.id, b.title, b.author
  order by count(*) desc, b.title asc
  limit greatest(1, coalesce(p_limit, 8))
$$;

grant execute on function public.top_books_between(timestamptz, timestamptz, int) to authenticated;
