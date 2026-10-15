-- 0315: another climber's belay record, for real climbers.
--
-- A profile's Safety section shows a BELAY RECORD (catches, last catch, partners who signed) for the
-- example climbers only: belay_catches is readable by its two parties alone (0038), so nobody could
-- read anyone else's. This returns, per climber, numbers derived from the rows the TRUST SCORE already
-- counts -- counted_catch_count (0203): catches the CAUGHT climber filed, plus climb logs whose climber
-- recorded a caught fall with this belayer -- so the profile and the score never disagree.
--   catches     counted_catch_count(id), the score's own number
--   last_catch  the latest date in that same set
--   partners    distinct climbers caught in that set
-- Nothing records a fall's severity, so there is no "high-factor" count, and none is invented.
-- Signed-in only, at most 200 ids.

create or replace function public.belay_ledgers(p_ids uuid[])
returns table(id uuid, catches integer, last_catch date, partners integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id,
         counted_catch_count(u.id),
         (select max(x.d) from (
            select bc.climber_id as who, bc.date_occurred as d from belay_catches bc
             where bc.belayer_id = u.id and bc.filed_by = bc.climber_id
            union
            select l.user_id, l.date_climbed from climb_logs l
             where l.belayed_by = u.id and l.caught_fall and l.user_id <> u.id) x),
         (select count(distinct x.who)::int from (
            select bc.climber_id as who from belay_catches bc
             where bc.belayer_id = u.id and bc.filed_by = bc.climber_id
            union
            select l.user_id from climb_logs l
             where l.belayed_by = u.id and l.caught_fall and l.user_id <> u.id) x)
    from (select distinct unnest(p_ids[1:200]) as id) u
   where auth.uid() is not null;
$$;
revoke execute on function public.belay_ledgers(uuid[]) from public, anon;
grant execute on function public.belay_ledgers(uuid[]) to authenticated;
