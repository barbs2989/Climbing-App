-- 0451 — THE CREW'S SAFETY ALIGNMENT SHOWS NOTHING UNTIL TWO HAVE ANSWERED (owner 2026-11-18).
-- The questionnaire promises "Your crew sees group-level counts, never who answered what". But with
-- ONE answer in, the group counts ARE that climber's answers: "1 Moderate", "a member has gear gaps"
-- told every crewmate exactly what the only person who had answered said (found on the live site,
-- 2026-11-18). crew_alignment (0314) now returns zero for every per-answer count -- the risk levels
-- and the four flags -- until at least two confirmed members have answered. Who has answered
-- (done_ids) and who is safety-ready (ready_ids) are unchanged: they say THAT, never WHAT.
--
-- Known limit, accepted by the owner's rule: in a crew of exactly two, once both have answered,
-- each can work out the other's answers from their own.

begin;

create or replace function public.crew_alignment(p_crew uuid)
returns table(member_count integer, done_ids uuid[], ready_ids uuid[],
              risk_conservative integer, risk_moderate integer, risk_aggressive integer,
              flag_fitness integer, flag_gear integer, flag_experience integer, flag_communication integer)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_min constant int := 2;  -- answers needed before any per-answer count is shown
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
  k as (select (count(*) filter (where n.risk_tolerance is not null) >= v_min) as enough from n)
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
