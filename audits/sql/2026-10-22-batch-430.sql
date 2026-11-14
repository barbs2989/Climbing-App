-- WA alpine audit -- batch 430 (pass 7) -- 2026-10-22
-- Routes: wa_mount_hopper_standard (fixed), wa_mount_howard_south_slope (clean),
--         wa_mount_index_north_face (clean), wa_mount_johnson_deception_chimney (flagged),
--         wa_mount_johnson_northwest_face (flagged), wa_mount_johnson_rumble_gully (flagged),
--         wa_mount_johnson_south_terrace_route (flagged), wa_mount_johnson_southwest_route (clean),
--         wa_mount_johnson_staircase_route (flagged), wa_mount_la_crosse_scramble (clean)

-- wa_mount_hopper: elevation stored as 6,120 ft in both areas.elevation_ft and this
-- route's own high_point_ft and summit waypoint, but two independent sources (Washington
-- Trails Association's Mount Hopper hike page and SummitPost) both give 6,114 ft, and
-- neither names 6,120 ft anywhere. No NPS/USGS page was found to adjudicate further, but
-- the two sources agree with each other and disagree with the stored value, so this is
-- fixed rather than just flagged.
UPDATE areas SET elevation_ft = 6114
WHERE id = 'wa_mount_hopper' AND elevation_ft = 6120;

UPDATE routes SET high_point_ft = 6114
WHERE id = 'wa_mount_hopper_standard' AND high_point_ft = 6120;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{5,elev}', to_jsonb(6114))
WHERE id = 'wa_mount_hopper_standard'
  AND waypoints->5->>'name' = 'Mount Hopper summit'
  AND waypoints->5->>'elev' = '6120';

-- NOT FIXED, flagged for a human instead (see audits/wa-alpine-audit-log.md for detail):
-- wa_mount_johnson_deception_chimney, wa_mount_johnson_rumble_gully,
-- wa_mount_johnson_northwest_face, wa_mount_johnson_south_terrace_route,
-- wa_mount_johnson_staircase_route: no source found (Wikipedia, AAC Publications search,
-- or general web search) names any of these five route names for Mount Johnson (Olympic
-- NP / The Needles) at all, let alone the climbers and years each row credits. Two
-- different routes (Deception Chimney and Rumble Gully) carry the IDENTICAL first-ascent
-- credit -- "Lex Maxwell, Joe Gleason, and Louis Ulrich, 1933" -- which is a strong sign
-- of duplicated/copied data rather than two separately-researched facts. Separately,
-- wa_mount_johnson_staircase_route credits "Dick Oswin in 1920," which would predate even
-- the mountain's own documented first ascent (Wikipedia's Mount Johnson (Washington)
-- article gives 1935 or 1940 as the first ascent of the summit itself, with the date
-- already uncertain between two sources). No fix proposed because nothing authoritative
-- was found to replace these values with -- but the internal contradiction (a named
-- "first ascent" of a route predating the peak's first ascent) and the exact-duplicate FA
-- across two routes warrant a human look, ideally against a print source such as the
-- Olympic Mountains climbing guide or AAC/AAJ archives not indexed by general web search.
