-- 0522: four fixes from the review of reliability (0519/0521), 2026-11-24.
--
-- 1. A DELETED CREW KEPT ITS REPORTS BUT LOST WHICH TRIP THEY WERE. crew_id is SET NULL on a crew's deletion (so a
--    disband cannot wipe a no-show), but reliability_of_users grouped by coalesce(crew_id, id), the "called off" rule
--    and the reveal both needed crew_id: after a disband, two crewmates' reports about one trip counted as two trips,
--    and a trip a crewmate had called off started counting. trip_crew is the crew's id, copied at insert, never nulled
--    and with no foreign key, and all three read it.
-- 2. LEAVING AFTER THE TRIP WAS RECORDED AS BAILING. The departure trigger recorded any confirmed member leaving a crew
--    with an agreed day, so a climber who went and then tidied the crew away could only be reported as cancelling.
--    Now only leaving on or before the day is a departure, and only such a departure is reportable.
-- 3. A NOTE UNDID "I WAS THERE". reply_to_trip_report upserted the reply, so adding context after disputing made the
--    report count again. A dispute now stays a dispute, and a later dispute keeps an earlier note.
-- 4. THE WINDOW'S EDGES DISAGREED WITH THE APP. The app opens "How did it go?" by the climber's local date; these
--    functions used UTC's current_date, so a climber in the US on the evening of day 14 was refused, and one east of UTC
--    on the morning of the day was told it had not happened. One day of slack each side.

begin;

alter table public.crew_trip_reports add column if not exists trip_crew uuid;
update public.crew_trip_reports set trip_crew = coalesce(crew_id, id) where trip_crew is null;
alter table public.crew_trip_reports alter column trip_crew set not null;
create index if not exists crew_trip_reports_trip on public.crew_trip_reports (trip_crew);
comment on column public.crew_trip_reports.trip_crew is
  'The crew this report is about, copied from crew_id at insert and kept when the crew is deleted (crew_id goes null): which TRIP a report belongs to (0522).';

create or replace function public.crew_trip_report_trip_key()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.trip_crew := coalesce(new.trip_crew, new.crew_id, new.id);
  return new;
end $$;
revoke all on function public.crew_trip_report_trip_key() from public, anon, authenticated;
drop trigger if exists crew_trip_reports_trip_key on public.crew_trip_reports;
create trigger crew_trip_reports_trip_key before insert on public.crew_trip_reports
  for each row execute function public.crew_trip_report_trip_key();

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
  -- Leaving AFTER the day is tidying up, not bailing (review 2026-11-24): only leaving on or before the day is a departure.
  if current_date > d::date then return old; end if;
  insert into public.crew_departures (crew_id, user_id, agreed_date) values (old.crew_id, old.user_id, d::date)
  on conflict (crew_id, user_id) do update set left_at = excluded.left_at, agreed_date = excluded.agreed_date;
  return old;
end $$;
revoke all on function public.crew_member_departed() from public, anon, authenticated;

create or replace function public.crew_trip_report_revealed(r public.crew_trip_reports)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.updated_at < now() - interval '7 days'
      or exists (select 1 from public.crew_trip_reports m where m.trip_crew = r.trip_crew and m.reporter_id = r.about_id);
$$;
revoke all on function public.crew_trip_report_revealed(public.crew_trip_reports) from public, anon, authenticated;

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
  -- A day of slack each side (review 2026-11-24): the app opens the window by the climber's LOCAL date, this by UTC.
  if current_date < d - 1 then raise exception 'the trip has not happened yet' using errcode = '22023'; end if;
  if current_date > d + 15 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
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
  departed := exists (select 1 from public.crew_departures x where x.crew_id = p_crew and x.user_id = p_about and x.left_at >= (d - 14)::timestamptz and x.left_at < (d + 1)::timestamptz);
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

create or replace function public.withdraw_trip_report(p_crew uuid, p_about uuid)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare me uuid := auth.uid(); d date;
begin
  if me is null then raise exception 'sign in first' using errcode = '42501'; end if;
  d := public.crew_trip_day(p_crew);
  if d is null or current_date > d + 15 then raise exception 'trip reports close 14 days after the trip' using errcode = '22023'; end if;
  delete from public.crew_trip_reports where crew_id = p_crew and reporter_id = me and about_id is not distinct from p_about;
  return found;
end $$;
revoke all on function public.withdraw_trip_report(uuid, uuid) from public, anon;
grant execute on function public.withdraw_trip_report(uuid, uuid) to authenticated;

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
  -- A note added after "I was there" keeps the dispute (review 2026-11-24: it used to replace it, and the report counted
  -- again); a later "I was there" keeps an earlier note.
  on conflict (report_id) do update set
    reply = case when public.crew_trip_replies.reply = 'was_there' then 'was_there' else excluded.reply end,
    note = coalesce(excluded.note, public.crew_trip_replies.note), created_at = now();
  return true;
end $$;
revoke all on function public.reply_to_trip_report(uuid, text, text) from public, anon;
grant execute on function public.reply_to_trip_report(uuid, text, text) to authenticated;

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
      select x.user_id, true from public.crew_departures x where x.crew_id = p_crew and x.user_id <> me and x.left_at >= (d - 14)::timestamptz and x.left_at < (d + 1)::timestamptz
        and not exists (select 1 from public.crew_members m2 where m2.crew_id = p_crew and m2.user_id = x.user_id and m2.status = 'confirmed')
    )
    select mates.uid, mates.gone, r.outcome, d, (current_date between d - 1 and d + 15), y.reply, y.note
      from mates left join public.crew_trip_reports r on r.crew_id = p_crew and r.reporter_id = me and r.about_id = mates.uid
                 left join public.crew_trip_replies y on y.report_id = r.id
    union all
    select null::uuid, false, r.outcome, d, (current_date between d - 1 and d + 15), null::text, null::text
      from public.crew_trip_reports r where r.crew_id = p_crew and r.reporter_id = me and r.about_id is null;
end $$;
revoke all on function public.crew_recap(uuid) from public, anon;
grant execute on function public.crew_recap(uuid) to authenticated;

create or replace function public.reliability_of_users(p_ids uuid[])
returns table(id uuid, trips integer, on_time integer, late integer, cancelled_early integer, cancelled_late integer, no_show integer, rel_n integer, rel_avg numeric)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with ids as (select distinct u from unnest(p_ids[1:200]) u),
  rep as (
    select r.about_id, r.trip_crew as trip, r.outcome,
           case r.outcome when 'on_time' then 5 when 'cancelled_early' then 4 when 'late' then 3 when 'cancelled_late' then 2 else 1 end as rank
      from public.crew_trip_reports r
     where r.about_id in (select u from ids)
       and public.crew_trip_report_revealed(r)
       and not exists (select 1 from public.crew_trip_replies y where y.report_id = r.id and y.reply = 'was_there')
       and not exists (select 1 from public.crew_trip_reports c where c.trip_crew = r.trip_crew
                        and c.about_id is null and c.reporter_id <> r.about_id)
  ),
  trip as (select distinct on (about_id, trip) about_id, outcome from rep order by about_id, trip, rank desc),
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
  'Per climber: crew trips crewmates reported on (revealed, undisputed, one outcome per trip) and how many were on time / late / cancelled with notice / cancelled last minute / no-show, plus the vouch Reliability stars. Counts only: no reporter is named. Signed-in only (0519).';
revoke all on function public.reliability_of_users(uuid[]) from public, anon;
grant execute on function public.reliability_of_users(uuid[]) to authenticated;

commit;
