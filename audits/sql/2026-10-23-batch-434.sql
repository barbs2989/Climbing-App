-- wa_mount_rainier_ingraham_direct: climbing_route step 5 ("Crater to Columbia Crest")
-- names the summit as "Columbia Crest (14,411 ft)", but this same route's own
-- high_point_ft (14406) and its own summit waypoint (elevFt 14406) already give
-- Columbia Crest as 14406 -- the row contradicts itself. 14406 also matches Mount
-- Rainier's areas.elevation_ft and the sibling Disappointment Cleaver route's
-- high_point_ft (both already 14406), so the stale "14,411" in this route's free
-- text is brought into line with the figure the row (and the rest of the app) has
-- already settled on.
UPDATE routes
SET climbing_route = replace(climbing_route::text, 'Columbia Crest (14,411 ft)', 'Columbia Crest (14,406 ft)')::jsonb
WHERE id = 'wa_mount_rainier_ingraham_direct';

-- wa_mount_rainier_ingraham_glacier_direct: overview text has two issues.
-- (1) "Cadever Gap" is a misspelling of "Cadaver Gap" -- confirmed against SummitPost
-- and multiple trip reports (turns-all-year.com, bcmc.ca) describing Cadaver Gap as
-- the steeper alternative to Cathedral Gap near Ingraham Flats; the sibling route
-- wa_mount_rainier_ingraham_direct already spells it correctly in its own
-- climbing_route text ("the steeper, shorter Cadaver Gap").
-- (2) The same stale "Columbia Crest, 14,411 ft" figure as above -- this route has
-- no high_point_ft of its own to contradict, but the figure is brought into line
-- with the 14406 ft already used throughout the rest of the app (areas.elevation_ft,
-- Disappointment Cleaver, and this same fix to the sibling Ingraham Direct route).
UPDATE routes
SET overview = replace(replace(overview, 'Cadever Gap', 'Cadaver Gap'), 'Columbia Crest, 14,411 ft', 'Columbia Crest, 14,406 ft')
WHERE id = 'wa_mount_rainier_ingraham_glacier_direct';
