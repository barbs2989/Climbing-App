-- WA alpine audit -- batch 97 (pass 2) -- 2026-08-10
-- Routes: wa_pernod_spire_standard (Pernod Spire), wa_phantom_peak_south_route +
--         wa_phantom_peak_west_ridge (Phantom Peak), wa_point_success_south_side (Point
--         Success), wa_poltergeist_pinnacle + wa_poltergeist_pinnacle_north_route
--         (Poltergeist Pinnacle), wa_primus_peak_south_ridge (Primus Peak),
--         wa_prusik_peak_der_sportsman (Prusik Peak).
-- Researched via 8 parallel agents, one per route. This session's network egress proxy
-- blocked WebFetch to mountainproject.com, wikipedia.org, cascadeclimbers.com,
-- americanalpineclub.org, peakbagger.com, listsofjohn.com, nps.gov and fs.usda.gov for
-- every agent, so all findings below rest on WebSearch result snippets rather than full
-- primary-source reads -- noted again here so it isn't lost, and worth a follow-up pass
-- with working fetch access.

-- wa_phantom_peak_south_route: approach_logistics names "Nooksack Cirque Trailhead" (Trail
-- #750) as the trailhead -- a real USFS trailhead, but it accesses Mount Shuksan's Nooksack
-- Cirque, not Phantom Peak or the Northern Pickets. Its lat/lng (48.89401, -121.65259) are
-- also just the Nooksack Cirque TH coordinates (same value corrected onto a Nooksack Tower
-- route in batch 93 -- looks like the same template value leaking to a second, unrelated
-- peak). This route's own `approach` text, `itinerary` and `waypoints` all correctly use the
-- Hannegan Pass Trailhead (end of Ruth Creek Rd/FR-32, elev 3,120 ft, 48.9101/-121.5927,
-- matching the USFS-documented location) for the real Whatcom Pass approach.
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(
        jsonb_set(approach_logistics, '{trailhead}', '"Hannegan Pass Trailhead (end of Ruth Creek Rd/FR-32)"'::jsonb),
        '{trailheadLat}', '48.9101'::jsonb
      ),
      '{trailheadLng}', '-121.5927'::jsonb
    ) || '{"trailheadDirection": "From the Hannegan Pass Trailhead, via Hannegan Pass, the Chilliwack River Trail, and Whatcom Pass to the Challenger Glacier and Phantom Peak'\''s southwest buttress."}'::jsonb
WHERE id = 'wa_phantom_peak_south_route'
  AND approach_logistics ->> 'trailhead' = 'Nooksack Cirque Trailhead (Trail #750)';

-- wa_phantom_peak_south_route: `road` describes "Goodell Creek / Ross Lake access" -- that
-- trailhead accesses the SOUTHERN Pickets (Terror Basin, McMillan Spires area) off SR-20 near
-- Newhalem, an unrelated sub-range. This route's own, already-correct waypoints/approach text
-- use Ruth Creek Road (FR-32) to the Hannegan Pass Trailhead instead.
UPDATE routes
SET road = jsonb_set(
      jsonb_set(road, '{name}', '"Ruth Creek Road (FR-32) to Hannegan Pass Trailhead"'::jsonb),
      '{driveNote}', '"From Glacier, WA on the Mount Baker Highway (SR-542), turn onto Hannegan Pass Road (FR-32) and follow it to its end at the Hannegan Pass Trailhead."'::jsonb
    )
WHERE id = 'wa_phantom_peak_south_route'
  AND road ->> 'name' = 'Goodell Creek / Ross Lake access';

-- wa_phantom_peak_west_ridge: emergency.rangerStation gives the Marblemount Wilderness
-- Information Center's phone as 360-854-7200. Its own sibling row (wa_phantom_peak_south_route,
-- same office) already has it correct as (360) 854-7245, matching NPS-linked search results
-- for the WIC's number; 7200 belongs to a different NPS line.
UPDATE routes
SET emergency = jsonb_set(
      emergency, '{rangerStation}',
      '"North Cascades National Park Wilderness Information Center, Marblemount, WA — 360-854-7245, noca_wilderness@nps.gov"'::jsonb
    )
WHERE id = 'wa_phantom_peak_west_ridge'
  AND emergency ->> 'rangerStation' LIKE '%360-854-7200%';

