-- 0523: the second review of reliability (0519/0521/0522), 2026-11-24 (owner: "review it all").
--
-- Five ways a record could be dodged or wiped, and one way it could be filed too early:
--
-- 1. LEAVING AFTER THE TRIP DODGED EVERY REPORT. 0522 stopped recording a departure after the day (so a climber who
--    went was not forced into "cancelled"), but that also made a climber who did NOT show, then left, unreportable.
--    Every departure is recorded again while the trip is reportable, and a departed crewmate can be given ANY of the
--    five answers: when they left says nothing certain about whether they came, and the old "before the day" rule
--    depended on whose time zone the day was in.
-- 2. DISBANDING AFTER THE TRIP DODGED EVERY REPORT. A deleted crew has no day to report against. A crew that had other
--    confirmed members cannot be deleted from its day until its reports close (it moves to Past crews by itself); before
--    the day it can, and deleting an ACCOUNT still deletes its crews.
-- 3. A SECOND TRIP ON ONE CREW OVERWROTE THE FIRST. Reports were one per (crew, reporter, crewmate) forever. They are
--    one per TRIP now: (crew, day, reporter, crewmate), and a trip is (crew, day) everywhere a trip is counted.
-- 4. TAKING A REPORT BACK AND FILING IT AGAIN ERASED "I WAS THERE". The reply hung off the report row, so withdraw (a
--    delete) took the dispute with it. A reply now belongs to the TRIP, the reporter and the crewmate, and records the
--    answer it disputed: it holds until the reporter files a DIFFERENT answer, which is a new claim.
-- 5. THE WINDOW OPENED BEFORE THE TRIP. 0522's day of slack let a report in on the evening before in the US. The day
--    now opens and closes by the date at UTC-12, which is never ahead of anyone's local date: a report is never early,
--    and the window closes generously.

begin;

-- ── the trip's "today": the date at UTC-12, never ahead of any climber's local date ─────────────────────────────────
create or replace function public.crew_trip_today()
returns date
language sql stable
set search_path = public, pg_temp
as $$ select ((now() at time zone 'utc') - interval '12 hours')::date $$;
revoke all on function public.crew_trip_today() from public, anon, authenticated;

-- ── 3. one report per TRIP ──────────────────────────────────────────────────────────────────────────────────────────
drop index if exists public.crew_trip_reports_one_per_mate;
drop index if exists public.crew_trip_reports_one_call_off;
create unique index crew_trip_reports_one_per_mate on public.crew_trip_reports (trip_crew, trip_date, reporter_id, about_id) where about_id is not null;
create unique index crew_trip_reports_one_call_off on public.crew_trip_reports (trip_crew, trip_date, reporter_id) where about_id is null;

-- ── 4. a reply belongs to the trip, the reporter and the crewmate, and names the answer it disputes ─────────────────
alter table public.crew_trip_replies add column if not exists trip_crew uuid;
alter table public.crew_trip_replies add column if not exists trip_date date;
alter table public.crew_trip_replies add column if not exists reporter_id uuid references public.profiles(id) on delete cascade;
alter table public.crew_trip_replies add column if not exists about_id uuid references public.profiles(id) on delete cascade;
alter table public.crew_trip_replies add column if not exists outcome text;
update public.crew_trip_replies y set trip_crew = r.trip_crew, trip_date = r.trip_date, reporter_id = r.reporter_id, about_id = r.about_id, outcome = r.outcome
  from public.crew_trip_reports r where r.id = y.report_id and y.trip_crew is null;
delete from public.crew_trip_replies where trip_crew is null;
alter table public.crew_trip_replies alter column trip_crew set not null;
alter table public.crew_trip_replies alter column trip_date set not null;
alter table public.crew_trip_replies alter column reporter_id set not null;
alter table public.crew_trip_replies alter column about_id set not null;
alter table public.crew_trip_replies alter column outcome set not null;
-- The report row may come and go (withdraw, re-file); the reply stays with the trip.
alter table public.crew_trip_replies drop constraint if exists crew_trip_replies_pkey;
alter table public.crew_trip_replies drop constraint if exists crew_trip_replies_report_id_fkey;
alter table public.crew_trip_replies alter column report_id drop not null;
alter table public.crew_trip_replies add constraint crew_trip_replies_report_id_fkey foreign key (report_id) references public.crew_trip_reports(id) on delete set null;
create unique index if not exists crew_trip_replies_one_per_report on public.crew_trip_replies (trip_crew, trip_date, reporter_id, about_id);
comment on table public.crew_trip_replies is
  'The reported climber''s answer, kept per TRIP, reporter and crewmate with the answer it disputed: was_there takes that answer out of the count until the reporter files a different one (0519, 0523).';

