-- WA alpine audit — batch 50 (2026-08-06)
-- Routes: wa_ultramega_ok (Burgundy Spire), wa_upper_north_ridge_w_great_gendarme
--         (Mount Stuart), wa_vasiliki_ridge_standard (Vasiliki Ridge / Ares Tower),
--         wa_vesper_peak_north_face_ragged_edge (Vesper Peak), wa_warrior_peak_standard
--         (Warrior Peak), wa_west_craggy_peak_standard_route (West Craggy Peak),
--         wa_west_twin_needle_south_route (West Twin Needle), wa_whatcom_peak_southwest_route
--         (Whatcom Peak), wa_whitehorse_mountain_nw_shoulder + wa_whitehorse_mountain_r1
--         (Whitehorse Mountain).
-- Researched via 8 parallel agents, one per peak group (Whitehorse Mountain's two
-- routes audited together as a sibling-contamination check). See
-- audits/wa-alpine-audit-log.md for the full writeup, including several
-- higher-stakes findings (a likely FA-credit swap on Mount Stuart, heavy
-- cross-route contamination on Whitehorse Mountain's r1) left flagged rather
-- than auto-fixed because this run's WebFetch access to primary sources
-- (Mountain Project, SummitPost, Peakbagger, Wikipedia, Beckey's guide) was
-- blocked at the network/proxy level all session, leaving only WebSearch
-- snippet corroboration for the highest-stakes claims.
-- Every confirmed fix below was re-checked against the live DB snapshot taken
-- at the start of this run before this file was written. All WHERE clauses
-- include the current (wrong) value as a safety check per project convention.

-- =========================================================================
-- Vasiliki Ridge (wa_vasiliki_ridge_standard) — high_point_ft never caught up
-- to the row's own `corrections` field, which already documents a 2025
-- GPS/LiDAR survey (countryhighpoints.com) settling on 8,203 ft over
-- Wikipedia's older rounded 8,190 ft figure. The area row and this route's
-- own summit waypoint (elev 8203) both already carry the corrected figure --
-- only high_point_ft was never updated to match.
-- =========================================================================

UPDATE routes SET high_point_ft = 8203
WHERE id = 'wa_vasiliki_ridge_standard' AND high_point_ft = 8190;

-- =========================================================================
-- Warrior Peak (wa_warrior_peak / wa_warrior_peak_standard) — three
-- independent fixes, all corroborated by Wikipedia/PeakVisor/Wikidata.
-- =========================================================================

-- Area elevation (7314) contradicted the route's own high_point_ft (7320,
-- already correct) and external sources (Wikipedia/PeakVisor/Wikidata all
-- give 7,320+ ft). The summit waypoint's numeric elev field (7314) also
-- disagreed with its own note text ("~7,320 ft").
UPDATE areas SET elevation_ft = 7320
WHERE id = 'wa_warrior_peak' AND elevation_ft = 7314;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elev}', '7320', false)
WHERE id = 'wa_warrior_peak_standard'
  AND waypoints->7->>'name' = 'Warrior Peak (Southeast Summit)'
  AND (waypoints->7->>'elev')::numeric = 7314;

-- Prominence: Wikipedia/PeakVisor independently and consistently give 760 ft;
-- no source found corroborates the on-file 804 ft.
UPDATE areas SET prominence_ft = 760
WHERE id = 'wa_warrior_peak' AND prominence_ft = 804;

-- rock_grade ("3rd class scrambling") directly contradicted this row's own
-- grade ("Class 4 / low 5th"), pitch_detail, and its own waypoint hazard note
-- ("Class 4 to low 5th (5.2)") describing the summit block step.
UPDATE routes SET rock_grade = 'Class 4, low 5th (5.0-5.2)'
WHERE id = 'wa_warrior_peak_standard' AND rock_grade = '3rd class (YDS) scrambling';

-- access.land_manager (snake_case, "NPS only") contradicted the more detailed
-- access.landManager (camelCase) on the same row, which correctly splits the
-- approach between Olympic NF (lower, USFS) and Olympic NP (upper cirque),
-- and was itself verified against the WTA/USFS-documented boundary sign
-- ~7.1 mi in. Brought land_manager in line with the row's own landManager.
UPDATE routes SET access = jsonb_set(
  access, '{land_manager}',
  '"Olympic National Forest (Quilcene Ranger District) administers the lower Buckhorn Wilderness approach (Camp Handy, Boulder Shelter), while Olympic National Park administers the upper cirque, Home Lake, Constance Pass, and the summit."'::jsonb,
  false
)
WHERE id = 'wa_warrior_peak_standard'
  AND access->>'land_manager' = 'National Park Service — Olympic National Park (Olympic Wilderness)';

-- =========================================================================
-- Burgundy Spire (wa_ultramega_ok) — three fixes, all sourced either from
-- the row's own internally-consistent waypoints/itinerary or from WSDOT.
-- =========================================================================

-- dist_km (10.62) is double what the route's own waypoints/itinerary imply:
-- waypoints[0].distMi=3.3 (one-way to the summit) = 5.31 km. Per CLAUDE.md,
-- dist_km is meant to be one-way and doubled by the app for round-trip
-- display; 10.62 already reads as the round-trip figure (itinerary's own
-- "6.6 mi" day total), so the app would double-count it to ~17 mi.
UPDATE routes SET dist_km = 5.31
WHERE id = 'wa_ultramega_ok' AND dist_km = 10.62;

-- gain_ft (4170) disagreed with this row's own loss_ft (4300) for a
-- car-to-car round trip, where gain must equal loss. The row's own
-- itinerary.days[0] already carries the reconciled 4300/4300 figure --
-- applying it to the top-level gain_ft column, same "note has the right
-- answer, column was never updated" pattern as the Vasiliki Ridge fix above.
UPDATE routes SET gain_ft = 4300
WHERE id = 'wa_ultramega_ok' AND gain_ft = 4170 AND loss_ft = 4300;

