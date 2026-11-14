-- WA alpine/mountaineering audit -- batch 358 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_olympus_blue_glacier_east_ramps, wa_olympus_summit_block_north_face,
--         wa_olympus_summit_block_west_edge, wa_olympus_traverse, wa_open_book_2,
--         wa_osceola_peak_scramble, wa_ottohorn_southeast_route, wa_ottohorn_west_ridge
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Blue Glacier / East Face Ramps, Mount Olympus (wa_olympus_blue_glacier_east_ramps)
-- -- top-level gain_ft/loss_ft disagree with this route's own itinerary breakdown
-- =========================================================================
-- gain_ft/loss_ft are stored as 7500/7402, but this route's own itinerary.days[]
-- breakdown sums to exactly 10200 ft gain (1600+4500+3800+300) and 10250 ft loss
-- (1250+1300+3800+3900). Sibling route wa_olympus_traverse's top-level gain_ft/loss_ft
-- (10700/10750) EXACTLY equal the sum of its own itinerary.days[], confirming the
-- itinerary-sum is this app's intended convention for these Olympus rows. 7402 looks
-- like a net trailhead-to-summit elevation difference (7980-578=7402) rather than
-- cumulative gain -- a different quantity that doesn't belong in this field.
UPDATE routes SET gain_ft = 10200
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND gain_ft = 7500;

UPDATE routes SET loss_ft = 10250
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND loss_ft = 7402;

-- Upper Hoh Road closure dates are wrong across this row's road.status/seasonalGate --
-- see the batch-wide Upper Hoh Road note below (shared with summit_block_north_face
-- and olympus_traverse).
UPDATE routes SET road = jsonb_set(
  road,
  '{status}',
  '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2025, illustrating its washout-prone history"'::jsonb
)
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND road->>'status' = 'Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2026, illustrating its washout-prone history';

UPDATE routes SET road = jsonb_set(
  road,
  '{seasonalGate}',
  '"None typical, but storm closures occur — as demonstrated by the ~4.5-month Dec 2024–May 2025 closure"'::jsonb
)
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND road->>'seasonalGate' = 'None typical, but storm closures occur — as demonstrated by the ~17-month Dec 2024–May 2026 closure';

-- =========================================================================
-- North Face Direct, Mount Olympus summit block (wa_olympus_summit_block_north_face)
-- -- same gain_ft/loss_ft bug as the sibling route above, plus length_m disagrees
-- -- with this row's own pitch_detail
-- =========================================================================
-- Same itinerary.days[] figures as wa_olympus_blue_glacier_east_ramps (1600/1250,
-- 4500/1300, 3800/3800, 300/3900) -> sums to 10200/10250, not the stored 7500/7402.
UPDATE routes SET gain_ft = 10200
WHERE id = 'wa_olympus_summit_block_north_face'
  AND gain_ft = 7500;

UPDATE routes SET loss_ft = 10250
WHERE id = 'wa_olympus_summit_block_north_face'
  AND loss_ft = 7402;

-- length_m is stored as 30 (~98 ft), but this row's own pitch_detail[0].lengthM is 24
-- (~79 ft) for the SAME single pitch, and the row's own overview ("a single ~80-ft
-- pitch") and rappels text ("about 80 ft") both independently agree with 24m/79ft, not
-- 30m/98ft. Syncing the summary length_m to what 3 of this row's own fields already say.
UPDATE routes SET length_m = 24
WHERE id = 'wa_olympus_summit_block_north_face'
  AND length_m = 30;

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
-- West Edge / West Route, Mount Olympus summit block (wa_olympus_summit_block_west_edge)
-- -- road.status denies the same Upper Hoh Road closure history the row's own
-- -- siblings correctly describe
-- =========================================================================
-- This route's own approach/itinerary fields say its approach is "identical" to the
-- standard Blue Glacier route, which shares the same Upper Hoh Road access -- so this
-- row's road.status should not flatly claim "Maintained year-round" with no closure
-- history when the same road had a real, documented ~4.5-month washout closure
-- (Dec 2024 - May 2025; KUOW, Washington State Standard, NPS current-conditions page).
UPDATE routes SET road = jsonb_set(
  road,
  '{status}',
  '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); same road as the standard Blue Glacier route, including its washout-prone history -- most recently closed by December 2024 storm damage until repairs reopened it in May 2025"'::jsonb
)
WHERE id = 'wa_olympus_summit_block_west_edge'
  AND road->>'status' = 'Maintained year-round';

