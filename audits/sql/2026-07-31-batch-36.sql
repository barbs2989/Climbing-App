-- WA Alpine Audit — Pass 1, Batch 36 — 2026-07-31
-- Peaks: Mount Formidable (Northeast Face Direct), Johannesburg Mountain
--        (Northeast Ridge, 1963 Route), Argonaut Peak (Northwest Arete),
--        Sloan Peak (Northwest Buttress), Kangaroo Temple (Northwest Face),
--        South Early Winters Spire (Northwest Face, Boving-Pollock),
--        Northwest Mox Peak (Standard Route), Dorado Needle (Northwest Ridge)

-- =========================================================================
-- Mount Formidable
-- =========================================================================

-- wa_northeast_face_direct: audited clean. FA (Jens Klubberud and Loren
-- Campbell, July 20 2002), the documented 11-year gap to a 2013 second
-- ascent, elevation (8,325 ft), and the Cascade Pass Trailhead coordinates
-- are all independently corroborated (SummitPost route + trip-report pages,
-- Wikipedia). The row's own data_quality note already flags the full
-- surnames as not tied to a primary source (no AAJ/AAC entry located) --
-- left as-is, consistent with the established policy of not fixing what a
-- row already marks unverified.

-- =========================================================================
-- Johannesburg Mountain
-- =========================================================================

-- wa_northeast_ridge_1963_route: `approach_logistics.trailheadLat/Lng`
-- (48.4683, -121.06) is mislabeled -- those are this same row's own
-- `waypoints` coordinates for "Cascade Pass" itself (a junction 3.6 mi up
-- the trail, elev 5392 ft), not the trailhead. The row's own waypoints
-- array separately carries a corrected trailhead point (48.4755, -121.075,
-- elev 3600 ft) with a note explaining it already fixed a ~1.2km DB-pin
-- error -- that fix was never propagated to approach_logistics. Confirmed
-- against this batch's own Mount Formidable route, which shares the
-- identical real-world trailhead (same Cascade River Road end) and stores
-- matching approach_logistics coordinates (48.475497, -121.075031).
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(approach_logistics, '{trailheadLat}', '48.475497', false),
  '{trailheadLng}', '-121.075031', false
),
corrections = COALESCE(corrections, '') || ' 2026-07-31: approach_logistics.trailheadLat/Lng corrected from 48.4683,-121.06 (the Cascade Pass junction, 3.6mi up-trail) to 48.475497,-121.075031 (the actual Cascade River Road trailhead) -- matches this row''s own already-corrected waypoints entry and the identical shared trailhead on wa_northeast_face_direct (Mount Formidable).'
WHERE id = 'wa_northeast_ridge_1963_route'
  AND (approach_logistics->>'trailheadLat')::numeric = 48.4683
  AND (approach_logistics->>'trailheadLng')::numeric = -121.06;

-- =========================================================================
-- Argonaut Peak
-- =========================================================================

-- wa_northwest_arete: the short `descent` field ("Reverse the arête back to
-- the notch, then downclimb the approach couloir.") directly contradicts
-- this same row's own, more detailed `descent_text`, `rappel_detail` (4
-- rappels), and `corrections` fields, which all agree the standard descent
-- instead traverses east off the ridge to the Argonaut-Colchuck col via the
-- NE-face snowfield and East Face -- not a reversal of the arête. Rewrote
-- the short field to match the row's own already-correct detailed data.
UPDATE routes
SET descent = 'Traverse east from the ridge crest to the Argonaut-Colchuck col: rappel the upper northeast-face snowfield, scramble to a broken-terrain rappel, then two more rappels down the East Face (4 total) -- do not expect to simply reverse the arete. From the East Face base, descend scree/talus/snow to the approach basin and reverse the approach.',
    corrections = COALESCE(corrections, '') || ' 2026-07-31: the short descent field previously described reversing the arete back to the notch, contradicting this row''s own descent_text/rappel_detail (both describe a 4-rappel traverse to the Argonaut-Colchuck col instead) -- rewrote to match.'
WHERE id = 'wa_northwest_arete'
  AND descent = 'Reverse the arête back to the notch, then downclimb the approach couloir.';

-- =========================================================================
-- Sloan Peak
-- =========================================================================

