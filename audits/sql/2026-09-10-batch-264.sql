-- Batch 264 (pass 5): wa_labor_pains, wa_lane_peak_r1, wa_lane_peak_r2, wa_lane_peak_r3,
--   wa_le_conte_mountain_northern_aspect, wa_lemah_mountain_east_route,
--   wa_lemah_two_goatshead_spire, wa_lena_lake_to_mt_stone_traverse
--
-- All findings below were independently verified this session via WebSearch against
-- external sources (Mountain Project, CascadeClimbers, Dasherton Climbs, Mountaineers.org,
-- Wikipedia, SummitPost, trailcatjim.com) before being written. No fix here is based on
-- internal-consistency reasoning alone without external corroboration -- see the log for
-- one case (Lena Lake/Mt Stone loss_ft) where an internal-consistency hunch was checked
-- against a primary source and turned out to be WRONG, so nothing was written for it.

-- Fix 1: wa_labor_pains -- rope_length_m (60) and gear[2] ("60m rope") both understate the
-- rope this route's own descent actually requires. This route's own rappel_count_note field
-- (already present, written by an earlier pass) states outright: "Labor Pains' own published
-- gear note calls for a 70 m rope specifically to take advantage of [the bolted] West Face
-- rappels" -- but the primary gear/rope_length_m fields were never updated to match that
-- note. Independently corroborated this session: a dedicated bolted rappel line ("West Face
-- NEWS rappel route," CascadeClimbers forum, established ~2011-2013) runs directly between
-- the West Face route and Labor Pains, explicitly documented as needing a 70m rope ("a 60m
-- just barely works"). Corrected the rope length in both fields to match the row's own
-- already-researched note.
UPDATE routes SET rope_length_m = 70
WHERE id = 'wa_labor_pains' AND rope_length_m = 60;

UPDATE routes SET gear = jsonb_set(gear, '{2}',
  '"70m rope (needed to reach the bolted West Face rappel line used for descent, rather than the Chockstone Route''s shorter stations)"'::jsonb)
WHERE id = 'wa_labor_pains' AND gear->>2 = '60m rope';

-- Fix 2: wa_lane_peak_r1 (The Zipper) -- top-level gain_ft/loss_ft (2000/2000) and the
-- approach text's own "around 2,000+ ft of gain to the notch" both overstate the route's
-- actual car-to-car elevation gain. This row's OWN itinerary object already states the
-- correct figure independently: itinerary.days[0].gainFt/lossFt = 1500/1500, and
-- itinerary.totalNote reads "roughly 6 hours and 1,500 ft car-to-car." Externally
-- corroborated this session via two independent sources for these exact Lane Peak
-- couloirs: Dasherton Climbs ("5.0 miles with elevation gain of 1,500 feet") and multiple
-- Mountaineers.org route listings, both converging on ~1,500 ft. No source found supporting
-- a ~2,000+ ft figure; it appears to be either an error or a conflation with cumulative
-- up-and-down terrain elsewhere on the approach (per this session's research). Corrected
-- the top-level fields and the approach-text sentence to match.
UPDATE routes SET gain_ft = 1500, loss_ft = 1500
WHERE id = 'wa_lane_peak_r1' AND gain_ft = 2000 AND loss_ft = 2000;

UPDATE routes SET approach = replace(approach,
  'around 2,000+ ft of gain to the notch', 'around 1,500 ft of gain to the notch')
WHERE id = 'wa_lane_peak_r1' AND approach LIKE '%around 2,000+ ft of gain to the notch%';

-- Fix 3: wa_lane_peak_r2 (The Fly) -- same defect as Fix 2, on the shared trailhead/approach.
-- This row's own itinerary.days[0].gainFt/lossFt = 1500/1500 and totalNote reads "roughly
-- 5-6 hours and 1,500 ft car-to-car." Same external corroboration as Fix 2 (these sources
-- cover both couloirs together). Corrected the top-level fields and the approach-text
-- sentence to match.
UPDATE routes SET gain_ft = 1500, loss_ft = 1500
WHERE id = 'wa_lane_peak_r2' AND gain_ft = 2000 AND loss_ft = 2000;

UPDATE routes SET approach = replace(approach,
  'approximately 2,000 feet elevation gain', 'approximately 1,500 feet elevation gain')
WHERE id = 'wa_lane_peak_r2' AND approach LIKE '%approximately 2,000 feet elevation gain%';

-- Fix 4: wa_lane_peak_r3 (Lover's Lane) -- same shared-trailhead defect as Fix 2/3
-- (gain_ft/loss_ft = 2000/2000). This route has no structured itinerary object to
-- corroborate internally, and its own approach text states no specific gain figure to
-- fix, but it shares the identical Reflection Lakes/Narada Falls approach and debris-apron
-- base as The Zipper and The Fly, for which the ~1,500 ft car-to-car figure is externally
-- confirmed by multiple independent sources this session. Corrected the top-level fields
-- to match its two siblings.
UPDATE routes SET gain_ft = 1500, loss_ft = 1500
WHERE id = 'wa_lane_peak_r3' AND gain_ft = 2000 AND loss_ft = 2000;
