-- Route finder: search/list routes anywhere under an area's subtree (e.g. every
-- route in a state, or a region, or a single crag) with optional text/discipline
-- filters, sorted and paged. Backs the DB-catalog "Route finder" / "View all
-- routes" screens the same way area_top_contributors (0005) backs Top Contributors.
create or replace function routes_in_subtree(
  root_id text,
  q text default null,
  disc text default null,
  lim int default 50,
  off int default 0
)
returns setof routes language sql stable as $$
  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
  order by r.name
  limit lim offset off;
$$;

create or replace function routes_in_subtree_count(
  root_id text,
  q text default null,
  disc text default null
)
returns bigint language sql stable as $$
  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc);
$$;
