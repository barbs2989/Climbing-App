-- 0213: Mt. Baker, Colfax, Shuksan and friends were filed twice — once under
-- "Bellingham and Mt Baker Hwy", and again as MP-named copies under "North Cascades".
--
-- Reported directly: "why is Mt. Baker under the North Cascades area? We already have Mount
-- Baker in the correct area under Bellingham and Mt Baker highway. Also there's ++ ice
-- climbing in north cascades. Don't those need to be under specific areas?" Approved: apply.
--
-- HOW IT HAPPENED. `import-mp-grades.mjs --create-areas` (#1913, applied live) walks each MP
-- route's location path and CREATES any level it cannot find by name under the parent it
-- has reached. MP files these peaks as `North Cascades > Mt. Baker`; we file them as
-- `Bellingham and Mt Baker Hwy > Mount Baker`. Different parent, different spelling, so the
-- importer minted a new area — and when the slug collided with our real one it appended a
-- counter, which is why the copies are `wa_colfax_peak_2`, `wa_main_peak_5`,
-- `wa_nooksack_tower_2`, `wa_mesahchie_peak_2`. Its near-duplicate route check only looks
-- inside the one area, so the classics on those peaks came in a second time as thin
-- 15-column MP rows beside our 40–72-column enriched ones.
--
-- WHAT MOVES WHERE (read live on 2026-09-25):
--
--   North Cascades > Mt. Baker [3]            -> Mount Baker (Hwy): all 3 are duplicates
--   North Cascades > Colfax Peak [3]          -> Colfax Peak (Hwy): all 3 are duplicates
--   North Cascades > Mt. Shuksan > Main Peak  -> Mount Shuksan (Hwy): 4 duplicates; Northwest
--                                                Couloir (not on the Hwy side) MOVES there
--   ... > Mt. Shuksan > Nooksack Tower [1]    -> Nooksack Tower (Hwy): Beckey-Schmidtke dup
--   ... > Mt. Shuksan > Lake Ann Buttress [1] -> re-parented under Bellingham and Mt Baker Hwy
--                                                (its own formation; the one route is unique)
--   ++ Ice climbing North Cascades
--        > Table Mountain Ice [2]             -> both routes MOVE onto Table Mountain (Hwy)
--   North Cascades > Pan Dome Falls [0]       -> deleted; empty copy of Pan Dome Falls Area
--   North Cascades > Mesahchie Peak [1]       -> the E Ridge route MOVES to our Mesahchie Peak
--                                                (North Cascades Core), 2 m away, which holds
--                                                only the West Ridge
--
-- Mamie Peak, Snowfield Peak and the Alpine Traverses are genuinely North Cascades and stay.
--
-- The keeper of each duplicate pair is the Hwy-side row (it carries the FA, pitches, approach
-- and the rest of the enrichment). The ONLY columns copied are ice_grade_num /
-- mixed_grade_num, blank on every keeper, so these climbs keep answering a WI or M range
-- search. Deliberately NOT copied: MP's placeholder `pitches` = 1 on glacier routes;
-- `grade_num` = 3 on North Ridge (5.x scale, contradicts "Grade III(+)"); `grade_system` /
-- `disciplines` tags the keepers never carried.
--
-- No user data points at anything here: contributions, topos, topo_lines, checkins,
-- gps_submissions, content_reports, objectives, hazard_votes, climb_logs, crew_listings,
-- user_itineraries, crews and user_lists all counted 0. Full row snapshot:
-- audits/nc-duplicate-peaks-2026-09-25/rollback.json.
--
-- ORDER IS LOAD-BEARING: routes out before an area is deleted; Lake Ann Buttress re-parented
-- before Mt. Shuksan is deleted. Re-parenting does NOT move route_count (only the routes
-- trigger does), so the affected ancestors are recounted at the end, as 0098 did.

begin;

-- ── 1. Keep the per-scale grades the MP rows carried ────────────────────────
-- Scalar subquery per row, never UPDATE ... FROM (0103: it reported success and changed 0).
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_mt_baker_north_ridge'))              where id = 'wa_mount_baker_north_ridge';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_mt_baker_cockscomb_ridge'))          where id = 'wa_mount_baker_cockscomb_ridge';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_mt_baker_coleman_headwall'))         where id = 'wa_mount_baker_coleman_headwall';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_colfax_peak_2_ford_s_theatre'))      where id = 'wa_colfax_peak_fords_theatre';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_main_peak_5_sw_couloir_and_face'))   where id = 'wa_sw_couloir_and_face';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_main_peak_5_fisher_chimneys'))       where id = 'wa_mount_shuksan_fisher_chimneys';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_main_peak_5_price_glacier')),
                  mixed_grade_num = coalesce(mixed_grade_num, (select mixed_grade_num from routes where id = 'wa_main_peak_5_price_glacier')) where id = 'wa_mount_shuksan_price_glacier';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_main_peak_5_north_face'))            where id = 'wa_mount_shuksan_north_face';
