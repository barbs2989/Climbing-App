-- 0272 — Trip reports are readable by EVERYONE unless the climber changes that on their profile.
--
-- The owner's rule (2026-10-08): "I want everyone to be able to read trip reports unless the user
-- changes that on their profiles."
--
--   * profiles.trip_reports_default: 'public' | 'friends' | 'private', default 'public'. The app
--     starts every new report from it (the log form's "Who can see this report" still lets one
--     report differ), and Settings offers to apply a change to the reports already written.
--   * climb_logs.trip_report_visibility used to DEFAULT to 'crew' (0037). A row written without a
--     visibility, and without a crew, was readable by nobody: "crew" with no crew_id matches no
--     policy. The column default is dropped; a BEFORE INSERT trigger fills a missing visibility from
--     the author's profile instead, so a writer that forgets the field follows the climber's choice
--     rather than hiding the report or widening it.
--
-- Existing rows are NOT rewritten. Measured 2026-10-08: two logs in the whole table, one 'public'
-- (the owner's) and one 'crew' without a crew that belongs to the CI fixture account.

alter table public.profiles
  add column if not exists trip_reports_default text not null default 'public';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_trip_reports_default_check') then
    alter table public.profiles add constraint profiles_trip_reports_default_check
      check (trip_reports_default in ('public', 'friends', 'private'));
  end if;
end $$;

alter table public.climb_logs alter column trip_report_visibility drop default;

-- Invoker, not definer: the only row it reads is the inserting climber's own profile.
create or replace function public.climb_logs_default_visibility()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.trip_report_visibility is null then
    select p.trip_reports_default into new.trip_report_visibility
      from profiles p where p.id = new.user_id;
    new.trip_report_visibility := coalesce(new.trip_report_visibility, 'public');
  end if;
  return new;
end;
$$;

drop trigger if exists climb_logs_default_visibility on public.climb_logs;
create trigger climb_logs_default_visibility
  before insert on public.climb_logs
  for each row execute function public.climb_logs_default_visibility();
