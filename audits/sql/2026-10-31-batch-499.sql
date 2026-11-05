-- WA alpine audit batch 499 (pass 8)
-- Routes: wa_hozomeen_mountain_southwest_buttress (clean), wa_hozomeen_mountain_west_face (clean),
--         wa_huckleberry_mountain_east_ridge (clean), wa_huckleberry_mountain_north_route (clean,
--         nothing stored to check), wa_huckleberry_mountain_north_spur (clean, nothing stored to
--         check), wa_huckleberry_mountain_south_face (clean),
--         wa_huckleberry_mountain_southwest_slope (clean, nothing stored to check),
--         wa_huckleberry_mountain_west_route (1 fix)

-- =========================================================================
-- Huckleberry Mountain, West Route (West Face) -- wa_huckleberry_mountain_west_route
-- =========================================================================
-- data_quality.gaps[1] says a prior pass "left on-file value (6,327 ft) unchanged as it falls
-- within that normal range" -- but the row's own high_point_ft (and its own summit waypoint) is
-- 6,320 ft, not 6,327 ft, so the note no longer describes what is actually on file. 6,320 ft is
-- itself the best-supported figure, confirmed via Wikipedia and PeakVisor (both 6,320 ft; a
-- minority TopoQuest/SummitPost figure runs 6,230-6,279 ft), and matches all three Huckleberry
-- Mountain routes checked this batch, so the number in the column is correct -- only the stale
-- note text, which misstates what value is on file, needed correcting.
UPDATE routes
SET data_quality = jsonb_set(
  data_quality,
  '{gaps,1}',
  '"Published elevation varies by source (6,320-6,340 ft) - left on-file value (6,320 ft) unchanged as it falls within that normal range. Prominence corrected to 720 ft per Wikipedia - the prior 780 ft on file may have been conflated with the unrelated USFS ''Huckleberry Mountain Trail #780'' near Darrington, WA."'::jsonb
)
WHERE id = 'wa_huckleberry_mountain_west_route'
  AND high_point_ft = 6320
  AND data_quality->'gaps'->>1 LIKE '%(6,327 ft) unchanged as it falls within that normal range%';
