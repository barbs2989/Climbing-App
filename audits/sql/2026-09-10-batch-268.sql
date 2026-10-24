-- Batch 268 (pass 5): wa_live_free_or_die, wa_lizard_mountain_south_route,
--   wa_luahna_peak_southwest_slope_southeast_ridge, wa_luna_glacier,
--   wa_luna_peak_southeast_slopes, wa_lundin_peak_south_face_left,
--   wa_magic_mountain_north_face, wa_magic_mountain_northeast_couloir
--
-- All findings below were verified this session either against the row's own internal
-- data (its own itinerary/waypoints/descent_text/climate fields, or a same-peak sibling's
-- already-corrected value from a prior batch) or via WebSearch against external sources
-- (AAC Publications, Blake Herrington's own blog, Climbing.com). WebFetch was not
-- attempted this session; WebSearch's synthesized results were sufficient for every
-- external check needed. See the log for two systemic bivy-list cross-contamination
-- findings flagged for human review rather than fixed -- nothing here deletes a row.

-- Fix 1: wa_live_free_or_die -- dist_km (8.05) is the route's round-trip distance stored
-- where the app expects a one-way figure (it doubles dist_km for round-trip display).
-- This route's own itinerary states "miles": 5 for the single-day car-to-car climb
-- (round trip), and it explicitly shares its approach with wa_liberty_crack ("Same East
-- Face approach as Liberty Crack"), whose own one-way dist_km is 4.02 (already correct,
-- per batch 266's note). 8.05 is also the exact pre-fix value batch 265 found and
-- corrected on wa_liberty_and_injustice_for_all (same peak, same bug, same erroneous
-- number) -- corrected here the same way: half of the stored round-trip figure.
UPDATE routes SET dist_km = 4.023
WHERE id = 'wa_live_free_or_die' AND dist_km = 8.05;

-- Fix 2: wa_live_free_or_die -- loss_ft is NULL. This is a single-day car-to-car climb
-- that returns to the base of the East Face by rappel (per this row's own descent_text:
-- "...make four double-rope rappels back to the ground/talus at the base of the East
-- Face"), i.e. an out-and-back route ending where it started. Filled to match the row's
-- own top-level gain_ft (2700), which is the more authoritative of the two available gain
-- figures on this row (the itinerary's own gainFt of 2400 is explicitly marked as an
-- "estimated" value in its totalNote, so gain_ft rather than the itinerary is used as the
-- source here).
UPDATE routes SET loss_ft = 2700
WHERE id = 'wa_live_free_or_die' AND loss_ft IS NULL;

-- Fix 3: wa_lizard_mountain_south_route -- data_quality.gaps carries a stale entry
-- ("No standalone gain/distance figures exist since the peak has no independent
-- trailhead approach") that is contradicted by this same row's own current data: it has
-- gain_ft=5980, dist_km=23.34, and a full waypoint chain from the Downey Creek Trailhead
-- (distMi=0) to the summit (distMi=14.5) -- 14.5 mi * 1.60934 = 23.335 km, matching
-- dist_km almost exactly, so these ARE a standalone, internally-consistent set of
-- gain/distance figures. The gap note predates whatever pass filled them in and was never
-- removed.
UPDATE routes SET
  data_quality = jsonb_set(
    data_quality,
    '{gaps}',
    (SELECT jsonb_agg(g) FROM jsonb_array_elements(data_quality->'gaps') g
     WHERE g::text NOT LIKE '%No standalone gain/distance figures exist%')
  )
WHERE id = 'wa_lizard_mountain_south_route';

-- Fix 4: wa_luna_glacier -- dist_km (61.15) is the round-trip distance stored where the
-- app expects one-way, the same bug as Fix 1. This row's own itinerary sums to
-- 11+6+2+2+8+11 = 40 miles across its six days, matching the itinerary's own totalNote
-- ("roughly 38-40 miles round trip") -- 61.15 km = 38.0 mi, squarely inside that stated
-- range. Corrected to half the stored value, matching a one-way distance of ~19 mi
-- (consistent with the itinerary's day 1-3 cumulative one-way distance to the advance
-- camp, roughly 19 mi, plus a short push to the summit).
UPDATE routes SET dist_km = 30.575
WHERE id = 'wa_luna_glacier' AND dist_km = 61.15;

-- Fix 5: wa_luna_glacier -- the Phantom Peak summit waypoint's distMi is 0, identical to
-- the trailhead's distMi (also 0), which cannot both be true for a route whose own
-- itinerary describes a 6-day, ~19-20-mile one-way approach to that summit. Set to match
-- the corrected one-way dist_km from Fix 4 (30.575 km = 19.0 mi), keeping both distance
-- fields on this row consistent with the same itinerary-derived figure.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,distMi}', '19.0')
WHERE id = 'wa_luna_glacier'
  AND waypoints->1->>'name' = 'Phantom Peak summit'
  AND waypoints->1->>'distMi' = '0';

-- Fix 6: wa_luna_peak_southeast_slopes -- one bivy entry ("Access Creek headwaters
-- basin") stores its elevation under the key "elevM" (1341, i.e. metres) while every
-- other bivy entry on this row -- and on this catalog's bivy entries generally -- uses
-- "elev" in feet. 1341 m = 4400.4 ft, which matches this row's own approach text
-- describing the same basin as "~4,400ft" almost exactly, so the value itself is right;
-- only the key is wrong, and a reader expecting "elev" would show no elevation for this
-- camp at all. Corrected to the feet convention used by its sibling entry and by this
-- row's own prose.
UPDATE routes SET
  bivy = (SELECT jsonb_agg(
       CASE WHEN e->>'name' = 'Access Creek headwaters basin'
            THEN (e - 'elevM') || jsonb_build_object('elev', 4400)
            ELSE e END
     ) FROM jsonb_array_elements(bivy) e)
WHERE id = 'wa_luna_peak_southeast_slopes'
  AND bivy @> '[{"name": "Access Creek headwaters basin", "elevM": 1341}]';

-- Fix 7: wa_lundin_peak_south_face_left -- the top-level `descent` field is generic
-- boilerplate ("Descend via the standard descent route... Be aware of loose rock and
-- snow bridge hazards") that does not match this route: "snow bridge hazards" describes
-- glacier travel, and Lundin Peak (6,057 ft, non-glaciated Alpine Lakes summit) has none.
-- This row's own `itinerary` field already gives the real, specific descent: "descend via
-- the West Ridge or Southeast Ridge and hike out." Replaced with route-specific wording
-- drawn from that same field.
UPDATE routes SET descent = 'Descend via the West Ridge or Southeast Ridge and hike out to the Commonwealth Basin/PCT North trailhead. Watch for loose rock on the descent talus.'
WHERE id = 'wa_lundin_peak_south_face_left'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible. Be aware of loose rock and snow bridge hazards. Maintain group cohesion on exposed sections.';

-- Fix 8: wa_magic_mountain_north_face -- best_season ("Jul-Sep, with route conditions...")
-- disagrees with this same row's own season field ("Jun-Aug") and its own climate.summer
-- text ("Late June to early August gives the best combination: snow-covered glacier,
-- bridged bergschrund, and an open road... By late summer the glacier goes to bare ice at
-- its margins and the schrund opens"), which both independently point to an early-summer
-- window and explicitly say late season gets WORSE, not better. Corrected to match the
-- row's own more detailed climate data.
UPDATE routes SET best_season = 'Late June through early August, while the Yawning Glacier and its bergschrund are still snow-covered and bridged. By late summer the glacier margins go to bare ice and the schrund opens, making the route harder rather than better -- unlike the South Ridge route, condition matters more here than calendar.'
WHERE id = 'wa_magic_mountain_north_face'
  AND best_season = 'Jul-Sep, with route conditions (glacier cover, couloir snow/ice) varying more year to year than the South Ridge route.';
