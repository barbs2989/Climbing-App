-- Batch 540 (pass 8, 2026-11-13)
-- Routes: Sinister Peak's North Face and Southwest Route; Skookum Peak
--   (Twin Sisters)'s Jaw's Tooth and Northwest Ridge and North Ridge via
--   Jaws' Tooth; Sky Mountain's South Slopes Scramble; Sloan Peak's
--   Corkscrew Route; Snowfield Peak's Neve Glacier/Standard Route; Snowking
--   Mountain's Standard Route/Snowking Glacier; South Early Winters Spire's
--   South Arete and Direct East Buttress.
-- Guarded on current stored values; a re-run is a safe no-op.

BEGIN;

-- wa_sinister_peak_southwest_route: top-level gain_ft/loss_ft (7000/5500)
-- disagree with this route's own itinerary.days sum (3200+2200+2500+300=8200
-- gain; 200+700+2500+5000=8400 loss) and its own itinerary.totalNote, which
-- states "~8,000-9,000 ft cumulative gain round trip" -- matching the day
-- sum, not the stored top-level figure.
UPDATE routes SET gain_ft = 8200, loss_ft = 8400
WHERE id = 'wa_sinister_peak_southwest_route' AND gain_ft = 7000 AND loss_ft = 5500;

-- wa_sinister_peak_north_face: gain_ft/loss_ft were both null, but this
-- route's own 4-day itinerary already sums to a symmetric 9250 ft gain and
-- 9250 ft loss, consistent with its own `descent` field ("reverse the
-- face... retrace the glacier approach back to camp" -- a round trip).
UPDATE routes SET gain_ft = 9250, loss_ft = 9250
WHERE id = 'wa_sinister_peak_north_face' AND gain_ft IS NULL AND loss_ft IS NULL;

COMMIT;

-- Flagged for human review (not fixed), see audits/wa-alpine-audit-log.md:
-- wa_skookum_peak_twinsisters_scramble's stored `gpx` track's first ~34 of
-- 45 points sit roughly 4 miles north of this route's own, externally
-- confirmed trailhead waypoint; wa_snowfield_peak_neve_glacier's `fa`
-- (Degenhardt & Strandberg, 1931) could not be confirmed specifically for
-- this peak and may belong to their documented 1931 Picket Range/Mount
-- Terror first ascents instead; and wa_sinister_peak_southwest_route's
-- itinerary day-mileage sum (67.5 mi) contradicts its own totalNote
-- (~33-35 mi), apparently because a later edit added the FR26 road-closure
-- walk to day 1/day 4 mileage without updating totalNote to match -- and its
-- sibling wa_sinister_peak_north_face, sharing the identical closed-road
-- approach, was never given the same addition.
