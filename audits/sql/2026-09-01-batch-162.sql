-- WA alpine audit — batch 162 (2026-09-01, pass 3)
-- Routes: wa_sahale_mountain_r1, wa_sahale_mountain_sahale_glacier,
-- wa_scramble_route, wa_se_ridge_aka_shield_wall, wa_sentinel_peak_standard,
-- wa_sews_sw_rib, wa_sharkfin_tower_southeast_ridge, wa_sherman_peak_baker_route.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Eagle Peak (wa_eagle_peak) — wa_scramble_route (Scramble Route)
-- =========================================================================

-- bivy held 6 entries, ALL of them Tatoosh Range camps for entirely
-- different peaks reached from a different trailhead system: "Snow Lake
-- Camp" is explicitly "the only established camp close enough to matter
-- for Unicorn Peak"; the cross-country bivy above it is for "Unicorn and
-- The Castle"; "Reflection Lakes area winter snow camp" serves "Lane Peak
-- or Pinnacle"; "Cougar Rock Campground" is offered "for a Pinnacle or
-- Unicorn day climb"; "Paradise designated winter group camping area"
-- serves winter Lane Peak parties; "Ohanapecosh Campground" is a fallback
-- for "the Tatoosh trailheads" generally. All of these are reached via
-- Stevens Canyon Road / Reflection Lakes on the EAST end of the Tatoosh
-- Range. Eagle Peak (confirmed via Wikipedia: "set on the west end of the
-- Tatoosh Range... immediately east of Longmire") is climbed entirely from
-- Longmire via the Nisqually suspension bridge — a different trailhead
-- system on the west end, which this row's own approach/approach_variants/
-- itinerary text confirms ("Typically a single long day trip from
-- Longmire"). None of the six entries names Eagle Peak or Longmire.
-- Textbook audit:camp-route-fit corridor-zone-file contamination, same
-- shape as the batch 148 Pilchuck fix ("Clearing bivy entirely matches the
-- row's own text" — this route needs no camp at all).
UPDATE routes SET bivy = NULL
WHERE id = 'wa_scramble_route'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Snow Lake Camp'
  AND bivy->5->>'name' = 'Ohanapecosh Campground';

-- access._raw.permit_location cited the Longmire Wilderness Information
-- Center's phone number as "(360-569-6550)" — transposed digits. Confirmed
-- via Visit Rainier / NPS-sourced listings: the correct number is
-- (360) 569-6650, which matches this same row's own emergency.rangerStation
-- field ("Longmire Wilderness Information Center, Mount Rainier National
-- Park: (360) 569-6650"), so the two fields disagreed with each other as
-- well as with the external source.
UPDATE routes SET access = jsonb_set(
  access, '{_raw,permit_location}',
  to_jsonb(replace(access->'_raw'->>'permit_location', '(360-569-6550)', '(360) 569-6650'))
)
WHERE id = 'wa_scramble_route'
  AND access->'_raw'->>'permit_location' = 'Longmire Wilderness Information Center (360-569-6550)';

-- =========================================================================
-- Mount Washington, Olympic (wa_mount_washington_olympic) —
-- wa_se_ridge_aka_shield_wall (SE Ridge AKA Shield Wall)
-- =========================================================================

-- bivy held 8 entries; 6 of them are Hamma Hamma River corridor camps
-- (Lena Lake, The Brothers climbers camp, Upper Lena Lake, Lake of the
-- Angels, Hamma Hamma River campgrounds, Jefferson Creek pull-outs) that
-- each self-identify, in their own notes, as serving The Brothers, Mount
-- Stone, Mount Skokomish or Mount Pershing — none of them Mount Washington
-- — and sit on a different drainage (Hamma Hamma River Road) from this
-- route's own trailhead (FR-2419 off North Lake Cushman Road/Big Creek).
-- The remaining 2 entries explicitly name this route's own peak: "Big
-- Creek Campground, Lake Cushman" states outright it is "the obvious
-- roadside base for MOUNT ELLINOR AND MOUNT WASHINGTON," and "Staircase
-- Campground" is described as a fallback for "the Ellinor and Washington
-- trailheads." Same audit:camp-route-fit corridor-zone-file contamination
-- as the Mount Steel "Belview... for Mount Olson only" fix CLAUDE.md
-- documents — a regional Olympics camping zone file bleeding onto this
-- route, with the row's OWN text naming which peaks each entry serves.
UPDATE routes SET bivy = jsonb_build_array(bivy->6, bivy->7)
WHERE id = 'wa_se_ridge_aka_shield_wall'
  AND jsonb_array_length(bivy) = 8
  AND bivy->0->>'name' = 'Lena Lake designated sites'
  AND bivy->6->>'name' = 'Big Creek Campground, Lake Cushman'
  AND bivy->7->>'name' = 'Staircase Campground, North Fork Skokomish';

-- =========================================================================
-- Sahale Mountain (wa_sahale_mountain) — wa_sahale_mountain_sahale_glacier
-- (Sahale Arm / Sahale Glacier)
-- =========================================================================

-- bivy[0] (Sahale Glacier Camp) elev read 7,500 ft, contradicting this
-- SAME row's own waypoints ("Sahale Glacier Camp", elev/elevFt 7600),
-- itinerary ("the permitted camp at ~7,600 ft"), and pitch_detail
-- ("totals 5.9 mi / 3,940 ft gain from the trailhead to camp (7,600 ft)")
-- -- the last of which this row's own corrections note already fixed to
-- 7,600 in a prior pass (from a stale 7,400), citing WTA. bivy carried a
-- third, still-wrong figure the earlier correction missed.
UPDATE routes SET bivy = jsonb_set(bivy, '{0,elev}', '7600')
WHERE id = 'wa_sahale_mountain_sahale_glacier'
  AND bivy->0->>'name' = 'Sahale Glacier Camp'
  AND (bivy->0->>'elev')::numeric = 7500;

-- =========================================================================
-- Sharkfin Tower (wa_sharkfin_tower) — wa_sharkfin_tower_southeast_ridge
-- (Southeast Ridge)
-- =========================================================================

-- bivy's "Sahale Glacier Camp" entry (a cross-referenced camp option, not
-- this route's own trailhead) read elev 7,400 ft -- the same stale figure
-- this batch's sibling wa_sahale_mountain_sahale_glacier just carried
-- (there as 7,500) before correction. The camp's real elevation is 7,600
-- ft per that row's own waypoints/itinerary/pitch_detail and this route's
-- own sibling-batch corroboration.
UPDATE routes SET bivy = jsonb_set(bivy, '{2,elev}', '7600')
WHERE id = 'wa_sharkfin_tower_southeast_ridge'
  AND bivy->2->>'name' = 'Sahale Glacier Camp'
  AND (bivy->2->>'elev')::numeric = 7400;

-- =========================================================================
-- Sentinel Peak (wa_sentinel_peak) — wa_sentinel_peak_standard
-- (Standard Route)
-- =========================================================================

-- bivy held 7 entries; 5 of them (Spider-Formidable Col, Drop Creek high
-- camp, South Fork Cascade River valley camps, Le Conte Pass, Crest
-- bivouacs above the South Cascade and Chickamin glaciers) are, per their
-- own notes, camps for Spider Mountain, Mount Formidable, Le Conte
-- Mountain and Elephant Head -- none of them named anywhere else in this
-- row's own approach/overview/beta text (checked). The remaining 2 are
-- this route's own: "Cache Col and the Cache Glacier shoulder" is "the
-- gateway to everything in this file" on the standard approach this row's
-- own overview describes, and "Sentinel Pass and Lizard Col" states
-- outright it is "the direct bases for Sentinel Peak and for Lizard
-- Mountain." Same Ptarmigan Traverse corridor zone-file contamination as
-- the Old Guard/Sentinel entries CLAUDE.md already documents nearby.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->5)
WHERE id = 'wa_sentinel_peak_standard'
  AND jsonb_array_length(bivy) = 7
  AND bivy->0->>'name' = 'Cache Col and the Cache Glacier shoulder'
  AND bivy->5->>'name' = 'Sentinel Pass and Lizard Col';

-- =========================================================================
-- Sherman Peak, Baker (wa_sherman_peak_baker) — wa_sherman_peak_baker_route
-- (Crater Rim Scramble from Easton Glacier)
-- =========================================================================

-- bivy held 6 entries; 4 of them (Coleman Glacier bivy under the Black
-- Buttes, Cougar Divide meadow camps, Skyline Divide crest camps, Deadhorse
-- Creek basin) are, per their own notes, camps for Colfax Peak's north-side
-- ice routes and for Hadley Peak -- entry 3 states outright "this is the
-- north-side approach to Hadley Peak and it has nothing to do with the
-- Black Buttes or the Coleman." Neither Colfax nor Hadley is this route's
-- peak (Sherman Peak, reached from the south via Easton/Squak Glacier).
-- The remaining 2 entries are this route's own: "Crag View, Squak Glacier"
-- states outright it is "the camp for Sherman Peak's Squak Glacier route,"
-- and "Upper Squak benches" is the higher camp on that same approach.
-- Same Mount Baker massif corridor zone-file contamination as the other
-- fixes in this batch.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1)
WHERE id = 'wa_sherman_peak_baker_route'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Crag View, Squak Glacier'
  AND bivy->2->>'name' = 'Coleman Glacier bivy under the Black Buttes north faces'
  AND bivy->3->>'name' = 'Cougar Divide meadow camps';

-- verify: should return 0 rows
select id from routes
where id in (
  'wa_scramble_route', 'wa_se_ridge_aka_shield_wall',
  'wa_sahale_mountain_sahale_glacier', 'wa_sharkfin_tower_southeast_ridge',
  'wa_sentinel_peak_standard', 'wa_sherman_peak_baker_route'
)
and (
  (id = 'wa_scramble_route' and (bivy is not null or access->'_raw'->>'permit_location' like '%360-569-6550%'))
  or (id = 'wa_se_ridge_aka_shield_wall' and bivy::text like '%Lena Lake%')
  or (id = 'wa_sahale_mountain_sahale_glacier' and bivy->0->>'elev' = '7500')
  or (id = 'wa_sharkfin_tower_southeast_ridge' and bivy::text like '%"elev": 7400%')
  or (id = 'wa_sentinel_peak_standard' and bivy::text like '%Spider-Formidable%')
  or (id = 'wa_sherman_peak_baker_route' and bivy::text like '%Coleman Glacier%')
);
