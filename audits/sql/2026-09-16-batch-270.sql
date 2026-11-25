-- WA alpine route audit, pass 5, batch 270.
-- Batch: wa_mojo_rising, wa_mount_adams_adams_glacier, wa_mount_adams_lava_glacier_headwall,
-- wa_mount_adams_lyman_glacier, wa_mount_adams_mazama_glacier_headwall,
-- wa_mount_adams_north_ridge, wa_mount_adams_northwest_ridge, wa_mount_adams_south_climb.
-- 6 SQL fixes across 4 routes. wa_mount_adams_lava_glacier_headwall, wa_mount_adams_lyman_glacier
-- and wa_mount_adams_northwest_ridge are clean (no confirmed errors) -- see the log for what was
-- checked and for one item flagged rather than fixed (a suspected FA misattribution on
-- wa_mount_adams_lava_glacier_headwall).
--
-- All fixes below are confirmed from internal row consistency (a route's own structured
-- fields contradicting its own summary/boilerplate fields) plus, where noted, external
-- corroboration. No coordinates, dates, or figures are invented anywhere in this file --
-- every replacement value is either copied from elsewhere on the same row, derived
-- arithmetically from the row's own itinerary, or matched to an already-researched
-- sibling route's convention.

-- Fix 1: wa_mojo_rising -- the `rappels` summary text ("Lower 3 pitches rappel with a
-- 60m rope") describes only the ALTERNATE BAIL option, while the structured
-- `rappel_detail` array (3 stations, anchors "Bolted/chain station in the descent
-- gully") documents a different descent entirely: the standard South Arete finish. This
-- row's own `rappel_count_note`, `descent_text`, and `approach_variants[0].baseFinding`
-- all independently and consistently describe BOTH options; `rappels` was the one field
-- left describing only the bail, worded as if it were the whole picture.
UPDATE routes SET rappels = 'Standard finish (South Arete): downclimb to the Rabbit Ears, then 3 single-rope 60m rappels from bolted/chain anchors. To bail without finishing, rappel pitches 1-3 directly with a single 60m rope back to the ground instead.'
WHERE id = 'wa_mojo_rising' AND rappels = 'Lower 3 pitches rappel with a 60m rope';

-- Fix 2: wa_mount_adams_adams_glacier -- itinerary day-1 objective claims a "~9,000 ft
-- high camp," contradicted by this row's own `waypoints` entry for "High Camp" (elev
-- 7000) and by sibling route wa_mount_adams_lyman_glacier's itinerary, which correctly
-- places the SAME shared Killen Creek high camp at "~6,900 ft." The 9,000 ft figure
-- looks carried over from Mount Adams' South Climb "Lunch Counter" camp (9,000-9,400
-- ft) on the opposite side of the mountain.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,objective}', to_jsonb(replace(itinerary#>>'{days,0,objective}', '9,000 ft', '7,000 ft')))
WHERE id = 'wa_mount_adams_adams_glacier' AND itinerary#>>'{days,0,objective}' = 'Reach ~9,000 ft high camp below the Adams Glacier';