-- The reply that stands against a report: same trip, same people, same answer.
create or replace function public.crew_trip_reply_for(r public.crew_trip_reports)
returns public.crew_trip_replies
language sql stable security definer
set search_path = public, pg_temp
as $$
  select y.* from public.crew_trip_replies y
   where y.trip_crew = r.trip_crew and y.trip_date = r.trip_date and y.reporter_id = r.reporter_id and y.about_id = r.about_id and y.outcome = r.outcome
   limit 1;
$$;
revoke all on function public.crew_trip_reply_for(public.crew_trip_reports) from public, anon, authenticated;

-- Revealed to its subject once they filed anything for that TRIP, or 7 days after it last changed.
create or replace function public.crew_trip_report_revealed(r public.crew_trip_reports)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.updated_at < now() - interval '7 days'
      or exists (select 1 from public.crew_trip_reports m where m.trip_crew = r.trip_crew and m.trip_date = r.trip_date and m.reporter_id = r.about_id);
$$;
revoke all on function public.crew_trip_report_revealed(public.crew_trip_reports) from public, anon, authenticated;

-- ── 1. every departure while the trip is reportable ─────────────────────────────────────────────────────────────────
create or replace function public.crew_member_departed()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare d text;
begin
  -- Only a confirmed member, only by their own hand (the organizer removing someone is not that someone bailing),
  -- and only while the crew and the climber both still exist: a crew's deletion and an account's deletion cascade
  -- through crew_members too, and neither is a departure.
  if old.status is distinct from 'confirmed' or auth.uid() is distinct from old.user_id then return old; end if;
  if not exists (select 1 from public.profiles where id = old.user_id) then return old; end if;
  select c.agreed_date into d from public.crews c where c.id = old.crew_id;
  if d is null or d !~ '^\d{4}-\d{2}-\d{2}$' then return old; end if;
  -- Before the day or after it: either way the crew can still say what happened, while the trip is reportable (0523).
  if public.crew_trip_today() > d::date + 14 then return old; end if;
  insert into public.crew_departures (crew_id, user_id, agreed_date) values (old.crew_id, old.user_id, d::date)
  on conflict (crew_id, user_id) do update set left_at = excluded.left_at, agreed_date = excluded.agreed_date;
  return old;
end $$;
revoke all on function public.crew_member_departed() from public, anon, authenticated;

-- ── 2. a crew with crewmates cannot be deleted while its trip is reportable ─────────────────────────────────────────
create or replace function public.crew_keep_while_reportable()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare d date;
begin
  -- Maintenance (no signed-in caller) and an account's own deletion (its profile is already gone) are not disbanding.
  if auth.uid() is null or old.created_by is null or not exists (select 1 from public.profiles where id = old.created_by) then return old; end if;
  if old.agreed_date is null or old.agreed_date !~ '^\d{4}-\d{2}-\d{2}$' then return old; end if;
  d := old.agreed_date::date;
  if public.crew_trip_today() < d or public.crew_trip_today() > d + 14 then return old; end if;
  if not exists (select 1 from public.crew_members m where m.crew_id = old.id and m.status = 'confirmed' and m.user_id <> old.created_by)
     and not exists (select 1 from public.crew_departures x where x.crew_id = old.id) then return old; end if;
  raise exception 'This crew can be reported on until %, so it can''t be disbanded until then. It moves to Past crews by itself.', to_char(d + 14, 'Mon DD')
    using errcode = 'P0001';
end $$;
revoke all on function public.crew_keep_while_reportable() from public, anon, authenticated;
drop trigger if exists crews_keep_while_reportable on public.crews;
create trigger crews_keep_while_reportable before delete on public.crews
  for each row execute function public.crew_keep_while_reportable();

-- ── writes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.submit_trip_report(p_crew uuid, p_about uuid, p_outcome text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; rid uuid; departed boolean; t date := public.crew_trip_today();
begin
  if me is null then raise exception 'sign in to file a trip report' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null then raise exception 'this crew has no agreed day' using errcode = '22023'; end if;
  if t < d then raise exception 'the trip has not happened yet' using errcode = '22023'; end if;
  if t > d + 14 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  if not exists (select 1 from public.crew_members where crew_id = p_crew and user_id = me and status = 'confirmed') then
    raise exception 'only the crew can report on its trip' using errcode = '42501';
  end if;
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
  departed := exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_about and x.left_at >= (d - 14)::timestamptz);
  if not departed and not exists (select 1 from public.crew_members where crew_id = p_crew and user_id = p_about and status = 'confirmed') then
    raise exception 'they were not on this crew' using errcode = '42501';
  end if;
  delete from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me and about_id is null;
  select id into rid from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me and about_id = p_about;
  if rid is null then
    insert into public.crew_trip_reports (crew_id, trip_crew, reporter_id, about_id, trip_date, outcome) values (p_crew, p_crew, me, p_about, d, p_outcome)
      returning id into rid;
  else
    -- A changed answer is a new claim: hidden again until the reveal, and a dispute of the OLD answer does not cover it.
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
  if d is null or public.crew_trip_today() > d + 14 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  -- The report goes; a reply to it stays with the trip (0523), so filing the same answer again meets the same dispute.
  delete from public.crew_trip_reports where trip_crew = p_crew and trip_date = d and reporter_id = me and about_id is not distinct from p_about;
  return found;