-- wa_northwest_buttress: audited clean. Route (IV 5.9+, 9 pitches, ~1800
-- ft), summit elevation (7,835 ft), and the Bedal Creek/FR-4096 approach are
-- all independently confirmed (Mountain Project, SummitPost, Wikipedia).
-- FA year (2000 vs. a prior file's 2020) was already researched and
-- resolved by an earlier pass, with the discrepancy documented in this
-- row's own data_quality note -- left as-is.

-- =========================================================================
-- Kangaroo Temple
-- =========================================================================

-- wa_northwest_face_2: audited clean. FA (Fred Beckey and Helmy Beckey,
-- 1942, the peak's first ascent) is independently confirmed (Mountaineers
-- Beckey retrospectives, AAC Publications), as is the 7,572 ft summit
-- elevation and the Washington Pass hairpin-turnout approach.

-- =========================================================================
-- South Early Winters Spire
-- =========================================================================

-- wa_northwest_face_boving_pollock: flagged, not fixed -- see below.

-- Flagged for human review (South Early Winters Spire):
-- wa_northwest_face_boving_pollock: the route name credits "Boving-Pollock"
--   and the row's own overview states a 1976 aid FA by Boving & Pollock
--   followed by a 1977 free ascent by Boving & Kerns, but the `fa` field
--   only records the 1977 free-ascent pair, omitting the 1976 aid FA. The
--   row's own data_quality note already flags this as unresolved (the
--   corroborating Cascade Climbers forum thread 403'd this pass too) --
--   left unfixed per the standing policy of not patching a field a row
--   already marks unverified.

-- =========================================================================
-- Northwest Mox Peak
-- =========================================================================

-- wa_northwest_mox_peak_standard: two issues on the same waypoint.
-- (1) elev (1800) contradicts this row's own approach text ("Park at
-- 2,350 ft where the road becomes impassable") and the identical Depot
-- Creek Road coordinate (49.033, -121.4025) stored on sibling
-- wa_southeast_mox_peak_se_rib, which gives 2350 ft for the same real
-- trailhead.
-- (2) note is a leaked internal research artifact ("Reused coordinate from
-- this session's own Southeast Mox Peak research...") -- the same
-- session-leak pattern previously found and fixed on
-- wa_dragontail_peak_serpentine_arete in batch 19. Replaced with normal
-- trailhead description text. (Note: sibling wa_southeast_mox_peak_se_rib
-- carries the identical leaked-note pattern on its own trailhead waypoint,
-- but that route is outside this batch's scope -- flagged below rather
-- than fixed.)
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elev}', '2350', false),
  '{0,note}', '"Depot Creek Road parking/trailhead (BC, Canada) -- the shared trailhead for both Mox Peaks approaches, off Chilliwack Lake Road/Depot Creek Road; park at ~2,350 ft where the road becomes impassable, per this route''s own approach description."'::jsonb,
  false
),
corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoint[0] (Depot Creek Road Trailhead) elev corrected from 1800 to 2350, matching this route''s own approach text and the identical trailhead coordinate on sibling wa_southeast_mox_peak_se_rib; also replaced a leaked internal research-session note in the same waypoint with normal description text.'
WHERE id = 'wa_northwest_mox_peak_standard'
  AND (waypoints->0->>'elev')::numeric = 1800
  AND waypoints->0->>'note' = 'Reused coordinate from this session''s own Southeast Mox Peak research (same real trailhead off Depot Creek Road).';

-- Flagged, not fixed (Northwest Mox Peak / Southeast Mox Peak):
-- wa_southeast_mox_peak_se_rib (out of this batch's scope -- discipline in
--   scope but not selected this round): carries the same leaked
--   internal-research-note pattern on its own Depot Creek Road trailhead
--   waypoint ("Reused coordinate from this session's own Devil's Club
--   (Southeast Mox Peak) research..."). Worth folding into a future batch
--   or a dedicated DB-wide sweep for this note-leak pattern (also seen in
--   batch 19).

-- =========================================================================
-- Dorado Needle
-- =========================================================================

-- wa_northwest_ridge: waypoints[0] ("Eldorado Creek Trailhead (Cascade
-- River Road)") stored lat/lng (48.5136, -121.1964) that puts the point
-- roughly 8 km from the real trailhead -- contradicted by this same row's
-- own `approach_logistics.trailheadLat/Lng` (48.49261, -121.11761) and by
-- all 4 sibling Eldorado Peak routes in the DB (wa_eldorado_peak_east_ridge,
-- wa_eldorado_peak_west_arete, wa_eldorado_peak_northeast_face,
-- wa_eldorado_peak_eldorado_glacier_nw), which all agree on ~48.49,-121.12
-- for the identical shared trailhead this route's own approach text says it
-- uses ("Same Eldorado Peak approach"). The row's `gpx` array's first point
-- carried the same wrong coordinate. Corrected both to match the row's own
-- approach_logistics value.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,lat}', '48.4926', false),
  '{0,lng}', '-121.1176', false
),
gpx = jsonb_set(
  jsonb_set(gpx, '{0,0}', '48.4926', false),
  '{0,1}', '-121.1176', false
),
corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints[0]/gpx[0] trailhead coordinate corrected from 48.5136,-121.1964 (~8km off) to 48.4926,-121.1176, matching this row''s own approach_logistics.trailheadLat/Lng and all 4 sibling Eldorado Peak routes sharing the same real Eldorado Creek trailhead.'
WHERE id = 'wa_northwest_ridge'
  AND (waypoints->0->>'lat')::numeric = 48.5136
  AND (waypoints->0->>'lng')::numeric = -121.1964
  AND (gpx->0->>0)::numeric = 48.5136;
