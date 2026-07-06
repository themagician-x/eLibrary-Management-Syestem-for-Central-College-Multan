-- ============================================================
--  M7 · Reporting views (security_invoker → base-table RLS applies)
-- ============================================================

create or replace view public.book_loan_counts
  with (security_invoker = true) as
  select b.id, b.title, b.author, b.category, count(l.id)::int as loan_count
  from public.books b
  left join public.loans l on l.book_id = b.id
  group by b.id, b.title, b.author, b.category;

create or replace view public.category_counts
  with (security_invoker = true) as
  select coalesce(nullif(trim(category), ''), 'Uncategorized') as category,
         count(*)::int as book_count
  from public.books
  group by 1;

grant select on public.book_loan_counts to authenticated;
grant select on public.category_counts  to authenticated;