end $$;
revoke all on function public.withdraw_trip_report(uuid, uuid) from public, anon;
grant execute on function public.withdraw_trip_report(uuid, uuid) to authenticated;

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
  insert into public.crew_trip_replies (report_id, trip_crew, trip_date, reporter_id, about_id, outcome, reply, note)
  values (r.id, r.trip_crew, r.trip_date, r.reporter_id, r.about_id, r.outcome, p_reply, n)
  on conflict (trip_crew, trip_date, reporter_id, about_id) do update set
    report_id = excluded.report_id,
    -- Answering the SAME claim: a dispute stays a dispute and a note is kept (0522). Answering a NEW claim (the reporter
    -- changed their answer): this reply replaces the old one.
    reply = case when public.crew_trip_replies.outcome = excluded.outcome and public.crew_trip_replies.reply = 'was_there' then 'was_there' else excluded.reply end,
    note = case when public.crew_trip_replies.outcome = excluded.outcome then coalesce(excluded.note, public.crew_trip_replies.note) else excluded.note end,
    outcome = excluded.outcome, created_at = now();
  return true;
end $$;
revoke all on function public.reply_to_trip_report(uuid, text, text) from public, anon;
grant execute on function public.reply_to_trip_report(uuid, text, text) to authenticated;

-- ── reads ───────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.crew_recap(p_crew uuid)
returns table(about_id uuid, departed boolean, my_outcome text, trip_date date, is_open boolean, their_reply text, their_note text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; t date := public.crew_trip_today();
begin
  if me is null or not exists (select 1 from public.crew_members where crew_id = p_crew and user_id = me and status = 'confirmed') then return; end if;
  d := public.crew_trip_day(p_crew);
  if d is null then return; end if;
  return query
    with mates as (
      select m.user_id as uid, false as gone from public.crew_members m where m.crew_id = p_crew and m.status = 'confirmed' and m.user_id <> me
      union
      select x.user_id, true from public.crew_departures x where x.crew_id = p_crew and x.user_id <> me and x.left_at >= (d - 14)::timestamptz
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

create or replace function public.my_trip_reports_about_me()
returns table(id uuid, crew_id uuid, reporter_id uuid, trip_date date, outcome text, updated_at timestamptz, reply text, note text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.id, r.trip_crew, r.reporter_id, r.trip_date, r.outcome, r.updated_at, y.reply, y.note
    from public.crew_trip_reports r
    left join lateral (select * from public.crew_trip_reply_for(r)) y on true
   where auth.uid() is not null and r.about_id = auth.uid() and public.crew_trip_report_revealed(r)
   order by r.trip_date desc, r.updated_at desc
   limit 200;
$$;
revoke all on function public.my_trip_reports_about_me() from public, anon;
grant execute on function public.my_trip_reports_about_me() to authenticated;

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
       -- disputed: the subject said "I was there" to THIS answer on this trip
       and not exists (select 1 from public.crew_trip_replies y where y.trip_crew = r.trip_crew and y.trip_date = r.trip_date
                        and y.reporter_id = r.reporter_id and y.about_id = r.about_id and y.outcome = r.outcome and y.reply = 'was_there')
       -- called off by a crewmate other than the subject, on this trip
       and not exists (select 1 from public.crew_trip_reports c where c.trip_crew = r.trip_crew and c.trip_date = r.trip_date
                        and c.about_id is null and c.reporter_id <> r.about_id)
  ),
  trip as (select distinct on (about_id, trip_crew, trip_date) about_id, outcome from rep order by about_id, trip_crew, trip_date, rank desc),
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
  'Per climber: crew trips crewmates reported on (revealed, undisputed, one outcome per trip, a trip being a crew and a day) and how many were on time / late / cancelled with notice / cancelled last minute / no-show, plus the vouch Reliability stars. Counts only: no reporter is named. Signed-in only (0519, 0523).';
revoke all on function public.reliability_of_users(uuid[]) from public, anon;
grant execute on function public.reliability_of_users(uuid[]) to authenticated;

commit;
