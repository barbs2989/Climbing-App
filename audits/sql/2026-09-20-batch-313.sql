-- WA alpine audit batch 313 (pass 6)
-- Routes: wa_cascade_peak_east_ridge, wa_castle_peak_tatoosh_southeast_face,
--         wa_cathedral_peak_pasayten_se_buttress, wa_chair_bryant_traverse,
--         wa_chair_peak_east_face, wa_chair_peak_north_face,
--         wa_chair_peak_northeast_buttress, wa_chair_peak_northwest_ridge

-- =========================================================================
-- Castle Peak (Tatoosh), Southeast Face -- wa_castle_peak_tatoosh_southeast_face
-- =========================================================================
-- access._raw was wrong-mountain cross-contamination: it named
-- "USFS Okanogan-Wenatchee National Forest - north Cascades Ranger
-- District" as the land manager, an altitude of "8,343 feet" (this
-- route's own high_point_ft/area elevation is 6,440 ft), and access
-- routes "Provincial Park (north), PCT (west), Freezeout Creek (east)" --
-- all Pasayten-Wilderness-corridor content (the near-identical
-- "Provincial Park"/border-proximity phrasing recurs, correctly, on this
-- same batch's wa_cathedral_peak_pasayten_se_buttress access._raw). The
-- Castle is inside Mount Rainier National Park in the Tatoosh Range, not
-- USFS Okanogan-Wenatchee land, and every OTHER field on this row
-- (top-level permit, road, access.notes/landManager/land_manager/
-- parking_pass/passRequired) already correctly describes Mount Rainier
-- NP. Removed the stale/wrong _raw sub-object, leaving the
-- already-correct top-level access fields untouched -- same pattern as
-- the wa_ridge_traverse_from_east_fury fix in batch 291.
UPDATE routes SET access = access - '_raw'
  WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND access->'_raw'->>'altitude' = '8,343 feet'
  AND access->'_raw'->>'land_manager' = 'USFS Okanogan-Wenatchee National Forest - north Cascades Ranger District';

-- bivy carried 6 entries; the first ("Snow Lake Camp") self-disqualifies
-- in its own text -- "The only established camp close enough to matter
-- for Unicorn Peak... the one Tatoosh objective where an overnight is
-- genuinely worth the trouble" -- explicitly framing itself as NOT
-- applicable to the other Tatoosh day-climb objectives, of which this
-- route (a 4-6 hour car-to-car scramble per its own itinerary) is one.
-- The remaining five entries all at least gesture toward Castle/Pinnacle
-- or general Tatoosh-area staging without excluding Castle (two name it
-- outright: "basins below Unicorn and The Castle", "Pinnacle and The
-- Castle in winter dress"), so they were left alone rather than pruned
-- further. Pruned 6 -> 5, matching the established
-- audit:camp-route-fit self-disqualifying-entry pattern (cf. Robinson
-- Mountain, batch 291: "these camps do nothing for the Robinson Creek or
-- Middle Fork peaks, which go the other direction from the pass").
UPDATE routes SET bivy = bivy - 0
  WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Snow Lake Camp'
  AND bivy->1->>'name' = 'Tatoosh cross-country zone bivy, basins below Unicorn and The Castle';

-- outing_shape was null despite descent_text/bail explicitly describing a
-- reversal of the same approach traverse back to the same Pinnacle Peak
-- Trailhead (Reflection Lakes) -- a same-trailhead round trip.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND outing_shape IS NULL;

-- =========================================================================
-- Cascade Peak, East Ridge and NW Chimney -- wa_cascade_peak_east_ridge
-- =========================================================================
-- bivy carried 6 entries, all genuine Cascade River Road / Cascade Pass
-- corridor camps, but only one -- "Johannesburg Camp" -- actually serves
-- this route: its own text says outright it is "the practical staging
-- point for the Cascade-Johannesburg Couloir, Cascade Peak, and any
-- pre-dawn start". The other five each explicitly name a DIFFERENT
-- objective reached via a different arm/pullout: "Boston Basin lower/
-- upper camp" serve Forbidden's West/North Ridge, Sharkfin Tower and the
-- Torment-Forbidden traverse (a different Cascade River Road pullout,
-- mile 21.7, not the Cascade Pass trailhead this route uses); "Sahale
-- Glacier Camp" serves Sahale Peak and Boston Peak via the Sahale
-- Arm/Quien Sabe Glacier (the opposite direction from this route's Mixup
-- Arm/CJ Couloir approaches); "Pelton Basin" serves "Mixup Peak, Magic
-- Mountain and the Middle Cascade Glacier approach to The Triad"; the
-- "Informal snow and rock bivouacs" entry names the Torment-Forbidden
-- traverse, Boston Peak and the Forbidden North Ridge, again none of them
-- Cascade Peak. Pruned 6 -> 1, matching the established
-- audit:camp-route-fit regional-corridor-contamination pattern.
UPDATE routes SET bivy = jsonb_build_array(bivy->4)
  WHERE id = 'wa_cascade_peak_east_ridge'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Boston Basin lower camp'
  AND bivy->4->>'name' = 'Johannesburg Camp'
  AND bivy->5->>'name' = 'Informal snow and rock bivouacs above the basins';

-- =========================================================================
-- Cathedral Peak (Pasayten), Southeast Buttress
-- wa_cathedral_peak_pasayten_se_buttress
-- =========================================================================
-- loss_ft was null while gain_ft was populated (4700) for a route whose
-- own itinerary Day 4 explicitly retraces the Andrews Creek Trail back to
-- the trailhead ("losing the elevation gained on Day 1") -- a documented
-- out-and-back trip to the same trailhead. Filled loss_ft to match
-- gain_ft, the established convention for a same-trailhead round trip
-- (cf. Big Snow Mountain / Black Peak NE Ridge, batch 311). NOTE, flagged
-- rather than further corrected: gain_ft (4700) does not fully reconcile
-- against this row's own itinerary day-by-day sum (Day1 4350 + Day2 1300
-- = 5650 excluding the optional Day3 bonus-summit, or 6650 including it)
-- -- a roughly 950-1950 ft gap depending on which days count. It is not
-- clear whether the top-level gain_ft field is meant to represent
-- approach-only gain, approach+summit-day gain, or the full multi-day
-- round trip including the optional layover/bonus-summit day, and the
-- three plausible readings point at three different numbers -- left for a
-- human call rather than guessed (same posture as the Ruth-Icy Traverse
-- saddle-elevation flag in batch 291).
UPDATE routes SET loss_ft = gain_ft
  WHERE id = 'wa_cathedral_peak_pasayten_se_buttress'
  AND gain_ft = 4700
  AND loss_ft IS NULL;

-- outing_shape was null despite the itinerary explicitly describing a
-- backpack-in/climb/backpack-out round trip to the same Andrews Creek
-- Trailhead (the descent from the summit is a different scramble line
-- than the ascent, but returns to the same base camp and the same
-- trailhead, matching the established convention used elsewhere in this
-- audit for routes whose on-mountain descent differs from the ascent
-- line but which are still a same-trailhead round trip).
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_cathedral_peak_pasayten_se_buttress'
  AND outing_shape IS NULL;

-- =========================================================================
-- Chair-Bryant Traverse -- wa_chair_bryant_traverse
-- =========================================================================
-- disciplines was ['alpine', 'aid'], contradicted by every other field on
-- this row: aid_grade is null, pitches is 0, pitch_detail is null, gear/
-- what_to_bring/pro_tips/watch_out list only a small rock rack, slings,
-- helmet, rope and a rappel device, and the row's own corrections field
-- (its research note) describes this exclusively as a 4th-to-low-5th-
-- class ridge scramble/climb with one mandatory rappel off Bryant, citing
-- a 5.4 YDS analog route -- no mention of aid climbing anywhere. Matches
-- the sibling Chair Peak ridge/rock routes' own discipline tagging
-- (East Face and Northwest Ridge both carry ['alpine', 'trad']).
UPDATE routes SET disciplines = '["alpine", "trad"]'::jsonb
  WHERE id = 'wa_chair_bryant_traverse'
  AND disciplines = '["alpine", "aid"]'::jsonb;

-- =========================================================================
-- Chair Peak, East Face -- wa_chair_peak_east_face
-- =========================================================================
-- Top-level permit was null while the three other Chair Peak routes in
-- this same cluster (North Face, Northeast Buttress, Northwest Ridge)
-- all carry the same permit text for the shared Alpental/Snow Lake
-- Trailhead. This route's own access.permit field already independently
-- states "None required -- free self-issue day-use permit at the
-- trailhead (no quota for day use)", so filled the top-level field to
-- match the sibling routes' established wording for consistency.
UPDATE routes SET permit = 'Free self-issue Alpine Lakes Wilderness permit at the trailhead; no quota or fee. Northwest Forest Pass to park at most trailheads.'
  WHERE id = 'wa_chair_peak_east_face'
  AND permit IS NULL;

-- =========================================================================
-- Chair Peak, North Face -- wa_chair_peak_north_face
-- =========================================================================
-- outing_shape was null despite descent_text describing a return to the
-- standard south-side gully/basin and the same Alpental trailhead.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_chair_peak_north_face'
  AND outing_shape IS NULL;

-- =========================================================================
-- Chair Peak, Northeast Buttress -- wa_chair_peak_northeast_buttress
-- =========================================================================
-- gain_ft (3100) fell 38 ft short of the round-trip physical floor for
-- this route's own trailhead (Alpental, 3,100 ft per waypoints[0]) and
-- high_point_ft (6,238 ft): 6238 - 3100 = 3138, which is exactly what
-- this row's own loss_ft already states. The itinerary's Day 1 gainFt/
-- lossFt (both 3100) mirrored the same short figure on both sides rather
-- than the correct 3138 net rise. Corrected gain_ft and the itinerary
-- day figures to 3138, matching loss_ft and the row's own trailhead/
-- summit elevations -- the same "gain_ft below its own hard floor"
-- pattern documented repeatedly elsewhere in this audit (Phantom Peak,
-- Remmel Mountain NW Ridge, Beyond Redlining).
UPDATE routes SET gain_ft = 3138,
  itinerary = jsonb_set(jsonb_set(itinerary, '{days,0,gainFt}', '3138'::jsonb), '{days,0,lossFt}', '3138'::jsonb)
  WHERE id = 'wa_chair_peak_northeast_buttress'
  AND gain_ft = 3100
  AND loss_ft = 3138
  AND itinerary->'days'->0->>'gainFt' = '3100'
  AND itinerary->'days'->0->>'lossFt' = '3100';

-- outing_shape was null despite descent_text describing a return to the
-- standard route and the same Alpental trailhead.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_chair_peak_northeast_buttress'
  AND outing_shape IS NULL;

-- =========================================================================
-- Chair Peak, Northwest Ridge -- wa_chair_peak_northwest_ridge
-- =========================================================================
-- outing_shape was null despite descent_text describing a multi-rappel
-- return to Thumbtack Rock and the same Alpental trailhead/approach path.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_chair_peak_northwest_ridge'
  AND outing_shape IS NULL;

-- =========================================================================
-- Flagged for human review, not fixed this batch
-- =========================================================================
-- 1) wa_cathedral_peak_pasayten_se_buttress: gain_ft (4700) does not
--    fully reconcile against its own itinerary day-by-day sum (see note
--    above on the loss_ft fix). Needs a human decision on which
--    convention (approach-only vs. approach+summit-day vs. full
--    multi-day round trip) the top-level field is meant to follow before
--    it can be corrected with confidence.
-- 2) wa_chair_peak_northeast_buttress: top-level grade ("Class 5.6",
--    grade_system "class") disagrees with rock_grade ("5.4"), and
--    grade_num (4) does not obviously derive from either value under the
--    numeral-suffix convention seen elsewhere in this same batch (e.g.
--    "5.2" -> grade_num 2, "5.7" -> grade_num 7). The row's own
--    pitch_detail already documents the crux pitch as "5.4-5.6 (dry)",
--    so both stored figures are plausibly real, sourced endpoints of one
--    range rather than an outright error -- but which should be the
--    canonical grade/grade_num, and how the app's own grade parser
--    (lib/grade.js's gradeNumFrom, out of scope for this DB-only audit)
--    expects a "Class N.n" hybrid notation to resolve, needs a human/code
--    review rather than a guess.
