-- The 3 routes the getting-there backlog found filed on the wrong peak (2026-10-29). Each row is an
-- empty stub (no grade, description, waypoints or approach), so moving it loses nothing.
--   * "Daniel Glacier" on Bald Eagle Peak: the Daniel Glacier is on Mount Daniel's north slope, and
--     Mount Daniel already holds "Daniel Glacier / Southeast Slopes" (wa_mount_daniel_daniel_glacier).
--     This stub is a duplicate of it, so it is DELETED — after a count that every table pointing at
--     a route holds 0 rows for it (re-asserted below, inside the transaction).
--   * "Mount Temple Ridge" on Big Chiwaukum: Temple Ridge runs to The Temple, Enchantments
--     (wa_the_temple), not the Chiwaukum Range. Moved there.
--   * "Three Musketeers Ridge" on Big Chiwaukum: an Enchantments summit (~7,700 ft) above Nada Lake
--     and the Toketie basin, ~1.8 km NE of The Temple. catalog_find_area found nothing under any
--     spelling, so the peak is ADDED under the Stuart Range, coordinate marked approximate (USGS
--     ground 7,574 ft at it), elevation left empty, and the route moved there.
-- Route ids are NOT renamed (route-identity.md). Rollback rows are in misfiled-rollback.json.
begin;

do $$
declare r record; n bigint;
begin
  for r in select conrelid::regclass::text t, a.attname c
           from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any(k.conkey)
           where k.contype = 'f' and k.confrelid = 'public.routes'::regclass loop
    execute format('select count(*) from %s where %I = $1', r.t, r.c) into n using 'wa_bald_eagle_peak_daniel_glacier';
    if n > 0 then raise exception '% rows in %.% point at the duplicate', n, r.t, r.c; end if;
  end loop;
  select count(*) into n from (
    select 1 from climb_logs where route_id = 'wa_bald_eagle_peak_daniel_glacier' union all
    select 1 from crews where route_id = 'wa_bald_eagle_peak_daniel_glacier' union all
    select 1 from objectives where route_id = 'wa_bald_eagle_peak_daniel_glacier' union all
    select 1 from hazard_votes where route_id = 'wa_bald_eagle_peak_daniel_glacier' union all
    select 1 from route_difficulty_ratings where route_id = 'wa_bald_eagle_peak_daniel_glacier' union all
    select 1 from user_itineraries where route_id = 'wa_bald_eagle_peak_daniel_glacier' union all
    select 1 from user_lists where 'wa_bald_eagle_peak_daniel_glacier' = any(route_ids)) x;
  if n > 0 then raise exception '% non-FK rows point at the duplicate', n; end if;
end $$;

delete from routes where id = 'wa_bald_eagle_peak_daniel_glacier' and area_id = 'wa_bald_eagle_peak' and description is null;

update routes set area_id = 'wa_the_temple'
 where id = 'wa_big_chiwaukum_mount_temple_ridge' and area_id = 'wa_big_chiwaukum';

insert into areas (id, name, area_type, parent_id, lat, lng, coords_approx, region)
select 'wa_three_musketeers_ridge', 'Three Musketeers Ridge', 'peak', 'wa_stuart_range', 47.5017, -120.7526, true, region
  from areas where id = 'wa_the_temple';

update routes set area_id = 'wa_three_musketeers_ridge'
 where id = 'wa_big_chiwaukum_three_musketeers_ridge' and area_id = 'wa_big_chiwaukum';

select id, area_id from routes where id in ('wa_bald_eagle_peak_daniel_glacier','wa_big_chiwaukum_mount_temple_ridge','wa_big_chiwaukum_three_musketeers_ridge');
select id, name, route_count, path::text from areas where id in ('wa_three_musketeers_ridge','wa_the_temple','wa_big_chiwaukum','wa_bald_eagle_peak');
commit;
