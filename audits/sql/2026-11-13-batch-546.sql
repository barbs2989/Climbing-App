-- WA alpine audit, batch 546 (pass 8)
-- wa_the_monk_le_gibet / wa_the_monk_odine / wa_the_monk_scabo: all three routes on "The Monk"
-- (a sub-peak of Cathedral Peak in the Pasayten Wilderness, area wa_the_monk_pasayten) store
-- high_point_ft = 8606 ft. That figure is Cathedral Peak's OWN summit elevation (Wikipedia
-- 8,606 ft NAVD88; Mountain Project/SummitPost/Mazamas ~8,601 ft) -- not The Monk's. ListsOfJohn
-- lists The Monk itself (peak id 212027) as a named sub-summit 0.10 mi from, and subsidiary to,
-- Cathedral Peak, with its own elevation of 8,009 ft (LiDAR) / 8,020 ft (map) and a connecting
-- saddle at 7,898 ft -- roughly 580-600 ft lower than the stored value, consistent with all three
-- routes having been mistakenly tagged with the neighboring (taller, more prominent) peak's
-- elevation rather than their own formation's. Using the LiDAR figure, which ListsOfJohn's own
-- entry flags as more reliable than the map's contour-derived elevation for this peak.
UPDATE routes SET high_point_ft = 8009 WHERE id = 'wa_the_monk_le_gibet';
UPDATE routes SET high_point_ft = 8009 WHERE id = 'wa_the_monk_odine';
UPDATE routes SET high_point_ft = 8009 WHERE id = 'wa_the_monk_scabo';
