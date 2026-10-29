-- Thin descent/approach follow-up (2026-10-29): delete six thin duplicate routes and two area-shaped
-- "routes", move two Rainier routes filed under Glacier Peak. Refuses if anything points at a deleted row.
do $$ declare ids text[] := array['wa_lane_peak_fly_the','wa_mount_rainier_emmons_glacier_2','wa_mount_rainier_ingraham_glacier_direct','wa_mount_roosevelt_southeast_route','wa_nooksack_tower_beckey_schmidtke_route','wa_glacier_peak_gerdine_ridge_cool_glacier','wa_comb_the_toketie_lake_area','wa_three_queens_approach_routes']; n int; t text; begin
foreach t in array array['climb_logs','content_reports','contributions','crew_listings','crews','gps_submissions','hazard_votes','objectives','route_base_checkins','route_base_pin_changes','route_difficulty_ratings','route_field_confidence','route_flags','route_ratings','route_views','topo_lines','topos','user_itineraries'] loop
 execute format('select count(*) from %I where route_id = any($1)', t) into n using ids; if n>0 then raise exception 'refs in %: %', t, n; end if; end loop;
select count(*) into n from user_lists where route_ids && ids; if n>0 then raise exception 'refs in user_lists'; end if;
delete from routes where id = any(ids); get diagnostics n = row_count; if n<>8 then raise exception 'deleted % not 8', n; end if;
update routes set area_id='wa_mount_rainier' where id in ('wa_glacier_peak_tahoma_cleaver','wa_glacier_peak_south_tahoma_headwall') and area_id='wa_glacier_peak'; get diagnostics n = row_count; if n<>2 then raise exception 'moved % not 2', n; end if;
end $$;
