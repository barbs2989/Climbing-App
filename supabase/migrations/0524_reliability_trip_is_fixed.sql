-- 0524: a TRIP is fixed once its day comes — the third review of reliability (owner 2026-11-24: "do another pass").
--
-- 0523 keyed reports by (crew, day), but the day and the roster could still move under them:
--
-- 1. THE DAY COULD BE MOVED OR CLEARED AFTER THE TRIP (crew_unpropose_day, or the organizer's own UPDATE), which both
--    closed the reports ("this crew has no agreed day") and lifted the disband guard. From the trip's day until its
--    reports close, the crew's agreed_date cannot change while anyone else was on the crew.
-- 2. "LEAVING" WAS NOT THE ONLY WAY OFF. A member could set their own status to declined, or the organizer could remove
--    every crewmate after the day, and neither left a trace. From the day on, ANY way off a crew is a departure for that
--    trip (who did it is kept), and a trip's ROSTER is its confirmed members plus its departures: anyone on it can
--    report and be reported. Before the day, the organizer removing someone is still not that someone bailing.
-- 3. DEPARTURES WERE NOT TIED TO A TRIP: one who left after trip 1 could be marked for trip 2. A departure is keyed by
--    the trip's day now, and only that trip's departures count.
-- 4. THE DISBAND GUARD STARTED LATE. It began when the date at UTC-12 reached the day — the evening of the day itself in
--    Australia. Protection (the guard and the day lock) starts on the day in the EARLIEST time zone (UTC+14); only the
--    reports' opening stays on UTC-12, so a report is never early.
-- 5. A DISPUTE COULD BE WIPED BY FLIP-FLOPPING. Replies were one row per (trip, reporter, crewmate), so answering an
--    interim answer overwrote the dispute of the first. A reply is one per ANSWER now.

begin;

-- The date in the EARLIEST time zone: the trip's day has begun somewhere once this reaches it.
create or replace function public.crew_trip_today_earliest()
returns date
language sql stable
set search_path = public, pg_temp
as $$ select ((now() at time zone 'utc') + interval '14 hours')::date $$;
revoke all on function public.crew_trip_today_earliest() from public, anon, authenticated;

-- Is the trip of day d "fixed" right now: begun somewhere, and its reports not yet closed?
create or replace function public.crew_trip_fixed(d date)
returns boolean
language sql stable
set search_path = public, pg_temp
as $$ select d is not null and public.crew_trip_today_earliest() >= d and public.crew_trip_today() <= d + 14 $$;
revoke all on function public.crew_trip_fixed(date) from public, anon, authenticated;

-- ── 3. departures belong to a trip ──────────────────────────────────────────────────────────────────────────────────
alter table public.crew_departures drop constraint if exists crew_departures_pkey;
alter table public.crew_departures add primary key (crew_id, user_id, agreed_date);
alter table public.crew_departures add column if not exists removed_by_other boolean not null default false;
comment on table public.crew_departures is
  'Someone who came off a crew for the trip of agreed_date: left, declined, or (from the day on) was removed (removed_by_other). With the confirmed members, the trip''s ROSTER. Read by definer functions only (0519, 0524).';

-- On the trip's roster: confirmed now, or came off it for THIS trip (left in the 14 days before it, or after).
create or replace function public.crew_trip_on_roster(p_crew uuid, p_user uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.crew_members where crew_id = p_crew and user_id = p_user and status = 'confirmed')
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_user and x.agreed_date = d and x.left_at >= (d - 14)::timestamptz);
$$;
revoke all on function public.crew_trip_on_roster(uuid, uuid, date) from public, anon, authenticated;

