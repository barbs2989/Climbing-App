-- WA alpine/mountaineering audit -- batch 363 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_rock_mountain_west_route, wa_ruby_mountain_happy_creek,
--         wa_ruby_mountain_northwest_ridge, wa_ruby_mountain_south_ridge,
--         wa_ruth_icy_traverse, wa_ruth_mountain_south_slopes,
--         wa_sahale_mountain_r1, wa_sahale_mountain_sahale_glacier
-- Every UPDATE is guarded on the value read live just before this file was written.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- Ruby Mountain's own area row (areas.id = 'wa_ruby_mountain') already stores
-- elevation_ft = 7426, matching ListsOfJohn's and peakery's 7,426 ft figure for the
-- peak. Two of its three routes (Northwest Ridge, South Ridge) already carry that
-- 7426 on their own summit waypoint but were never updated on high_point_ft, which
-- still read the older, commonly-repeated-but-less-precise 7408 figure (SummitPost
-- rounds to "7408'") -- a plain desync between a route's own waypoint and its own
-- high_point_ft, not a judgment call. The third (Happy Creek) was never updated at
-- all and still carries 7408 on both fields.
UPDATE routes SET high_point_ft = 7426
WHERE id = 'wa_ruby_mountain_northwest_ridge' AND high_point_ft = 7408;

UPDATE routes SET high_point_ft = 7426
WHERE id = 'wa_ruby_mountain_south_ridge' AND high_point_ft = 7408;

UPDATE routes SET
  high_point_ft = 7426,
  waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '7426'), '{0,elevFt}', '7426')
WHERE id = 'wa_ruby_mountain_happy_creek'
  AND high_point_ft = 7408
  AND waypoints->0->>'elev' = '7408' AND waypoints->0->>'elevFt' = '7408';

-- Rock Mountain West Route (wa_rock_mountain_west_route): gain_ft/loss_ft (4050) is
-- less than the route's own net rise from its own trailhead waypoint (2,675 ft) to
-- its own high_point_ft (6,852 ft) = 4,177 ft -- an out-and-back cannot gain less
-- than its net rise, so 4050 is arithmetically impossible regardless of which of the
-- disputed summit-elevation figures is used (see the flagged item in this batch's
-- log entry). Raised to the floor the row's own two fields already require; the
-- true figure is likely somewhat higher still, since the route crosses a false
-- south summit and dips to a saddle before the final climb to the true summit, but
-- that dip's depth isn't stated anywhere in the row.
UPDATE routes SET gain_ft = 4177, loss_ft = 4177
WHERE id = 'wa_rock_mountain_west_route'
  AND gain_ft = 4050 AND loss_ft = 4050;

-- Ruth Mountain's summit lies inside North Cascades National Park (confirmed via
-- NPS/WTA: a backcountry permit is required for overnight stays there, same as the
-- Sahale Mountain routes above), while the Hannegan Trailhead approach is in the
-- Mt. Baker-Snoqualmie NF, which these two rows' own access.fees field already
-- states requires a Northwest Forest Pass. permit was NULL on both of this peak's
-- routes in this batch (no sibling on the peak already carries a filled-in permit
-- to copy, unlike the Pasayten/Enchantment-rule fixes in prior batches), so the
-- text below restates only what the rows' own access/emergency fields and the
-- external confirmation already establish.
UPDATE routes SET permit = 'No permit for day climbs. Overnight camping (e.g. at Ruth Arm, inside North Cascades NP) requires a backcountry permit: $10/person/night + $6 nonrefundable reservation fee, reserve on Recreation.gov or walk up at the Glacier Public Service Center. Northwest Forest Pass ($5/day or $30/annual) required for day parking at the Hannegan Trailhead (Mt. Baker-Snoqualmie NF).'
WHERE id = 'wa_ruth_mountain_south_slopes'
  AND permit IS NULL;

UPDATE routes SET permit = 'No permit for day climbs. Overnight camping (e.g. at Ruth Arm, inside North Cascades NP) requires a backcountry permit: $10/person/night + $6 nonrefundable reservation fee, reserve on Recreation.gov or walk up at the Glacier Public Service Center. Northwest Forest Pass ($5/day or $30/annual) required for day parking at the Hannegan Trailhead (Mt. Baker-Snoqualmie NF).'
WHERE id = 'wa_ruth_icy_traverse'
  AND permit IS NULL;

COMMIT;