-- road.seasonalGate's closure start date (Dec 12, 2025) doesn't match
-- WSDOT's official 2025-26 season announcement (SR-20 over Washington Pass
-- closed for the season Thursday, Dec 4, 2025 at 6pm). Reopening date
-- (June 14, 2026) was independently confirmed correct and left unchanged.
UPDATE routes
SET road = jsonb_set(
  road, '{seasonalGate}',
  '"SR-20 closes seasonally over Washington Pass due to avalanche danger (closed Dec 4, 2025-June 14, 2026 in the 2025-26 season, with exact dates varying by year)."'::jsonb,
  false
)
WHERE id = 'wa_ultramega_ok' AND road->>'seasonalGate' LIKE '%Dec 12, 2025%';

-- =========================================================================
-- Mount Stuart (wa_upper_north_ridge_w_great_gendarme) — ranger district
-- name fix, same recurring nonexistent/misnamed-district pattern already
-- fixed on this same land unit in batches 4, 5, and 12 ("Leavenworth Ranger
-- District" is not an official USFS district name; the correct current name
-- for the north-side district headquartered in Leavenworth is Wenatchee
-- River Ranger District).
-- =========================================================================

UPDATE routes
SET emergency = jsonb_set(
      emergency, '{rangerStation}',
      '"Wenatchee River Ranger District (north) / Cle Elum Ranger District (south), Okanogan-Wenatchee NF"'::jsonb,
      false
    ),
    corrections = '2026-08-06: emergency.rangerStation corrected from "Leavenworth Ranger District" (not an official USFS district name) to "Wenatchee River Ranger District", matching the identical fix already applied to this same land unit on Bonanza Peak (batch 4), Chiwawa Mountain (batch 5), and Fortress Mountain (batch 12). NOTE: this batch also surfaced several likely errors on this row NOT auto-fixed here -- a possible FA-credit swap between the 1956 (bypass) and 1964 (Great Gendarme direct) parties, a "Top of Sherpa Glacier notch" waypoint that looks contaminated from neighboring Sherpa Peak, a pitch count that disagrees across three fields (16/17/18), and a dist_km/gain_ft pair inconsistent with the row''s own waypoints -- all left flagged pending primary-source access; see audits/wa-alpine-audit-log.md batch 50 entry. This row''s prior "None -- consistent across multiple sources" corrections claim was itself false given the above.'
WHERE id = 'wa_upper_north_ridge_w_great_gendarme'
  AND emergency->>'rangerStation' LIKE '%Leavenworth Ranger District%';

-- =========================================================================
-- Whatcom Peak (wa_whatcom_peak_southwest_route / wa_whatcom_peak) — two
-- fixes: a first-ascent misspelling and a summit coordinate outlier.
-- =========================================================================

-- fa misspells "Buchanen" (the real 1936 co-FA, per Wikipedia) as "Buchanan"
-- -- and this row's own parent area.blurb already spells it correctly
-- ("Buchanen"), so the route row was the sole outlier even within its own DB.
UPDATE routes SET fa = replace(fa, 'Buchanan', 'Buchanen')
WHERE id = 'wa_whatcom_peak_southwest_route' AND fa LIKE '%Buchanan%';

-- The area's lat/lng and this route's own approach_logistics.peakLat/Lng
-- (48.8576357/-121.373549) sit ~677m from this row's own summit waypoint
-- (48.8561/-121.3825), which itself converts exactly from Wikipedia's DMS
-- coordinate (48°51'22"N 121°22'57"W = 48.856111/-121.3825). Brought the
-- area and approach_logistics in line with the externally-verified waypoint.
UPDATE areas SET lat = 48.856111, lng = -121.3825
WHERE id = 'wa_whatcom_peak' AND lat = 48.8576357 AND lng = -121.373549;

UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(approach_logistics, '{peakLat}', '48.856111', false),
      '{peakLng}', '-121.3825', false
    )
WHERE id = 'wa_whatcom_peak_southwest_route'
  AND approach_logistics->>'peakLat' = '48.8576357';

-- =========================================================================
-- Whitehorse Mountain (wa_whitehorse_mountain_nw_shoulder) — max_angle (55)
-- contradicted this route's own descent_text, which explicitly describes the
-- summit downclimb reaching "up to about 60 degrees." r1's own pitch_detail
-- (~50-55 degrees on its rollover) is consistent with 55, so this fix is
-- scoped to nw_shoulder only, not copied across to its sibling.
-- =========================================================================

UPDATE routes SET max_angle = 60
WHERE id = 'wa_whitehorse_mountain_nw_shoulder' AND max_angle = 55;

-- =========================================================================
-- No other confirmed errors this batch. wa_vesper_peak_north_face_ragged_edge
-- audited clean aside from the elevation fix already pending from batch 49
-- (not re-proposed here). wa_west_craggy_peak_standard_route and
-- wa_west_twin_needle_south_route each have real, significant open questions
-- (a misplaced creek-crossing waypoint with no confidently-sourced
-- replacement value; a grade II-vs-III self-contradiction and an impossible
-- waypoint-distance pair) but no confirmed, safely-sourced field-level fix --
-- both flagged in the log rather than patched here. wa_whitehorse_mountain_r1
-- is more heavily contaminated (identical GPX track and top-level
-- gain/loss/distance figures copied wholesale from its nw_shoulder sibling,
-- contradicting its own itinerary and cited source) -- needs a human rewrite
-- with a freshly-plotted track, not a field patch.
-- =========================================================================
