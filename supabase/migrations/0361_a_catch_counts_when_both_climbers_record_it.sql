-- 0361: a belay catch counts only when BOTH climbers have recorded it.
--
-- Until now (0194/0203) a catch counted for the belayer as soon as the CLIMBER WHO WAS CAUGHT filed
-- it, and a climb log naming a belayer with caught_fall counted on its own. That stopped a belayer
-- crediting themselves, but not the other direction: anyone could put catches on someone else's
-- Belay board without that person ever agreeing. The Log a catch sheet now finds ANY climber with a
-- profile, not only friends and past crew-mates (owner, 2026-10-23: "the other person still needs
-- to confirm"), so the count must not rest on one side's word.
--
-- THE RULE (the Strava "add others" model: a tagged athlete's activity appears only once THEY
-- accept). A catch is a (belayer, climber, day). It counts once that day has a row filed by the
-- belayer AND a row filed by the climber -- whoever logs it first, the other confirms by filing
-- their own copy, which is exactly what the app's Confirm button does. One per pair per day, as
-- before. The climb_logs path no longer counts on its own: saving a log with a caught fall already
-- files a belay_catches row (ClimbMatch syncLogToDb), so the belayer is asked to confirm it.
--
-- And a climber who has BLOCKED you cannot be named in a catch you file (the crew-invite guard,
-- 0094); nobody can file a catch with themselves.
--
-- WHAT IT STILL CANNOT STOP: two real accounts agreeing to confirm each other's invented catches.
-- The report button on every ranking row remains the answer to that.
--
-- Measured before applying: belay_catches held 0 rows and climb_logs 0 caught falls, so no
-- climber's number changes.

create or replace function confirmed_catches(p_belayer uuid)
returns table(climber_id uuid, date_occurred date)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.climber_id, a.date_occurred from belay_catches a
   where a.belayer_id = p_belayer and a.filed_by = a.climber_id and a.climber_id <> a.belayer_id
     and exists (select 1 from belay_catches b
                  where b.belayer_id = a.belayer_id and b.climber_id = a.climber_id
                    and b.date_occurred = a.date_occurred and b.filed_by = b.belayer_id)
   group by a.climber_id, a.date_occurred;
$$;
revoke all on function confirmed_catches(uuid) from public;
revoke all on function confirmed_catches(uuid) from anon;
revoke all on function confirmed_catches(uuid) from authenticated;

create or replace function counted_catch_count(p_belayer uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::integer from confirmed_catches(p_belayer);
$$;
revoke all on function counted_catch_count(uuid) from public;
revoke all on function counted_catch_count(uuid) from anon;
revoke all on function counted_catch_count(uuid) from authenticated;

create or replace function public.belay_ledgers(p_ids uuid[])
returns table(id uuid, catches integer, last_catch date, partners integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id,
         counted_catch_count(u.id),
         (select max(x.date_occurred) from confirmed_catches(u.id) x),
         (select count(distinct x.climber_id)::int from confirmed_catches(u.id) x)
    from (select distinct unnest(p_ids[1:200]) as id) u
   where auth.uid() is not null;
$$;
revoke execute on function public.belay_ledgers(uuid[]) from public, anon;
grant execute on function public.belay_ledgers(uuid[]) to authenticated;

create or replace function guard_belay_catch_parties() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare other uuid;
begin
  if new.belayer_id = new.climber_id then
    raise exception 'a catch is between two climbers';
  end if;
  other := case when auth.uid() = new.belayer_id then new.climber_id else new.belayer_id end;
  -- Says nothing about a block, as the crew and message guards do not.
  if exists (select 1 from blocked_users where blocker = other and blocked = auth.uid()) then
    raise exception 'this climber cannot be added to a catch';
  end if;
  return new;
end;
$$;
drop trigger if exists belay_catches_guard_parties on belay_catches;
create trigger belay_catches_guard_parties before insert on belay_catches
  for each row execute function guard_belay_catch_parties();