-- NOTE: This route's timing block (totalHrs=15.5, summitTimeHrs=11, descentTimeHrs=3,
-- approachTimeHrs=1.5) is internally self-consistent as arithmetic (11+3+1.5=15.5), but
-- approachTimeHrs=1.5 contradicts this row's own approach/itinerary text, which both
-- explicitly say the approach is "identical" to the standard route's 11-hour approach.
-- Correcting approachTimeHrs alone would break the totalHrs arithmetic, and there is no
-- way to confirm from available sources whether summitTimeHrs/descentTimeHrs are
-- measuring the same thing as the sibling routes' fields (which use a different
-- multi-day trip structure entirely: 11/12/8 approach/summit/descent = 31 total, vs this
-- row's 1.5/11/3 = 15.5) -- NOT fixed here; left for human review (see log).

-- =========================================================================
-- The Traverse, Mount Olympus (wa_olympus_traverse)
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
-- -- this route's own itinerary day entry disagrees with its own top-level gain/loss
-- =========================================================================
-- Top-level gain_ft/loss_ft are 2397/2397, independently corroborated externally
-- ("The Unicorn Peak roundtrip is 4.8 miles with 2,397 feet of elevation gain"), but
-- the row's own itinerary.days[0].gainFt/lossFt say 2600/2600 and itinerary.totalNote
-- repeats "~2,600 ft gain" -- both contradicting the row's own top-level fields AND
-- the external figure. Syncing the itinerary to match.
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
-- (1) Summit elevation: high_point_ft (8587) is correct (WTA trip report "Osceola
-- Peak (8587')"; Wikipedia/aggregated sources "8,587-foot summit"; this row's own
-- beta/descent fields already agree on 8587), but the "Osceola Peak" summit waypoint
-- stores elev=8584, and the approach/itinerary text repeat that same "8,584 ft" figure
-- twice. Syncing all three to 8587 to match this row's own high_point_ft.
UPDATE routes SET waypoints = jsonb_set(
  waypoints,
  '{7,elev}',
  '8587'::jsonb
)
WHERE id = 'wa_osceola_peak_scramble'
  AND waypoints->7->>'name' = 'Osceola Peak'
  AND waypoints->7->>'elev' = '8584';

UPDATE routes SET approach = replace(approach, 'Final scrambling to the 8,584 ft summit', 'Final scrambling to the 8,587 ft summit')
WHERE id = 'wa_osceola_peak_scramble'
  AND approach LIKE '%Final scrambling to the 8,584 ft summit%';

UPDATE routes SET itinerary = jsonb_set(
  itinerary,
  '{days,1,objective}',
  '"Summit Osceola Peak (8,587 ft) and return to camp"'::jsonb
)
WHERE id = 'wa_osceola_peak_scramble'
  AND itinerary->'days'->1->>'objective' = 'Summit Osceola Peak (8,584 ft) and return to camp';

-- (2) Top-level gain_ft/loss_ft (3439/3439) contradict this row's own itinerary, whose
-- day-by-day figures (2300+1450+1900=5650 gain; 2000+1450+2200=5650 loss) agree with
-- each other AND with this row's own itinerary.totalNote ("~5,600 ft of cumulative
-- gain"). No external source needed -- same-row self-contradiction, itinerary is the
-- side two of this row's own fields already agree on.
UPDATE routes SET gain_ft = 5650
WHERE id = 'wa_osceola_peak_scramble'
  AND gain_ft = 3439;

UPDATE routes SET loss_ft = 5650
WHERE id = 'wa_osceola_peak_scramble'
  AND loss_ft = 3439;

-- (3) access.passRequired flatly says no Northwest Forest Pass is needed at Harts
-- Pass/Slate Pass trailheads, contradicting this SAME row's own access.parking_pass
-- ("Northwest Forest Pass required at trailheads") and its own bivy entry for Harts
-- Pass/Meadows campgrounds ("Northwest Forest Pass or an Interagency pass to park at
-- the trailheads") -- both already agree a pass IS required. External search results
-- describing the Harts Pass trailhead lots corroborate the pass-required side.
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
-- (1) emergency.county says "Skagit County", but the Goodell Creek trailhead and the
-- SR 20 approach are in Whatcom County (Wikipedia: "Newhalem is... in Whatcom County").
-- This row's own sibling wa_ottohorn_west_ridge already correctly stores "Whatcom
-- County" for the identical trailhead/approach.
UPDATE routes SET emergency = jsonb_set(
  emergency,
  '{county}',
  '"Whatcom County"'::jsonb
)
WHERE id = 'wa_ottohorn_southeast_route'
  AND emergency->>'county' = 'Skagit County';

-- (2) emergency.sheriffDispatch names Skagit County Sheriff for the same trailhead
-- that emergency.county (just corrected above) places in Whatcom County. The sibling
-- row's sheriffDispatch field already correctly names the Whatcom County Sheriff's
-- non-emergency dispatch number (360-676-6911, independently confirmed via a WA 211
-- listing) as the agency running SAR for the Southern Pickets.
UPDATE routes SET emergency = jsonb_set(
  emergency,
  '{sheriffDispatch}',
  '"911 for emergencies. Whatcom County Sheriff''s Office non-emergency dispatch: 360-676-6911. The WCSO runs search and rescue for the Southern Pickets."'::jsonb
)
WHERE id = 'wa_ottohorn_southeast_route'
  AND emergency->>'sheriffDispatch' = 'Skagit County Sheriff (360) 336-9450 (after-hours contact); call 911 in an emergency.';

-- (3) gpx track is out of order: this row's own waypoints[] array correctly lists
-- "Goodell Creek Trailhead" (48.68276,-121.26928) FIRST, but the gpx point array has
-- that same coordinate second-to-last instead of first. Reordering gpx to start at the
-- trailhead and proceed in the same order as the row's own waypoints.
UPDATE routes SET gpx = '[[48.68276, -121.26928], [48.721092, -121.288257], [48.724699, -121.289851], [48.733115, -121.293572], [48.751149, -121.301543], [48.763172, -121.306857], [48.769183, -121.309514], [48.7764, -121.3125]]'::jsonb
WHERE id = 'wa_ottohorn_southeast_route'
  AND gpx = '[[48.721092, -121.288257], [48.724699, -121.289851], [48.733115, -121.293572], [48.751149, -121.301543], [48.763172, -121.306857], [48.769183, -121.309514], [48.68276, -121.26928], [48.7764, -121.3125]]'::jsonb;

-- (4) itinerary.days[1].note calls Himmelgeisterhorn "(Düsseldorfspitz)" as though the
-- two names refer to the same feature. External sources (Alpinist.com's Southern
-- Pickets feature) establish Himmelgeisterhorn is simply the original/full name of
-- Himmelhorn itself, while Düsseldorferspitze is a separate, smaller pinnacle parties
-- cross en route to it -- not the same summit. Removing the incorrect equivalence.
UPDATE routes SET itinerary = jsonb_set(
  itinerary,
  '{days,1,note}',
  '"Climb steep snow/talus from camp to the Ottohorn-Himmelhorn col, then scramble the class 3-4 east ridge/southeast side to the Ottohorn summit; parties report roughly an hour round trip from the col to the summit and back. Many groups use the same col to tag Frenzel Spitz and/or Himmelgeisterhorn (Himmelhorn''s full/original name) the same day since the approach effort to the col is the crux of the outing."'::jsonb
)
WHERE id = 'wa_ottohorn_southeast_route'
  AND itinerary->'days'->1->>'note' = 'Climb steep snow/talus from camp to the Ottohorn-Himmelhorn col, then scramble the class 3-4 east ridge/southeast side to the Ottohorn summit; parties report roughly an hour round trip from the col to the summit and back. Many groups use the same col to tag Frenzel Spitz and/or Himmelgeisterhorn (Düsseldorfspitz) the same day since the approach effort to the col is the crux of the outing.';

-- =========================================================================
-- West Ridge, Ottohorn (wa_ottohorn_west_ridge)
-- =========================================================================
-- Wilderness Information Center phone is stored as "360-854-7200" in three fields on
-- this same row (emergency.rangerStation, pro_tips[7], access.permit), but the
-- correct number is (360) 854-7245 -- confirmed via WTA's ranger station listing,
-- Yellow Pages, and the Chamber of Commerce, and matching the sibling row
-- wa_ottohorn_southeast_route's already-correct emergency.rangerStation field.
UPDATE routes SET emergency = jsonb_set(
  emergency,
  '{rangerStation}',
  '"North Cascades National Park Wilderness Information Center, 7280 Ranger Station Road, Marblemount WA 98267 — (360) 854-7245. Permits, current conditions, bear canister loans and trip-planning advice."'::jsonb
)
WHERE id = 'wa_ottohorn_west_ridge'
  AND emergency->>'rangerStation' = 'North Cascades National Park Wilderness Information Center, 7280 Ranger Station Road, Marblemount WA 98267 — 360-854-7200. Permits, current conditions, bear canister loans and trip-planning advice.';

UPDATE routes SET access = jsonb_set(
  access,
  '{permit}',
  '"A backcountry/wilderness permit is required for every overnight stay, including bivouacs — which means every realistic ascent of this peak. The Terror Basin and Crescent Creek cross-country zones cannot be booked ahead: their permits are walk-up only, issued in person the day of or the day before your trip. The Wilderness Information Center at 7280 Ranger Station Road, Marblemount WA 98267 ((360) 854-7245) issues permits, lends bear canisters and gives current conditions."'::jsonb
)
WHERE id = 'wa_ottohorn_west_ridge'
  AND access->>'permit' = 'A backcountry/wilderness permit is required for every overnight stay, including bivouacs — which means every realistic ascent of this peak. The Terror Basin and Crescent Creek cross-country zones cannot be booked ahead: their permits are walk-up only, issued in person the day of or the day before your trip. The Wilderness Information Center at 7280 Ranger Station Road, Marblemount WA 98267 (360-854-7200) issues permits, lends bear canisters and gives current conditions.';

UPDATE routes SET pro_tips = (
  SELECT jsonb_agg(
    CASE
      WHEN elem = 'Pick up the permit and current conditions in person at the Marblemount Wilderness Information Center (360-854-7200) — the rangers there track snow levels on the Terror Creek path and the state of the Barrier.'
      THEN '"Pick up the permit and current conditions in person at the Marblemount Wilderness Information Center ((360) 854-7245) — the rangers there track snow levels on the Terror Creek path and the state of the Barrier."'::jsonb
      ELSE to_jsonb(elem)
    END
  )
  FROM jsonb_array_elements_text(pro_tips) AS elem
)
WHERE id = 'wa_ottohorn_west_ridge'
  AND pro_tips @> '["Pick up the permit and current conditions in person at the Marblemount Wilderness Information Center (360-854-7200) — the rangers there track snow levels on the Terror Creek path and the state of the Barrier."]'::jsonb;

COMMIT;
