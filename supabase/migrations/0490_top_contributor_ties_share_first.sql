-- 0490: climbers level on points at the top of an area's board are BOTH its top contributor.
--
-- WHY (found 2026-11-19 testing the boards with real accounts; owner 2026-11-23: "fix"):
-- user_top_contributor_areas picked #1 with row_number() ordered by points and then by account
-- id, so of two climbers with the same points one held the profile's Top Contributor badge for
-- that area and the other did not, decided by which uuid sorts first. Measured on Washington:
-- two accounts at 14 points each, one badge. Ranks gives climbers level on points the same rank
-- (1, 1, 3); the badge now does too.
--
-- WHAT CHANGES: rank() over points alone, so every climber tied for first holds the badge. It
-- reads the whole board rather than its first two rows, because a tie can be three wide. Still
-- needs more than one contributor on the board (k > 1), and still ranks through
-- area_top_contributors, so the leaderboard switch and blocks (0486) apply unchanged. The
-- signature and the columns returned are 0333's.

begin;

create or replace function public.user_top_contributor_areas(p_uid text)
returns table(area_id text, name text)
language sql stable security definer set search_path = public, pg_temp as $$
  with mine as (
    select distinct cp.area_path as path from contribution_points() cp where cp.contributor = p_uid
  ),
  anc as (
    select distinct pa.id, pa.name, nlevel(pa.path) as lv
    from areas pa join mine m on pa.path @> m.path
  ),
  ranked as (
    select a.id, a.name, a.lv, t.contributor,
           rank() over (partition by a.id order by t.n desc) as rk,
           count(*) over (partition by a.id) as k
    from anc a cross join lateral area_top_contributors(a.id, 100000) t
  )
  select id, name from ranked
  where rk = 1 and k > 1 and contributor = p_uid
  order by lv desc, name;
$$;

grant execute on function public.user_top_contributor_areas(text) to anon, authenticated, service_role;

commit;
