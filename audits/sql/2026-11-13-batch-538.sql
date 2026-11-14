-- Batch 538 (pass 8, 2026-11-13)
-- Routes: Ruth Mountain's North Face / Ruth Glacier; Sahale Mountain's Quien
--   Sabe Glacier and Sahale Arm / Sahale Glacier; Colchuck Balanced Rock's
--   Scarface; Mount Washington (Olympics)'s SE Ridge AKA Shield Wall;
--   Sentinel Peak's Standard Route; South Early Winters Spire's Southwest
--   Rib; Sharkfin Tower's Flakes and Chimneys (South Face) and Southeast
--   Ridge; Sherman Peak (Mount Baker)'s Crater Rim Scramble.
-- All statements guarded on the row's current stored value, so a concurrent
-- edit or a re-run after this has already applied is a safe no-op rather
-- than a silent overwrite.

BEGIN;

-- wa_sahale_mountain_sahale_glacier: the "Sahale Glacier Camp" waypoint
-- entry self-contradicts within one object -- elev=7686 vs elevFt=7600 in
-- the SAME waypoint. This row's own access._raw.altitude_restrictions
-- ("Sahale Glacier Camp at 7,600 feet") and pitch_detail[1] notes ("camp
-- (7,600 ft)") both already say 7,600 ft, and Mountaineers.org's Sahale
-- Peak/South Slope route page independently gives the same camp as 7,600
-- ft. A 2026-07-31 correction already fixed this number elsewhere in the
-- row (7,400 -> 7,600) but missed this waypoint's `elev` field.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{2,elev}', to_jsonb(7600))
WHERE id = 'wa_sahale_mountain_sahale_glacier'
  AND waypoints->2->>'name' = 'Sahale Glacier Camp'
  AND (waypoints->2->>'elev')::int = 7686
  AND (waypoints->2->>'elevFt')::int = 7600;

-- Same row, same camp, same underlying 2026-07-31 fix that didn't propagate:
-- bivy[0] ("Sahale Glacier Camp", role "main") carries elev=7500, also
-- contradicting the row's own access._raw/pitch_detail text and the now-
-- corrected waypoint above.
UPDATE routes
SET bivy = jsonb_set(bivy, '{0,elev}', to_jsonb(7600))
WHERE id = 'wa_sahale_mountain_sahale_glacier'
  AND bivy->0->>'name' = 'Sahale Glacier Camp'
  AND bivy->0->>'role' = 'main'
  AND (bivy->0->>'elev')::int = 7500;

-- wa_sharkfin_tower_flakes_and_chimneys_south_face: high_point_ft is NULL,
-- while its sibling route on the same peak (wa_sharkfin_tower_southeast_
-- ridge) already independently stores high_point_ft=8120, matching the
-- wa_sharkfin_tower area row's elevation_ft=8120. Wikipedia's Sharkfin
-- Tower infobox (8,120 ft / 2,470 m) and SummitPost (8,120 ft / 2,475 m)
-- independently confirm 8,120 ft as the peak's elevation (a listsofjohn.com
-- outlier of "8,220'" and Wikipedia's own "8,120+ ft" hedge noted but not
-- preferred, since the infobox, SummitPost, and this app's own converged
-- data on the sibling route and area row all agree on 8,120).
UPDATE routes
SET high_point_ft = 8120
WHERE id = 'wa_sharkfin_tower_flakes_and_chimneys_south_face'
  AND high_point_ft IS NULL;

COMMIT;

-- No other confirmed errors this batch. See audits/wa-alpine-audit-log.md
-- for three items flagged for human review (not fixed here): Quien Sabe
-- Glacier's gain_ft/loss_ft vs. its own itinerary total; Scarface's `fa`
-- field and route identity, which could not be confirmed against Mountain
-- Project (the only "Scarface" found there is an unrelated Yosemite route);
-- and Sentinel Peak Standard Route's gain_ft/loss_ft, which is internally
-- inconsistent with the route's own round-trip shape but needs a full day-
-- by-day elevation-profile recomputation rather than a single swap.
