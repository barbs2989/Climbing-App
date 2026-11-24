-- 0519: RELIABILITY — did a crewmate show up, on time, or bail? Recorded by the crew, after the trip.
--
-- Owner, 2026-11-23: "reliability should be a factor. Climbers should get scored on reliability ie showing up, on
-- time, not bailing". Decisions the same day: ONE crewmate's report counts; the climber it is about can reply "I was
-- there", and a disputed report does not count; reports stay hidden from the climber they are about until that
-- climber has filed their own recap for the crew, or 7 days have passed (Airbnb's simultaneous reveal, which cut
-- retaliation). Shown as plain counts, never a score: the trust score was removed on 2026-10-21 (0335).
--
-- What already existed: a "Trip recap" sheet (ClimbMatch.jsx) with Showed / No-show per member that wrote NOTHING,
-- crews with no record of what happened after their day, and leaving a crew DELETES the crew_members row. So:
--
--   crew_departures      who LEFT a crew with an agreed day, by their own hand, so a climber who bailed by leaving
--                        stays reportable. A member the organizer removed is not a departure.
--   crew_trip_reports    one row per (crew, reporter, crewmate): on_time | late | cancelled_early | cancelled_late |
--                        no_show — or one 'called_off' row per (crew, reporter) with no crewmate: the crew turned back
--                        or did not go (weather, conditions, safety), which marks NOBODY. Turning back is never a
--                        mark against anyone. crew_id is SET NULL on a crew's deletion, so deleting a crew does not
--                        wipe a report.
--   crew_trip_replies    the reported climber's answer: 'was_there' (disputes it; it stops counting) or 'note'.
--
-- Every read and write goes through a function. The tables have RLS on and no policies, and the client roles hold no
-- table privileges: a report must never be readable row by row, or the reveal rule is decoration.

begin;

