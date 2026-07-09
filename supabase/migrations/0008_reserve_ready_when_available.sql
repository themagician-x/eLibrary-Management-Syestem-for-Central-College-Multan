-- A hold on a book that still has a free copy on the shelf should be actionable
-- immediately: flag it 'ready' for pickup instead of parking it in the waiting
-- queue (where nothing would ever promote it, since promotion only happens on a
-- return). Only queue as 'waiting' when every copy is already spoken for.

create or replace function public.reserve_book(p_book_id uuid, p_student_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare v_status text; v_pos int; v_avail int; v_ready int;
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

  select available_copies into v_avail from books where id = p_book_id;
  select count(*) into v_ready from reservations where book_id = p_book_id and status = 'ready';

  if v_avail > v_ready then
    -- an unclaimed copy is on the shelf → ready for pickup now (0 = ready, not queued)
    insert into reservations (book_id, student_id, status, ready_at)
    values (p_book_id, p_student_id, 'ready', now());
    return 0;
  end if;

  insert into reservations (book_id, student_id) values (p_book_id, p_student_id);
  select count(*) into v_pos from reservations where book_id = p_book_id and status = 'waiting';
  return v_pos;
end $$;

grant execute on function public.reserve_book(uuid, uuid) to authenticated;

-- Backfill: promote existing 'waiting' holds to 'ready' where their book still
-- has free copies, oldest first, up to the number of unclaimed copies.
with ranked as (
  select r.id,
         r.book_id,
         row_number() over (partition by r.book_id order by r.created_at) as rn
  from reservations r
  where r.status = 'waiting'
),
capacity as (
  select b.id as book_id,
         b.available_copies - coalesce((
           select count(*) from reservations r2
           where r2.book_id = b.id and r2.status = 'ready'
         ), 0) as free
  from books b
)
update reservations res
set status = 'ready', ready_at = now()
from ranked, capacity
where res.id = ranked.id
  and ranked.book_id = capacity.book_id
  and ranked.rn <= capacity.free;
