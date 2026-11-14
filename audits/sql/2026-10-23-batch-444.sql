-- WA alpine/mountaineering audit -- batch 444 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_old_snowy_mountain_west_route, wa_olympus_summit_block_north_face,
--         wa_olympus_summit_block_west_edge, wa_olympus_traverse, wa_open_book_2,
--         wa_osceola_peak_scramble, wa_ottohorn_southeast_route, wa_oval_peak_scramble
--
-- NOTE ON PROVENANCE: every fix below was ALREADY proposed in
-- audits/sql/2026-09-30-batch-358.sql (pass 6, 2026-09-30) against the same rows. A fresh
-- read of the live DB immediately before writing this file (see below) found every one of
-- those values still unapplied/unchanged -- i.e. no one has run batch-358's SQL against the
-- live database yet. This file re-verifies each finding against current authoritative
-- sources (not just re-copying the old file) and re-proposes the identical fixes so a human
-- has one current, re-confirmed file to review; see audits/wa-alpine-audit-log.md for the
-- re-verification detail. All values below were re-read from the live DB immediately before
-- this file was written; each UPDATE carries a guard on the current value so it cannot
-- silently no-op if another session (or a belated run of batch-358's file) has already
-- touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- North Face Direct Finish, Mount Olympus summit block (wa_olympus_summit_block_north_face)
-- =========================================================================
-- gain_ft/loss_ft (7500/7402) disagree with this row's own itinerary.days[] breakdown,
-- which sums to exactly 10200 ft gain / 10250 ft loss. Sibling wa_olympus_traverse's
-- top-level gain_ft/loss_ft (10700/10750) EXACTLY equal the sum of its own itinerary.days[],
-- confirming the itinerary-sum is this app's intended convention for these Olympus rows.
-- 7402 looks like a net trailhead-to-summit elevation difference (7980-578=7402) rather
-- than cumulative gain -- a different quantity that doesn't belong in this field.
UPDATE routes SET gain_ft = 10200
WHERE id = 'wa_olympus_summit_block_north_face'
  AND gain_ft = 7500;

UPDATE routes SET loss_ft = 10250
WHERE id = 'wa_olympus_summit_block_north_face'
  AND loss_ft = 7402;

-- length_m is stored as 30 (~98 ft), but this row's own pitch_detail[0].lengthM is 24
-- (~79 ft) for the SAME single pitch, and the row's own overview ("a single ~80-ft
-- pitch") and rappels text ("about 80 ft") both independently agree with 24m/79ft.
UPDATE routes SET length_m = 24
WHERE id = 'wa_olympus_summit_block_north_face'
  AND length_m = 30;

-- Upper Hoh Road: row says the Dec 2024 storm closure lasted "until ... May 2026". Re-verified
-- 2026-10-23 via the Peninsula Daily News (reopening coverage) and Yakima Herald/Sequim
-- Gazette: the road was repaired and reopened May 8, 2025 (a ribbon-cutting with Gov. Bob
-- Ferguson, ~4.5 months after the Dec 2024 washout, funded from the state's Strategic Reserve
-- Fund after county/federal funding fell through) -- not May 2026. (A later, separate Aug 2025
-- flash-flood closure and a Dec 2025 atmospheric-river closure both happened too, but neither
-- is the event this row is describing, which is specifically the Dec 2024 washout's repair.)
UPDATE routes SET road = jsonb_set(
  road,
  '{status}',
  '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2025"'::jsonb
)
WHERE id = 'wa_olympus_summit_block_north_face'
  AND road->>'status' = 'Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2026';

UPDATE routes SET road = jsonb_set(
  road,
  '{seasonalGate}',
  '"Storm closures possible — as demonstrated by the ~4.5-month Dec 2024–May 2025 closure"'::jsonb
)
WHERE id = 'wa_olympus_summit_block_north_face'
  AND road->>'seasonalGate' = 'Storm closures possible — as demonstrated by the ~17-month Dec 2024–May 2026 closure';

UPDATE routes SET access = jsonb_set(
  access,
  '{closures}',
  '"Upper Hoh Road has a real washout history — most recently closed by December 2024 storm damage until repairs reopened it in May 2025; check current NPS road conditions before a trip"'::jsonb
)
WHERE id = 'wa_olympus_summit_block_north_face'
  AND access->>'closures' = 'Upper Hoh Road has a real washout history — most recently closed by December 2024 storm damage until repairs reopened it in May 2026; check current NPS road conditions before a trip';

-- =========================================================================
-- Northwest Edge Finish, Mount Olympus summit block (wa_olympus_summit_block_west_edge)
-- =========================================================================
-- This route's own approach/itinerary fields say its approach is "identical" to the
-- standard Blue Glacier route, which shares the same Upper Hoh Road access -- so this
-- row's road.status should not flatly claim "Maintained year-round" with no closure
-- history when the same road had the real, documented ~4.5-month washout closure above
-- (Dec 2024 - May 2025).
UPDATE routes SET road = jsonb_set(
  road,
  '{status}',
  '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); same road as the standard Blue Glacier route, including its washout-prone history -- most recently closed by December 2024 storm damage until repairs reopened it in May 2025"'::jsonb
)
WHERE id = 'wa_olympus_summit_block_west_edge'
  AND road->>'status' = 'Maintained year-round';

-- NOTE (not fixed, carried forward from pass 6): this route's timing block
-- (totalHrs=15.5, summitTimeHrs=11, descentTimeHrs=3, approachTimeHrs=1.5) is internally
-- self-consistent as arithmetic, but approachTimeHrs=1.5 contradicts this row's own
-- approach/itinerary text, which say the approach is "identical" to the standard route's
-- 11-hour approach. Correcting approachTimeHrs alone would break the totalHrs arithmetic,
-- and there's no way to confirm whether summitTimeHrs/descentTimeHrs mean the same thing
-- as the sibling routes' fields (which use an entirely different day structure: 11/12/8 =
-- 31 total) -- left for human review.

-- =========================================================================
-- Mount Olympus Traverse (wa_olympus_traverse)
-- =========================================================================
UPDATE routes SET road = jsonb_set(
  road,
  '{status}',
  '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2025"'::jsonb
)
WHERE id = 'wa_olympus_traverse'
  AND road->>'status' = 'Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2026';

UPDATE routes SET road = jsonb_set(
  road,
  '{seasonalGate}',
  '"Storm closures possible — as demonstrated by the ~4.5-month Dec 2024–May 2025 closure"'::jsonb
)
WHERE id = 'wa_olympus_traverse'
  AND road->>'seasonalGate' = 'Storm closures possible — as demonstrated by the ~17-month Dec 2024–May 2026 closure';

UPDATE routes SET access = jsonb_set(
  access,
  '{closures}',
  '"Upper Hoh Road has a real washout history — most recently closed by December 2024 storm damage until repairs reopened it in May 2025; check current NPS road conditions before a trip"'::jsonb
)
WHERE id = 'wa_olympus_traverse'
  AND access->>'closures' = 'Upper Hoh Road has a real washout history — most recently closed by December 2024 storm damage until repairs reopened it in May 2026; check current NPS road conditions before a trip';

-- =========================================================================
-- Open Book, Unicorn Peak (wa_open_book_2)
-- =========================================================================
-- Top-level gain_ft/loss_ft are 2397/2397, independently corroborated externally (an
-- aggregator's "Unicorn Peak roundtrip is 4.8 miles with 2,397 feet of elevation gain"),
-- but the row's own itinerary.days[0].gainFt/lossFt say 2600/2600 and itinerary.totalNote
-- repeats "~2,600 ft gain" -- both contradicting this row's own top-level fields.
UPDATE routes SET itinerary = jsonb_set(
  jsonb_set(itinerary, '{days,0,gainFt}', '2397'::jsonb),
  '{days,0,lossFt}', '2397'::jsonb
)
WHERE id = 'wa_open_book_2'
  AND itinerary->'days'->0->>'gainFt' = '2600'
  AND itinerary->'days'->0->>'lossFt' = '2600';

UPDATE routes SET itinerary = jsonb_set(
  itinerary,
  '{totalNote}',
  '"A single day, roughly 7.5 hrs car-to-car, ~2,397 ft gain and 5.5 mi round trip, on the easiest of Unicorn''s three technical summit lines."'::jsonb
)
WHERE id = 'wa_open_book_2'
  AND itinerary->>'totalNote' = 'A single day, roughly 7.5 hrs car-to-car, ~2,600 ft gain and 5.5 mi round trip, on the easiest of Unicorn''s three technical summit lines.';

-- =========================================================================
-- Southwest Slopes Scramble, Osceola Peak (wa_osceola_peak_scramble)
-- =========================================================================
-- (1) Summit elevation: high_point_ft (8587) is correct (re-verified 2026-10-23: WTA trip
-- report "Osceola Peak (8587')"; Wikipedia-sourced aggregates agree; this row's own
-- beta/descent fields and even this SAME waypoint's own "note" text ("True summit (8,587
-- ft)") already say 8587), but the "Osceola Peak" summit waypoint's "elev" key stores 8584,
-- and itinerary.days[1].objective repeats that same "8,584 ft" figure. Syncing both to 8587.
UPDATE routes SET waypoints = jsonb_set(
  waypoints,
  '{7,elev}',
  '8587'::jsonb
)
WHERE id = 'wa_osceola_peak_scramble'
  AND waypoints->7->>'name' = 'Osceola Peak'
  AND waypoints->7->>'elev' = '8584';

UPDATE routes SET itinerary = jsonb_set(
  itinerary,
  '{days,1,objective}',
  '"Summit Osceola Peak (8,587 ft) and return to camp"'::jsonb
)
WHERE id = 'wa_osceola_peak_scramble'
  AND itinerary->'days'->1->>'objective' = 'Summit Osceola Peak (8,584 ft) and return to camp';

-- (2) Top-level gain_ft/loss_ft (3439/3439) contradict this row's own itinerary, whose
-- day-by-day figures (2300+1450+1900=5650 gain; 2000+1450+2200=5650 loss) agree with each
-- other AND with this row's own itinerary.totalNote ("~5,600 ft of cumulative gain").
-- Same-row self-contradiction; no external source needed.
UPDATE routes SET gain_ft = 5650
WHERE id = 'wa_osceola_peak_scramble'
  AND gain_ft = 3439;

UPDATE routes SET loss_ft = 5650
WHERE id = 'wa_osceola_peak_scramble'
  AND loss_ft = 3439;

-- (3) access.passRequired flatly says no Northwest Forest Pass is needed at Harts
-- Pass/Slate Pass trailheads, contradicting this SAME row's own access.parking_pass and
-- its own bivy entry for the Harts Pass trailhead lot, both of which already say a pass IS
-- required.
UPDATE routes SET access = jsonb_set(
  access,
  '{passRequired}',
  '"A Northwest Forest Pass (or Interagency/America the Beautiful pass) is required to park at the Harts Pass/Slate Pass trailheads"'::jsonb
)
WHERE id = 'wa_osceola_peak_scramble'
  AND access->>'passRequired' = 'None — a Northwest Forest Pass is not required at Harts Pass/Slate Pass trailheads';

-- =========================================================================
-- Southeast Route, Ottohorn (wa_ottohorn_southeast_route)
-- =========================================================================
-- (1) emergency.county says "Skagit County", but re-verified 2026-10-23: Wikipedia and an
-- NPS places page both place Newhalem/Goodell Creek specifically in Whatcom County (the
-- "Skagit" name here comes from the Skagit River/Skagit River Hydroelectric Project running
-- through Newhalem, not from Skagit County).
UPDATE routes SET emergency = jsonb_set(
  emergency,
  '{county}',
  '"Whatcom County"'::jsonb
)
WHERE id = 'wa_ottohorn_southeast_route'
  AND emergency->>'county' = 'Skagit County';

-- (2) emergency.sheriffDispatch names the Skagit County Sheriff for the same trailhead
-- emergency.county (just corrected above) places in Whatcom County. Confirmed Whatcom
-- County Sheriff's Office non-emergency dispatch number via a WA 211 listing.
UPDATE routes SET emergency = jsonb_set(
  emergency,
  '{sheriffDispatch}',
  '"911 for emergencies. Whatcom County Sheriff''s Office non-emergency dispatch: 360-676-6911. The WCSO runs search and rescue for the Southern Pickets."'::jsonb
)
WHERE id = 'wa_ottohorn_southeast_route'
  AND emergency->>'sheriffDispatch' = 'Skagit County Sheriff (360) 336-9450 (after-hours contact); call 911 in an emergency.';

-- (3) gpx track is out of order: this row's own waypoints[] array correctly lists "Goodell
-- Creek Trailhead" (48.68276,-121.26928) FIRST, but the gpx point array has that same
-- coordinate second-to-last instead of first. Reordering gpx to start at the trailhead.
UPDATE routes SET gpx = '[[48.68276, -121.26928], [48.721092, -121.288257], [48.724699, -121.289851], [48.733115, -121.293572], [48.751149, -121.301543], [48.763172, -121.306857], [48.769183, -121.309514], [48.7764, -121.3125]]'::jsonb
WHERE id = 'wa_ottohorn_southeast_route'
  AND gpx = '[[48.721092, -121.288257], [48.724699, -121.289851], [48.733115, -121.293572], [48.751149, -121.301543], [48.763172, -121.306857], [48.769183, -121.309514], [48.68276, -121.26928], [48.7764, -121.3125]]'::jsonb;

-- (4) itinerary.days[1].note calls Himmelgeisterhorn "(Düsseldorfspitz)" as though the two
-- names refer to the same feature. Per pass 6's research (Alpinist.com's Southern Pickets
-- feature), Himmelgeisterhorn is simply Himmelhorn's original/full name, while
-- Düsseldorferspitze is a separate, smaller pinnacle en route to it -- not the same summit.
UPDATE routes SET itinerary = jsonb_set(
  itinerary,
  '{days,1,note}',
  '"Climb steep snow/talus from camp to the Ottohorn-Himmelhorn col, then scramble the class 3-4 east ridge/southeast side to the Ottohorn summit; parties report roughly an hour round trip from the col to the summit and back. Many groups use the same col to tag Frenzel Spitz and/or Himmelgeisterhorn (Himmelhorn''s full/original name) the same day since the approach effort to the col is the crux of the outing."'::jsonb
)
WHERE id = 'wa_ottohorn_southeast_route'
  AND itinerary->'days'->1->>'note' = 'Climb steep snow/talus from camp to the Ottohorn-Himmelhorn col, then scramble the class 3-4 east ridge/southeast side to the Ottohorn summit; parties report roughly an hour round trip from the col to the summit and back. Many groups use the same col to tag Frenzel Spitz and/or Himmelgeisterhorn (Düsseldorfspitz) the same day since the approach effort to the col is the crux of the outing.';

COMMIT;
