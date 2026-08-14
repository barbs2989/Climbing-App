-- The last four Colorado fourteeners: Crestone Peak, Crestone Needle, Mount Wilson, Maroon Peak.
-- Takes the list to 52 of 53 — which is every peak that is legal to stand on (see Bross, below).
--
-- THESE FOUR WERE DEFERRED BY 0144 for a real reason, and this file does the SMALLER half of what
-- that reason implied. Each already appears inside a COMBINED area:
--
--     co_crestones_the                 crag, 11 routes, holds "Crestone Peak North Buttress",
--                                      "Crestone Traverse", "Ellingwood Ledges" and
--                                      "The Prow (Kit Carson)" — several distinct summits' routes
--     co_maroon_bells                  crag, 3 routes: Bell Cord Couloir, Bells Traverse,
--                                      Megamoronal
--     co_el_diente_peak_mount_wilson   crag, 1 route: "North Buttress - El Diente Peak"
--
-- WHAT THIS FILE DOES NOT DO, deliberately: it MOVES NOTHING. Adding the summits is additive and
-- reversible; re-filing eleven existing routes across four peaks is a different operation with a
-- different risk, and it needs each route adjudicated on its own (the Crestones traverse and the
-- Bells Traverse genuinely span TWO summits and belong to neither alone). The combined crags stay
-- exactly as they are, holding the technical routes climbers file there.
--
-- One consequence worth stating rather than discovering later: `co_crestone_peak_north_pillar` and
-- `co_crestone_peak_north_buttress` are route ids that LOOK peak-scoped to the `co_crestone_peak`
-- this migration creates, while remaining filed under co_crestones_the. That is pre-existing and
-- harmless — ids are unique and the convention is a naming habit, not a foreign key — but it is
-- exactly the kind of thing that reads as a bug on a later pass.
--
-- EL DIENTE AND NORTH MAROON ARE NOT MISSING. Both are 14,000 ft summits and neither is on the 53
-- — they are UNRANKED, with ~239 ft and ~234 ft of prominence against the 300 ft cutoff. Their
-- absence from the roster is correct, and adding them would inflate the list beyond what it
-- advertises.
--
-- ROUTE NAMES come from 14ers.com pages that self-identify as each peak's "Standard Route
-- Description", cross-checked against Wikipedia — the same standard 0144 applied. None is a
-- compass direction invented here.
--
-- MOUNT WILSON IS THE ONE WHERE SOURCES DISAGREE, and the disagreement is about WHICH ROUTE IS
-- STANDARD, not about any name:
--     * 14ers.com currently labels SOUTHWEST SLOPES (Class 3) the Standard Route.
--     * Wikipedia and SummitPost describe the NORTH SLOPES / North Face from Navajo Basin
--       (Class 4) as the normal route, and 14ers.com still hosts it as a first-class route.
-- Both names are real and sourced. This file takes Southwest Slopes because 0144 resolved every
-- one of its seventeen peaks by 14ers.com's own Standard Route label, and switching authority for
-- one row would make the set incoherent. The alternative is recorded here rather than dropped —
-- if a climber reports the North Slopes as the normal line, that is a known disagreement and not
-- a defect. Do NOT also import the North Slopes as a second "standard".
--
-- CRESTONE NEEDLE'S CLASS IS CONTESTED and stored as the current one. 14ers.com and Wikipedia both
-- say Class 4 today; the South Face was long published as Class 3 and many live sources still say
-- so. The route NAME is undisputed. Stored 4.
--
-- Elevations are 14ers.com's current (LiDAR-derived) figures, matching where 0144 took its own.
-- The roster in scripts/oneoff/roster-data.mjs advertises slightly different numbers for three of
-- these (Crestone Needle 14,203 against 14,196) — that is untouched on purpose: the card's
-- displayed elevation comes from the ROSTER, not from this column, and the resolver's elevation
-- cross-check tolerates 500 ft, so nothing here depends on the two agreeing to the foot.
--
-- PARENTS follow the catalog's own structure rather than 0144's habit. Mount Wilson goes under
-- co_northern_san_juans because that is where co_wilson_peak — the fourteener already on the
-- roster — and the combined El Diente area both sit; filing it under co_san_juans beside 0144's
-- other San Juan peaks would separate it from its own group. All four parents were checked to
-- hold 0 direct routes, so trg_areas_leaf_xor accepts the children.
--
--     Class 1-3 -> scrambling          Class 4 -> mountaineering   (Crestone Needle only)
--
-- `grade_num` stays NULL — a class rating is not on the sortable rock-grade ladder.
-- Re-runnable: every statement is ON CONFLICT DO NOTHING.

begin;

insert into areas (id, name, parent_id, area_type, elevation_ft, lat, lng, source) values
  ('co_crestone_peak',   'Crestone Peak',   'co_sangre_de_cristo_range', 'peak', 14299, 37.9669, -105.5854, 'fourteeners'),
  ('co_crestone_needle', 'Crestone Needle', 'co_sangre_de_cristo_range', 'peak', 14196, 37.9647, -105.5767, 'fourteeners'),
  ('co_mount_wilson',    'Mount Wilson',    'co_northern_san_juans',     'peak', 14256, 37.8391, -107.9916, 'fourteeners'),
  ('co_maroon_peak',     'Maroon Peak',     'co_elk_mountains',          'peak', 14163, 39.0708, -106.9890, 'fourteeners')
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, grade_system, source) values
  ('co_crestone_peak_south_face',      'co_crestone_peak',   'South Face',        'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_crestone_needle_south_face',    'co_crestone_needle', 'South Face',        'mountaineering', 'Class 4', 'class', 'fourteeners'),
  ('co_mount_wilson_southwest_slopes', 'co_mount_wilson',    'Southwest Slopes',  'scrambling',     'Class 3', 'class', 'fourteeners'),
  ('co_maroon_peak_south_ridge',       'co_maroon_peak',     'South Ridge',       'scrambling',     'Class 3', 'class', 'fourteeners')
on conflict (id) do nothing;

commit;

-- Verify AFTER, as SEPARATE statements — a failing SELECT inside the transaction rolls the inserts
-- back, which is how 0097's writes were undone:
--
--   select count(*) from areas  where source='fourteeners';   -- expect 43 (39 after 0144 + 4)
--   select count(*) from routes where source='fourteeners';   -- expect 40 (36 after 0144 + 4)
--   select id, path from areas where id='co_mount_wilson';
--     -- must be usa.colorado.co_alpine_rock.co_san_juans.co_northern_san_juans.co_mount_wilson
--   select route_count from areas where id='co_crestones_the';   -- expect 11, UNCHANGED
--   select route_count from areas where id='co_maroon_bells';    -- expect 3,  UNCHANGED
--
-- The last two are the point: this migration must not have moved anything.
--
-- Then `npm run check:counts` and re-run scripts/oneoff/resolve-peak-rosters.mjs: Colorado 14ers
-- should read 52 of 53 usable, the remaining one being MOUNT BROSS, whose summit is still
-- privately owned and illegal to stand on — see 0144. Colorado is then COMPLETE to its achievable
-- ceiling, and every peak list in the app is either complete or complete-but-for-a-closure.
--
-- FOLLOW-UP THIS FILE DOES NOT DO:
--   * co_crestones_the holds "Ellingwood Ledges" (5.7), which is the Ellingwood Arete on CRESTONE
--     NEEDLE and a Fifty Classic Climbs route. Whether it should move onto the new
--     co_crestone_needle, and whether it is correctly tagged for the fifty list, is worth its own
--     look — moving it changes which area a Fifty Classic is filed under, which is not a change to
--     make as a side effect of adding summits.
