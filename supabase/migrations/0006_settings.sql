-- ============================================================
--  M7 · Settings — single-row library rules
-- ============================================================

create table if not exists public.settings (
  id           smallint primary key default 1 check (id = 1),
  loan_days    smallint not null default 14 check (loan_days between 1 and 365),
  max_books    smallint not null default 3  check (max_books between 1 and 50),
  max_renews   smallint not null default 2  check (max_renews between 0 and 20),
  fine_per_day numeric(10,2) not null default 5 check (fine_per_day >= 0),
  updated_at   timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;
drop policy if exists "settings_authenticated_all" on public.settings;
create policy "settings_authenticated_all" on public.settings
  for all to authenticated using (true) with check (true);