-- ── departures ────────────────────────────────────────────────────────────────────────────────────────────────────
create table public.crew_departures (
  crew_id     uuid not null references public.crews(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  left_at     timestamptz not null default now(),
  agreed_date date not null,
  primary key (crew_id, user_id)
);
alter table public.crew_departures enable row level security;
revoke all on table public.crew_departures from anon, authenticated;
comment on table public.crew_departures is
  'A confirmed member who LEFT (not was removed from) a crew that had an agreed day, so crewmates can still say they cancelled (0519). Read by definer functions only.';

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
  insert into public.crew_departures (crew_id, user_id, agreed_date) values (old.crew_id, old.user_id, d::date)
  on conflict (crew_id, user_id) do update set left_at = excluded.left_at, agreed_date = excluded.agreed_date;
  return old;
end $$;
revoke all on function public.crew_member_departed() from public, anon, authenticated;
drop trigger if exists crew_members_departed on public.crew_members;
create trigger crew_members_departed after delete on public.crew_members
  for each row execute function public.crew_member_departed();

-- Rejoining undoes a departure.
create or replace function public.crew_member_rejoined()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed' then delete from public.crew_departures where crew_id = new.crew_id and user_id = new.user_id; end if;
  return new;
end $$;
revoke all on function public.crew_member_rejoined() from public, anon, authenticated;
drop trigger if exists crew_members_rejoined on public.crew_members;
create trigger crew_members_rejoined after insert or update of status on public.crew_members
  for each row execute function public.crew_member_rejoined();

-- ── reports ───────────────────────────────────────────────────────────────────────────────────────────────────────
create table public.crew_trip_reports (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid references public.crews(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  about_id    uuid references public.profiles(id) on delete cascade,
  trip_date   date not null,
  outcome     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint crew_trip_reports_outcome check (outcome in ('on_time','late','cancelled_early','cancelled_late','no_show','called_off')),
  -- 'called_off' is about the trip, so it names nobody; every other outcome names one crewmate who is not the reporter.
  constraint crew_trip_reports_shape check ((outcome = 'called_off') = (about_id is null)),
  constraint crew_trip_reports_not_self check (about_id is null or about_id <> reporter_id)
);
create unique index crew_trip_reports_one_per_mate on public.crew_trip_reports (crew_id, reporter_id, about_id) where about_id is not null;
create unique index crew_trip_reports_one_call_off on public.crew_trip_reports (crew_id, reporter_id) where about_id is null;
create index crew_trip_reports_about on public.crew_trip_reports (about_id);
alter table public.crew_trip_reports enable row level security;
revoke all on table public.crew_trip_reports from anon, authenticated;
comment on table public.crew_trip_reports is
  'What a crewmate said happened on a crew''s day: on time, late, cancelled with notice, cancelled last minute, did not show, or the crew called it off. Read through functions only (0519).';

create table public.crew_trip_replies (
  report_id  uuid primary key references public.crew_trip_reports(id) on delete cascade,
  reply      text not null,
  note       text,
  created_at timestamptz not null default now(),
  constraint crew_trip_replies_reply check (reply in ('was_there','note')),
  constraint crew_trip_replies_note_len check (note is null or char_length(note) <= 280),
  constraint crew_trip_replies_note_needed check (reply <> 'note' or (note is not null and char_length(btrim(note)) > 0))
);
alter table public.crew_trip_replies enable row level security;
revoke all on table public.crew_trip_replies from anon, authenticated;
comment on table public.crew_trip_replies is
  'The reported climber''s answer to a trip report: was_there disputes it (it stops counting), note adds context (0519).';

-- A crew's day as a date, or null when it has none (agreed_date is text).
create or replace function public.crew_trip_day(p_crew uuid)
returns date
language sql stable security definer
set search_path = public, pg_temp
as $$
  select case when c.agreed_date ~ '^\d{4}-\d{2}-\d{2}$' then c.agreed_date::date end from public.crews c where c.id = p_crew;
$$;
revoke all on function public.crew_trip_day(uuid) from public, anon, authenticated;

-- A report is REVEALED to the climber it is about once they filed anything for that crew, or 7 days after it was
-- last changed. Until then it changes nobody's counts either, so the counts cannot leak it early.
create or replace function public.crew_trip_report_revealed(r public.crew_trip_reports)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.updated_at < now() - interval '7 days'
      or (r.crew_id is not null and exists (select 1 from public.crew_trip_reports m where m.crew_id = r.crew_id and m.reporter_id = r.about_id));
$$;
revoke all on function public.crew_trip_report_revealed(public.crew_trip_reports) from public, anon, authenticated;

-- ── writes ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- File (or change) what happened to one crewmate, or say the crew called it off (p_about null, p_outcome 'called_off').
-- Open from the crew's day to 14 days after it, to a confirmed member, about a confirmed member or one who left in
-- the 14 days before the day (leaving earlier than that is plenty of notice: nothing to report).
create or replace function public.submit_trip_report(p_crew uuid, p_about uuid, p_outcome text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date; rid uuid; departed boolean;
begin
  if me is null then raise exception 'sign in to file a trip report' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null then raise exception 'this crew has no agreed day' using errcode = '22023'; end if;
  if current_date < d then raise exception 'the trip has not happened yet' using errcode = '22023'; end if;
  if current_date > d + 14 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  if not exists (select 1 from public.crew_members where crew_id = p_crew and user_id = me and status = 'confirmed') then
    raise exception 'only the crew can report on its trip' using errcode = '42501';
  end if;
  if p_outcome = 'called_off' then
    if p_about is not null then raise exception 'calling off a trip names nobody' using errcode = '22023'; end if;
    delete from public.crew_trip_reports where crew_id = p_crew and reporter_id = me;
    insert into public.crew_trip_reports (crew_id, reporter_id, about_id, trip_date, outcome) values (p_crew, me, null, d, 'called_off')
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
  -- Someone who left the crew cancelled; they cannot also have been on time, late or a no-show.
  if departed and p_outcome not in ('cancelled_early','cancelled_late') then
    raise exception 'they left the crew: say whether they cancelled with notice or at the last minute' using errcode = '22023';
  end if;
  delete from public.crew_trip_reports where crew_id = p_crew and reporter_id = me and about_id is null;
  select id into rid from public.crew_trip_reports where crew_id = p_crew and reporter_id = me and about_id = p_about;
  if rid is null then
    insert into public.crew_trip_reports (crew_id, reporter_id, about_id, trip_date, outcome) values (p_crew, me, p_about, d, p_outcome)
      returning id into rid;
  else
    -- A changed report is a new claim: the old answer to it goes, and it is hidden again until the reveal.
    update public.crew_trip_reports set outcome = p_outcome, updated_at = now() where id = rid and outcome is distinct from p_outcome;
    if found then delete from public.crew_trip_replies where report_id = rid; end if;
  end if;
  return rid;
end $$;
revoke all on function public.submit_trip_report(uuid, uuid, text) from public, anon;
grant execute on function public.submit_trip_report(uuid, uuid, text) to authenticated;

-- Take back what you filed about one crewmate (p_about), or your "called off" (p_about null), inside the same window.
create or replace function public.withdraw_trip_report(p_crew uuid, p_about uuid)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date;
begin
  if me is null then raise exception 'sign in first' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null or current_date > d + 14 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  delete from public.crew_trip_reports where crew_id = p_crew and reporter_id = me and about_id is not distinct from p_about;
  return found;
end $$;
revoke all on function public.withdraw_trip_report(uuid, uuid) from public, anon;
grant execute on function public.withdraw_trip_report(uuid, uuid) to authenticated;

-- The reported climber's answer, to a report they can see (revealed), within 30 days of its reveal window opening.
create or replace function public.reply_to_trip_report(p_report uuid, p_reply text, p_note text)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); r public.crew_trip_reports;
begin
  if me is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into r from public.crew_trip_reports where id = p_report;
  if r.id is null or r.about_id is distinct from me or not public.crew_trip_report_revealed(r) then
    raise exception 'there is no such report about you' using errcode = '42501';
  end if;
  if r.outcome = 'on_time' then raise exception 'there is nothing to answer in an on-time report' using errcode = '22023'; end if;
  if r.updated_at < now() - interval '37 days' then raise exception 'replies close 30 days after a report is shown to you' using errcode = '22023'; end if;
  if p_reply not in ('was_there','note') then raise exception 'unknown reply %', p_reply using errcode = '22023'; end if;
  insert into public.crew_trip_replies (report_id, reply, note) values (p_report, p_reply, nullif(btrim(coalesce(p_note,'')), ''))
  on conflict (report_id) do update set reply = excluded.reply, note = excluded.note, created_at = now();
  return true;
end $$;
revoke all on function public.reply_to_trip_report(uuid, text, text) from public, anon;
grant execute on function public.reply_to_trip_report(uuid, text, text) to authenticated;

-- ── reads ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- The recap sheet for one crew, for a confirmed member: who can be reported (crewmates, and anyone who left in the 14
-- days before the day), what I filed about each, and whether I said it was called off (the row with about_id null).
-- With each of my reports, THEIR answer to it: a note that only its writer could read would be context for nobody.
create or replace function public.crew_recap(p_crew uuid)
returns table(about_id uuid, departed boolean, my_outcome text, trip_date date, is_open boolean, their_reply text, their_note text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date;
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
    select mates.uid, mates.gone, r.outcome, d, (current_date between d and d + 14), y.reply, y.note
      from mates left join public.crew_trip_reports r on r.crew_id = p_crew and r.reporter_id = me and r.about_id = mates.uid
                 left join public.crew_trip_replies y on y.report_id = r.id
    union all
    select null::uuid, false, r.outcome, d, (current_date between d and d + 14), null::text, null::text
      from public.crew_trip_reports r where r.crew_id = p_crew and r.reporter_id = me and r.about_id is null;
end $$;
revoke all on function public.crew_recap(uuid) from public, anon;
grant execute on function public.crew_recap(uuid) to authenticated;

-- What crewmates have said about ME, once revealed, with my reply. called_off rows name nobody and are not listed.
create or replace function public.my_trip_reports_about_me()
returns table(id uuid, crew_id uuid, reporter_id uuid, trip_date date, outcome text, updated_at timestamptz, reply text, note text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.id, r.crew_id, r.reporter_id, r.trip_date, r.outcome, r.updated_at, y.reply, y.note
    from public.crew_trip_reports r left join public.crew_trip_replies y on y.report_id = r.id
   where auth.uid() is not null and r.about_id = auth.uid() and public.crew_trip_report_revealed(r)
   order by r.trip_date desc, r.updated_at desc
   limit 200;
$$;
revoke all on function public.my_trip_reports_about_me() from public, anon;
grant execute on function public.my_trip_reports_about_me() to authenticated;

-- A vouch's reason is JSON ({ratings:{reliability:4,...},...}) for every vouch the app writes, plain text for older
-- ones. Parse without throwing.
create or replace function public.try_jsonb(t text)
returns jsonb
language plpgsql immutable
set search_path = public, pg_temp
as $$
begin
  if t is null or t !~ '^\s*\{' then return null; end if;
  return t::jsonb;
exception when others then return null;
end $$;
revoke all on function public.try_jsonb(text) from public, anon, authenticated;

-- RELIABILITY, AS COUNTS, for the partner cards and profiles on screen (cap 200, like partner_counts). Per climber:
-- trips = crew trips someone else reported on, resolved to ONE outcome per trip; then how many of each. A trip counts
-- only from reports that are revealed and not disputed; one that anyone OTHER than the climber called off is skipped
-- for them (they cannot excuse themselves); and where crewmates disagree about one climber's trip, the most
-- favourable outcome wins. rel_n / rel_avg: the vouch Reliability stars (1-5) they received.
create or replace function public.reliability_of_users(p_ids uuid[])
returns table(id uuid, trips integer, on_time integer, late integer, cancelled_early integer, cancelled_late integer, no_show integer, rel_n integer, rel_avg numeric)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with ids as (select distinct u from unnest(p_ids[1:200]) u),
  rep as (
    select r.about_id, coalesce(r.crew_id, r.id) as trip, r.outcome,
           case r.outcome when 'on_time' then 5 when 'cancelled_early' then 4 when 'late' then 3 when 'cancelled_late' then 2 else 1 end as rank
      from public.crew_trip_reports r
     where r.about_id in (select u from ids)
       and public.crew_trip_report_revealed(r)
       and not exists (select 1 from public.crew_trip_replies y where y.report_id = r.id and y.reply = 'was_there')
       and not exists (select 1 from public.crew_trip_reports c where r.crew_id is not null and c.crew_id = r.crew_id
                        and c.about_id is null and c.reporter_id <> r.about_id)
  ),
  trip as (select distinct on (about_id, trip) about_id, outcome from rep order by about_id, trip, rank desc),
  stars as (
    select v.to_id, (public.try_jsonb(v.reason) #>> '{ratings,reliability}') as s
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
  'Per climber: crew trips crewmates reported on (revealed, undisputed, one outcome per trip) and how many were on time / late / cancelled with notice / cancelled last minute / no-show, plus the vouch Reliability stars. Counts only: no reporter is named. Signed-in only (0519).';
revoke all on function public.reliability_of_users(uuid[]) from public, anon;
grant execute on function public.reliability_of_users(uuid[]) to authenticated;

commit;
