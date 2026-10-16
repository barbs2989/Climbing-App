-- 0273 — Signed-out visitors can read PUBLIC trip reports again, and nobody can probe other people's
-- friendships.
--
-- 0269 put `are_friends(auth.uid(), user_id)` into climb_logs' "view crew logs" policy, and granted
-- are_friends to `authenticated` only. Postgres checks EXECUTE on every function a policy names before it
-- reads a row, so EVERY signed-out read of climb_logs -- a plain select, and the three SECURITY INVOKER
-- readers get_trip_reports_for_consensus, route_logged_with and state_trip_reports -- failed with
-- "permission denied for function are_friends" (401) instead of returning the public reports.
-- Measured live 2026-10-08 by probe-trip-reports-default.mjs: a stranger read a public report, a
-- signed-out visitor got a 401.
--
-- Granting are_friends to anon would have fixed that and widened the second problem: are_friends(a, b)
-- answers for ANY two accounts, so any signed-in climber could map who is friends with whom, around the
-- "Show mutual friends" setting. The policy now calls is_my_friend(other), which can only answer about
-- the caller's own friendships (false when signed out), and are_friends is left to SECURITY DEFINER
-- callers (report_content), which run it as its owner.

create or replace function public.is_my_friend(p_other uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select auth.uid() is not null and p_other is not null and exists (
    select 1 from connections c
     where c.status = 'accepted'
       and ((c.requester = auth.uid() and c.addressee = p_other)
         or (c.addressee = auth.uid() and c.requester = p_other)));
$$;
revoke all on function public.is_my_friend(uuid) from public;
grant execute on function public.is_my_friend(uuid) to anon, authenticated;

drop policy if exists "view crew logs" on public.climb_logs;
create policy "view crew logs" on public.climb_logs for select using (
  trip_report_visibility = 'public'
  or (trip_report_visibility = 'crew' and crew_id in (
        select crew_members.crew_id from crew_members
         where crew_members.user_id = auth.uid() and crew_members.status = 'confirmed'))
  or (trip_report_visibility = 'friends' and is_my_friend(user_id))
);

revoke execute on function public.are_friends(uuid, uuid) from authenticated;
