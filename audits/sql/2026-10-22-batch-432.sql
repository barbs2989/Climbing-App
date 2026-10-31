-- WA alpine audit -- batch 432 (pass 7) -- 2026-10-22
-- Routes: wa_mount_norton_scramble (fixed), wa_mount_olympus_blue_glacier (clean),
--         wa_mount_olympus_west_ridge (clean), wa_mount_persis_the_hexorcist (clean),
--         wa_mount_persis_west_ridge (clean), wa_mount_pilchuck_east_ridge (clean route,
--         shares an area-level fix), wa_mount_pilchuck_standard_route (clean route,
--         shares the same area-level fix), wa_mount_price_hester_lake_route (clean)

-- wa_mount_norton_scramble: the route's own high_point_ft, summit waypoint (elev/elevFt),
-- overview prose, and itinerary schedule all state 6,319 ft for Mount Norton's summit --
-- but areas.elevation_ft for the same peak already correctly stores 6,397 ft, and both
-- Wikipedia and PeakVisor independently give 6,397 ft. The route's own figure is simply
-- stale/wrong against its own area row and against outside sources; bringing all four
-- places on the route into line with the already-correct area value and the sources.
UPDATE routes SET high_point_ft = 6397
WHERE id = 'wa_mount_norton_scramble' AND high_point_ft = 6319;

UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{6,elev}', to_jsonb(6397)), '{6,elevFt}', to_jsonb(6397))
WHERE id = 'wa_mount_norton_scramble'
  AND waypoints->6->>'name' = 'Mount Norton'
  AND waypoints->6->>'elev' = '6319';

UPDATE routes
SET overview = replace(overview, '6,319 ft summit', '6,397 ft summit')
WHERE id = 'wa_mount_norton_scramble' AND overview LIKE '%6,319 ft summit%';

UPDATE routes
SET itinerary = jsonb_set(itinerary, '{days,2,schedule,3,label}', '"Reach the summit (6,397 ft)"'::jsonb)
WHERE id = 'wa_mount_norton_scramble'
  AND itinerary->'days'->2->'schedule'->3->>'label' = 'Reach the summit (6,319 ft)';

-- wa_mount_pilchuck (area row, affects both wa_mount_pilchuck_east_ridge and
-- wa_mount_pilchuck_standard_route): areas.elevation_ft stores 5,341 ft, a figure no
-- outside source names at all. Both of the app's own Pilchuck routes already agree with
-- each other at 5,324 ft (high_point_ft on both rows), and 5,324 ft is independently
-- corroborated by SummitPost and by the Mount Pilchuck State Park Wikipedia article's own
-- body text (its infobox gives a third, lower figure, 5,273 ft, which also doesn't match
-- 5,341 and looks like a separate old survey point, not a correction of this value).
-- Washington Trails Association gives a fourth figure, 5,327 ft, close to but not matching
-- either of the other two -- so sources cluster near 5,324-5,327 ft and none support 5,341.
-- Fixing the area row to match the value the app's own routes already use and that has the
-- strongest independent corroboration.
UPDATE areas SET elevation_ft = 5324
WHERE id = 'wa_mount_pilchuck' AND elevation_ft = 5341;

-- NOT FIXED, noted but not flagged (see audits/wa-alpine-audit-log.md for detail):
-- wa_mount_olympus_west_ridge's 1964 Maykut/Miller/Witte FA and
-- wa_mount_persis_west_ridge's 1917 Hinman-party FA could not be confirmed by general web
-- search (niche first-ascent credits that likely require AAJ/guidebook archives not
-- indexed online), but neither claim is contradicted by anything found, so per the audit's
-- own rule against flagging what can't be checked either way, these are left as is.
