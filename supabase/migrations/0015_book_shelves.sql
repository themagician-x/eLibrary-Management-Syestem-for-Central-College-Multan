-- ============================================================
--  Copies live on shelves, and a title is identified by its ISBN.
--
--  Two problems, one migration.
--
--  1. Nothing stopped the same book being catalogued twice. `isbn` was plain
--     text with no constraint, and while the CSV import checked for existing
--     ISBNs, the Add book form did not — so pasting a title already on the
--     shelves silently created a second record, splitting its copies and its
--     borrowing history across two rows.
--
--     ISBN is a globally unique identifier for an edition, so it is the right
--     key. It stays optional (older and locally published books genuinely have
--     none), which makes this a partial unique index over a normalised form:
--     978-0-262-03384-8 and 9780262033848 are the same book.
--
--  2. A title had exactly one shelf. A collection of twenty copies split
--     across two racks could not be recorded, because `books.shelf` held a
--     single value.
--
--     A repeating group of (shelf, copies) per book is a 1NF violation, so it
--     becomes its own relation. `books.total_copies` is then the SUM of those
--     rows and is never written independently — the same reasoning applied to
--     available_copies in 0009. A number stored in two places will eventually
--     disagree; the remedy is to remove one of the places.
-- ============================================================

-- ------------------------------------------------------------
--  1. ISBN as a real identifier
-- ------------------------------------------------------------

-- Normalised form: digits and the ISBN-10 check character X only, upper-cased.
-- Both arms are immutable, which a generated column requires.
alter table public.books
  add column if not exists isbn_key text
  generated always as (
    nullif(upper(regexp_replace(coalesce(isbn, ''), '[^0-9Xx]', '', 'g')), '')
  ) stored;

-- Fail loudly and usefully if the catalogue already contains duplicates,
-- rather than with a bare constraint violation naming no rows.
do $$
declare v_dupes text;
begin
  select string_agg(format('%s (%s copies)', isbn_key, n), ', ')
    into v_dupes
  from (
    select isbn_key, count(*) as n
    from public.books
    where isbn_key is not null
    group by isbn_key
    having count(*) > 1
  ) d;

  if v_dupes is not null then
    raise exception
      'Cannot add the unique ISBN index — these ISBNs are already catalogued more than once: %. Merge those records first.',
      v_dupes;
  end if;
end $$;

create unique index if not exists books_isbn_key_uidx
  on public.books (isbn_key)
  where isbn_key is not null;

-- ------------------------------------------------------------
--  2. Where the copies are
-- ------------------------------------------------------------

create table if not exists public.book_shelves (
  book_id  uuid     not null references public.books (id) on delete cascade,
  shelf    text     not null,
  copies   smallint not null default 1 check (copies > 0),
  primary key (book_id, shelf)
);

create index if not exists book_shelves_shelf_idx on public.book_shelves (shelf);

comment on table public.book_shelves is
  'How many copies of a title sit on each shelf. books.total_copies is the sum of these rows and is never set directly. Copies not yet placed use the shelf UNASSIGNED.';

-- Shelf codes are compared as identifiers, so normalise on the way in:
-- "cs-a1", " CS-A1 " and "CS-A1" must be one shelf, not three.
create or replace function public.book_shelves_normalise()
returns trigger language plpgsql set search_path = public as $$
begin
  new.shelf := nullif(upper(trim(new.shelf)), '');
  if new.shelf is null then new.shelf := 'UNASSIGNED'; end if;
  return new;
end $$;

drop trigger if exists book_shelves_normalise on public.book_shelves;
create trigger book_shelves_normalise
  before insert or update on public.book_shelves
  for each row execute function public.book_shelves_normalise();

-- ------------------------------------------------------------
--  3. total_copies becomes derived
-- ------------------------------------------------------------

-- NULL (not 0) when a book has no shelf rows at all, so the caller can tell
-- "nothing placed yet" from "placed, and the answer is zero".
create or replace function public.book_shelved_copies(p_book_id uuid)
returns int
language sql stable security definer set search_path = public as $$
  select sum(copies)::int from book_shelves where book_id = p_book_id
$$;

-- Replaces the 0009 version. Same job, plus: total_copies is now taken from
-- the shelf rows whenever any exist, so a direct write to books.total_copies
-- cannot put the two out of step.
create or replace function public.books_derive_availability()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.total_copies     := coalesce(public.book_shelved_copies(new.id), new.total_copies);
  new.available_copies := greatest(0, new.total_copies - public.book_copies_on_loan(new.id));
  return new;
end $$;

-- Any change to the shelves re-derives the book's total.
create or replace function public.book_shelves_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_book uuid;
begin
  v_book := coalesce(new.book_id, old.book_id);
  -- this UPDATE fires books_derive_availability, which recomputes both numbers
  update books set total_copies = coalesce(public.book_shelved_copies(v_book), 0)
    where id = v_book;
  return null;
end $$;

drop trigger if exists book_shelves_sync on public.book_shelves;
create trigger book_shelves_sync
  after insert or update or delete on public.book_shelves
  for each row execute function public.book_shelves_sync();

-- ------------------------------------------------------------
--  4. Move the existing shelves across, then drop the column
-- ------------------------------------------------------------

insert into public.book_shelves (book_id, shelf, copies)
select id,
       coalesce(nullif(upper(trim(shelf)), ''), 'UNASSIGNED'),
       total_copies