-- wa_phantom_peak_west_ridge: `fa` cites "American Alpine Journal 2022, Vol. 64, Issue 96, p.
-- 106". Every bookseller/publisher listing found for "American Alpine Journal 2022" (AAC's own
-- store, Amazon, Blackwell's, Mountaineers Books) cites it as a single number, "96" -- no
-- separate "Vol. 64" exists alongside the issue number. The "Vol. 64" segment looks fabricated;
-- removed rather than guessing a replacement. Page number (p. 106) could not be independently
-- confirmed either way (source page itself was egress-blocked) and is left as-is.
UPDATE routes
SET fa = 'Eric Wehrly & Rolf Larson, July 30, 2021 (published American Alpine Journal 2022, Issue 96, p. 106)'
WHERE id = 'wa_phantom_peak_west_ridge'
  AND fa = 'Eric Wehrly & Rolf Larson, July 30, 2021 (published American Alpine Journal 2022, Vol. 64, Issue 96, p. 106)';

-- wa_poltergeist_pinnacle: `pitches` is 6, but the row's own `pitch_detail` array has only 4
-- entries (the last literally labeled "P4-6 (ridge, simul-climbed)" -- three notional rope-
-- lengths folded into one entry), and Mountain Project's route page (via search) lists 4
-- pitches: P1 5.9/180ft, P2 5.8/200ft, P3 5.8/200ft, P4+ 5.7/800ft. The sibling duplicate row
-- (wa_poltergeist_pinnacle_north_route, same climb) already correctly carries pitches: 4.
UPDATE routes SET pitches = 4
WHERE id = 'wa_poltergeist_pinnacle'
  AND pitches = 6;

