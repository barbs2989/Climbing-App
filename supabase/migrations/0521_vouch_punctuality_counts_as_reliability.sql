-- 0521: an older vouch's "punctuality" stars count as its reliability rating (owner 2026-11-24, re-audit).
--
-- Before "Reliability" was a vouch category, the vouch form asked "Punctuality" (now retired), which asked the same
-- thing: did they turn up on time and do what they said. 0519's reliability_of_users read only ratings.reliability,
-- so on 2026-11-24 one of the 7 live vouches (a punctuality-only one) counted for nothing toward its climber's
-- reliability, while the app's own fallback (relRecordOf, #3851) counts it for the example climbers. Same rule in both
-- places now: the vouch's reliability rating when it has one, else its punctuality rating. Nothing else changes; the
-- function is re-created whole from 0519 with that one expression replaced.

begin;

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
