-- 0527: the trip's day is the CREW'S day — the fifth review of reliability (owner 2026-11-24: "review again").
--
-- Four rounds of fixes defined "the trip has begun" with worldwide worst cases (the date at UTC+14 for the lock, at
-- UTC-12 for the reports), and every round found a new edge in the gap between them: a bail the evening before read
-- as "on the trip" in the Americas, an organizer's removal on the day went unrecorded in Australia, the Day sheet
-- locked the evening before. The database never knew where the crew was. It does now, to the hour:
--
-- 1. A CREW'S LOCAL TIME, from the longitude of its climb, its area (or the nearest area above it with a coordinate),
--    or its meet-up pin: round(lng / 15) hours from UTC (crew_trip_offset; daylight saving is inside the hour).
--    Everything keys on the crew's own day: the report window (day to day+14), the day lock and the disband guard
--    (the same window), "on the trip" (came off on or after the day's local midnight), "bailed" (came off in the 14
--    days before it), and an organizer's removal (recorded from that midnight).
-- 2. CONFIRMED, NOT INVITED. crew_members.joined_at is stamped when the invite or request is MADE, so a climber
--    invited before the trip and accepted after it read as on it. confirmed_at is stamped when the status becomes
--    confirmed, and "on the trip" needs it before the day ended.
-- 3. "CALLED OFF" BY ONE CREWMATE WIPED EVERY OTHER RECORD for the trip — and someone on the trip who did not show
--    could file it. A trip is called off for a climber when at least half of the OTHER crewmates who filed for that
--    trip said so (and at least one did). Ties keep the benefit of the doubt.
-- 4. The disband guard and the day lock count only crewmates who were ON the trip (or bailed before it): someone who
--    joined afterwards no longer freezes a solo organizer's crew.

begin;

-- ── 2. confirmed_at ─────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.crew_members add column if not exists confirmed_at timestamptz;
update public.crew_members set confirmed_at = joined_at where status = 'confirmed' and confirmed_at is null;
comment on column public.crew_members.confirmed_at is
  'When this member''s status became confirmed (joined_at is when the invite or request was made). "On the trip" reads it (0527).';
create or replace function public.crew_member_stamp_confirmed()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then new.confirmed_at := now(); end if;
  if new.status is distinct from 'confirmed' then new.confirmed_at := null; end if;
  return new;
end $$;
revoke all on function public.crew_member_stamp_confirmed() from public, anon, authenticated;
drop trigger if exists crew_members_stamp_confirmed on public.crew_members;
create trigger crew_members_stamp_confirmed before insert or update of status on public.crew_members
  for each row execute function public.crew_member_stamp_confirmed();

-- ── 1. the crew's local time ────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.crew_trip_offset(p_crew uuid)
returns integer
language sql stable security definer
set search_path = public, pg_temp
as $$
  select greatest(-12, least(14, round(coalesce(
           (select r.lng from public.crews c join public.routes r on r.id = c.route_id where c.id = p_crew),
           (select a.lng from public.crews c join public.routes r on r.id = c.route_id join public.areas a on a.id = r.area_id where c.id = p_crew),
           (select a.lng from public.crews c join public.areas a on a.id = c.area_id where c.id = p_crew),
           (select p.lng from public.crews c
              join public.areas a on a.id = coalesce(c.area_id, (select r.area_id from public.routes r where r.id = c.route_id))
              join public.areas p on p.path @> a.path and p.lng is not null
             where c.id = p_crew order by nlevel(p.path) desc limit 1),
           (select c.meet_lng from public.crews c where c.id = p_crew),
           -105) / 15.0)))::integer;   -- no coordinate anywhere: the catalog is North American, so mountain time
$$;
revoke all on function public.crew_trip_offset(uuid) from public, anon, authenticated;

-- The crew's local date now, and the instant its day d begins (local midnight).
create or replace function public.crew_trip_local_today(p_crew uuid)
returns date
language sql stable
set search_path = public, pg_temp
as $$ select ((now() at time zone 'utc') + make_interval(hours => public.crew_trip_offset(p_crew)))::date $$;
revoke all on function public.crew_trip_local_today(uuid) from public, anon, authenticated;

create or replace function public.crew_trip_start(p_crew uuid, d date)
returns timestamptz
language sql stable
set search_path = public, pg_temp
as $$ select (d::timestamp - make_interval(hours => public.crew_trip_offset(p_crew))) at time zone 'utc' $$;
revoke all on function public.crew_trip_start(uuid, date) from public, anon, authenticated;

