-- WA alpine audit -- batch 219 (2026-09-06, pass 4)
-- Routes: wa_mount_torment_south_ridge, wa_mount_torment_torment_forbidden_traverse,
-- wa_mount_triumph_northeast_ridge, wa_ne_ridge (Cathedral Peak, Pasayten),
-- wa_needle_peak_north_ridge, wa_neve_glacier_west_ridge, wa_news_nw_corner
-- (North Early Winters Spire), wa_nooksack_tower_beckey_route,
-- wa_nooksack_tower_south_face.
-- Each WHERE clause includes the current (wrong/null) value as a safety check.
-- Apply each UPDATE individually.

-- Needle Peak North Ridge: high_point_ft was NULL. The row's own summit waypoint
-- already stores elev/elevFt 7896 at coordinates matching this project's own
-- areas row for Needle Peak (48.2795734,-120.902325) to five decimal places.
-- Externally corroborated: listsofjohn.com lists Needle Peak, WA at 7,897 ft
-- (1 ft rounding difference from the row's own waypoint, not a conflict).
-- Filled to match the row's own waypoint and the external source.
UPDATE routes
SET high_point_ft = 7896
WHERE id = 'wa_needle_peak_north_ridge'
  AND high_point_ft IS NULL;

-- Nooksack Tower South Face: fa was dated "July 2002". The AAC's American Alpine
-- Journal published this first-ascent report in its 2002 annual volume, but the
-- climb itself took place in July 2001 -- the source page's own URL
-- (cascadeclassics.org/Climbing/NooksackTower/SouthFace/Summer01/) and a
-- biographical account of the climb ("the summer of Manfredi's senior year",
-- referring to 2001) both independently date the ascent to summer 2001, not
-- 2002. This is the common AAJ-publication-year-vs-ascent-year mixup. Corrected
-- to the actual climbing date; climber names (Jens Klubberud and Ben Manfredi)
-- are unaffected and already correct.
UPDATE routes
SET fa = 'Jens Klubberud and Ben Manfredi, July 2001'
WHERE id = 'wa_nooksack_tower_south_face'
  AND fa = 'Jens Klubberud and Ben Manfredi, July 2002';

-- Nooksack Tower South Face: access.landManager said only "National Park Service
-- (North Cascades National Park)", directly disagreeing with this same row's own
-- access.land_manager field ("Mt. Baker-Snoqualmie National Forest ... with some
-- upper routes crossing into North Cascades National Park") -- two keys on one
-- row making incompatible single-agency claims about the same approach. The
-- sibling wa_nooksack_tower_beckey_route, which shares this exact trailhead and
-- summit, already states the joint-jurisdiction fact correctly in its own
-- landManager field ("North Cascades National Park / Mount Baker-Snoqualmie
-- National Forest") -- externally corroborated (Nooksack Tower's summit sits
-- inside North Cascades NP; the Nooksack Cirque approach is Mount Baker-
-- Snoqualmie NF/Wilderness land). Corrected to match the sibling and resolve the
-- self-contradiction.
UPDATE routes
SET access = jsonb_set(access, '{landManager}',
  '"North Cascades National Park / Mount Baker-Snoqualmie National Forest"'::jsonb)
WHERE id = 'wa_nooksack_tower_south_face'
  AND access->>'landManager' = 'National Park Service (North Cascades National Park)';

-- Nooksack Tower South Face: rappels (the prose descent-method column every
-- other route in this batch has populated) was NULL, even though this row's own
-- rappel_count_note already concludes "10 is used as the representative count"
-- for a descent via the standard Beckey-Schmidtke line, and this row's own
-- descent_text already states the first-ascent party descended that way rather
-- than reversing the South Face. Filled by re-homing those two on-file
-- statements into the rappels column, worded to match the sibling Beckey
-- route's own rappels field for the same descent line -- nothing researched.
UPDATE routes
SET rappels = 'Descent typically follows the standard Beckey-Schmidtke North Face route rather than reversing the South Face: from the summit, downclimb/rappel the north arete and rock trough to the head of the couloir, then make a long series of rappels (trip reports describe roughly ten 60m rappels) down the couloir back to the glacier below, building anchors as needed (slings on rock horns, occasional picket or v-thread).'
WHERE id = 'wa_nooksack_tower_south_face'
  AND rappels IS NULL;

-- Nooksack Tower South Face: both waypoints (trailhead and summit) were missing
-- elev/elevFt entirely. The trailhead point is the identical coordinate
-- (48.89401,-121.65259) as the sibling wa_nooksack_tower_beckey_route's own
-- "Nooksack Cirque Trailhead (Trail #750)" waypoint, which stores elev/elevFt
-- 2200; the summit point is the identical coordinate (48.8364,-121.5867) as this
-- project's own Nooksack Tower area row and as the sibling's own summit
-- waypoint, both 8285 (matching this row's own high_point_ft). Filled from the
-- row's own high_point_ft and the sibling's matching waypoints -- no new
-- research.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(waypoints, '{0,elev}', '2200'::jsonb),
          '{0,elevFt}', '2200'::jsonb),
        '{1,elev}', '8285'::jsonb),
      '{1,elevFt}', '8285'::jsonb)
WHERE id = 'wa_nooksack_tower_south_face'
  AND waypoints->0->>'name' = 'Nooksack Cirque Trailhead (Trail #750)'
  AND waypoints->0->'elev' IS NULL
  AND waypoints->1->>'name' = 'Nooksack Tower summit'
  AND waypoints->1->'elev' IS NULL;

-- This session independently checked access/land-manager, permit, and
-- first-ascent facts for both Nooksack Tower routes against external sources
-- (elevation, FA date/party, and NPS/USFS jurisdiction over the Nooksack Cirque
-- approach vs. the summit). Stamping access_checked_at on both.
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_nooksack_tower_beckey_route';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_nooksack_tower_south_face';