update routes set ice_grade_num = coalesce(ice_grade_num, (select ice_grade_num from routes where id = 'wa_nooksack_tower_2_beckey_schmidtke')) where id = 'wa_nooksack_tower_beckey_route';

-- ── 2. Drop the duplicate MP rows, only if all 11 keepers exist ────────────
delete from routes where id in (
  'wa_mt_baker_north_ridge', 'wa_mt_baker_cockscomb_ridge', 'wa_mt_baker_coleman_headwall',
  'wa_colfax_peak_2_cosley_houston', 'wa_colfax_peak_2_ford_s_theatre', 'wa_colfax_peak_2_polish_route',
  'wa_main_peak_5_sw_couloir_and_face', 'wa_main_peak_5_fisher_chimneys', 'wa_main_peak_5_price_glacier',
  'wa_main_peak_5_north_face', 'wa_nooksack_tower_2_beckey_schmidtke')
  and (select count(*) from routes where id in (
  'wa_mount_baker_north_ridge', 'wa_mount_baker_cockscomb_ridge', 'wa_mount_baker_coleman_headwall',
  'wa_colfax_peak_cosley_houston', 'wa_colfax_peak_fords_theatre', 'wa_colfax_peak_polish_route',
  'wa_sw_couloir_and_face', 'wa_mount_shuksan_fisher_chimneys', 'wa_mount_shuksan_price_glacier',
  'wa_mount_shuksan_north_face', 'wa_nooksack_tower_beckey_route')) = 11;

-- ── 3. Move the routes that exist only on the North Cascades copies ────────
update routes set area_id = 'wa_mount_shuksan'  where id = 'wa_main_peak_5_northwest_couloir';
update routes set area_id = 'wa_table_mountain' where id in ('wa_table_mountain_ice_east_face', 'wa_table_mountain_ice_death_picnic');
update routes set area_id = 'wa_mesahchie_peak' where id = 'wa_mesahchie_peak_2_e_ridge_via_mesahchie_icefall_couloir_variation';

-- ── 4. Lake Ann Buttress is its own formation: re-parent the leaf ──────────
update areas set parent_id = 'wa_shuksan_baker_neighbors' where id = 'wa_lake_ann_buttress';

-- ── 5. Delete the emptied copies, children before parents ──────────────────
delete from areas where id in ('wa_main_peak_5', 'wa_nooksack_tower_2', 'wa_table_mountain_ice')
  and not exists (select 1 from routes where area_id = areas.id);
delete from areas where id in ('wa_mt_baker', 'wa_colfax_peak_2', 'wa_mesahchie_peak_2', 'wa_pan_dome_falls',
                               'wa_mt_shuksan', 'wa_ice_climbing_north_cascades')
  and not exists (select 1 from routes where area_id = areas.id)
  and not exists (select 1 from areas c where c.parent_id = areas.id);

-- ── 6. Recount every area whose subtree changed ────────────────────────────
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_north_cascades', 'wa_hwy20_ncnp', 'wa_shuksan_baker_neighbors', 'wa_lake_ann_buttress',
               'wa_mount_shuksan', 'wa_table_mountain', 'wa_north_cascades_core', 'wa_mesahchie_peak',
               'wa_mount_baker', 'wa_colfax_peak', 'wa_nooksack_tower', 'wa_northwest', 'washington', 'usa');

commit;

-- Verify by RE-READING, not by "it ran without error":
--   select id, name, route_count from areas where parent_id = 'wa_north_cascades' order by name;
--     -> no Mt. Baker, Colfax, Mt. Shuksan, Mesahchie, Pan Dome Falls or ++ Ice climbing
--   select area_id, count(*) from routes where area_id in ('wa_mount_baker','wa_colfax_peak',
--     'wa_mount_shuksan','wa_table_mountain','wa_mesahchie_peak','wa_lake_ann_buttress') group by 1;
--     -> 9, 4, 11, 3, 2, 1
