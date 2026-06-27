-- Live-catalog Top Contributors: roll up the contributions ledger through an area's
-- subtree (via ltree path) and rank by contributor. Used by DbAreaBrowser.
create or replace function area_top_contributors(aid text, lim int default 3)
returns table(contributor text, n bigint) language sql stable as $$
  select c.contributor, count(*) as n
  from contributions c
  left join routes r on r.id = c.route_id
  join areas ca on ca.id = coalesce(c.area_id, r.area_id)
  join areas pa on pa.id = aid
  where ca.path <@ pa.path
  group by c.contributor
  order by n desc, c.contributor
  limit lim;
$$;
