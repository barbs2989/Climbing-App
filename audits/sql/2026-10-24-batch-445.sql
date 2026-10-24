-- WA alpine/mountaineering audit -- batch 445 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_overcoat_peak_north_face, wa_overcoat_peak_southeast_route,
--         wa_pernod_spire_standard, wa_phantom_peak_south_route, wa_phantom_peak_west_ridge,
--         wa_philadelphia_mountain_scramble, wa_point_success_south_side,
--         wa_poltergeist_pinnacle
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Overcoat Peak, East Face / Southeast Route -- wa_overcoat_peak_southeast_route
-- =========================================================================
-- This is a simple out-and-back (same approach reversed for the exit, per its own
-- itinerary notes), so total gain must equal total loss. Its own itinerary.days[] sums to
-- gainFt 5200+900+100=6200 and lossFt 0+2900+3300=6200 -- and walking that day-by-day
-- elevation profile from the Dingford Creek Trailhead waypoint (elev 1450) returns exactly
-- to 1450 ft at the end of day 3, confirming 6200/6200 is the row's own internally-correct
-- total. Top-level gain_ft/loss_ft (6032/5800) disagree with that sum AND are not even
-- equal to each other, which an out-and-back route cannot be.
UPDATE routes SET gain_ft = 6200
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND gain_ft = 6032;

UPDATE routes SET loss_ft = 6200
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND loss_ft = 5800;

-- =========================================================================
-- Pernod Spire, Standard Rock Route -- wa_pernod_spire_standard
-- =========================================================================
-- waypoints[1] "Burgundy Col" stores elev=7793 and its own note calls it a "7,770-ft
-- notch" -- both disagree with this SAME row's own itinerary.days[0].objective text,
-- which already independently says "Burgundy Col (~7,950 ft)". Re-verified 2026-10-24 via
-- SummitPost's Chianti Spire page, which gives the Burgundy Col bivy sites at ~7,950 ft --
-- matching this row's own itinerary text, not its waypoint fields. Corrected the waypoint
-- to match.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '7950'::jsonb)
WHERE id = 'wa_pernod_spire_standard'
  AND waypoints #>> '{1,name}' = 'Burgundy Col'
  AND waypoints #>> '{1,elev}' = '7793';

UPDATE routes SET waypoints = jsonb_set(
  waypoints,
  '{1,note}',
  '"7,950-ft notch separating the Wine Spires from Vasiliki Ridge, reached via steep talus/scree above the Bench camp."'::jsonb
)
WHERE id = 'wa_pernod_spire_standard'
  AND waypoints #>> '{1,name}' = 'Burgundy Col'
  AND waypoints #>> '{1,note}' = '7,770-ft notch separating the Wine Spires from Vasiliki Ridge, reached via steep talus/scree above the Bench camp.';

-- itinerary.days[0] (Trailhead at elev 4360 -> Burgundy Col) stores gainFt=2600, lossFt=100.
-- 4360 + 2600 - 100 = 6860, which falls about 1,090 ft short of the day's own stated
-- destination -- "Burgundy Col (~7,950 ft)" -- now corroborated above. gainFt should be
-- 7950 - 4360 + 100 = 3690 to actually reach the day's own named destination.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,gainFt}', '3690'::jsonb)
WHERE id = 'wa_pernod_spire_standard'
  AND itinerary #>> '{days,0,gainFt}' = '2600'
  AND itinerary #>> '{days,0,objective}' LIKE '%Burgundy Col (~7,950 ft)%';

-- NOTE (not fixed): top-level gain_ft/loss_ft (4000/4000) no longer exactly equal the
-- itinerary sum after the gainFt fix above (3690+900=4590 gain vs the itinerary's own
-- lossFt sum of 100+3600=3700, which are not even equal to each other, let alone to
-- 4000/4000). Day 2's lossFt (3600, notch/summit back down to the 4360-ft car) may also
-- need adjustment, but no authoritative source gives the exact elevation of the
-- Pernod-Chianti notch or a clean breakdown of the ridge traverse's ups and downs to
-- derive a confident number -- left for a human to re-derive rather than guessed.

-- =========================================================================
-- Phantom Peak, South Route -- wa_phantom_peak_south_route
-- =========================================================================
-- Top-level gain_ft/loss_ft (1916/1000) are wildly inconsistent with this row's own
-- itinerary.days[] breakdown (gainFt 2500+3000+2400+300+200=8400, lossFt
-- 200+300+2400+3000+2500=8400) -- and walking that day-by-day profile from the Hannegan
-- Pass Trailhead waypoint (elev 3120) returns EXACTLY to 3120 ft at the end of day 5,
-- confirming 8400/8400 as the row's own internally-correct round-trip total for this
-- 5-day, ~44-mile approach.
UPDATE routes SET gain_ft = 8400
WHERE id = 'wa_phantom_peak_south_route'
  AND gain_ft = 1916;

UPDATE routes SET loss_ft = 8400
WHERE id = 'wa_phantom_peak_south_route'
  AND loss_ft = 1000;

-- high_point_ft (8016) disagrees with this SAME row's own waypoints[4] summit elev
-- (8000). Re-verified 2026-10-24: Wikipedia's Picket Range table gives Phantom Peak at
-- 8,004 ft, and SummitPost's Northern Pickets summit list gives 8,000 ft -- both close to
-- this row's own waypoint and neither anywhere near 8,016 ft, which no source found
-- corroborates. (A WTA figure of 8,207 ft is a known outlier that matches Mount
-- Challenger's height instead, not Phantom Peak's, so it is not used as a tiebreaker.)
UPDATE routes SET high_point_ft = 8000
WHERE id = 'wa_phantom_peak_south_route'
  AND high_point_ft = 8016;

UPDATE routes SET itinerary = jsonb_set(
  itinerary,
  '{days,2,objective}',
  '"Climb Phantom Peak (8,000 ft) via the southwest glacier, south couloir, and southwest ridge"'::jsonb
)
WHERE id = 'wa_phantom_peak_south_route'
  AND itinerary #>> '{days,2,objective}' = 'Climb Phantom Peak (8,016 ft) via the southwest glacier, south couloir, and southwest ridge';

-- =========================================================================
-- Phantom Peak, West Ridge -- wa_phantom_peak_west_ridge
-- =========================================================================
-- Same high_point_ft correction as the sibling South Route above, and for the same reason
-- (Wikipedia 8,004 ft / SummitPost 8,000 ft; no source corroborates 8,016).
UPDATE routes SET high_point_ft = 8000
WHERE id = 'wa_phantom_peak_west_ridge'
  AND high_point_ft = 8016;

-- =========================================================================
-- Phantom Peak (area) -- wa_phantom_peak
-- =========================================================================
-- Same correction, propagated to the parent area row for the same reason.
UPDATE areas SET elevation_ft = 8000
WHERE id = 'wa_phantom_peak'
  AND elevation_ft = 8016;

COMMIT;