-- Fix 3 & 4: wa_mount_adams_north_ridge -- the identical "9,000 ft" high-camp error as
-- Fix 2 above (same shared Killen Creek / High Camp approach), in both the day-1 note
-- and the day-1 objective. Corrected to ~7,000 ft to match this row's own waypoints and
-- sibling routes. Also, dist_km (5.6 km = 3.48 mi) matches neither this route's own
-- itinerary (day totals sum to 21.2 mi = 34.1 km round trip) nor any single leg of it.
-- Every sibling Mount Adams route sharing this Killen Creek trailhead cluster (Adams
-- Glacier 28.16 km/17.5 mi, Lava Glacier Headwall 26.55 km/16.5 mi, Lyman Glacier 37.3
-- km/23.18 mi) stores dist_km as the full round-trip itinerary total, each matching its
-- own itinerary to within rounding -- corrected to match that same convention using
-- this row's own itinerary (8.6 + 4.0 + 8.6 = 21.2 mi = 34.12 km).
UPDATE routes SET itinerary = jsonb_set(
    jsonb_set(itinerary, '{days,0,objective}', to_jsonb(replace(itinerary#>>'{days,0,objective}', '9,000 ft', '7,000 ft'))),
    '{days,0,note}', to_jsonb(replace(itinerary#>>'{days,0,note}', '9,000 ft', '7,000 ft'))
)
WHERE id = 'wa_mount_adams_north_ridge'
  AND itinerary#>>'{days,0,objective}' = 'Reach ~9,000 ft high camp below the North Ridge'
  AND itinerary#>>'{days,0,note}' = 'Hike the Killen Creek Trail through forest, meadow, and huckleberry fields, crossing East Fork Adams Creek (last reliable water) before climbing onto snow to a high camp around 9,000 ft.';

UPDATE routes SET dist_km = 34.12
WHERE id = 'wa_mount_adams_north_ridge' AND dist_km = 5.6;

-- Fix 5: wa_mount_adams_mazama_glacier_headwall -- `permit` carried the generic USFS
-- "Mt. Adams Climbing Pass (Cascade Volcano Pass)" boilerplate shared by the
-- Forest-Service-side Mount Adams routes, but this specific route starts from Bird
-- Creek Meadows on YAKAMA NATION land (Tract D) -- confirmed by this same row's own
-- `access` field (landManager: "Yakama Nation..."), `watch_out`, `approach`, and
-- `approach_variants`, all of which independently and consistently describe the Yakama
-- tribal-use permit process and never mention the Forest Service pass. External sources
-- (Mountaineers.org / Oregon Hikers trip reports for Bird Creek Meadows, cross-checked
-- via search) corroborate: a Yakama Indian Reservation Tract-D tribal-use permit,
-- bought at the Mirror Lake gate, is required for this approach, and non-tribal-member
-- access has historically been restricted to roughly July 1-October 1 (and closed
-- outright in some years) because this land is not part of the USFS Mount Adams
-- Wilderness.
UPDATE routes SET permit = 'This route starts on Yakama Nation land (Tract D), not U.S. Forest Service Mt. Adams Wilderness -- the USFS Cascade Volcano Pass does not apply here. A Yakama Indian Reservation Tract-D tribal-use permit is required instead, purchased at the fee station at the Mirror Lake gate on entry (no advance purchase). Non-tribal-member access has historically been limited to a mid-summer-to-early-autumn window (roughly July 1-October 1) and has been closed outright in some years -- confirm current access with the Yakama Nation before planning a trip.'
WHERE id = 'wa_mount_adams_mazama_glacier_headwall' AND permit = 'Mt. Adams Climbing Pass (Cascade Volcano Pass) required above 7,000 ft May 1-Sep 30, sold per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.';

-- Fix 6: wa_mount_adams_south_climb -- `itinerary` is stored as a plain prose string
-- instead of the {cal, days, totalNote} structured object every other route with a
-- populated itinerary uses (confirmed against all 7 other routes in this batch). The
-- app's itinerary-reading code (ClimbMatchCore.jsx's
-- itinDaysToDraft/itinDraftToStructured/routeAscentFt) expects `itinerary.days` to be
-- an array; on a bare string that access reads as empty, so this content likely never
-- reaches the Planner tab's day-by-day section. Reshaped into the same object
-- convention with the ORIGINAL TEXT PRESERVED VERBATIM as `totalNote` -- no day-by-day
-- figures are invented, since none are stated in the source text.
UPDATE routes SET itinerary = '{"cal": "", "days": [], "totalNote": "Most parties do it in 2 days: hike in and camp near Lunch Counter (~9,000-9,400 ft) day one, alpine-start for the summit push, then descend to the car day two. Strong parties climb it car-to-car in a single long day (roughly 10-14 hours total)."}'::jsonb
WHERE id = 'wa_mount_adams_south_climb' AND itinerary = to_jsonb('Most parties do it in 2 days: hike in and camp near Lunch Counter (~9,000-9,400 ft) day one, alpine-start for the summit push, then descend to the car day two. Strong parties climb it car-to-car in a single long day (roughly 10-14 hours total).'::text);
