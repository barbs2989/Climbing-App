-- Seventeen more Colorado fourteeners, plus the route Mount Belford was missing.
-- Takes the Colorado 14ers tick list from 30 usable objectives to 48 of 53.
--
-- EVERY ONE WAS ADJUDICATED INDIVIDUALLY (scripts/oneoff/adjudicate-colorado-fourteeners.mjs),
-- because MISSING IS A HYPOTHESIS in this catalog and not a finding. The exact-name matcher says
-- "no area with this name" for all of these, but the first Colorado pass implied 41 were absent
-- and a loose probe showed 18 — the difference between 0137 and up to 23 duplicate mountains. A
-- duplicate peak splits a mountain's routes across two rows permanently (0106/0107/0112 each
-- repaired that by hand). So each name was probed loosely and every Colorado near miss read.
--
-- The near misses are almost all unrelated CRAGS that share one word, and they are worth naming
-- so nobody re-derives them: Mount Massive matched "A Massive Pain in the ASS"; Wetterhorn Peak
-- matched a boulder field on its approach trail; San Luis Peak matched the 412-route San Luis
-- Valley region; Mount Yale matched "Royale Rock"; Grays Peak matched "Graysill Boulder".
--
-- TWO DECOYS WERE CAUGHT BY READING THE ROUTES, not the names — the method that settled the
-- Three Sisters transposition in 0139:
--     co_challenger   holds "S.C.R.U.B." (5.10a) and "East Face/Challenger" — a sport/rock crag,
--                     NOT Challenger Point the fourteener.
--     co_crestone     holds routes literally named "Unknown" (5.9) and "Unknown II" (5.11d) — a
--                     crag, not Crestone Peak.
-- Both would have been accepted by a name match and each would have produced a wrong summit on a
-- tick list, which is worse than a short list.
--
-- FOUR FOURTEENERS ARE DELIBERATELY NOT HERE, because they already live inside COMBINED areas and
-- splitting those is a different and riskier operation than adding an absent peak — it means
-- deciding where existing routes go:
--     co_el_diente_peak_mount_wilson   ONE area named for TWO fourteeners, holding exactly one
--                                      route: "North Buttress - El Diente Peak". So Mount Wilson
--                                      has nothing there despite being in the area's name.
--     co_maroon_bells                  holds Bell Cord Couloir and the Bells Traverse — routes
--                                      that span BOTH Maroon summits.
--     co_crestones_the                 holds "The Prow (Kit Carson)", so it is a group area
--                                      covering several distinct peaks.
-- That leaves Mount Wilson, Maroon Peak, Crestone Peak and Crestone Needle for a separate change.
--
-- MOUNT BROSS IS EXCLUDED ON PURPOSE, and this is the one to read before "finishing" the list.
-- `co_mount_bross` exists and holds 0 routes, so it looks exactly like Mount Belford below — one
-- route away from complete. It is not. THE SUMMIT IS STILL LEGALLY CLOSED: the USFS permanently
-- added 480 acres of the DeCaLiBron corridor to Pike-San Isabel NF in March 2026, but the summit
-- itself remains privately owned (defunct mine shafts) and standing on it is trespassing. The
-- West Slopes route crosses that ground. A tick list is an invitation to go climb something, so
-- Bross must not carry one — the same rule that kept Eagle Rock Spire off the Desert Towers list
-- for being on Navajo Nation land. Colorado therefore tops out at 52 achievable, not 53.
--
-- MOUNT LINDSEY IS INCLUDED BUT CONDITIONAL. It reopened in March 2025 after a ~4-year closure,
-- following Colorado's 2023 Recreational Use Statute revision, and access now requires a SIGNED
-- ELECTRONIC WAIVER IN ADVANCE (mountlindseywaiver.com). Only the standard gully and the ridge
-- route from the primary trailhead are permitted; any other line is trespassing. That belongs in
-- the route's access prose, which this migration does not write — see the note at the bottom.
--
-- ROUTE NAMES come from 14ers.com, whose route pages self-identify as each peak's "Standard Route
-- Description", cross-checked against Wikipedia/GNIS for coordinates and elevation. None is a
-- compass direction invented here. Three are COMPOSITE — "Via Challenger Point", "Via Mt.
-- Shavano", "Via Redcloud Peak" — because that is genuinely what the source calls them and each
-- standard ascent really does traverse from the neighbouring summit. 0137 already used exactly
-- this shape for Mount Oxford's "Via Mount Belford".
--
-- GRADES carry the class and NOT the source's easy/difficult qualifier. 14ers.com rates Castle
-- Peak "Difficult Class 2" and Kit Carson / Lindsey "Easy Class 3"; those qualifiers are prose
-- about a class, and `grade` is rendered as a compact pill — see CLAUDE.md on writing an
-- explanation into a display field. The class is what is stored.
--
--     Class 1-3 -> scrambling          Class 4 -> mountaineering   (Sunlight Peak only)
--
-- ELEVATIONS are the traditional NGVD29 figures every guidebook and tick list uses, which is what
-- 0137 already stored (Mount Elbert 14,440). Wikipedia has moved to NAVD88/NAPGD2022 and reads
-- 1-3 ft lower on six of these; mixing the two datums inside one list would be the real error.
--
-- KIT CARSON: GNIS's official name is "Kit Carson Mountain" (renamed from Peak in 1970) but
-- climbers, 14ers.com and Wikipedia all use "Kit Carson Peak", and this is a climbing catalog, so
-- the area takes the climbers' name. The roster carries the GNIS spelling, so an ALIASES entry in
-- resolve-peak-rosters.mjs bridges the two — the same mechanism as Grace Peak / East Dix.
--
-- Mount Lindsey's coordinate is the GNIS/Wikipedia one; 14ers.com places the summit ~370 m away
-- and it is the only peak of the nineteen where the sources disagree.
--
-- `grade_num` stays NULL — a class rating is not on the sortable rock-grade ladder. `path` is set
-- by the areas_set_path trigger; `route_count` by a trigger on routes. Every parent below was
-- checked to hold 0 direct routes, so trg_areas_leaf_xor accepts the children.
--
-- Re-runnable: every statement is ON CONFLICT DO NOTHING.

