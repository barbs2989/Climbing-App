-- WA alpine/mountaineering audit -- batch 362 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_ptarmigan_peak_pasayten_scramble, wa_ragged_edge, wa_rapple_grapple,
--         wa_raven_ridge_southeast_ridge_crater_lake, wa_remmel_mountain_nw_ridge,
--         wa_remmel_mountain_southeast_slope, wa_ridge_traverse_from_east_fury,
--         wa_rikki_tikki_tavi, wa_rock_mountain_northeast_ridge
-- Every UPDATE is guarded on the value read live just before this file was written.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- Rapple Grapple (wa_rapple_grapple): gain_ft/loss_ft 2200 is less than the climb's
-- own net rise. The route summits Liberty Bell (7,720 ft) and starts at the Blue Lake
-- Trailhead, which this row's waypoint puts at 5,400 ft and siblings put at 5,160-5,400
-- ft -- so the net gain alone is at least 2,320 ft. The Beckey Route sibling
-- (wa_liberty_bell_beckey_route) shares this route's trailhead, approach, first pitch
-- and descent and stores 2,520 ft (= 7,720 - 5,200), so that figure is adopted here, for
-- the top-level fields and the one-day itinerary entry that repeats them.
UPDATE routes SET
  gain_ft = 2520, loss_ft = 2520,
  itinerary = jsonb_set(jsonb_set(itinerary, '{days,0,gainFt}', '2520'), '{days,0,lossFt}', '2520')
WHERE id = 'wa_rapple_grapple'
  AND gain_ft = 2200 AND loss_ft = 2200
  AND itinerary->'days'->0->>'gainFt' = '2200' AND itinerary->'days'->0->>'lossFt' = '2200';

-- Remmel Mountain Southeast Slope (wa_remmel_mountain_southeast_slope): loss_ft is NULL
-- for an out-and-back (its own itinerary: "climb to the summit and return to camp ...
-- hike out"), so loss equals the stored gain_ft (5600).
UPDATE routes SET loss_ft = 5600
WHERE id = 'wa_remmel_mountain_southeast_slope'
  AND gain_ft = 5600 AND loss_ft IS NULL;

-- Same route: permit is NULL, while its sibling on the same peak and the same
-- Thirtymile Trailhead (wa_remmel_mountain_nw_ridge) already states the Pasayten
-- Wilderness rule. Same wilderness, same rule; text copied verbatim.
UPDATE routes SET permit = 'Free self-issue Pasayten Wilderness permit at the trailhead; no quota or fee. Northwest Forest Pass at some trailheads.'
WHERE id = 'wa_remmel_mountain_southeast_slope'
  AND permit IS NULL;

-- Rikki Tikki Tavi (wa_rikki_tikki_tavi): permit is NULL for a Colchuck Balanced Rock
-- route inside the Enchantment Permit Area (Colchuck zone), reached from the Stuart
-- Lake Trailhead. Its sibling wa_nw_ridge_2 on the same formation already states the
-- Enchantment rule; text copied verbatim.
UPDATE routes SET permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.'
WHERE id = 'wa_rikki_tikki_tavi'
  AND permit IS NULL;

COMMIT;
