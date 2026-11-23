-- 0483 — A CREW MEMBER'S ORDER OF DAYS REACHES THE CREW (owner 2026-11-19: "We should add 3rd, 4th,
-- 5th, etc back up days for proposing a day to climb on crews").
--
-- A crew can already hold 10 proposed days (0448), and the Day sheet let a climber call one of them
-- their 1st choice and one a Backup. That order never left the phone: crew_day_acks held (crew, user,
-- date) and nothing else, so a reload dropped it and no crewmate ever saw it. And each rank could sit
-- on one day only, so with four days on the table a climber could order two of them.
--
-- crew_day_acks.rank is the place of that day in THAT member's own order: 1 = first choice, 2 = backup,
-- 3 = second backup, and so on. It is an ORDER, not a score, so the app reads positions from it (the
-- lowest rank a member holds is their first choice) and a gap left by taking a day back means nothing.
--
--   * A new "I can make it" row with no rank goes to the end of the member's order (trigger), so every
--     path that says "I can make it" — the row insert, crew_propose_day — gets a place. A member who
--     still has rows from before this migration (no rank) is left unranked until they order their days
--     themselves: nobody is given a first choice they did not pick.
--   * crew_rank_day(crew, date, place) moves one day to a place in the caller's order and renumbers the
--     rest 1..n in one statement, creating the "I can make it" row when there is none.
--
-- Agreement is unchanged: a day is agreed when every confirmed member can make it. The order only
-- decides between several days everyone can make.

begin;

alter table public.crew_day_acks add column if not exists rank smallint;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'crew_day_acks_rank_positive' and conrelid = 'public.crew_day_acks'::regclass) then
    alter table public.crew_day_acks add constraint crew_day_acks_rank_positive check (rank is null or rank >= 1);
  end if;
end $$;

comment on column public.crew_day_acks.rank is
  'The place of this day in this member''s own order of the crew''s proposed days: 1 = first choice, 2 = backup, 3 = second backup… Null = never ordered. Set by the insert trigger and crew_rank_day (0483).';

create or replace function public.crew_day_acks_default_rank()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.rank is null and not exists (
    select 1 from public.crew_day_acks a
    where a.crew_id = new.crew_id and a.user_id = new.user_id and a.rank is null
  ) then
    select least(coalesce(max(a.rank), 0) + 1, 32767) into new.rank
      from public.crew_day_acks a
     where a.crew_id = new.crew_id and a.user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.crew_day_acks_default_rank() from public, anon, authenticated;

drop trigger if exists crew_day_acks_default_rank on public.crew_day_acks;
create trigger crew_day_acks_default_rank
  before insert on public.crew_day_acks
  for each row execute function public.crew_day_acks_default_rank();

create or replace function public.crew_rank_day(p_crew uuid, p_date date, p_rank integer)
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
    raise exception 'sign in to order the crew''s days' using errcode = '42501';
  end if;
  select * into v_crew from public.crews where id = p_crew;
  if not found then
    raise exception 'crew not found' using errcode = 'P0002';
  end if;
  if v_crew.created_by is distinct from v_uid and not exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew and m.user_id = v_uid and m.status = 'confirmed'
  ) then
    raise exception 'only the crew''s members can order its days' using errcode = '42501';
  end if;
  if p_date is null or not (coalesce(v_crew.dates, '[]'::jsonb) ? v_key) then
    raise exception 'that day is not one of the crew''s proposed days' using errcode = '22023';
  end if;
  if p_rank is null or p_rank < 1 or p_rank > 10 then
    raise exception 'a day''s place is between 1 and 10' using errcode = '22023';
  end if;

  -- Ordering a day says you can make it.
  insert into public.crew_day_acks (crew_id, user_id, date) values (p_crew, v_uid, p_date)
    on conflict do nothing;

  -- The caller's other days keep their order (unranked ones after the ranked, by date); this day is
  -- put at p_rank, or at the end when p_rank is past it, and everything is renumbered 1..n.
  with ordered as (
    select a.date, row_number() over (order by a.rank nulls last, a.date) as pos
      from public.crew_day_acks a
     where a.crew_id = p_crew and a.user_id = v_uid and a.date <> p_date
  ), cnt as (
    select count(*)::int as n from ordered
  ), placed as (
    select o.date, case when o.pos >= least(p_rank, c.n + 1) then o.pos + 1 else o.pos end as r
      from ordered o cross join cnt c
    union all
    select p_date, least(p_rank, c.n + 1) from cnt c
  )
  update public.crew_day_acks a
     set rank = p.r::smallint
    from placed p
   where a.crew_id = p_crew and a.user_id = v_uid and a.date = p.date;
end;
$$;

revoke all on function public.crew_rank_day(uuid, date, integer) from public, anon;
grant execute on function public.crew_rank_day(uuid, date, integer) to authenticated;

commit;
