-- WA alpine/mountaineering audit -- batch 399 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_east_ridge_4 (Inspiration Peak), wa_east_twin_needle_north_buttress,
--         wa_east_twin_needle_south_route, wa_east_twin_needle_thread_of_ice,
--         wa_eldorado_peak_east_ridge, wa_eldorado_peak_eldorado_glacier_nw,
--         wa_eldorado_peak_north_ridge, wa_east_ridge_8 (Pinnacle Peak),
--         wa_east_ridge_9 (Ingalls Peak), wa_east_slope (Primus Peak)
-- All ten routes came back clean against every authoritative/well-corroborated source
-- checked (NPS, Wikipedia/USGS, SummitPost, Mountaineers.org, AAJ/AAC, Mountain Project,
-- WTA, WSDOT, trip reports) -- no SQL below rests on an external-source contradiction.
-- The one fix in this file is instead an INTERNAL self-contradiction in the row itself.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- =========================================================================
-- Northwest Couloir / Eldorado Glacier, Eldorado Peak (wa_eldorado_peak_eldorado_glacier_nw)
-- -- `fa` names a specific party the row's own data_quality note says isn't confirmed
-- =========================================================================
-- The `fa` field reads "Dan Cauthorn and Bill Pilling", but this same row's
-- data_quality.gaps array already states "No confirmed first-ascent party/date found".
-- No source (AAJ, SummitPost, Mountain Project, alpinedave.com, climberkyle.com,
-- turns-all-year.com) credits Cauthorn/Pilling, or anyone else, with this route's first
-- ascent. A row that simultaneously asserts a named FA and admits in its own metadata
-- that no FA is confirmed is internally inconsistent and would display an unsupported
-- claim to a climber. Clearing the unsupported credit rather than guessing a correct one.
UPDATE routes SET fa = NULL
WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw'
  AND fa = 'Dan Cauthorn and Bill Pilling';