-- Reportable, locked and guarded: the crew's day to 14 days after, by the crew's own date.
create or replace function public.crew_trip_open(p_crew uuid, d date)
returns boolean
language sql stable
set search_path = public, pg_temp
as $$ select d is not null and public.crew_trip_local_today(p_crew) between d and d + 14 $$;
revoke all on function public.crew_trip_open(uuid, date) from public, anon, authenticated;

-- ON THE TRIP: confirmed before the day ended (crew-local), or came off on or after it began.
create or replace function public.crew_trip_was_on(p_crew uuid, p_user uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.crew_members m where m.crew_id = p_crew and m.user_id = p_user and m.status = 'confirmed'
                   and coalesce(m.confirmed_at, m.joined_at, now()) < public.crew_trip_start(p_crew, d + 1))
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_user and x.agreed_date = d
                   and x.left_at >= public.crew_trip_start(p_crew, d));
$$;
revoke all on function public.crew_trip_was_on(uuid, uuid, date) from public, anon, authenticated;

-- REPORTABLE: on the trip, or bailed by their own hand in the 14 days before it began.
create or replace function public.crew_trip_on_roster(p_crew uuid, p_user uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.crew_trip_was_on(p_crew, p_user, d)
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_user and x.agreed_date = d
                   and not x.removed_by_other
                   and x.left_at >= public.crew_trip_start(p_crew, d) - interval '14 days'
                   and x.left_at <  public.crew_trip_start(p_crew, d));
$$;
revoke all on function public.crew_trip_on_roster(uuid, uuid, date) from public, anon, authenticated;

-- Departures: your own, while the trip is reportable or before it; an organizer's removal, once the crew's day began.
create or replace function public.crew_record_departure(p_crew uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare d text; me uuid := auth.uid();
begin
  if me is null then return; end if;
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  select c.agreed_date into d from public.crews c where c.id = p_crew;
  if d is null or d !~ '^\d{4}-\d{2}-\d{2}$' then return; end if;
  if public.crew_trip_local_today(p_crew) > d::date + 14 then return; end if;
  if me is distinct from p_user and now() < public.crew_trip_start(p_crew, d::date) then return; end if;
  insert into public.crew_departures (crew_id, user_id, agreed_date, removed_by_other) values (p_crew, p_user, d::date, me is distinct from p_user)
  on conflict (crew_id, user_id, agreed_date) do update set left_at = now(), removed_by_other = excluded.removed_by_other;
end $$;
revoke all on function public.crew_record_departure(uuid, uuid) from public, anon, authenticated;

-- 4. "Others" are crewmates on this trip's roster — never the organizer, never someone who joined afterwards.
create or replace function public.crew_trip_has_others(p_crew uuid, p_owner uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id is distinct from p_owner
                   and public.crew_trip_on_roster(p_crew, m.user_id, d))
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.agreed_date = d and x.user_id is distinct from p_owner
                   and public.crew_trip_on_roster(p_crew, x.user_id, d));
$$;
revoke all on function public.crew_trip_has_others(uuid, uuid, date) from public, anon, authenticated;

create or replace function public.crew_keep_day_while_reportable()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare d date;
begin
  if auth.uid() is null or new.agreed_date is not distinct from old.agreed_date then return new; end if;
  if old.agreed_date is null or old.agreed_date !~ '^\d{4}-\d{2}-\d{2}$' then return new; end if;
  d := old.agreed_date::date;
  if not public.crew_trip_open(old.id, d) or not public.crew_trip_has_others(old.id, old.created_by, d) then return new; end if;
  raise exception 'This crew''s day has come, so it stays % until its trip reports close on %.', to_char(d, 'Mon DD'), to_char(d + 14, 'Mon DD')
    using errcode = 'P0001';
end $$;
revoke all on function public.crew_keep_day_while_reportable() from public, anon, authenticated;

create or replace function public.crew_keep_while_reportable()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare d date;
begin
  if auth.uid() is null or old.created_by is null or not exists (select 1 from public.profiles where id = old.created_by) then return old; end if;
  if old.agreed_date is null or old.agreed_date !~ '^\d{4}-\d{2}-\d{2}$' then return old; end if;
  d := old.agreed_date::date;
  if not public.crew_trip_open(old.id, d) or not public.crew_trip_has_others(old.id, old.created_by, d) then return old; end if;
  raise exception 'This crew can be reported on until %, so it can''t be disbanded until then. It moves to Past crews by itself.', to_char(d + 14, 'Mon DD')
    using errcode = 'P0001';
end $$;
revoke all on function public.crew_keep_while_reportable() from public, anon, authenticated;

