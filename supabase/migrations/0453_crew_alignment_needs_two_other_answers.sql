-- 0453 — THE SAFETY SUMMARY WAITS FOR TWO ANSWERS FROM OTHER CLIMBERS, NOT TWO IN ALL (owner 2026-11-18,
-- "do the rest"). 0451 hid every per-answer count until two members had answered. In a crew of two that was
-- not enough: once both answered, each could subtract their own answer from the counts and read the other's
-- exactly. The rule now counts the answers of the members OTHER than the caller: the counts show only once at
-- least two other climbers have answered, which is exactly when no single crewmate's answer can be singled
-- out from your own. A crew of two never sees per-answer counts; who has answered (done_ids) still shows.

begin;

create or replace function public.crew_alignment(p_crew uuid)
returns table(member_count integer, done_ids uuid[], ready_ids uuid[],
              risk_conservative integer, risk_moderate integer, risk_aggressive integer,
              flag_fitness integer, flag_gear integer, flag_experience integer, flag_communication integer)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_min constant int := 2;  -- answers from OTHER members needed before any per-answer count is shown
begin
  if auth.uid() is null or not exists (
       select 1 from crew_members where crew_id = p_crew and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'not a confirmed member of this crew';
  end if;
  return query
  with m as (
    select cm.user_id from crew_members cm
     where cm.crew_id = p_crew and cm.status = 'confirmed'
       and not exists (select 1 from blocked_users b
                        where (b.blocker = cm.user_id and b.blocked = auth.uid())
                           or (b.blocker = auth.uid() and b.blocked = cm.user_id))),
  a as (
    select s.user_id, s.risk_tolerance, s.answers, s.ready_at
      from crew_safety_answers s join m on m.user_id = s.user_id
     where s.crew_id = p_crew),
  n as (
    select a.*,
           case when a.answers->>'physical' ~ '^[0-9]+$' then (a.answers->>'physical')::int end as q_physical,
           case when a.answers->>'gear' ~ '^[0-9]+$' then (a.answers->>'gear')::int end as q_gear,
           case when a.answers->>'experience' ~ '^[0-9]+$' then (a.answers->>'experience')::int end as q_experience,
           case when a.answers->>'communication' ~ '^[0-9]+$' then (a.answers->>'communication')::int end as q_communication
      from a),
  k as (select (count(*) filter (where n.risk_tolerance is not null and n.user_id <> auth.uid()) >= v_min) as enough from n)
  select (select count(*)::int from m),
         coalesce((select array_agg(n.user_id order by n.user_id) from n where n.risk_tolerance is not null), '{}'::uuid[]),
         coalesce((select array_agg(n.user_id order by n.user_id) from n where n.ready_at is not null), '{}'::uuid[]),
         case when (select enough from k) then (select count(*)::int from n where n.risk_tolerance = 'conservative') else 0 end,
         case when (select enough from k) then (select count(*)::int from n where n.risk_tolerance = 'moderate') else 0 end,
         case when (select enough from k) then (select count(*)::int from n where n.risk_tolerance = 'aggressive') else 0 end,
         case when (select enough from k) then (select count(*)::int from n where n.q_physical >= 2) else 0 end,
         case when (select enough from k) then (select count(*)::int from n where n.q_gear >= 2) else 0 end,
         case when (select enough from k) then (select count(*)::int from n where n.q_experience >= 2) else 0 end,
         case when (select enough from k) then (select count(*)::int from n where n.q_communication >= 2) else 0 end;
end; $$;
revoke execute on function public.crew_alignment(uuid) from public, anon;
grant execute on function public.crew_alignment(uuid) to authenticated;

commit;
