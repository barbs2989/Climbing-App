-- Mount Adams duplicate-route dedup. REVIEW BEFORE RUNNING -- contains DELETEs.
--
-- Scope: area wa_mount_adams (route_count 12). Every id below was read back from
-- the live database, not constructed. Note that `id ilike '%adams%'` also matches
-- unrelated routes in other states (ak_ken_adams, ca_pat_adams_dihedral,
-- ct_douglas_adams, ut_sam_adams ...) -- never scope this work by name.
--
-- CONCLUSION AFTER DIFFING ALL COLUMNS:
--   * South set: 3 rows for the one standard route -> collapse to 1.
--   * Northwest Ridge pair: NOT duplicates. Left alone. See section 3.
--
-- The earlier PR (#392) also claimed a duplicate pair for Avalanche Glacier
-- (adams_avalanche_glacier / wa_mount_adams_avalanche_glacier). Only
-- adams_avalanche_glacier exists -- there is nothing to dedup there.

-- ---------------------------------------------------------------------------
-- 0. PRE-FLIGHT. Run this alone first and read the output before continuing.
--    Expect exactly 3 rows. If you get any other number, stop.
-- ---------------------------------------------------------------------------
select id, name, dist_km, gain_ft, high_point_ft,
       (select count(*) from unnest(coalesce(hazards,'{}'::text[]))) as hazard_count
from routes
where id in (
  'wa_mount_adams_south_climb',
  'wa_mount_adams_south_spur',
  'wa_mount_adams_south_side'
)
order by id;

-- ---------------------------------------------------------------------------
-- 1. Drop the empty stub.
--
--    wa_mount_adams_south_side holds NOTHING except id, name, area_id and two
--    false booleans. Every other column is null: no approach, no hazards, no
--    waypoints, no gpx, no grade. It is a placeholder row, not a route.
-- ---------------------------------------------------------------------------
delete from routes where id = 'wa_mount_adams_south_side';

-- ---------------------------------------------------------------------------
-- 2. Collapse south_spur into south_climb.
--
--    Both rows describe the same climb -- Mount Adams' standard South Spur /
--    South Climb from the Cold Springs trailhead. They were enriched twice by
--    different passes and disagree on the numbers.
--
--    Survivor: wa_mount_adams_south_climb
--      - id follows the wa_mount_adams_* convention (south_spur does too, but
--        "South Climb (South Spur)" as a name carries both common aliases)
--      - carries source = 'wa-enrich-batch' and a populated obj_haz
--
--    BUT south_spur has the more accurate figures, so take those first:
--      - dist_km: this column is ONE-WAY across the catalog. Verified against
--        wa_forbidden_peak_west_ridge (5.6 km = 3.5 mi, and Boston Basin is
--        ~3.7 mi one way) and wa_mount_rainier_disappointment_cleaver (11.3 km
--        = 7.0 mi). south_climb's 19.3 km = 12.0 mi is the ROUND TRIP and is
--        wrong by that convention; south_spur's 9.2 km = 5.7 mi is right.
--      - gain_ft: Cold Springs trailhead 5,600 ft to the 12,276 ft summit is
--        6,676 ft, which is south_spur's value exactly. south_climb's 6,700 is
--        rounded.
update routes set dist_km = 9.2, gain_ft = 6676
where id = 'wa_mount_adams_south_climb';

--    Optional -- only if you prefer the structured itinerary. south_spur stores
--    itinerary as the {cal, days:[...]} object the in-app editor reads, while
--    south_climb stores a plain prose string. Uncomment to carry it over:
--
-- update routes r set itinerary = s.itinerary
--   from routes s
--  where r.id = 'wa_mount_adams_south_climb'
--    and s.id = 'wa_mount_adams_south_spur';

delete from routes where id = 'wa_mount_adams_south_spur';

-- ---------------------------------------------------------------------------
-- 3. DO NOT DEDUP THE NORTHWEST RIDGE PAIR.
--
--    adams_northwest_ridge and wa_mount_adams_northwest_ridge look like a
--    naming duplicate but the columns say they are different climbs:
--
--      field         adams_northwest_ridge          wa_mount_adams_northwest_ridge
--      ------------  -----------------------------  ------------------------------
--      fa            Givler, LeBlond, McGowan 1967  Molenaar, Johnson, Ostro, Startzel
--      face          NW Ridge, climber's right of   West Face of the North Ridge
--                    Adams Glacier
--      alpine_grade  Grade II                       Grade III
--      ice_grade     AI2-3                          AI1-2
--      max_angle     45                             50
--      pitches       3                              5
--
--    Different first-ascent parties and different faces means deleting either
--    one probably destroys a real route. Mount Adams has both a Northwest Ridge
--    and a North Face of the Northwest Ridge; these two rows may be exactly
--    that pair, mis-titled.
--
--    Confusingly, wa_mount_adams_northwest_ridge.rope_note reads "North Face of
--    Northwest Ridge, Grade I..." -- which is the OTHER row's name. So at least
--    one row has contaminated fields. That is a research question, not a
--    deletion.
--
--    wa_mount_adams_north_ridge is a clearly separate third route (North
--    Cleaver, aspect N, FA A.G. Aiken / Edward J. Allen). Leave it.
--
--    Also note adams_avalanche_glacier and adams_northwest_ridge lack the wa_
--    prefix every other Washington route uses. Renaming an id means updating
--    anything referencing it, so it is deliberately not done here.

-- ---------------------------------------------------------------------------
-- 4. Fix the cached area count. Two rows were removed, so 12 -> 10.
--    Recomputed rather than hardcoded.
-- ---------------------------------------------------------------------------
update areas a
   set route_count = (select count(*) from routes r where r.area_id = a.id)
 where a.id = 'wa_mount_adams';

-- ---------------------------------------------------------------------------
-- 5. POST-CHECK. Expect: 10 routes, route_count 10, and the two deleted ids
--    absent. If deleted_rows_still_present is not 0, something went wrong.
-- ---------------------------------------------------------------------------
select
  (select count(*) from routes where area_id = 'wa_mount_adams')            as routes_now,
  (select route_count from areas where id = 'wa_mount_adams')               as cached_count,
  (select count(*) from routes
     where id in ('wa_mount_adams_south_side','wa_mount_adams_south_spur')) as deleted_rows_still_present,
  (select dist_km from routes where id = 'wa_mount_adams_south_climb')      as survivor_dist_km,
  (select gain_ft from routes where id = 'wa_mount_adams_south_climb')      as survivor_gain_ft;