from public.books
where total_copies > 0
on conflict (book_id, shelf) do nothing;

alter table public.books drop column if exists shelf;

-- ------------------------------------------------------------
--  5. Placing and moving copies
-- ------------------------------------------------------------

-- Add copies to a shelf, creating the shelf entry if this is the first time
-- the title has been placed there. This is what the Add book form calls when
-- the librarian confirms that a scanned ISBN is already catalogued.
create or replace function public.place_copies(
  p_book_id uuid,
  p_shelf   text,
  p_copies  int
) returns int
language plpgsql security definer set search_path = public as $$
declare v_shelf text; v_total int;
begin
  if p_copies is null or p_copies < 1 then
    raise exception 'Number of copies must be at least 1';
  end if;
  if not exists (select 1 from books where id = p_book_id) then
    raise exception 'Book not found';
  end if;

  v_shelf := coalesce(nullif(upper(trim(p_shelf)), ''), 'UNASSIGNED');

  insert into book_shelves (book_id, shelf, copies)
    values (p_book_id, v_shelf, p_copies)
  on conflict (book_id, shelf)
    do update set copies = book_shelves.copies + excluded.copies;

  select total_copies into v_total from books where id = p_book_id;
  return v_total;
end $$;

-- Move copies between two shelves without changing the total.
create or replace function public.move_copies(
  p_book_id uuid,
  p_from    text,
  p_to      text,
  p_copies  int
) returns void
language plpgsql security definer set search_path = public as $$
declare v_from text; v_to text; v_have int;
begin
  v_from := coalesce(nullif(upper(trim(p_from)), ''), 'UNASSIGNED');
  v_to   := coalesce(nullif(upper(trim(p_to)),   ''), 'UNASSIGNED');
  if v_from = v_to then raise exception 'Those are the same shelf'; end if;
  if p_copies is null or p_copies < 1 then
    raise exception 'Number of copies must be at least 1';
  end if;

  select copies into v_have from book_shelves
    where book_id = p_book_id and shelf = v_from for update;
  if v_have is null then raise exception 'No copies on shelf %', v_from; end if;
  if v_have < p_copies then
    raise exception 'Only % copies on shelf %', v_have, v_from;
  end if;

  if v_have = p_copies then
    delete from book_shelves where book_id = p_book_id and shelf = v_from;
  else
    update book_shelves set copies = copies - p_copies
      where book_id = p_book_id and shelf = v_from;
  end if;

  insert into book_shelves (book_id, shelf, copies)
    values (p_book_id, v_to, p_copies)
  on conflict (book_id, shelf)
    do update set copies = book_shelves.copies + excluded.copies;
end $$;

-- ------------------------------------------------------------
--  6. Write-off now retires a copy from a named shelf
-- ------------------------------------------------------------

-- Supersedes the 0014 version. The only change in behaviour: the copy leaves a
-- specific shelf, and books.total_copies follows from that rather than being
-- decremented directly. p_shelf may be omitted, in which case the copy is taken
-- from whichever shelf holds the most — the sensible default when a librarian
-- writing off a damaged book does not record where it came from.
create or replace function public.write_off_copy(
  p_book_id   uuid,
  p_loan_id   uuid    default null,
  p_reason    text    default 'lost',
  p_note      text    default null,
  p_charge    numeric default 0,
  p_shelf     text    default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_on_loan int; v_student uuid; v_loan_book uuid;
  v_returned timestamptz; v_fine_id uuid; v_id uuid;
  v_shelf text; v_have int;
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

  -- which shelf loses the copy
  v_shelf := nullif(upper(trim(coalesce(p_shelf, ''))), '');
  if v_shelf is null then
    select shelf into v_shelf from book_shelves
      where book_id = p_book_id order by copies desc, shelf asc limit 1;
  end if;
  if v_shelf is null then raise exception 'This book has no shelved copies'; end if;

  select copies into v_have from book_shelves
    where book_id = p_book_id and shelf = v_shelf for update;
  if v_have is null then raise exception 'No copies on shelf %', v_shelf; end if;

  if v_have = 1 then
    delete from book_shelves where book_id = p_book_id and shelf = v_shelf;
  else
    update book_shelves set copies = copies - 1
      where book_id = p_book_id and shelf = v_shelf;
  end if;
  -- books.total_copies follows from the trigger on book_shelves

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

-- the 5-argument version from 0014 would now be ambiguous
drop function if exists public.write_off_copy(uuid, uuid, text, text, numeric);

-- ------------------------------------------------------------
--  7. Access
-- ------------------------------------------------------------

alter table public.book_shelves enable row level security;

drop policy if exists "book_shelves_authenticated_all" on public.book_shelves;
create policy "book_shelves_authenticated_all" on public.book_shelves
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.book_shelves to authenticated;

grant execute on function public.book_shelved_copies(uuid) to authenticated;
grant execute on function public.place_copies(uuid, text, int) to authenticated;
grant execute on function public.move_copies(uuid, text, text, int) to authenticated;
grant execute on function public.write_off_copy(uuid, uuid, text, text, numeric, text) to authenticated;

-- ------------------------------------------------------------
--  8. Reconcile anything that was already out of step
-- ------------------------------------------------------------

update public.books b
set total_copies = coalesce(public.book_shelved_copies(b.id), b.total_copies);
