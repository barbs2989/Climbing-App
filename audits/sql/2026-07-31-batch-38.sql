-- WA alpine audit batch 38 (2026-07-31): Unicorn Peak, Ottohorn (x2), Overcoat Peak,
-- Pernod Spire, Phantom Peak, Point Success, Mount Challenger/Poltergeist Pinnacle.
-- Run each statement, then the paired "expect" select, before moving to the next.

-- ---------------------------------------------------------- Ottohorn Southeast Route (FA)
-- fa carried Twin Needles' first ascent (Degenhardt/Martin/Strandberg, Aug 17 1932) --
-- contradicting this same row's own `overview` field and the wa_ottohorn area's own
-- `blurb`, which both already correctly describe Ottohorn's real FA: Ed Cooper, Glen
-- Denny, Joan Firey, Joe Firey & George Whitmore, Sept 10 1961, via the east ridge from
-- the Ottohorn-Himmelhorn col. Corroborated externally (AAC Publications "First Ascents
-- in the Southern Pickets"; Alpinist's George Whitmore obituary).
UPDATE routes
SET fa = 'Ed Cooper, Glen Denny, Joan Firey, Joe Firey & George Whitmore, September 10, 1961 (peak first ascent, via this same southeast/east-ridge line from the Ottohorn-Himmelhorn col, not a separately confirmed route-specific FA record)',
    corrections = COALESCE(corrections, '') || ' 2026-07-31: fa corrected — previously credited Twin Needles'' 1932 FA party (Degenhardt/Martin/Strandberg), which this row''s own overview and the wa_ottohorn area blurb already correctly distinguish from Ottohorn''s real 1961 FA.'
WHERE id = 'wa_ottohorn_southeast_route'
  AND fa = 'William Degenhardt, James Martin & Herb Strandberg, August 17, 1932 (peak first ascent; presumed to be via this same southeast line since it is the mountain''s only established route, not a separately confirmed route-specific FA record)';

-- expect: 1 row updated
SELECT id, fa FROM routes WHERE id = 'wa_ottohorn_southeast_route';

-- --------------------------------------------------- Ottohorn Southeast Route (waypoint)
-- waypoints[7] "Ottohorn summit" elevFt was 7640, the sole outlier against this same
-- row's own high_point_ft (7840), the wa_ottohorn area's elevation_ft (7840), and
-- external corroboration (Steph Abegg Southern Pickets material cites 7,840 ft).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elevFt}', '7840', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints[7] (Ottohorn summit) elevFt corrected from 7640 to 7840 to match this row''s own high_point_ft and the wa_ottohorn area elevation_ft.'
WHERE id = 'wa_ottohorn_southeast_route'
  AND waypoints->7->>'name' = 'Ottohorn summit'
  AND (waypoints->7->>'elevFt')::int = 7640;

-- expect: 1 row updated
SELECT id, waypoints->7 AS summit_waypoint FROM routes WHERE id = 'wa_ottohorn_southeast_route';

-- ------------------------------------------- Overcoat Peak Southeast Route (land_manager)
-- access.land_manager named Okanogan-Wenatchee NF, which has no jurisdiction over this
-- route's Dingford Creek/Middle Fork Snoqualmie approach -- contradicting this same row's
-- own more specific access.landManager/emergency.rangerStation (both correctly Mt.
-- Baker-Snoqualmie NF, Snoqualmie Ranger District) and USFS's own Dingford Creek
-- Trailhead page. Same wrong-ranger-district contamination pattern as batches 4/5/8/12/37.
UPDATE routes
SET access = jsonb_set(access, '{land_manager}', '"Mount Baker-Snoqualmie National Forest (Snoqualmie Ranger District) — Alpine Lakes Wilderness"', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.land_manager corrected from "Mt. Baker-Snoqualmie National Forest / Okanogan-Wenatchee National Forest — Alpine Lakes Wilderness" — Okanogan-Wenatchee NF has no jurisdiction over this route''s Dingford Creek/Middle Fork Snoqualmie corridor, matches this row''s own access.landManager/emergency.rangerStation.'
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest / Okanogan-Wenatchee National Forest — Alpine Lakes Wilderness';

-- expect: 1 row updated
SELECT id, access->'land_manager' AS land_manager FROM routes WHERE id = 'wa_overcoat_peak_southeast_route';

-- ------------------------------------------- Overcoat Peak Southeast Route (parking_pass)
-- access.parking_pass cited Salmon La Sac, Pete Lake and Necklace Valley -- three
-- unrelated east-side/Skykomish trailheads this route never uses -- contradicting this
-- row's own access.fees, which correctly discusses only the Dingford Creek Trailhead.
-- Boilerplate copy-paste from unrelated trailheads.
UPDATE routes
SET access = jsonb_set(access, '{parking_pass}', '"No day-use fee currently posted at the Dingford Creek Trailhead itself, a Northwest Forest Pass or America the Beautiful interagency pass is recommended in case requirements change."', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access.parking_pass corrected — previously cited Salmon La Sac, Pete Lake and Necklace Valley trailheads, none of which this route uses (its trailhead is Dingford Creek on Middle Fork Snoqualmie Road), replaced to match this row''s own access.fees.'
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at Salmon La Sac, Pete Lake, and Necklace Valley trailheads — $5/day or $30/year.';

-- expect: 1 row updated
SELECT id, access->'parking_pass' AS parking_pass FROM routes WHERE id = 'wa_overcoat_peak_southeast_route';

-- ------------------------------------------- Pernod Spire Standard Rock Route (waypoint)
-- waypoints[0] "Burgundy Col" note was a leaked internal-research artifact ("Reused
-- coordinate from this session's own Vasiliki Tower research...") -- same session-leak
-- pattern already fixed on Northwest Mox Peak (batch 36) and Dragontail's Serpentine
-- Arete (batch 19). The coordinate itself is fine (matches the same real col on sibling
-- route wa_south_face under wa_vasiliki_tower); only the note text is replaced.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,note}', '"7,770-ft notch separating the Wine Spires from Vasiliki Ridge, reached via steep talus/scree above the Bench camp."', false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints[0] (Burgundy Col) note replaced — previously a leaked internal-research artifact referencing "this session''s own Vasiliki Tower research", not a real route note. Coordinate itself was already correct.'
WHERE id = 'wa_pernod_spire_standard'
  AND waypoints->0->>'name' = 'Burgundy Col'
  AND waypoints->0->>'note' = 'Reused coordinate from this session''s own Vasiliki Tower research (same real col, separating the Wine Spires from Vasiliki Ridge).';

-- expect: 1 row updated
SELECT id, waypoints->0 AS burgundy_col FROM routes WHERE id = 'wa_pernod_spire_standard';