-- areas.wa_poltergeist_pinnacle: lat/lng (48.823, -121.345) sit about 250-300m from the
-- externally-sourced coordinate (Wikipedia: 48°49'25"N 121°20'29"W = 48.82361, -121.34139).
-- That corrected pair is already on file elsewhere in this same peak's data -- the
-- wa_poltergeist_pinnacle route's own summit waypoint uses lat 48.82361, lng -121.34139 --
-- so this looks like a real data-entry divergence rather than legitimate rounding, not a
-- guess.
UPDATE areas
SET lat = 48.82361,
    lng = -121.34139
WHERE id = 'wa_poltergeist_pinnacle'
  AND lat = 48.823
  AND lng = -121.345;

-- wa_primus_peak_south_ridge (+ area wa_primus_peak): "McAllister Glacier" / "North
-- Klawatti/McAllister Glacier" mislabels the glacier flanking Primus Peak's south side, which
-- Isolation/Inspiration-Traverse parties actually cross from Klawatti-Austera Col to reach
-- Primus's south face/south ridge. Wikipedia (via search) describes Primus as "flanked by
-- North Klawatti Glacier to the south" and McAllister Glacier as a real but geographically
-- distinct, non-adjacent glacier in a separate cirque north/east of Dorado Needle -- split off
-- from the Klawatti Glacier system by Klawatti Peak's arete, nowhere near Primus. Two real
-- glaciers sharing one broader ice-cap system got conflated under a compound label
-- ("North Klawatti/McAllister") that then propagated across the route and area rows. Fixed
-- everywhere that compound/standalone mislabel appears; left untouched: "McAllister Camp" and
-- "McAllister-Klawatti col" (a real, differently-named Thunder Creek-side feature -- see the
-- separately flagged blended-route note in the audit log, not fixed here since it needs a
-- human split/reparent decision, not a text substitution).
UPDATE routes SET
  name = replace(name, 'McAllister Glacier', 'North Klawatti Glacier'),
  face = replace(face, 'McAllister Glacier', 'North Klawatti Glacier'),
  overview = replace(replace(overview, 'North Klawatti/McAllister', 'North Klawatti'), 'McAllister Glacier', 'North Klawatti Glacier'),
  hazards = replace(hazards::text, 'North Klawatti/McAllister', 'North Klawatti')::jsonb,
  pro_tips = replace(pro_tips::text, 'North Klawatti/McAllister', 'North Klawatti')::jsonb,
  watch_out = replace(watch_out::text, 'North Klawatti/McAllister', 'North Klawatti')::jsonb,
  waypoints = replace(waypoints::text, 'McAllister Glacier', 'North Klawatti Glacier')::jsonb,
  timing = replace(timing::text, 'North Klawatti/McAllister', 'North Klawatti')::jsonb,
  itinerary = replace(itinerary::text, 'North Klawatti/McAllister', 'North Klawatti')::jsonb,
  partner_requirements = replace(partner_requirements::text, 'McAllister Glacier', 'North Klawatti Glacier')::jsonb,
  seasonal_hazards = replace(seasonal_hazards::text, 'McAllister Glacier', 'North Klawatti Glacier')::jsonb,
  data_quality = replace(data_quality::text, 'North Klawatti/McAllister', 'North Klawatti')::jsonb
WHERE id = 'wa_primus_peak_south_ridge'
  AND name = 'South Ridge / McAllister Glacier';

-- areas.wa_primus_peak: blurb said "the North Klawatti/McAllister Glaciers to the south"
-- (plural, describing what was thought to be two glaciers). It's one glacier -- corrected to
-- singular "North Klawatti Glacier" rather than just dropping the "/McAllister" segment, which
-- would have left the grammatically-wrong plural in place.
UPDATE areas
SET blurb = replace(blurb, 'North Klawatti/McAllister Glaciers to the south', 'North Klawatti Glacier to the south')
WHERE id = 'wa_primus_peak'
  AND blurb LIKE '%North Klawatti/McAllister Glaciers to the south%';

-- wa_prusik_peak_der_sportsman: access._raw.group_size_limits says "Maximum party 12 people"
-- -- the general Alpine Lakes Wilderness default, not the Enchantments Permit Area's specific,
-- more restrictive cap. This same row's own access.rules ("capped at 8 people") and
-- access.group_limit (8) already have the correct, Enchantment-specific figure.
UPDATE routes
SET access = jsonb_set(
      access, '{_raw,group_size_limits}', '"Maximum party 8 people"'::jsonb
    )
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND access #>> '{_raw,group_size_limits}' = 'Maximum party 12 people';

-- wa_prusik_peak_der_sportsman: gain_ft (6200) and loss_ft (4500) can't both be right on a
-- round-trip itinerary that returns to its own trailhead -- cumulative gain must equal
-- cumulative loss. This row's own itinerary.days[] breakdown sums to gainFt=5400,
-- lossFt=5400, self-consistently (and its own timing.totalHrs already correctly equals the
-- sum of its section hours), so the itinerary's total is the reliable figure to sync the
-- top-level columns to.
UPDATE routes SET gain_ft = 5400, loss_ft = 5400
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND gain_ft = 6200
  AND loss_ft = 4500;

-- wa_prusik_peak_der_sportsman: `rappels` says "Single-rope rappel down the back side."
-- (singular), contradicted by every other, more detailed field on the same row --
-- `rope_note` (5 single-rope rappels down the north-side gully), `rappel_count_note` (5 per
-- the route field, 6 counting an extra rappel past the balanced-rock landmark per the descent
-- text), and `rappel_detail` (6 itemized rappel entries) -- all added later per this row's own
-- `corrections` field, which says the multi-rappel detail was "verified via the Mountain
-- Project route page and independent trip reports." This summary field was simply never
-- updated to match.
UPDATE routes
SET rappels = '5-6 single-rope rappels down the north-side gully (opposite the south-facing ascent line).'
WHERE id = 'wa_prusik_peak_der_sportsman'
  AND rappels = 'Single-rope rappel down the back side.';

-- verify
SELECT id, approach_logistics ->> 'trailhead' AS trailhead, road ->> 'name' AS road_name FROM routes WHERE id = 'wa_phantom_peak_south_route';
SELECT id, emergency ->> 'rangerStation' AS ranger, fa FROM routes WHERE id = 'wa_phantom_peak_west_ridge';
SELECT id, pitches FROM routes WHERE id = 'wa_poltergeist_pinnacle';
SELECT id, lat, lng FROM areas WHERE id = 'wa_poltergeist_pinnacle';
SELECT id, name, face FROM routes WHERE id = 'wa_primus_peak_south_ridge';
SELECT id, blurb FROM areas WHERE id = 'wa_primus_peak';
SELECT id, access #>> '{_raw,group_size_limits}' AS grp, gain_ft, loss_ft, rappels FROM routes WHERE id = 'wa_prusik_peak_der_sportsman';
