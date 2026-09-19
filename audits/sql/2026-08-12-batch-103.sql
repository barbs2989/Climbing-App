-- WA alpine audit — batch 103 (2026-08-12, pass 2)
-- Routes: wa_south_ridge_2 (Luna Peak), wa_south_ridge_3 (Black Peak, no
-- confirmed fixes this pass), wa_south_ridge_4 (Eldorado Peak's Main Peak),
-- wa_south_spur (Whatcom Peak), wa_south_twin_sister_north_ridge,
-- wa_south_twin_sister_scramble, wa_south_twin_sister_west_ridge (South
-- Twin Sister), wa_southeast_face (Sharkfin Tower),
-- wa_southeast_mox_peak_se_rib (Southeast Mox Peak),
-- wa_southeast_ridge_se_corner (Mount Shuksan).
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention.

-- =========================================================================
-- Luna Peak (wa_luna_peak) — wa_south_ridge_2 (South Ridge)
-- =========================================================================

-- waypoints/gpx were stored out of route order (Trailhead, Summit, then two
-- lower Access Creek crossings), which GPXMap draws straight in array order,
-- producing a backwards, self-crossing track — same bug class as Mount
-- Stuart's Sherpa Glacier (batch 100). Summit (the route's high point, per
-- this row's own high_point_ft=8311) reordered to last; the two crossing
-- waypoints (no on-file elev/distMi to order between them) kept in their
-- existing relative order.
UPDATE routes SET
  waypoints = jsonb_build_array(waypoints->0, waypoints->2, waypoints->3, waypoints->1),
  gpx = jsonb_build_array(gpx->0, gpx->2, gpx->3, gpx->1)
WHERE id = 'wa_south_ridge_2'
  AND waypoints->1->>'name' = 'Luna Peak summit (true/north summit)'
  AND (waypoints->1->>'elev')::numeric = 8311
  AND waypoints->2->>'name' = 'Access Creek crossing (larger log jam)'
  AND waypoints->3->>'name' = 'Access Creek crossing (smaller logs, alternate)';

-- =========================================================================
-- Black Peak (wa_black_peak) — wa_south_ridge_3 (South Ridge)
-- =========================================================================
-- Re-verified against the 2026-08-05 corrections already on file (lat/lng,
-- trailhead, alpine_grade, loss_ft, access.rules) — all still hold. No new
-- confirmed error found this pass. Three items flagged for human review
-- (see log): elevation datum conflict (8970 vs external 8975/8986), gain_ft
-- not reconciling with the route's own itinerary sums, and unresolved
-- Wing/Lewis Lake permit-zone ambiguity. No SQL for this route this batch.

-- =========================================================================
-- Eldorado Peak / Main Peak (wa_main_peak) — wa_south_ridge_4 (South Ridge)
-- =========================================================================

-- areas.elevation_ft (8872) disagreed with this same area row's own blurb
-- text ("Eldorado Peak (8,873 ft)") and with the route's own high_point_ft
-- (8873). Wikipedia's cited USGS figure (8,872.9 ft) rounds to 8873, not
-- 8872 -- the scalar was off by a rounding error, not a datum conflict.
UPDATE areas SET elevation_ft = 8873
WHERE id = 'wa_main_peak' AND elevation_ft = 8872;

-- routes.descent said "retracing the ascent when possible," contradicting
-- this same row's own pro_tips ("Descend via the East Ridge rather than
-- reversing the South Ridge"), descent_text ("Descend via Eldorado's
-- standard East Ridge route"), and itinerary ("climb the South Ridge...
-- and descend the East Ridge") -- three fields on the row agree with each
-- other and disagree only with descent, which reads as unedited boilerplate.
UPDATE routes SET descent = 'Descend via Eldorado''s East Ridge (the standard/easiest route) rather than reversing the South Ridge -- retrace through the gap in the East Ridge, then across the Inspiration and Eldorado Glaciers back to camp. Be aware of loose rock, snow bridge hazards, and possible cornices near the ridge crest. Maintain group cohesion on exposed and glaciated sections.'
WHERE id = 'wa_south_ridge_4'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible. Be aware of loose rock and snow bridge hazards. Maintain group cohesion on exposed sections.';

-- =========================================================================
-- Whatcom Peak (wa_whatcom_peak) — wa_south_spur (South Spur)
-- =========================================================================

-- approach_logistics.peakLat/peakLng (48.8576357/-121.373549) sat ~0.4mi/677m
-- from this row's own summit waypoint and its own top-level lat/lng
-- (48.8561/-121.3825), both of which convert exactly from Wikipedia's DMS
-- coordinate (48°51'22"N 121°22'57"W = 48.856111/-121.3825). Identical fix
-- already applied to the sibling wa_whatcom_peak_southwest_route in batch 50
-- (2026-08-06); this route was missed in that sweep.
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(approach_logistics, '{peakLat}', '48.856111', false),
      '{peakLng}', '-121.3825', false
    )
WHERE id = 'wa_south_spur'
  AND (approach_logistics->>'peakLat')::numeric = 48.8576357
  AND (approach_logistics->>'peakLng')::numeric = -121.373549;

-- =========================================================================
-- South Twin Sister (wa_south_twin_sister) — three routes sharing one
-- trailhead (FR 38 / Middle Fork Nooksack)
-- =========================================================================

-- West Ridge: rappels overstates a rappel this row's own descent_text calls
-- optional ("Parties who instead stay on the ridge crest... sometimes
-- choose to rappel... rather than downclimb it") -- the standard descent
-- (false-summit bypass) needs none. Same shape as the Silver Star Glacier
-- fix in batch 100.
UPDATE routes SET rappels = '0'
WHERE id = 'wa_south_twin_sister_west_ridge' AND rappels = '1';

-- North Ridge: commitment ("II") contradicts this row's own grade field
-- ("Grade III, Class 4"); this row's own itinerary also calls it "longer
-- and more technical than the West Ridge" (glacier travel + bergschrund),
-- which itself is already commitment "II" for a shorter, non-glaciated line.
UPDATE routes SET commitment = 'III'
WHERE id = 'wa_south_twin_sister_north_ridge' AND commitment = 'II';

-- North Ridge: itinerary.days[0].schedule[5].detail still says "(short
-- rappel near the top)" on descent, contradicting this row's own rappels
-- ("0") and its own descent_text ("no rappels are required on the standard
-- descent") -- stale text carried over from the West Ridge sibling's
-- optional line.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,schedule,5,detail}', '"Descend via the West Ridge standard line (false-summit bypass); no rappel required back to the bikes."')
WHERE id = 'wa_south_twin_sister_north_ridge'
  AND itinerary->'days'->0->'schedule'->5->>'detail' = 'Reverse the West Ridge line (short rappel near the top) back to the bikes.';

-- Olivine Scramble: access.parking_pass claims a Northwest Forest Pass is
-- required, but both sibling routes sharing this exact FR 38 trailhead
-- already carry a 2026-08-05 correction removing this claim (sourced to
-- mountainproject.com/cascadeclimbers.com); this row's own beta says it
-- "Shares its approach with the West Ridge route" and was evidently missed
-- by that pass.
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"No developed fee trailhead here -- FR 38 gate/pullout is an undeveloped roadside parking spot; no Northwest Forest Pass required (same trailhead as the sibling West Ridge and North Ridge routes)."')
WHERE id = 'wa_south_twin_sister_scramble'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at most trailheads — $30/year or $5/day.';

-- Olivine Scramble: waypoints[0] (South Twin Sister Summit) elev/elevFt
-- stale at 7,000 ft, contradicting this row's own high_point_ft (7,004) and
-- both siblings' summit waypoints (already 7,004) -- 7,004 ft independently
-- confirmed (Wikipedia).
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '7004'), '{0,elevFt}', '7004')
WHERE id = 'wa_south_twin_sister_scramble'
  AND waypoints->0->>'name' = 'South Twin Sister Summit'
  AND (waypoints->0->>'elev')::numeric = 7000
  AND (waypoints->0->>'elevFt')::numeric = 7000;