-- ── writes and reads on the crew's window ───────────────────────────────────────────────────────────────────────────
create or replace function public.submit_trip_report(p_crew uuid, p_about uuid, p_outcome text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; rid uuid; t date;
begin
  if me is null then raise exception 'sign in to file a trip report' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null then raise exception 'this crew has no agreed day' using errcode = '22023'; end if;
  t := public.crew_trip_local_today(p_crew);
  if t < d then raise exception 'reports for this trip open on its day' using errcode = '22023'; end if;
  if t > d + 14 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  if not public.crew_trip_was_on(p_crew, me, d) then raise exception 'only the climbers on the trip can report on it' using errcode = '42501'; end if;
  if p_outcome = 'called_off' then
    if p_about is not null then raise exception 'calling off a trip names nobody' using errcode = '22023'; end if;
    delete from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me;
    insert into public.crew_trip_reports (crew_id, trip_crew, reporter_id, about_id, trip_date, outcome) values (p_crew, p_crew, me, null, d, 'called_off')
      returning id into rid;
    return rid;
  end if;
  if p_outcome not in ('on_time','late','cancelled_early','cancelled_late','no_show') then
    raise exception 'unknown outcome %', p_outcome using errcode = '22023';
  end if;
  if p_about is null or p_about = me then raise exception 'a report is about one crewmate' using errcode = '22023'; end if;
  if not public.crew_trip_on_roster(p_crew, p_about, d) then raise exception 'they were not on this crew' using errcode = '42501'; end if;
  delete from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me and about_id is null;
  select id into rid from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me and about_id = p_about;
  if rid is null then
    insert into public.crew_trip_reports (crew_id, trip_crew, reporter_id, about_id, trip_date, outcome) values (p_crew, p_crew, me, p_about, d, p_outcome)
      returning id into rid;
  else
    update public.crew_trip_reports set outcome = p_outcome, updated_at = now() where id = rid and outcome is distinct from p_outcome;
  end if;
  return rid;
end $$;
revoke all on function public.submit_trip_report(uuid, uuid, text) from public, anon;
grant execute on function public.submit_trip_report(uuid, uuid, text) to authenticated;

create or replace function public.withdraw_trip_report(p_crew uuid, p_about uuid)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date;
begin
  if me is null then raise exception 'sign in first' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null or public.crew_trip_local_today(p_crew) > d + 14 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  delete from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me and about_id is not distinct from p_about;
  return found;
end $$;
revoke all on function public.withdraw_trip_report(uuid, uuid) from public, anon;
grant execute on function public.withdraw_trip_report(uuid, uuid) to authenticated;

create or replace function public.crew_recap(p_crew uuid)
returns table(about_id uuid, departed boolean, my_outcome text, trip_date date, is_open boolean, their_reply text, their_note text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; o boolean;
begin
  if me is null then return; end if;
  d := public.crew_trip_day(p_crew);
  if d is null or not public.crew_trip_was_on(p_crew, me, d) then return; end if;
  o := public.crew_trip_open(p_crew, d);
  return query
    with mates as (
      select m.user_id as uid, false as gone from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id <> me
        and public.crew_trip_on_roster(p_crew, m.user_id, d)
      union
      select x.user_id, true from public.crew_departures x where x.crew_id = p_crew and x.agreed_date = d and x.user_id <> me
        and public.crew_trip_on_roster(p_crew, x.user_id, d)
        and not exists (select 1 from public.crew_members m2 where m2.crew_id = p_crew and m2.user_id = x.user_id and m2.status = 'confirmed')
    )
    select mates.uid, mates.gone, r.outcome, d, o, y.reply, y.note
      from mates
      left join public.crew_trip_reports r on r.trip_crew = p_crew and r.trip_date = d and r.reporter_id = me and r.about_id = mates.uid
      left join lateral (select * from public.crew_trip_reply_for(r)) y on r.id is not null
    union all
    select null::uuid, false, r.outcome, d, o, null::text, null::text
      from public.crew_trip_reports r where r.trip_crew = p_crew and r.trip_date = d and r.reporter_id = me and r.about_id is null;
end $$;
revoke all on function public.crew_recap(uuid) from public, anon;
grant execute on function public.crew_recap(uuid) to authenticated;

create or replace function public.my_trip_recaps()
returns table(crew_id uuid, trip_date date, place text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select c.id, x.agreed_date, coalesce(r.name, a.name)
    from public.crew_departures x
    join public.crews c on c.id = x.crew_id
    left join public.routes r on r.id = c.route_id
    left join public.areas a on a.id = c.area_id
   where auth.uid() is not null and x.user_id = auth.uid()
     and c.agreed_date = to_char(x.agreed_date, 'YYYY-MM-DD')
     and public.crew_trip_was_on(c.id, auth.uid(), x.agreed_date)
     and public.crew_trip_open(c.id, x.agreed_date)
     and not exists (select 1 from public.crew_members m where m.crew_id = c.id and m.user_id = auth.uid() and m.status = 'confirmed')
   order by x.agreed_date desc
   limit 50;
$$;
revoke all on function public.my_trip_recaps() from public, anon;
grant execute on function public.my_trip_recaps() to authenticated;

-- ── 3. called off by at least half of the OTHER crewmates who filed for the trip ─────────────────────────────────────
create or replace function public.reliability_of_users(p_ids uuid[])
returns table(id uuid, trips integer, on_time integer, late integer, cancelled_early integer, cancelled_late integer, no_show integer, rel_n integer, rel_avg numeric)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with ids as (select distinct u from unnest(p_ids[1:200]) u),
  rep as (
    select r.about_id, r.trip_crew, r.trip_date, r.outcome,
           case r.outcome when 'on_time' then 5 when 'cancelled_early' then 4 when 'late' then 3 when 'cancelled_late' then 2 else 1 end as rank
      from public.crew_trip_reports r
     where r.about_id in (select u from ids)
       and public.crew_trip_report_revealed(r)
       and not exists (select 1 from public.crew_trip_replies y where y.trip_crew = r.trip_crew and y.trip_date = r.trip_date
                        and y.reporter_id = r.reporter_id and y.about_id = r.about_id and y.outcome = r.outcome and y.reply = 'was_there')
  ),
  -- For each subject's trip: of the OTHER crewmates who filed anything for it, how many said it was called off.
  filers as (
    select s.about_id, s.trip_crew, s.trip_date,
           count(distinct f.reporter_id) filter (where f.reporter_id <> s.about_id) as n_filers,
           count(distinct f.reporter_id) filter (where f.reporter_id <> s.about_id and f.about_id is null) as n_called_off
      from (select distinct about_id, trip_crew, trip_date from rep) s
      join public.crew_trip_reports f on f.trip_crew = s.trip_crew and f.trip_date = s.trip_date
     group by s.about_id, s.trip_crew, s.trip_date
  ),
  kept as (
    select rep.* from rep join filers fl using (about_id, trip_crew, trip_date)
     where not (fl.n_called_off >= 1 and fl.n_called_off * 2 >= fl.n_filers)
  ),
  trip as (select distinct on (about_id, trip_crew, trip_date) about_id, outcome from kept order by about_id, trip_crew, trip_date, rank desc),
  stars as (
    select v.to_id, coalesce(nullif(public.try_jsonb(v.reason) #>> '{ratings,reliability}', ''), public.try_jsonb(v.reason) #>> '{ratings,punctuality}') as s
      from public.vouches v where v.to_id in (select u from ids) and v.from_id <> v.to_id
  ),
  st as (select to_id, count(*)::integer as n, round(avg(s::numeric), 2) as a from stars where s ~ '^[1-5](\.\d+)?$' group by to_id)
  select ids.u,
         coalesce((select count(*) from trip t where t.about_id = ids.u), 0)::integer,
         coalesce((select count(*) from trip t where t.about_id = ids.u and t.outcome = 'on_time'), 0)::integer,
         coalesce((select count(*) from trip t where t.about_id = ids.u and t.outcome = 'late'), 0)::integer,
         coalesce((select count(*) from trip t where t.about_id = ids.u and t.outcome = 'cancelled_early'), 0)::integer,
         coalesce((select count(*) from trip t where t.about_id = ids.u and t.outcome = 'cancelled_late'), 0)::integer,
         coalesce((select count(*) from trip t where t.about_id = ids.u and t.outcome = 'no_show'), 0)::integer,
         coalesce(st.n, 0), st.a
    from ids left join st on st.to_id = ids.u
   where exists (select 1 from public.profiles p where p.id = ids.u);
$$;
comment on function public.reliability_of_users(uuid[]) is
  'Per climber: crew trips crewmates reported on (revealed, undisputed, one outcome per trip, a trip being a crew and a day; a trip at least half the other filing crewmates called off is left out) and how many were on time / late / cancelled with notice / cancelled last minute / no-show, plus the vouch Reliability stars. Counts only: no reporter is named. Signed-in only (0519, 0523, 0527).';
revoke all on function public.reliability_of_users(uuid[]) from public, anon;
grant execute on function public.reliability_of_users(uuid[]) to authenticated;

commit;
