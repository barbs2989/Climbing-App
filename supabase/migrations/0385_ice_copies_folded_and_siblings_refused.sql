-- 0385: the two ice-season copies #2835 left beside their place are folded, and a same-named SIBLING
-- is refused whatever its coordinates.
--
-- Owner note (North Cascades): "this keeps happening where areas get duplicated … We need to have
-- guards from this to keep happening." 0340/0341 folded the Cascade River Drainage bucket and refused
-- a bucket name. Then #2835 dissolved Mountain Project's ice/mixed buckets and moved their crags up a
-- level, which filed two places twice under one parent:
--   Squamish › The Smoke Bluffs        beside  The Smoke Bluffs Ice  (3 climbs, ~5 m apart on MP)
--   Durango   › Pine River Area        beside  Pine River            (2 ice climbs, same trailhead)
-- check:area-duplicates (daily) caught both; the insert/update trigger did not, because one side of
-- each pair had NO coordinate, and 0216/0218 then compare only peaks. The Cascade River bucket had no
-- coordinate either. So: two children of ONE parent whose names agree once "The", "Area", "Ice",
-- "Climbing" are dropped are one place, coordinate or not. This is the daily sweep's same-parent pass
-- (0256) moved into the database, with a narrower key: "Mount", "Peak" and "Crag" are KEPT, so the
-- sibling pairs already read as different places (Mount Wilson / Wilson Peak, Baker Crags / Mount
-- Baker, Index / Mount Index, Crested Butte / Mt. Crested Butte) are not refused.
--
-- Where each climb went (read on Mountain Project's own route pages):
--   Frozen Zombie, Alice      → The Smoke Bluffs › Wall Area   (beside Zombie Roof; "when not frozen,
--                                                               this is the Alice rock route")
--   Bughouse Heights Ice      → The Smoke Bluffs › Bughouse Heights (the seeps off its right side)
--   Granite Peak Smear, Falls Creek Falls stay on their own leaf, which moves UNDER Pine River Area as
--     "Pine River Trail": a route must sit on a leaf (routes_require_leaf) and Pine River Area holds
--     The Citadel and Fern Gully, while these two are 3 and 9 miles up the Pine River Trail from the
--     same trailhead. One place in the tree, its ice where it actually is.
-- Nothing else pointed at the Smoke Bluffs copy (contributions, topos, crews, partner_areas, saved_areas,
-- crew_rides: 0 each, counted with the service key before the delete). Rollback:
-- scripts/data/rollback-0385-ice-copies-folded.json.
--
-- Bypass unchanged: set local catalog.allow_duplicate = 'on'.

begin;

update routes set area_id = 'bc_wall_area'
 where id in ('bc_the_smoke_bluffs_ice_frozen_zombie', 'bc_the_smoke_bluffs_ice_alice') and area_id = 'bc_the_smoke_bluffs_ice';
update routes set area_id = 'bc_bughouse_heights'
 where id = 'bc_the_smoke_bluffs_ice_bughouse_heights_ice' and area_id = 'bc_the_smoke_bluffs_ice';
update areas set parent_id = 'co_pine_river_area', name = 'Pine River Trail'
 where id = 'co_pine_river' and parent_id = 'co_durango';

delete from areas where id = 'bc_the_smoke_bluffs_ice'
   and not exists (select 1 from areas c where c.parent_id = areas.id)
   and not exists (select 1 from routes r where r.area_id = areas.id);

update areas a set route_count = (
  select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ a.path
) where exists (select 1 from areas t where t.id in ('bc_wall_area', 'bc_bughouse_heights', 'co_pine_river') and a.path @> t.path);

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from areas where id = 'bc_wall_area') then return; end if;
  select count(*) into n from areas where id = 'bc_the_smoke_bluffs_ice';
  if n > 0 then raise exception '0385: The Smoke Bluffs Ice survived'; end if;
  select count(*) into n from areas where id = 'co_pine_river' and parent_id = 'co_pine_river_area' and name = 'Pine River Trail';
  if n <> 1 then raise exception '0385: Pine River did not move under Pine River Area'; end if;
  select count(*) into n from routes where (id, area_id) in (
    ('bc_the_smoke_bluffs_ice_frozen_zombie', 'bc_wall_area'), ('bc_the_smoke_bluffs_ice_alice', 'bc_wall_area'),
    ('bc_the_smoke_bluffs_ice_bughouse_heights_ice', 'bc_bughouse_heights'));
  if n <> 3 then raise exception '0385: % of 3 climbs moved', n; end if;
end $$;

create or replace function catalog_sibling_key(t text) returns text
language sql immutable parallel safe set search_path = public, pg_temp as $$
  select coalesce(nullif(string_agg(u.w, ' ' order by u.i), ''), public.search_canon(t))
    from unnest(string_to_array(public.search_canon(t), ' ')) with ordinality as u(w, i)
   where u.w not in ('the', 'area', 'areas', 'climbing', 'climbs', 'ice')
$$;

create or replace function refuse_duplicate_area() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare hit record; st ltree;
begin
  if coalesce(current_setting('catalog.allow_duplicate', true), '') = 'on' then return new; end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name
                      and new.parent_id is not distinct from old.parent_id then return new; end if;
  select subpath(path, 0, 2) into st from areas where id = new.parent_id;
  if st is null or nlevel(st) < 2 then return new; end if;

  -- a same-named SIBLING, coordinate or not (0385)
  select a.id, catalog_breadcrumb(a.path) bc, null::numeric km into hit
    from areas a
   where a.parent_id = new.parent_id
     and a.id <> new.id
     and length(catalog_sibling_key(new.name)) >= 3
     and catalog_sibling_key(a.name) = catalog_sibling_key(new.name)
   limit 1;

  if hit.id is null and new.lat is not null and new.lng is not null then
    select a.id, catalog_breadcrumb(a.path) bc, round(catalog_km(new.lat, new.lng, a.lat, a.lng)::numeric, 2) km into hit
      from areas a
     where a.path <@ st
       and a.id <> new.id
       and catalog_key(a.name) = catalog_key(new.name)
       and a.lat between new.lat - 0.02 and new.lat + 0.02
       and catalog_km(new.lat, new.lng, a.lat, a.lng) <= 1.5
     order by catalog_km(new.lat, new.lng, a.lat, a.lng) limit 1;
  elsif hit.id is null then
    select a.id, catalog_breadcrumb(a.path) bc, null::numeric km into hit
      from areas a
     where a.path <@ st
       and a.id <> new.id
       and a.area_type = 'peak'
       and search_canon(a.name) = search_canon(new.name)
     limit 1;
  end if;

  if hit.id is not null then
    raise exception 'area "%" (under %) already exists as % — % %',
      new.name, new.parent_id, hit.id, hit.bc, coalesce('(' || hit.km || ' km away)', '')
      using hint = 'Add routes to the existing area. If this really is a different place: set local catalog.allow_duplicate = ''on''.';
  end if;
  return new;
end $$;

commit;