-- =========================================================================
-- Sharkfin Tower (wa_sharkfin_tower) — wa_southeast_face (Southeast Face)
-- =========================================================================

-- access.group_limit (6) and access.rules both described Boston Basin as a
-- 6-person cross-country zone; NPS designates it a Type I (12-person) zone,
-- matching this row's own access._raw.group_size_limits ("4-12 people
-- depending on specific campsite") -- same bug already fixed on the sibling
-- Southeast Ridge route in batch 100, recurring independently on this row.
UPDATE routes SET access = jsonb_set(
    jsonb_set(access, '{group_limit}', '12'::jsonb),
    '{rules}', to_jsonb('Group size capped at 12 in the Boston Basin/Eldorado/Sulphide Glacier high-occupancy (Type I) cross-country zones; 6 in other off-trail cross-country zones. Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones — free loaners at permit offices.'::text)
)
WHERE id = 'wa_southeast_face'
  AND (access->>'group_limit')::numeric = 6
  AND access->>'rules' = 'Group size capped at 6 in off-trail cross-country zones (which includes Boston Basin/Eldorado approaches; 12 in on-trail corridors). Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones — free loaners at permit offices.';

-- access._raw.seasonal_closures named SR-20's Diablo/Mazama mountain-pass
-- closure, which does not gate Boston Basin access; the trailhead is via
-- Cascade River Road, which has its own Eldorado-gate (MP 20) winter
-- closure -- matching this row's own access.seasonal/road.seasonalGate.
UPDATE routes SET access = jsonb_set(
    access, '{_raw,seasonal_closures}',
    to_jsonb(replace(access->'_raw'->>'seasonal_closures', 'State Route 20 mid-November to mid-April', 'Cascade River Road closes at the Eldorado gate (~MP 20, about 3 miles below the Boston Basin trailhead) for the winter season, typically late Oct/early Nov through spring, depending on snowpack and washout repairs'))
)
WHERE id = 'wa_southeast_face'
  AND access->'_raw'->>'seasonal_closures' = 'State Route 20 mid-November to mid-April; Boston Basin permits frequently unavailable mid-summer on weekends';

