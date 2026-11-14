-- wa_mount_rainier_curtis_ridge: stored high_point_ft (13800) is only the top of the
-- technical ridge, but this route's own waypoints list Columbia Crest (true summit,
-- elevFt 14406) as its final point, and descent_text says the route continues "over
-- the summit area" to Columbia Crest. 14406 also matches Mount Rainier's own
-- areas.elevation_ft and the sibling Disappointment Cleaver route's high_point_ft.
UPDATE routes SET high_point_ft = 14406 WHERE id = 'wa_mount_rainier_curtis_ridge';
