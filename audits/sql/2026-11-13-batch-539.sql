-- Batch 539 (pass 8, 2026-11-13)
-- Routes: Sherman Peak (Mount Baker)'s Squak Glacier Route; Sherpa Balanced
--   Rock's Northeast Couloir and Standard Route; Sherpa Glacier (Mount
--   Stuart); Sherpa Peak's East Ridge, North Ridge, Northeast Face and West
--   Ridge; Silver Star Mountain's Silver Star Glacier and Northeast Ridge.
-- Guarded on current stored values; a re-run is a safe no-op.

BEGIN;

-- wa_silver_star_glacier's own 2026-07-31 correction note says this fa (the
-- 1952 Beckey/Hieb/Staley/Wilde party) belongs to the WEST summit, not this
-- east-summit route, and was "already credited" on the sibling NE Ridge
-- route -- but that never actually happened to either row. Confirmed via
-- SummitPost/AAC Journal: the 1952 party summited the west peak via the
-- glacier's NE side; the east/true summit's FA is credited to Wernstedt
-- (1926, from the south).
UPDATE routes SET fa = NULL
WHERE id = 'wa_silver_star_glacier'
  AND fa = 'Fred Beckey, Joe Heib, Herb Staley and Don Wilde, May 1952';

-- Companion fix: wa_silver_star_ne_ridge's own `beta` text already states
-- this fact ("Beckey's 1952 party made the first recorded ascent of the
-- west summit via this general northeast aspect from the glacier") but its
-- `fa` column was never set.
UPDATE routes SET fa = 'Fred Beckey, Joe Heib, Herb Staley and Don Wilde, May 1952'
WHERE id = 'wa_silver_star_ne_ridge' AND fa IS NULL;

-- wa_silver_star_glacier: gain_ft (4000) disagrees with this route's own
-- itinerary.days[].gainFt sum (3500+900=4400); loss_ft (4400) already
-- matches that sum. descent = "Reverse the ascent" (round trip), so gain
-- should equal loss.
UPDATE routes SET gain_ft = 4400
WHERE id = 'wa_silver_star_glacier' AND gain_ft = 4000 AND loss_ft = 4400;

-- wa_sherpa_balanced_rock_standard: high_point_ft (8605) disagrees with its
-- own area row (wa_sherpa_balanced_rock, elevation_ft=8630) and all 3 other
-- Sherpa Peak routes, already standardized to 8630 on 2026-07-31 (Wikipedia/
-- Peakbagger/SummitPost). Not re-litigating the external dispute (SummitPost/
-- PeakVisor/LiDAR-map say 8605) -- just matching this route to its own area
-- row and its own siblings.
UPDATE routes SET high_point_ft = 8630
WHERE id = 'wa_sherpa_balanced_rock_standard' AND high_point_ft = 8605;

-- Same row: loss_ft is NULL while gain_ft=7500, but this route's own
-- itinerary.days[0].lossFt=7500 and its own totalNote ("~7,500 ft of gain
-- and loss") already say loss should equal gain on this car-to-car day.
UPDATE routes SET loss_ft = 7500
WHERE id = 'wa_sherpa_balanced_rock_standard' AND gain_ft = 7500 AND loss_ft IS NULL;

-- wa_sherman_peak_baker_squak_glacier: loss_ft is NULL while gain_ft=6800,
-- but this route's own 2-day itinerary already gives days[1].lossFt=6800
-- ("descending to the car" per totalNote) on this round trip.
UPDATE routes SET loss_ft = 6800
WHERE id = 'wa_sherman_peak_baker_squak_glacier' AND gain_ft = 6800 AND loss_ft IS NULL;

-- wa_sherpa_peak_north_ridge's data_quality.gaps claims a duplicate row
-- "wa_north_ridge_9" -- no such id exists in the live catalog (checked
-- directly). Removing the stale claim.
UPDATE routes
SET data_quality = jsonb_set(
  data_quality, '{gaps}',
  (data_quality->'gaps') - 'This entry duplicates wa_north_ridge_9; catalog likely has two records for the same physical line.'
)
WHERE id = 'wa_sherpa_peak_north_ridge'
  AND data_quality->'gaps' ? 'This entry duplicates wa_north_ridge_9; catalog likely has two records for the same physical line.';

COMMIT;

-- Flagged for human review (not fixed), see audits/wa-alpine-audit-log.md:
-- wa_sherpa_peak_northeast_face is a near-empty stub (only id/area_id/name/
-- discipline/classic populated) despite being a real documented line; and
-- wa_sherpa_peak_east_ridge / west_ridge both have top-level gain_ft/loss_ft
-- disagreeing with their own itinerary.days sums (likely a real up-down-up
-- traverse profile), needing a full recompute rather than a blind swap.