begin;

-- 1. The seventeen peaks. co_sawatch_range / co_front_range / co_mosquito_range /
--    co_elk_mountains came from 0137; co_san_juans and co_sangre_de_cristo_range already existed.
insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng, source) values
  ('co_mount_massive',     'Mount Massive',     'co_sawatch_range',          'peak', 14427, 39.1875, -106.4756, 'fourteeners'),
  ('co_la_plata_peak',     'La Plata Peak',     'co_sawatch_range',          'peak', 14344, 39.0295, -106.4730, 'fourteeners'),
  ('co_mount_yale',        'Mount Yale',        'co_sawatch_range',          'peak', 14200, 38.8442, -106.3138, 'fourteeners'),
  ('co_tabeguache_peak',   'Tabeguache Peak',   'co_sawatch_range',          'peak', 14158, 38.6255, -106.2508, 'fourteeners'),
  ('co_grays_peak',        'Grays Peak',        'co_front_range',            'peak', 14275, 39.6338, -105.8176, 'fourteeners'),
  ('co_mount_lincoln',     'Mount Lincoln',     'co_mosquito_range',         'peak', 14293, 39.3515, -106.1116, 'fourteeners'),
  ('co_mount_sherman',     'Mount Sherman',     'co_mosquito_range',         'peak', 14043, 39.2251, -106.1701, 'fourteeners'),
  ('co_castle_peak',       'Castle Peak',       'co_elk_mountains',          'peak', 14274, 39.0097, -106.8614, 'fourteeners'),
  ('co_uncompahgre_peak',  'Uncompahgre Peak',  'co_san_juans',              'peak', 14318, 38.0717, -107.4621, 'fourteeners'),
  ('co_mount_eolus',       'Mount Eolus',       'co_san_juans',              'peak', 14087, 37.6220, -107.6227, 'fourteeners'),
  ('co_sunlight_peak',     'Sunlight Peak',     'co_san_juans',              'peak', 14061, 37.6274, -107.5957, 'fourteeners'),
  ('co_san_luis_peak',     'San Luis Peak',     'co_san_juans',              'peak', 14023, 37.9868, -106.9313, 'fourteeners'),
  ('co_wetterhorn_peak',   'Wetterhorn Peak',   'co_san_juans',              'peak', 14021, 38.0607, -107.5109, 'fourteeners'),
  ('co_sunshine_peak',     'Sunshine Peak',     'co_san_juans',              'peak', 14004, 37.9228, -107.4256, 'fourteeners'),
  ('co_kit_carson_peak',   'Kit Carson Peak',   'co_sangre_de_cristo_range', 'peak', 14167, 37.9797, -105.6025, 'fourteeners'),
  ('co_challenger_point',  'Challenger Point',  'co_sangre_de_cristo_range', 'peak', 14086, 37.9803, -105.6066, 'fourteeners'),
  ('co_mount_lindsey',     'Mount Lindsey',     'co_sangre_de_cristo_range', 'peak', 14055, 37.5847, -105.4408, 'fourteeners')
