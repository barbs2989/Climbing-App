-- Batch 415 (Pass 7) -- Lake Mountain (Pasayten), Lane Peak's four named/numbered
-- couloirs, Le Conte Mountain, Colchuck Balanced Rock's Leche La Vaca and Let it Burn,
-- Lemah Mountain's East Route, Lemah Two's Goatshead Spire.
-- Run `npm run check:sql -- fix.sql` against this file before applying, per
-- docs/codebase/hand-written-sql.md.

-- 1. Lake Mountain / Standard Scramble: the route's own `high_point_ft` (8371) is the
-- value independent sources agree on -- SummitPost and a Country High Points trip report
-- both give 8,371 ft, and no source found gives 8,377. The route's `overview` prose
-- and its own summit waypoint (index 7 of `waypoints`) both say 8,377 ft instead,
-- disagreeing with the row's own high_point_ft and with every external source checked.
UPDATE routes
SET overview = replace(overview, '(8,377 ft)', '(8,371 ft)')
WHERE id = 'wa_lake_mountain_pasayten_scramble'
  AND overview LIKE '%(8,377 ft)%';

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elev}', '8371')
WHERE id = 'wa_lake_mountain_pasayten_scramble'
  AND waypoints->7->>'name' = 'Lake Mountain'
  AND waypoints->7->>'type' = 'Summit'
  AND (waypoints->7->>'elev')::int = 8377;