-- gain_ft/loss_ft (4870/4870) didn't match this row's own itinerary.days
-- sum (2500+2400=4900) or its own totalNote ("Roughly 4,900 ft total gain").
UPDATE routes SET gain_ft = 4900, loss_ft = 4900
WHERE id = 'wa_southeast_face' AND gain_ft = 4870 AND loss_ft = 4870;

-- =========================================================================
-- Southeast Mox Peak (wa_southeast_mox_peak) — wa_southeast_mox_peak_se_rib
-- (name already corrected to "West Ridge (Beckey Route)" in a prior pass;
-- the id's "se_rib" is a leftover pre-correction slug, not a live error —
-- flagged for a deliberate rename follow-up, not touched here)
-- =========================================================================

-- gain_ft (7400) contradicted this row's own itinerary day-by-day sum
-- (day1 3400 + day2 3500 = 6900) and its own loss_ft (already 6900) -- for
-- a car-to-car round trip these should reconcile, and the itinerary's two
-- days independently sum to 6900 for both gain and loss.
UPDATE routes SET gain_ft = 6900
WHERE id = 'wa_southeast_mox_peak_se_rib' AND gain_ft = 7400;

-- =========================================================================
-- Mount Shuksan (wa_mount_shuksan) — wa_southeast_ridge_se_corner
-- (Southeast Ridge / SE Corner)
-- =========================================================================

-- waypoints/gpx stored out of route order (TH -> summit -> camp -> notch)
-- despite the summit having the highest distMi (6.7 vs 4.75/6) -- same
-- GPXMap-draws-array-order bug fixed on Sherpa Glacier in batch 100.
-- Reordered by distMi (TH->camp->notch->summit) and the summit elev
-- corrected from 9127 to 9131 to match this row's own high_point_ft --
-- the same fix already applied to this peak's North Face/Northeast
-- Ridge/Northwest Arete siblings in batch 88, never propagated here.
UPDATE routes SET
  waypoints = jsonb_build_array(waypoints->0, waypoints->2, waypoints->3, jsonb_set(waypoints->1, '{elev}', '9131')),
  gpx = jsonb_build_array(gpx->0, gpx->2, gpx->3, gpx->1)
WHERE id = 'wa_southeast_ridge_se_corner'
  AND waypoints->1->>'name' = 'Mount Shuksan'
  AND (waypoints->1->>'elev')::numeric = 9127
  AND jsonb_array_length(waypoints) = 4;

-- seasonal_hazards.avalanche.zone was "NWAC Mt Baker zone", not a real
-- NWAC zone name -- same defect fixed on two Shuksan siblings (North
-- Face, Northeast Ridge) in batch 88; corrected to "West Slopes North
-- (NWAC)", matching this route's own parent-area avy_zone field.
UPDATE routes SET seasonal_hazards = jsonb_set(seasonal_hazards, '{avalanche,zone}', '"West Slopes North (NWAC)"'::jsonb)
WHERE id = 'wa_southeast_ridge_se_corner'
  AND seasonal_hazards->'avalanche'->>'zone' = 'NWAC Mt Baker zone';

-- climate.forecastZone was "NWAC/Mountain-Forecast Mount Baker area",
-- same not-a-real-zone-name defect as above -- corrected to match.
UPDATE routes SET climate = jsonb_set(climate, '{forecastZone}', '"West Slopes North (NWAC)"'::jsonb)
WHERE id = 'wa_southeast_ridge_se_corner'
  AND climate->>'forecastZone' = 'NWAC/Mountain-Forecast Mount Baker area';
