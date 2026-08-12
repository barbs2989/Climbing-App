-- WA alpine audit — pass 2, batch 66 (2026-08-07)
-- Frying Pan/Whitman Glaciers (Little Tahoma), Ghost Peak, Gilbert Peak x3, Glacier Peak x5

-- wa_frying_pan_whitman_glaciers: approach_logistics.trailhead/trailheadLat/trailheadLng/trailheadDirection
-- described "White River Trailhead (FR-6400, Lake Wenatchee)" (~150mi away, Okanogan-Wenatchee NF) — cross-route
-- contamination. Route's own approach text/waypoints/gpx all agree on Fryingpan Creek Trailhead, 46.8884/-121.611,
-- ~3,900 ft (confirmed via NPS/Gaia GPS trailhead data).
UPDATE routes
SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(jsonb_set(
      approach_logistics, '{trailhead}', '"Fryingpan Creek Trailhead"'),
      '{trailheadLat}', '46.8884'),
      '{trailheadLng}', '-121.611'),
      '{trailheadDirection}', '"From the Fryingpan Creek Trailhead (~3,900 ft) on the Sunrise/White River Road, about 3 miles past the White River entrance station."')
WHERE id = 'wa_frying_pan_whitman_glaciers';

-- wa_frying_pan_whitman_glaciers: access.notes referenced "Mount Tom area, North Cascades" and a Northwest Forest
-- Pass — nonsensical for a Mount Rainier NP route, contradicts the row's own access.parking_pass/landManager.
-- Same boilerplate-junk string flagged DB-wide (35 routes) in pass-1 batch 15; this is one more instance.
UPDATE routes
SET access = jsonb_set(access, '{notes}', '"NPS entrance fee applies inside Mount Rainier National Park (not a Northwest Forest Pass); no additional climbing-specific permit beyond the climbing registration fee listed above."')
WHERE id = 'wa_frying_pan_whitman_glaciers';

-- wa_frying_pan_whitman_glaciers: pitches=0 contradicts its own pitch_detail (2 pitches, 335m+183m=518m matching
-- length_m exactly).
UPDATE routes SET pitches = 2 WHERE id = 'wa_frying_pan_whitman_glaciers';

-- wa_frying_pan_whitman_glaciers: gain_ft=7600 contradicts its own itinerary.days[].gainFt sum (3550+3788+0=7338),
-- which matches the already-correct loss_ft=7338 for this round-trip route.
UPDATE routes SET gain_ft = 7338 WHERE id = 'wa_frying_pan_whitman_glaciers';

-- wa_ghost_peak_south_route: descent_text has the party exiting via Big Beaver Trail to Ross Lake, contradicting
-- the route's own approach text (explicitly Hannegan Pass Trailhead, "not Ross Lake") and itinerary.days[6]
-- ("Hike out to the Hannegan Pass trailhead"). Copy-paste contamination from a Ross-Lake-approached route.
UPDATE routes
SET descent_text = replace(descent_text,
  'back over Pt. 7374 to Challenger Arm, over Perfect Pass/Whatcom Glacier or Whatcom Peak''s north ridge to Whatcom Pass, and out the Big Beaver Trail to Ross Lake and the dam.',
  'back over Pt. 7374 to Challenger Arm, over Perfect Pass/Whatcom Glacier or Whatcom Peak''s north ridge to Whatcom Pass, then reverse the Brush Creek Trail and Chilliwack River crossing back over Hannegan Pass to the Hannegan Pass Trailhead.')
WHERE id = 'wa_ghost_peak_south_route';

-- wa_gilbert_peak_conrad_glacier: waypoints[0] (South Tieton Creek/Conrad Meadows Trailhead) is ~1mi off and
-- missing elevFt. Sibling wa_gilbert_peak_meade_glacier uses the identical trailhead with confirmed-correct
-- coordinates (matches Natural Atlas trailhead data for South Fork Tieton Trailhead #1120).
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(
    jsonb_set(waypoints, '{0,lat}', to_jsonb(46.508793::numeric)),
    '{0,lng}', to_jsonb(-121.280865::numeric)
  ),
  '{0,elevFt}', to_jsonb(4044)
)
WHERE id = 'wa_gilbert_peak_conrad_glacier';

