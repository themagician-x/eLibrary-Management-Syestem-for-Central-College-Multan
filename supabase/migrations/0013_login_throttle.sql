-- ============================================================
--  Progressive lockout after repeated wrong passwords.
--
--  Three free attempts, then each further failure locks the account for
--  longer: 30s, 1m, 2m, 5m, 15m, 30m, capped at 1 hour. State lives in the
--  database, not the browser, so clearing cookies or switching tabs doesn't
--  reset it. A successful sign-in clears the record.
--
--  Callable by anon: the login form has to ask "am I locked out?" before the
--  user is authenticated. Both functions take only an email and return only a
--  lock state, so they leak nothing about whether an account exists.
-- ============================================================

create table if not exists public.login_attempts (
  email        text primary key,
  fails        int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.login_attempts enable row level security;
-- no policies: only the SECURITY DEFINER functions below may touch it

-- 0-indexed past the 3 free attempts: 1st lock 30s, then 1m, 2m, 5m, 15m, 30m, 1h
create or replace function public.lockout_seconds(p_step int)
returns int language sql immutable as $$
  select (array[30, 60, 120, 300, 900, 1800, 3600])[least(greatest(p_step, 1), 7)]
$$;

-- how long this email must wait; 0 when it may try now
create or replace function public.login_wait(p_email text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  select locked_until into v_until
    from login_attempts where email = lower(trim(p_email));
  if v_until is null or v_until <= now() then return 0; end if;
  return ceil(extract(epoch from (v_until - now())))::int;
end $$;

-- record the outcome of an attempt; returns the seconds now locked out (0 if free)
create or replace function public.login_record(p_email text, p_ok boolean)
returns int
language plpgsql security definer set search_path = public as $$
declare v_key text := lower(trim(p_email)); v_fails int; v_wait int;
begin
  if p_ok then
    delete from login_attempts where email = v_key;
    return 0;
  end if;

  insert into login_attempts (email, fails, updated_at)
       values (v_key, 1, now())
  on conflict (email) do update
       set fails = login_attempts.fails + 1, updated_at = now()
    returning fails into v_fails;

  if v_fails <= 3 then
    return 0;                          -- still inside the free attempts
  end if;

  v_wait := public.lockout_seconds(v_fails - 3);
  update login_attempts
     set locked_until = now() + make_interval(secs => v_wait)
   where email = v_key;
  return v_wait;
end $$;

revoke all on function public.login_wait(text)           from public;
revoke all on function public.login_record(text, boolean) from public;
grant execute on function public.login_wait(text)            to anon, authenticated;
grant execute on function public.login_record(text, boolean) to anon, authenticated;
