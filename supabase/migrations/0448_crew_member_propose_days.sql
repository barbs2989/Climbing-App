-- 0448 — ANY CREW MEMBER CAN PUT A DAY FORWARD (owner 2026-11-14: "I think anyone should be able to
-- propose days to climb in the calendar right?"). Until now only the organiser could: crews has one
-- UPDATE policy, "organizer can update own crew" (0036), so a member's proposal matched zero rows and the
-- card hid the calendar from them ("The organizer puts days forward; you pick the ones you can make").
--
-- Owner's rule for taking a day back: whoever proposed it, or the organiser.
--
-- So members do not get UPDATE on crews (that would let them rewrite the meet-up, the cap, the
-- itinerary…). Instead two SECURITY DEFINER functions touch exactly the day list:
--   crew_propose_day(crew, date)   — a confirmed member or the organiser; future days only, at most 10
--                                    proposed; records who proposed it, and that they can make it.
--   crew_unpropose_day(crew, date) — that day's proposer or the organiser; also drops the day's
--                                    "I can make it" rows and, if it was the locked day, the lock.
-- crews.date_proposers is { "YYYY-MM-DD": "<uuid>" }. Days proposed before this migration have no
-- entry, so only the organiser can take those back — the rule as it stood.
--
-- And the crew tables join Realtime, so a crewmate's change reaches an open Crews tab without a
-- reload (walkthrough 2026-11-14: Avery's proposed day never appeared on Blake's screen). Realtime
-- applies each table's SELECT policy, so nobody receives a crew they cannot already read.

begin;

alter table public.crews add column if not exists date_proposers jsonb not null default '{}'::jsonb;
comment on column public.crews.date_proposers is
  'Who proposed each candidate day in crews.dates: { "YYYY-MM-DD": user uuid }. Written only by crew_propose_day / crew_unpropose_day (0448).';

create or replace function public.crew_propose_day(p_crew uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_crew public.crews%rowtype;
  v_key text := to_char(p_date, 'YYYY-MM-DD');
begin
  if v_uid is null then
    raise exception 'sign in to propose a day' using errcode = '42501';
  end if;
  select * into v_crew from public.crews where id = p_crew for update;
  if not found then
    raise exception 'crew not found' using errcode = 'P0002';
  end if;
  if v_crew.created_by is distinct from v_uid and not exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew and m.user_id = v_uid and m.status = 'confirmed'
  ) then
    raise exception 'only the crew''s members can propose a day' using errcode = '42501';
  end if;
  if p_date is null or p_date < current_date then
    raise exception 'pick today or a later day' using errcode = '22023';
  end if;
  if coalesce(v_crew.dates, '[]'::jsonb) ? v_key then
    -- Already proposed: still say the caller can make it, nothing else changes.
    insert into public.crew_day_acks (crew_id, user_id, date) values (p_crew, v_uid, p_date)
      on conflict do nothing;
    return;
  end if;
  if jsonb_array_length(coalesce(v_crew.dates, '[]'::jsonb)) >= 10 then
    raise exception 'a crew can have at most 10 proposed days — take one back first' using errcode = '22023';
  end if;
  update public.crews
     set dates = (select coalesce(jsonb_agg(d order by d), '[]'::jsonb)
                    from (select jsonb_array_elements_text(coalesce(v_crew.dates, '[]'::jsonb)) as d
                          union select v_key) s),
         date_proposers = coalesce(date_proposers, '{}'::jsonb) || jsonb_build_object(v_key, v_uid::text)
   where id = p_crew;
  -- Putting a day forward says you can make it.
  insert into public.crew_day_acks (crew_id, user_id, date) values (p_crew, v_uid, p_date)
    on conflict do nothing;
end;
$$;

create or replace function public.crew_unpropose_day(p_crew uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_crew public.crews%rowtype;
  v_key text := to_char(p_date, 'YYYY-MM-DD');
begin
  if v_uid is null then
    raise exception 'sign in to change the crew''s days' using errcode = '42501';
  end if;
  select * into v_crew from public.crews where id = p_crew for update;
  if not found then
    raise exception 'crew not found' using errcode = 'P0002';
  end if;
  if v_crew.created_by is distinct from v_uid
     and coalesce(v_crew.date_proposers ->> v_key, '') <> v_uid::text then
    raise exception 'only the climber who proposed this day, or the organiser, can take it back' using errcode = '42501';
  end if;
  -- The proposer may have left the crew since; a non-member proposer cannot act on it any more.
  if v_crew.created_by is distinct from v_uid and not exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew and m.user_id = v_uid and m.status = 'confirmed'
  ) then
    raise exception 'only the crew''s members can change its days' using errcode = '42501';
  end if;
  update public.crews
     set dates = (select coalesce(jsonb_agg(d order by d), '[]'::jsonb)
                    from jsonb_array_elements_text(coalesce(v_crew.dates, '[]'::jsonb)) as d
                   where d <> v_key),
         date_proposers = coalesce(date_proposers, '{}'::jsonb) - v_key,
         agreed_date = case when agreed_date = v_key then null else agreed_date end,
         date_forced = case when agreed_date = v_key then false else date_forced end
   where id = p_crew;
  delete from public.crew_day_acks where crew_id = p_crew and date = p_date;
end;
$$;

revoke all on function public.crew_propose_day(uuid, date) from public, anon;
revoke all on function public.crew_unpropose_day(uuid, date) from public, anon;
grant execute on function public.crew_propose_day(uuid, date) to authenticated;
grant execute on function public.crew_unpropose_day(uuid, date) to authenticated;

-- Realtime for the crew tables (see the header). Guarded so a re-run, or a table already added by
-- hand in the dashboard, is not an error.
do $$
declare t text;
begin
  foreach t in array array['crews', 'crew_members', 'crew_day_acks'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
