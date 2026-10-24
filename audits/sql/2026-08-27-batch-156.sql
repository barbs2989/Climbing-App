-- WA alpine audit -- batch 156 (2026-08-27, pass 3)
-- Routes: wa_north_face_left_buttress, wa_north_face_var_right_directisimo,
-- wa_north_gardner_mountain_nw_couloir, wa_north_ridge_2, wa_north_ridge_3,
-- wa_north_ridge_4, wa_northeast_buttress_4, wa_northeast_face_direct.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Castle Peak -- North Face (Left Buttress) "Fight or Flight", wa_north_face_left_buttress
-- =========================================================================

-- road describes a completely unrelated place: Stehekin (Lake Chelan ferry
-- access) and the Bridge Creek Trailhead off SR-20 near Rainy Pass. Castle
-- Peak sits in the Pasayten Wilderness at 48.98 N, right on the Canadian
-- border -- Stehekin (~48.3 N) and Bridge Creek (~48.5 N) are both a
-- different range entirely, over 50 miles south, and belong to a different
-- route (this same batch's wa_northeast_face_direct/Mount Formidable carries
-- near-identical Stehekin/ferry road text, which is genuinely correct for
-- that Cascade-Pass-area peak -- this looks like that text was copied onto
-- the wrong row). This row's OWN approach field and waypoints already
-- correctly describe the real access: BC Hwy 3 to the Monument 78/Windy Joe
-- trailhead in Manning Park (Canada side, "the more common approach"), or
-- SR-20 to the Ross Dam Trailhead plus a boat/hike up Ross Lake to Lightning
-- Creek (US side). Re-homing only what this row's own approach text already
-- states -- nothing new researched or invented.
UPDATE routes
SET road = '{"name": "BC Hwy 3 to the Monument 78/83 (Windy Joe) Trailhead, E.C. Manning Provincial Park, BC (Canada-side approach), or SR-20 to the Ross Dam Trailhead + Ross Lake boat/hike (US-side approach)", "status": "Paved highway access to both trailheads. From either, the route itself is reached by a long, multi-day cross-country wilderness approach with no maintained trail for the final stretch.", "driveNote": "Canada side (the more common approach): BC Hwy 3 to the Monument 78/Windy Joe trailhead in Manning Park. US side: SR-20 to the Ross Dam Trailhead, then a boat or hike up Ross Lake to Lightning Creek (wilderness permit from the North Cascades Wilderness Information Center in Marblemount)."}'::jsonb
WHERE id = 'wa_north_face_left_buttress'
  AND road->>'name' = 'Stehekin (via Lake Chelan ferry/floatplane, no road access) or Bridge Creek Trailhead off SR-20';

-- =========================================================================
-- Colchuck Peak -- Northeast Buttress, wa_northeast_buttress_4
-- =========================================================================

-- watch_out is stored as a single jsonb string (every sibling route in this
-- batch carries watch_out as a jsonb array) and its content describes an
-- entirely different route: mixed M4 ice climbing, an "ice bulge (A2-3
-- rating)" pitch, a heavily corniced rappel descent, and -- the give-away --
-- "wind-loaded terrain near Snoqualmie Pass." Colchuck Peak is in the
-- Enchantments/Icicle Creek drainage near Leavenworth, nowhere near
-- Snoqualmie Pass (a different range, over 60 miles away), and this row's
-- own overview describes "Colchuck's premier ROCK route... mostly solid
-- granite," 5.8+ summer rock -- not a mixed/ice route with M4 and A2-3
-- pitches. The row's own hazards field and climbing_route pitch notes
-- already correctly describe this route's real hazards (moat crossing,
-- loose/mossy rock in the lower dihedral, the blind-cam 5.9 crux, and the
-- long 17-21 hour day). Replacing the foreign text with a proper jsonb
-- array built only from what this row's own hazards/climbing_route fields
-- already establish -- nothing new researched or invented.
UPDATE routes
SET watch_out = '["The moat where snow meets rock at the buttress base varies from an easy snow-bridge step to the technical crux of the day depending on conditions, and parties often rope up for it.", "Loose, mossy rock and old fixed pins mark the dirtiest section of the route, in the shallow chimney leading into the main dihedral on the lower buttress.", "The technical crux (around pitch 9-10, 5.9) is steep and smooth, requiring a cam to be placed blind in a horizontal crack.", "This is a very long 17-21 hour car-to-car day, and benighted parties are common, often finishing the Colchuck Glacier descent by headlamp."]'::jsonb
WHERE id = 'wa_northeast_buttress_4'
  AND watch_out::text LIKE '%wind-loaded terrain near Snoqualmie Pass%';

-- =========================================================================
-- Concord Tower area record, wa_concord_tower (areas table)
-- =========================================================================

-- areas.wa_concord_tower.elevation_ft (7611) contradicts this same peak's
-- own route row (wa_north_face_var_right_directisimo), whose high_point_ft
-- and summit waypoint were already corrected to 7560 in a prior audit pass
-- (per that row's own corrections note: "external sources... consistently
-- give Concord Tower a 7,560 ft summit"). Confirmed independently here via
-- two separate WebSearch queries returning SummitPost's figure of 7,560 ft
-- for Concord Tower's summit (immediately south of Liberty Bell, 7,720 ft,
-- in the Liberty Bell Group above Washington Pass) -- 7,611 does not appear
-- in any source found. The area record was never updated when the route
-- record was fixed; bringing it into agreement.
UPDATE areas
SET elevation_ft = 7560
WHERE id = 'wa_concord_tower'
  AND elevation_ft = 7611;

-- verify: each of the three rows above should now read the corrected value
SELECT id, road FROM routes WHERE id = 'wa_north_face_left_buttress';
SELECT id, watch_out FROM routes WHERE id = 'wa_northeast_buttress_4';
SELECT id, elevation_ft FROM areas WHERE id = 'wa_concord_tower';
