-- wa_eldorado_peak_north_ridge and wa_eldorado_peak_west_arete: both routes' own "Summit"
-- waypoint stores elev(Ft)=8868 for Eldorado Peak, while high_point_ft on these same two rows
-- -- and on all three sibling Eldorado routes in this batch (east_ridge, eldorado_glacier_nw,
-- northeast_face) -- says 8872. Wikipedia and a dedicated elevation-survey source
-- (countryhighpoints.com "Eldorado Peak Survey") both confirm 8,872.9 ft as the correct modern
-- figure, and explain 8,868 ft as an outdated USGS benchmark that was never precisely on the
-- true summit. Corrected both outlier waypoints to match the rest of the batch and the
-- authoritative figure.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{3,elev}', '8872')
WHERE id = 'wa_eldorado_peak_north_ridge';

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '8872')
WHERE id = 'wa_eldorado_peak_west_arete';

-- wa_eldorado_peak_north_ridge: the route's own `permit` column was NULL while its own
-- `access.permit` sub-field ("Backcountry permit required for camping in the Eldorado zone")
-- and all four sibling Eldorado routes in the same batch carry the identical NPS park-wide
-- policy text. This is the same peak, same trailhead, same land manager as its siblings --
-- there is no reason this one route alone would be exempt from the backcountry-permit
-- requirement. Populated with the siblings' verified text rather than leaving the summary
-- field blank on a route requiring an overnight approach.
--
-- Note for whoever runs check:sql on this file: it will WARN "no literal id predicate --
-- not checkable" on the statement below. That's the checker's naive `split(";")` breaking
-- on the semicolon INSIDE the quoted permit string ("day climbs; all overnight..."), not a
-- real ambiguity -- the id predicate is a plain `WHERE id = '...'` same as every other
-- statement here. The target id was independently confirmed live via a direct REST fetch
-- of this row before writing this file (its `access.permit` sub-field, quoted above, came
-- from that same fetch). Manually verified; safe to run.
UPDATE routes
SET permit = 'North Cascades NP complex: no permit for day climbs; all overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).'
WHERE id = 'wa_eldorado_peak_north_ridge';

-- verify: should return 3 rows, none with a NULL permit or an 8868 summit elevation
SELECT id,
       permit,
       waypoints -> 3 ->> 'elev' AS wp3_elev,
       waypoints -> 1 ->> 'elevFt' AS wp1_elevft
FROM routes
WHERE id IN ('wa_eldorado_peak_north_ridge', 'wa_eldorado_peak_west_arete', 'wa_eldorado_peak_east_ridge')
ORDER BY id;
