-- 0221 — the areas where ONE climber is the top contributor, for the profile's
-- "🏆 Top Contributor · <area>" badge.
--
-- The badge was computed in the client from the seed ROUTES demo set, matched by DISPLAY
-- NAME: a real climber never earned it, and one whose name happened to equal a seed author's
-- was handed that author's badge. This asks the ledger instead, by uid, with the same rule
-- the seed version applied — the climber ranks first in an area (or any area above it) that
-- has more than one contributor — and the same ranking area_top_contributors (0148) uses, so
-- the badge and the area leaderboard can never disagree about who is on top.
--
-- `stable`, not SECURITY DEFINER, exactly like area_top_contributors: contributions are
-- public-read, so it reads nothing the caller could not.

create or replace function user_top_contributor_areas(p_uid text)
returns table(area_id text, name text) language sql stable as $$
  with mine as (
    select distinct ca.path
    from contributions c
    left join routes r on r.id = c.route_id
    join areas ca on ca.id = coalesce(c.area_id, r.area_id)
    where c.contributor = p_uid
  ),
  anc as (
    select distinct pa.id, pa.name, nlevel(pa.path) as lv
    from areas pa join mine m on pa.path @> m.path
  ),
  ranked as (
    select a.id, a.name, a.lv, t.contributor,
           row_number() over (partition by a.id order by t.n desc, t.contributor) as rk,
           count(*) over (partition by a.id) as k
    from anc a cross join lateral area_top_contributors(a.id, 2) t
  )
  select id, name from ranked
  where rk = 1 and k > 1 and contributor = p_uid
  order by lv desc, name;
$$;

grant execute on function user_top_contributor_areas(text) to anon, authenticated, service_role;
