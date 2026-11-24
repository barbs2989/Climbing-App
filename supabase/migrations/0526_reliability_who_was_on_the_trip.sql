-- 0526: who was ON the trip — the fourth review of reliability (owner 2026-11-24: "fix it then review again").
--
-- 0525's roster was "confirmed now, or came off for this trip from 14 days before it", and it decided BOTH who could
-- report and who could be reported. Three holes followed:
--   * A climber who LEFT before the day could still report, including "called off", which takes the whole trip off
--     every crewmate's record.
--   * A climber who JOINED after the day (the day is locked for 14 days, so the crew still names it) counted as on it.
--   * An organizer's removal counted from the day in the EARLIEST time zone (10:00 UTC the day before), so a crewmate
--     removed the evening before the trip could be marked a no-show.
-- Two questions now, answered separately:
--   ON THE TRIP  — confirmed by the end of the day (joined_at), or came off it on or after the day began anywhere.
--                  They report, and are reported.
--   BAILED       — came off it in the 14 days before the day, by their own hand. They are reported, and do not report.
-- An organizer's removal is recorded only once the day has begun in the LATEST time zone (the trip's own start), and
-- the organizer leaving their own crew does not count as "others" for the disband guard and the day lock.
-- my_trip_recaps() lists the trips a climber was on but has since come off, so the app can still ask them.

begin;

-- The day d has begun everywhere at  d 00:00 UTC-12  = d 12:00 UTC; it began somewhere at d 00:00 UTC+14 = (d-1) 10:00 UTC.
-- It is over everywhere at (d+1) 00:00 UTC-12 = (d+1) 12:00 UTC.
create or replace function public.crew_trip_was_on(p_crew uuid, p_user uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.crew_members m where m.crew_id = p_crew and m.user_id = p_user and m.status = 'confirmed'
                   and coalesce(m.joined_at, now()) < ((d + 1)::timestamp + interval '12 hours') at time zone 'utc')
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_user and x.agreed_date = d
                   and x.left_at >= (d::timestamp - interval '14 hours') at time zone 'utc');
$$;
revoke all on function public.crew_trip_was_on(uuid, uuid, date) from public, anon, authenticated;

-- Reportable: on the trip, or bailed in the 14 days before it.
create or replace function public.crew_trip_on_roster(p_crew uuid, p_user uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.crew_trip_was_on(p_crew, p_user, d)
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_user and x.agreed_date = d
                   and x.left_at >= (d - 14)::timestamptz and not x.removed_by_other);
$$;
revoke all on function public.crew_trip_on_roster(uuid, uuid, date) from public, anon, authenticated;

-- An organizer's removal counts once the trip's day has begun in the latest time zone (crew_trip_today() >= d).
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
  if public.crew_trip_today() > d::date + 14 then return; end if;
  if me is distinct from p_user and public.crew_trip_today() < d::date then return; end if;
  insert into public.crew_departures (crew_id, user_id, agreed_date, removed_by_other) values (p_crew, p_user, d::date, me is distinct from p_user)
  on conflict (crew_id, user_id, agreed_date) do update set left_at = now(), removed_by_other = excluded.removed_by_other;
end $$;
revoke all on function public.crew_record_departure(uuid, uuid) from public, anon, authenticated;

-- The organizer is never "others" — not as a member, and not as a departure.
create or replace function public.crew_trip_has_others(p_crew uuid, p_owner uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id is distinct from p_owner)
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.agreed_date = d and x.user_id is distinct from p_owner
                   and x.left_at >= (d - 14)::timestamptz);
$$;
revoke all on function public.crew_trip_has_others(uuid, uuid, date) from public, anon, authenticated;

-- Only those ON the trip report (a climber who bailed before it cannot, "called off" included).
create or replace function public.submit_trip_report(p_crew uuid, p_about uuid, p_outcome text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; rid uuid; t date := public.crew_trip_today();
begin
  if me is null then raise exception 'sign in to file a trip report' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null then raise exception 'this crew has no agreed day' using errcode = '22023'; end if;
  if t < d then raise exception 'reports for this trip open later today' using errcode = '22023'; end if;
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

create or replace function public.crew_recap(p_crew uuid)
returns table(about_id uuid, departed boolean, my_outcome text, trip_date date, is_open boolean, their_reply text, their_note text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; t date := public.crew_trip_today();
begin
  if me is null then return; end if;
  d := public.crew_trip_day(p_crew);
  if d is null or not public.crew_trip_was_on(p_crew, me, d) then return; end if;
  return query
    with mates as (
      select m.user_id as uid, false as gone from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id <> me
        and public.crew_trip_on_roster(p_crew, m.user_id, d)
      union
      select x.user_id, true from public.crew_departures x where x.crew_id = p_crew and x.agreed_date = d and x.user_id <> me
        and public.crew_trip_on_roster(p_crew, x.user_id, d)
        and not exists (select 1 from public.crew_members m2 where m2.crew_id = p_crew and m2.user_id = x.user_id and m2.status = 'confirmed')
    )
    select mates.uid, mates.gone, r.outcome, d, (t between d and d + 14), y.reply, y.note
      from mates
      left join public.crew_trip_reports r on r.trip_crew = p_crew and r.trip_date = d and r.reporter_id = me and r.about_id = mates.uid
      left join lateral (select * from public.crew_trip_reply_for(r)) y on r.id is not null
    union all
    select null::uuid, false, r.outcome, d, (t between d and d + 14), null::text, null::text
      from public.crew_trip_reports r where r.trip_crew = p_crew and r.trip_date = d and r.reporter_id = me and r.about_id is null;
end $$;
revoke all on function public.crew_recap(uuid) from public, anon;
grant execute on function public.crew_recap(uuid) to authenticated;

-- The trips I was ON but have since come off (left, declined, or removed after the day began): the crew is no longer in
-- my crews, so the app asks me from here. Open window only.
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
     and public.crew_trip_today() between x.agreed_date and x.agreed_date + 14
     and not exists (select 1 from public.crew_members m where m.crew_id = c.id and m.user_id = auth.uid() and m.status = 'confirmed')
   order by x.agreed_date desc
   limit 50;
$$;
revoke all on function public.my_trip_recaps() from public, anon;
grant execute on function public.my_trip_recaps() to authenticated;

commit;
