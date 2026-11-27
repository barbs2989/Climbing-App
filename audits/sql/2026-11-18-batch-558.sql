-- WA alpine audit, batch 558 (pass 9)

-- areas.wa_big_snagtooth (Big Snagtooth, Kangaroo Ridge spire near Washington Pass): elevation_ft
-- is stored as 8379, but a 2023 theodolite survey (Country High Points) measured the summit at
-- 8374.3 ft +/-0.1ft -- and the area's own route wa_big_snagtooth_west_ridge already carries
-- high_point_ft 8374 and a "Big Snagtooth Summit" waypoint with elev: 8374 at the matching
-- coordinate (48.534263, -120.588409). The area row was the one field disagreeing with the
-- modern survey and with its own route. Fixing it to match.
UPDATE areas SET elevation_ft = 8374 WHERE id = 'wa_big_snagtooth' AND elevation_ft = 8379;

-- routes.wa_big_snagtooth_west_ridge: the route's own "Big Snagtooth Summit" waypoint carries two
-- different numbers for the same point -- elev: 8374 (matching high_point_ft and the 2023 survey)
-- but elevFt: 8379 (the stale pre-survey figure, matching the area row just fixed above). Fixing
-- elevFt to agree with elev within the same waypoint object.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '8374'::jsonb)
WHERE id = 'wa_big_snagtooth_west_ridge' AND waypoints->1->>'elevFt' = '8379';
