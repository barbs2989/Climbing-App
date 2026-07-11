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

-- Areas (any depth) matching a name under a subtree, with their immediate
-- parent's name — backs the "All areas" tree modal's filter box, the same way
-- the static catalog's AreaTree does a flat name search when you type.
create or replace function areas_in_subtree(
  root_id text,
  q text,
  lim int default 40
)
returns table(id text, name text, area_type text, route_count int, parent_id text, parent_name text)
language sql stable as $$
  select a.id, a.name, a.area_type, a.route_count, a.parent_id, pa.name as parent_name
  from areas a
  join areas root on root.id = root_id
  left join areas pa on pa.id = a.parent_id
  where a.path <@ root.path
    and a.id <> root_id
    and a.name ilike '%' || q || '%'
  order by a.name
  limit lim;
$$;