on conflict (id) do nothing;

-- 2. One standard route per peak, plus the one Mount Belford was missing. co_mt_belford already
--    exists (parented to co_leadville_ice) and held ZERO routes, so it needed a ROUTE and not a
--    peak — creating an area for it would have been the duplicate. Same shape as or_middle_sister
--    in 0138. Its parent is an odd home for a Sawatch fourteener, but re-parenting is a separate
--    question from making the peak tickable, so it is left where it is.
insert into routes (id, area_id, name, discipline, grade, grade_system, source) values
  ('co_mount_massive_east_slopes',           'co_mount_massive',    'East Slopes',          'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_la_plata_peak_northwest_ridge',       'co_la_plata_peak',    'Northwest Ridge',      'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_yale_southwest_slopes',         'co_mount_yale',       'Southwest Slopes',     'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_tabeguache_peak_via_mount_shavano',   'co_tabeguache_peak',  'Via Mt. Shavano',      'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_grays_peak_north_slopes',             'co_grays_peak',       'North Slopes',         'scrambling',     'Class 1', 'class', 'fourteeners'),
  ('co_mount_lincoln_west_ridge',            'co_mount_lincoln',    'West Ridge',           'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_sherman_southwest_ridge',       'co_mount_sherman',    'Southwest Ridge',      'scrambling',     'Class 1', 'class', 'fourteeners'),
  ('co_castle_peak_northeast_ridge',         'co_castle_peak',      'Northeast Ridge',      'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_uncompahgre_peak_south_ridge',        'co_uncompahgre_peak', 'South Ridge',          'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_eolus_northeast_ridge',         'co_mount_eolus',      'Northeast Ridge',      'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_sunlight_peak_south_face',            'co_sunlight_peak',    'South Face',           'mountaineering', 'Class 4', 'class', 'fourteeners'),
  ('co_san_luis_peak_northeast_ridge',       'co_san_luis_peak',    'Northeast Ridge',      'scrambling',     'Class 1', 'class', 'fourteeners'),
  ('co_wetterhorn_peak_southeast_ridge',     'co_wetterhorn_peak',  'Southeast Ridge',      'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_sunshine_peak_via_redcloud_peak',     'co_sunshine_peak',    'Via Redcloud Peak',    'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_kit_carson_peak_via_challenger',      'co_kit_carson_peak',  'Via Challenger Point', 'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_challenger_point_north_slope',        'co_challenger_point', 'North Slope',          'scrambling',     'Class 2', 'class', 'fourteeners'),
  ('co_mount_lindsey_northwest_gully',       'co_mount_lindsey',    'Northwest Gully',      'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_mt_belford_northwest_ridge',          'co_mt_belford',       'Northwest Ridge',      'scrambling',     'Class 2', 'class', 'fourteeners')
on conflict (id) do nothing;

commit;

-- Verify AFTER, as SEPARATE statements — a failing SELECT inside the transaction rolls the
-- inserts back, which is how 0097's writes were undone:
--
--   select count(*) from areas  where source='fourteeners';   -- expect 39 (22 from 0137 + 17)
--   select count(*) from routes where source='fourteeners';   -- expect 36 (18 from 0137 + 18)
--   select route_count from areas where id='co_mt_belford';   -- expect 1, was 0
--   select id, path from areas where id='co_kit_carson_peak';
--     -- must be usa.colorado.co_sangre_de_cristo_range.co_kit_carson_peak
--   select count(*) from routes where area_id='co_mount_bross';  -- expect 0, deliberately
--
-- Then `npm run check:counts` and re-run scripts/oneoff/resolve-peak-rosters.mjs: Colorado 14ers
-- should read 48 of 53 usable.
--
-- FOLLOW-UP THIS FILE DOES NOT DO, recorded so it is not lost:
--   * Mount Lindsey's waiver requirement belongs in that route's access prose. This migration
--     writes the same minimal column set as 0137/0138/0140, and populating `access` for one route
--     of eighteen would be worse than a note — the enrichment path is where that text belongs.
--   * `co_west_eolus` holds a route ("South Face Direct", 5.7) but NO source could find a feature
--     named "West Eolus" — North Eolus is real and unranked, West Eolus appears to be neither.
--     That area is suspect and wants its own look.
