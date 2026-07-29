-- Remove four duplicate route rows found by scripts/audit-duplicate-routes.mjs.
--
-- Run AFTER scripts/dedup-merge-wa-peaks.mjs, which has already been applied. It moved the
-- only two things worth keeping off these rows:
--   * "Avalanche hazard when snow-covered"  -> wa_mount_stuart_cascadian_couloir (+ alpine_grade II)
--   * "Unprotected scrambling above the last bolted anchor to reach the true summit"
--                                           -> wa_the_tooth_fairy
-- Everything else on the four was either redundant with the keeper or worse than it.
--
--   KEEP                                    DELETE                        why the keeper wins
--   wa_mount_stuart_cascadian_couloir       stuart_cascadian_couloir      55 vs 37 fields; 19.3 km
--                                                                        round trip vs a 9.6 km
--                                                                        one-way figure (ratio 2.01,
--                                                                        the same tell as Adams)
--   wa_mount_stuart_west_ridge              stuart_west_ridge             56 vs 39 fields; loser has
--                                                                        no distance or gain at all
--   wa_the_tooth_fairy                      wa_the_tooth_tooth_fairy      54 vs 45 fields, 2 gpx pts
--                                                                        vs none
--   wa_dragontail_peak_serpentine_arete     wa_serpentine_arete           50 vs 29 fields; loser is
--                                                                        "Serpentine Arete" without
--                                                                        the accent
--
-- NOTE on the two survivors whose id doesn't match convention: wa_the_tooth_fairy keeps its id
-- even though wa_the_tooth_tooth_fairy matches the area-prefix pattern better, and the same
-- goes for the Serpentine pair. Route ids are referenced by logs, saved objectives and deep
-- links, so the row with the real content keeps its id rather than being renamed into the
-- tidier one.
--
-- Left for a human on purpose. A wrong DELETE in this table destroyed Triple Couloirs once.

-- 1. LOOK BEFORE YOU CUT. Expect 8 rows: four fat keepers and four thin losers, matching the
--    field counts above. If it doesn't look like that, stop.
select id, name, dist_km, gain_ft, alpine_grade,
       array_length(hazards, 1) as hazards,
       jsonb_array_length(to_jsonb(gpx)) as gpx_points
from routes
where id in (
  'wa_mount_stuart_cascadian_couloir','stuart_cascadian_couloir',
  'wa_mount_stuart_west_ridge','stuart_west_ridge',
  'wa_the_tooth_fairy','wa_the_tooth_tooth_fairy',
  'wa_dragontail_peak_serpentine_arete','wa_serpentine_arete'
)
order by name, id;

-- 2. Delete the four duplicates.
delete from routes where id = 'stuart_cascadian_couloir';
delete from routes where id = 'stuart_west_ridge';
delete from routes where id = 'wa_the_tooth_tooth_fairy';
delete from routes where id = 'wa_serpentine_arete';

-- 3. Recompute the cached counts on the three affected peaks. Recomputed rather than
--    hardcoded, so it stays right if anything else changed.
update areas a
set route_count = (select count(*) from routes r where r.area_id = a.id)
where a.id in ('wa_mount_stuart','wa_the_tooth','wa_dragontail_peak');

-- 4. VERIFY: expect 4 rows (the keepers only), and sane route_counts.
-- If these result tables don't appear, your paste was truncated.
select id, name, dist_km, alpine_grade, array_length(hazards, 1) as hazards
from routes
where id in (
  'wa_mount_stuart_cascadian_couloir','stuart_cascadian_couloir',
  'wa_mount_stuart_west_ridge','stuart_west_ridge',
  'wa_the_tooth_fairy','wa_the_tooth_tooth_fairy',
  'wa_dragontail_peak_serpentine_arete','wa_serpentine_arete'
)
order by id;

select id, name, route_count from areas
where id in ('wa_mount_stuart','wa_the_tooth','wa_dragontail_peak') order by id;
