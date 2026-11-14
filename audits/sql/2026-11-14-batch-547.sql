-- WA alpine audit, batch 547 (pass 8)
-- wa_the_monk_west_cracks_left_crack / wa_the_monk_west_cracks_right_crack: same bug found and
-- fixed for this peak's other three routes in batch 546 (2026-11-13) -- these two routes on
-- "The Monk" (area wa_the_monk_pasayten, a sub-summit of Cathedral Peak in the Pasayten
-- Wilderness) also store high_point_ft = 8606 ft, which is Cathedral Peak's OWN elevation
-- (Wikipedia 8,606 ft; Mountain Project/SummitPost/Mazamas ~8,601 ft), not The Monk's. ListsOfJohn
-- gives The Monk its own elevation of 8,009 ft (LiDAR, more reliable per that entry) / 8,020 ft
-- (map), with a 7,898 ft connecting saddle to Cathedral -- consistent with the same import mix-up
-- that batch 546 already identified for this peak's other routes. Confirmed live: all five of
-- The Monk's routes still show 8606 (batch 546's proposed fix has not yet been applied), so this
-- file's two statements plus batch 546's three cover the full set.
UPDATE routes SET high_point_ft = 8009 WHERE id = 'wa_the_monk_west_cracks_left_crack';
UPDATE routes SET high_point_ft = 8009 WHERE id = 'wa_the_monk_west_cracks_right_crack';
