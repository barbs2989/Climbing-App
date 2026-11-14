-- Batch 537 (pass 8, 2026-11-13)
-- Routes: Remmel Mountain's NW Ridge and Southeast Slope; Mount Fury (West Peak)'s Ridge
-- Traverse from East Fury; Colchuck Balanced Rock's Rikki Tikki Tavi; Rock Mountain's
-- Northeast Ridge (Nason Ridge Traverse) and West Route; Ruby Mountain's Happy Creek Route,
-- Northwest Ridge Route and South Ridge Route; Ruth Mountain's Ruth-Icy Traverse.

-- wa_rock_mountain_west_route stores high_point_ft = 6852, but this peak's OTHER route
-- (wa_rock_mountain_northeast_ridge) and the wa_rock_mountain area row were already
-- corrected to 6841 on 2026-07-31 against Wikipedia (6,840+ ft) and GNIS/Wikidata (2,085.5m
-- = 6,841 ft) -- that correction was never propagated to this sibling route, leaving two
-- routes on the same peak disagreeing on its own summit height.
UPDATE routes SET high_point_ft = 6841
WHERE id = 'wa_rock_mountain_west_route' AND high_point_ft = 6852;

-- wa_remmel_mountain (area row) stores elevation_ft = 8688, but Wikipedia's infobox gives
-- 8,685 ft (2,647 m) for Remmel Mountain, and this peak's own two route rows
-- (wa_remmel_mountain_nw_ridge, wa_remmel_mountain_southeast_slope) already independently
-- store high_point_ft = 8685 -- the area row is the outlier against both the external
-- source and the app's own routes.
UPDATE areas SET elevation_ft = 8685
WHERE id = 'wa_remmel_mountain' AND elevation_ft = 8688;

-- wa_ruby_mountain (area row) stores elevation_ft = 7426, a figure no source searched
-- supports (SummitPost and WTA give 7,408 ft; Wikipedia/PeakVisor give 7,412 ft). All three
-- of this peak's own route rows (wa_ruby_mountain_happy_creek, _northwest_ridge, _south_ridge)
-- already independently store high_point_ft = 7408, so the area row is corrected to match
-- both the closest documented figure and the app's own converged data.
UPDATE areas SET elevation_ft = 7408
WHERE id = 'wa_ruby_mountain' AND elevation_ft = 7426;

-- wa_ruby_mountain_northwest_ridge's own `waypoints` entry for "Ruby Mountain summit" carries
-- elev/elevFt = 7426, contradicting this same row's own high_point_ft = 7408 (and the other
-- two Ruby Mountain routes above) -- corrected to match.
UPDATE routes SET waypoints = '[{"lat": 48.694408, "lng": -121.042952, "elev": 7408, "name": "Ruby Mountain summit", "type": "Summit", "distMi": null, "elevFt": 7408}]'::jsonb
WHERE id = 'wa_ruby_mountain_northwest_ridge' AND high_point_ft = 7408
  AND waypoints = '[{"lat": 48.694408, "lng": -121.042952, "elev": 7426, "name": "Ruby Mountain summit", "type": "Summit", "distMi": null, "elevFt": 7426}]'::jsonb;

-- No other confirmed errors this batch. See audits/wa-alpine-audit-log.md for the one
-- flagged-for-human-review item (wa_remmel_mountain_southeast_slope's FA claim, which could
-- not be confirmed OR contradicted and is not fixed here).
