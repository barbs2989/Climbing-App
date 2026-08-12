-- WA alpine audit batch 101 (pass 2)
-- Sinister Peak, Sitkum Spire, Sloan Peak, Snowfield Peak, Snowking Mountain,
-- South Early Winters Spire (South Arete, Direct East Buttress, East Buttress,
-- Passenger, Southwest Couloir)
-- Generated 2026-08-12. Proposed fixes for human review before running.

-- =========================================================================
-- Sinister Peak
-- =========================================================================

-- wa_sinister_peak_southwest_route: high_point_ft was 8440, contradicted by
-- this route's own summit waypoint (elev 8444), by the wa_sinister_peak
-- area row's elevation_ft (8444), and by the sibling North Face route's
-- high_point_ft (already 8444, per that row's own 2026-07-31 correction
-- note claiming it was updated "to match ... the sibling Southwest Route's
-- summit waypoint" -- a claim that was true of the waypoint but was never
-- applied to this row's own high_point_ft scalar).
UPDATE routes SET high_point_ft = 8444 WHERE id = 'wa_sinister_peak_southwest_route';

-- wa_sinister_peak_southwest_route: gain_ft/loss_ft were 7000/5500, an
-- asymmetric pair on a route that returns to its own starting trailhead
-- (Downey Creek TH out-and-back over the same approach both ways) and that
-- doesn't match this row's own itinerary.days sum: 3200+2200+2500+300=8200
-- gain, 200+700+2500+5000=8400 loss. The itinerary's own totalNote ("roughly
-- 8,000-9,000 ft cumulative gain round trip") independently corroborates
-- the higher figure, not the on-file 7000/5500.
UPDATE routes SET gain_ft = 8200, loss_ft = 8400 WHERE id = 'wa_sinister_peak_southwest_route';

-- =========================================================================
-- Sitkum Spire
-- =========================================================================

-- wa_sitkum_spire_standard: high_point_ft was 9355 (Sitkum Spire's own
-- subsidiary elevation, correctly used for the wa_sitkum_spire area row),
-- but this route's own corrections field explicitly documents that the
-- route's highPointFt should read 10,541 ft -- Glacier Peak's true summit,
-- which is what parties actually reach via this line, with Sitkum Spire
-- itself only a waypoint passed en route. gain_ft (8,500 ft, already on
-- file and referenced by that same corrections text) is consistent with a
-- 10,541 ft high point from the 2,300 ft trailhead (net ~8,241 ft) and not
-- with a 9,355 ft one (net ~7,055 ft). The corrections note was written
-- but the scalar was never actually updated to match it.
UPDATE routes SET high_point_ft = 10541 WHERE id = 'wa_sitkum_spire_standard';

-- =========================================================================
-- South Early Winters Spire -- South Arete
-- =========================================================================

-- wa_south_arete: pitches was 3, contradicted by this row's own
-- pitch_detail (exactly 2 numbered pitches, the second explicitly ending
-- "walk-off near summit"), its own beta text ("Pitch 1 climbs... Pitch 2
-- climbs a gully... then easier ground leads to the summit" -- no third
-- pitch), and its own itinerary day note ("a couple of 5.5-5.6 moves over
-- 2 pitches"). The stray 3 most likely bled in from this same row's
-- rappel_count_note ("gets you back to the base... in 2-3 rappels"; 3 used
-- for descent stations), a different count describing the walk-off/rappel
-- descent, not the climb.
UPDATE routes SET pitches = 2 WHERE id = 'wa_south_arete';
