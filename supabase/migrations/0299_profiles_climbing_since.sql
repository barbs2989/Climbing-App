-- 0299: a climber can say how long they have climbed.
--
-- The example profiles carry `years`, and four surfaces print it -- a reporter's "Advanced · 8y exp" on a route's
-- reports, the résumé's "N years climbing", the profile compare grid -- but no real profile could ever hold it: the
-- editor never asked and profiles had no column. A YEAR is stored rather than a count, so it never goes stale; the
-- client derives the years from it.
--
-- partner_signals (0295) returns it beside level and trust, so a list of reporters needs no second read. Its return
-- type changes, so it is dropped and re-created; grants are restated exactly as 0295 set them.

alter table public.profiles add column if not exists climbing_since smallint;
alter table public.profiles drop constraint if exists profiles_climbing_since_range;
alter table public.profiles add constraint profiles_climbing_since_range
  check (climbing_since is null or climbing_since between 1930 and 2100);
comment on column public.profiles.climbing_since is
  'Year the climber started climbing (self-reported). NULL = not set. Public, like level (0237).';

drop function if exists public.partner_signals(uuid[]);
create function public.partner_signals(p_ids uuid[])
returns table(id uuid, level text, trust_score integer, climbing_since smallint)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id, p.level, public.compute_trust_score(p.id), p.climbing_since
    from public.profiles p
   where p.id = any(p_ids)
   limit 200;
$$;

comment on function public.partner_signals(uuid[]) is
  'Level, server trust score and climbing-since year for each of these climbers. Signed-in only (0295, 0299).';

revoke execute on function public.partner_signals(uuid[]) from public, anon;
grant execute on function public.partner_signals(uuid[]) to authenticated;
