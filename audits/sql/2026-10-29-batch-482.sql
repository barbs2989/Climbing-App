-- WA alpine route audit -- batch 482 (pass 8)
-- Routes: wa_crooked_thumb_peak_east_face, wa_crooked_thumb_peak_south_route,
-- wa_cutthroat_peak_cauthorn_wilson_couloir, wa_cutthroat_peak_northeast_face,
-- wa_cutthroat_south_buttress, wa_cutthroat_the_swarm, wa_cutthroat_west_ridge,
-- wa_dark_peak_dark_glacier_route
-- All values below were re-read from the live DB immediately before this file was
-- written; the UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_cutthroat_peak (area row): elevation_ft is stored as 8065, one foot off
-- the peak's current best-supported figure. Wikipedia's current article and
-- ListsOfJohn both give 8,066 ft from LiDAR survey (the older, map-based
-- figure is 8,050 ft, paired with a 1,730 ft prominence -- not this row's
-- figure). This row's own prominence_ft (1,766) already matches the CURRENT
-- Wikipedia entry's 1,766 ft exactly, which pairs with the 8,066 ft
-- elevation, not 8,065 -- so 8,065 looks like a single stray digit rather
-- than a different source's figure. All 5 of this area's own routes already
-- carry high_point_ft 8,066, so this also makes the area row agree with its
-- own routes.
update areas set
  elevation_ft = 8066
where id = 'wa_cutthroat_peak'
  and elevation_ft = 8065;

-- verify: should show 8066, matching the 5 Cutthroat routes' own high_point_ft
select id, elevation_ft, prominence_ft from areas where id = 'wa_cutthroat_peak';
