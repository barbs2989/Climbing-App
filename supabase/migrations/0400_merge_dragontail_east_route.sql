-- 0400: Dragontail Peak's "East Route" and "East Ridge via Aasgard Pass Route" are ONE climb in two rows.
--
-- Found by the Peakbagger track pass (2026-11-04): both rows stored the same 1,971-point recording, and
-- READ side by side they describe one line — Colchuck Lake, up Aasgard Pass, across the snowfield to the
-- east-ridge saddle and on to the summit. The name-key guard (check:catalog-duplicates) cannot see a
-- climb filed under two different names; scripts/oneoff/gpx-any-source/same-climb-census.mjs lists them.
-- The keeper is the Aasgard row (it holds every researched column). It fills each BLANK column from the
-- twin (0221/0271's rule): disciplines, snow_grade_num, and sort_order (the twin was the peak's first
-- route). Its grade stays Class 3 (the twin's "Mod. Snow" is the early-season condition its own text
-- already describes). The twin is deleted.
-- No climber row points at the twin (all 20 referencing tables read 0 on 2026-11-04). ABORTS if one does
-- now, or if either row is no longer where the plan read it.

begin;

do $$ declare n int; begin
  -- an EMPTY database (a Supabase preview, check:migration-replay) has no catalog
  if not exists (select 1 from routes where id = 'wa_dragontail_peak_east_ridge_aasgard_pass') then raise notice '0400: no catalog'; return; end if;
  select count(*) into n from routes
   where (id = 'wa_dragontail_peak_east_ridge_aasgard_pass' and area_id = 'wa_dragontail_peak' and name = 'East Ridge via Aasgard Pass Route')
      or (id = 'wa_dragontail_peak_east_route' and area_id = 'wa_dragontail_peak' and name = 'East Route');
  if n <> 2 then raise exception '0400: % of 2 rows are as the plan read them', n; end if;
  select (select count(*) from climb_logs where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from content_reports where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from contributions where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from crew_listings where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from crews where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from gps_submissions where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from hazard_votes where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from objectives where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_base_checkins where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_base_pin_changes where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_difficulty_ratings where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_field_confidence where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_flags where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_ratings where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_views where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from topo_lines where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from topos where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from user_itineraries where route_id = 'wa_dragontail_peak_east_route')
       + (select count(*) from route_link_ups where 'wa_dragontail_peak_east_route' = any(route_ids))
       + (select count(*) from user_lists where 'wa_dragontail_peak_east_route' = any(route_ids))
    into n;
  if n > 0 then raise exception '0400: % climber rows point at the row this deletes — stop and repoint them', n; end if;

  update routes k set
    disciplines = case when (k.disciplines is null or k.disciplines in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.disciplines else k.disciplines end,
    snow_grade_num = coalesce(k.snow_grade_num, o.snow_grade_num),
    sort_order = coalesce(k.sort_order, o.sort_order)
  from routes o
  where k.id = 'wa_dragontail_peak_east_ridge_aasgard_pass' and o.id = 'wa_dragontail_peak_east_route';

  delete from routes where id = 'wa_dragontail_peak_east_route';
end $$;

commit;