-- ── 2. every way off a crew is recorded against its trip ────────────────────────────────────────────────────────────
create or replace function public.crew_record_departure(p_crew uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare d text; me uuid := auth.uid();
begin
  -- Maintenance (no caller), and an account's or a crew's own deletion cascading through crew_members, are not departures.
  if me is null then return; end if;
  if not exists (select 1 from public.profiles where id = p_user) then return; end if;
  select c.agreed_date into d from public.crews c where c.id = p_crew;
  if d is null or d !~ '^\d{4}-\d{2}-\d{2}$' then return; end if;
  if public.crew_trip_today() > d::date + 14 then return; end if;
  -- Before the day, the organizer removing someone is not that someone bailing; from the day on, it is recorded too, so
  -- neither side can be cut out of the trip's reports.
  if me is distinct from p_user and public.crew_trip_today_earliest() < d::date then return; end if;
  insert into public.crew_departures (crew_id, user_id, agreed_date, removed_by_other) values (p_crew, p_user, d::date, me is distinct from p_user)
  on conflict (crew_id, user_id, agreed_date) do update set left_at = now(), removed_by_other = excluded.removed_by_other;
end $$;
revoke all on function public.crew_record_departure(uuid, uuid) from public, anon, authenticated;

create or replace function public.crew_member_departed()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from 'confirmed' then return old; end if;
  perform public.crew_record_departure(old.crew_id, old.user_id);
  return old;
end $$;
revoke all on function public.crew_member_departed() from public, anon, authenticated;

-- Declining or going back to pending after being confirmed is coming off the crew too.
create or replace function public.crew_member_demoted()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if old.status = 'confirmed' and new.status is distinct from 'confirmed' then perform public.crew_record_departure(old.crew_id, old.user_id); end if;
  return new;
end $$;
revoke all on function public.crew_member_demoted() from public, anon, authenticated;
drop trigger if exists crew_members_demoted on public.crew_members;
create trigger crew_members_demoted after update of status on public.crew_members
  for each row execute function public.crew_member_demoted();

-- ── 1. the day is fixed from the trip's day until its reports close ─────────────────────────────────────────────────
create or replace function public.crew_trip_has_others(p_crew uuid, p_owner uuid, d date)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id is distinct from p_owner)
      or exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.agreed_date = d and x.left_at >= (d - 14)::timestamptz);
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
  if not public.crew_trip_fixed(d) or not public.crew_trip_has_others(old.id, old.created_by, d) then return new; end if;
  raise exception 'This crew''s day has come, so it stays % until its trip reports close on %.', to_char(d, 'Mon DD'), to_char(d + 14, 'Mon DD')
    using errcode = 'P0001';
end $$;
revoke all on function public.crew_keep_day_while_reportable() from public, anon, authenticated;
drop trigger if exists crews_keep_day_while_reportable on public.crews;
create trigger crews_keep_day_while_reportable before update of agreed_date on public.crews
  for each row execute function public.crew_keep_day_while_reportable();

-- ── 4. the disband guard starts on the day in the earliest time zone, and counts THIS trip's roster ──────────────────
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
  if not public.crew_trip_fixed(d) or not public.crew_trip_has_others(old.id, old.created_by, d) then return old; end if;
  raise exception 'This crew can be reported on until %, so it can''t be disbanded until then. It moves to Past crews by itself.', to_char(d + 14, 'Mon DD')
    using errcode = 'P0001';
end $$;
revoke all on function public.crew_keep_while_reportable() from public, anon, authenticated;

-- ── 5. one reply per ANSWER ─────────────────────────────────────────────────────────────────────────────────────────
drop index if exists public.crew_trip_replies_one_per_report;
create unique index crew_trip_replies_one_per_answer on public.crew_trip_replies (trip_crew, trip_date, reporter_id, about_id, outcome);

create or replace function public.reply_to_trip_report(p_report uuid, p_reply text, p_note text)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); r public.crew_trip_reports; n text := nullif(btrim(coalesce(p_note,'')), '');
begin
  if me is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into r from public.crew_trip_reports where id = p_report;
  if r.id is null or r.about_id is distinct from me or not public.crew_trip_report_revealed(r) then
    raise exception 'there is no such report about you' using errcode = '42501';
  end if;
  if r.outcome = 'on_time' then raise exception 'there is nothing to answer in an on-time report' using errcode = '22023'; end if;
  if r.updated_at < now() - interval '37 days' then raise exception 'replies close 30 days after a report is shown to you' using errcode = '22023'; end if;
  if p_reply not in ('was_there','note') then raise exception 'unknown reply %', p_reply using errcode = '22023'; end if;
  -- One reply per answer (0524): answering another answer never touches this one, and a dispute stays a dispute.
  insert into public.crew_trip_replies (report_id, trip_crew, trip_date, reporter_id, about_id, outcome, reply, note)
  values (r.id, r.trip_crew, r.trip_date, r.reporter_id, r.about_id, r.outcome, p_reply, n)
  on conflict (trip_crew, trip_date, reporter_id, about_id, outcome) do update set
    report_id = excluded.report_id,
    reply = case when public.crew_trip_replies.reply = 'was_there' then 'was_there' else excluded.reply end,
    note = coalesce(excluded.note, public.crew_trip_replies.note), created_at = now();
  return true;
end $$;
revoke all on function public.reply_to_trip_report(uuid, text, text) from public, anon;
grant execute on function public.reply_to_trip_report(uuid, text, text) to authenticated;

-- ── the roster decides who reports and who is reported ──────────────────────────────────────────────────────────────
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
  if not public.crew_trip_on_roster(p_crew, me, d) then raise exception 'only the crew can report on its trip' using errcode = '42501'; end if;
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
  if d is null or not public.crew_trip_on_roster(p_crew, me, d) then return; end if;
  return query
    with mates as (
      select m.user_id as uid, false as gone from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id <> me
      union
      select x.user_id, true from public.crew_departures x where x.crew_id = p_crew and x.agreed_date = d and x.user_id <> me and x.left_at >= (d - 14)::timestamptz
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

commit;
