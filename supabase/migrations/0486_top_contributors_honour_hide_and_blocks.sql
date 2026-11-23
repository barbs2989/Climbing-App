-- 0486: TOP CONTRIBUTORS leaves out the climbers Ranks already leaves out.
--
-- WHY (found 2026-11-19, testing the boards with real accounts): Settings › Privacy says of
-- "Show me on leaderboards" that "Off keeps you out of every ranking". leaderboard() honours it,
-- so a climber who turned it off left Ranks › Contributions, but area_top_contributors() never
-- read the switch: the same climber stayed, by name, on the TOP CONTRIBUTORS card of every area
-- and route page they had contributed under, and kept the profile's Top Contributor badge
-- (user_top_contributor_areas ranks through this function). Measured with a real account: switch
-- off, Ranks By area dropped them, the area board and the badge did not.
--
-- The block was the same gap. leaderboard() hides a climber from anyone they blocked and from
-- anyone who blocked them; the area board returned their id regardless, and because the blocked
-- reader cannot read that profile the card drew a nameless "Climber" row with their points.
--
-- WHAT CHANGES: one function. A contributor is left off an area's board when
--   * their profile has show_on_ranks = false (for every reader, themselves included: the card has
--     no "you are hidden" line, so their own name there would read as the switch not working), or
--   * the signed-in reader blocked them, or they blocked the signed-in reader.
-- A signed-out reader is unchanged by blocks, as profile reads are (0095). A contributor with no
-- profile row (an account since deleted) is unchanged too. The points, the roll-up through the
-- area tree, the order and the signature are 0333's, so lib/db.js reads it as before, and
-- user_top_contributor_areas needs no edit: a hidden climber is never #1 of a board they are not on.

begin;

create or replace function public.area_top_contributors(aid text, lim int default 3)
returns table(contributor text, n bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select cp.contributor, sum(cp.pts)::bigint as n
  from contribution_points() cp
  join areas pa on pa.id = aid
  left join profiles p on p.id::text = cp.contributor
  where cp.area_path <@ pa.path
    and coalesce(p.show_on_ranks, true)
    and (p.id is null or auth.uid() is null or not exists (
          select 1 from blocked_users b
           where (b.blocker = p.id and b.blocked = auth.uid())
              or (b.blocker = auth.uid() and b.blocked = p.id)))
  group by cp.contributor
  order by n desc, cp.contributor
  limit lim;
$$;

grant execute on function public.area_top_contributors(text, int) to anon, authenticated, service_role;

commit;