-- wa_gilbert_peak_conrad_glacier: emergency.rangerStation = "Cowlitz Valley Ranger District, Gifford Pinchot NF"
-- is a copy-paste from the West Route (Gifford Pinchot/Snowgrass side). Conrad Glacier's own Conrad
-- Meadows/South Tieton approach sits on Naches Ranger District, Okanogan-Wenatchee NF per USFS pages.
UPDATE routes
SET emergency = jsonb_set(emergency, '{rangerStation}',
  '"Naches Ranger District, Okanogan-Wenatchee National Forest — (509) 653-1401, 10237 US Hwy 12, Naches, WA 98937"')
WHERE id = 'wa_gilbert_peak_conrad_glacier';

-- wa_gilbert_peak_meade_glacier: access has two keys for the same fact that disagree — camelCase landManager
-- (correct: Okanogan-Wenatchee NF/Naches RD, confirmed via USFS) vs snake_case land_manager (an exact copy of
-- the West Route's Gifford Pinchot/Cowlitz Valley RD value, wrong for this trailhead).
UPDATE routes
SET access = jsonb_set(access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Naches Ranger District) — Goat Rocks Wilderness"')
WHERE id = 'wa_gilbert_peak_meade_glacier';

-- wa_glacier_peak_cool_glacier_gerdine: fa misspells 1897 USGS surveyor A. H. Dubois as "A. H. Dubor" — same
-- recurring typo already fixed on other Glacier Peak routes in pass-1 batch 13.
UPDATE routes SET fa = replace(fa, 'A. H. Dubor', 'A. H. Dubois')
WHERE id = 'wa_glacier_peak_cool_glacier_gerdine';

-- wa_glacier_peak_cool_glacier_gerdine: gain_ft/loss_ft (9400/9400) contradict the row's own
-- itinerary.days[].gainFt/lossFt sums (7750/7800) and its own totalNote text ("~7,650-7,750 ft gain").
UPDATE routes SET gain_ft = 7750, loss_ft = 7800
WHERE id = 'wa_glacier_peak_cool_glacier_gerdine';

-- wa_glacier_peak_disappointment_peak_cleaver: same recurring "A. H. Dubor" -> "A. H. Dubois" FA misspelling.
UPDATE routes SET fa = replace(fa, 'A. H. Dubor', 'A. H. Dubois')
WHERE id = 'wa_glacier_peak_disappointment_peak_cleaver';

-- wa_glacier_peak_frostbite_ridge: gpx track is byte-for-byte identical to wa_glacier_peak_cool_glacier_gerdine's
-- (same 76 points, same start/end coords) — a copy-paste artifact describing the south-side North Fork
-- Sauk/White Pass corridor, not this route's actual north-side White Chuck/Kennedy Ridge line. No accurate
-- replacement track exists in the row, so nulling rather than fabricating one.
UPDATE routes SET gpx = NULL WHERE id = 'wa_glacier_peak_frostbite_ridge';

-- wa_glacier_peak_frostbite_ridge: approach_logistics.trailheadDirection says "Southeast from North Fork Sauk
-- Trailhead," but the row's own trailheadLat/Lng (48.05832,-121.28793) place the summit (48.1112273,-121.1139922)
-- to the northeast, not southeast.
UPDATE routes SET approach_logistics = jsonb_set(
  approach_logistics, '{trailheadDirection}',
  '"Northeast from North Fork Sauk Trailhead via Trail #649 to the PCT at White Pass, then north on the PCT toward Glacier Ridge and alpine access to Frostbite Ridge"'
) WHERE id = 'wa_glacier_peak_frostbite_ridge';

-- wa_glacier_peak_kennedy_glacier: approach_logistics.peakLat/peakLng (48.1072,-121.113) is ~500m off the true
-- summit. Disagrees with this route's own summit waypoint (48.1112273,-121.1139922), sibling Sitkum route's
-- approach_logistics, the parent area row, and USGS/topo sources (all ~48.111844/-121.11412).
UPDATE routes
SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{peakLat}', '48.111844'), '{peakLng}', '-121.11412')
WHERE id = 'wa_glacier_peak_kennedy_glacier';

-- wa_glacier_peak_kennedy_glacier: loss_ft is null despite gain_ft=8200 and the itinerary's own lossFt values
-- (0+4350+3850=8200) for a round-trip loop back to the trailhead.
UPDATE routes SET loss_ft = 8200 WHERE id = 'wa_glacier_peak_kennedy_glacier';

-- wa_glacier_peak_sitkum_glacier: same recurring "A.H. Dubor" -> "A.H. Dubois" FA misspelling.
UPDATE routes
SET fa = replace(fa, 'A.H. Dubor', 'A.H. Dubois')
WHERE id = 'wa_glacier_peak_sitkum_glacier';
