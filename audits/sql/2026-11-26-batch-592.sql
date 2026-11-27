-- wa_little_sister_north_face: high_point_ft was stored as 6526, but this route's own
-- overview says it finishes with scrambling to Little Sister's true summit, and the
-- Southeast Ridge route on the same peak (wa_little_sister_southeast_ridge) already
-- stores 6600 for that same true summit. Two independent sources corroborate ~6600-6620
-- (SummitPost's Twin Sisters Range page: 6,600 ft; Yellowleaf.org: 6,620 ft, noting
-- "Little Sister" is an unofficial name) -- neither supports 6526. Correcting to 6600 to
-- match the peak's own other route and the sourced elevation.
UPDATE routes SET high_point_ft = 6600 WHERE id = 'wa_little_sister_north_face';

-- wa_little_sister_west_face: same inconsistency as North Face above -- stored 6526 for
-- the same true summit that the Southeast Ridge route (already correct in this DB) and
-- external sources place at 6600-6620. Correcting to 6600.
UPDATE routes SET high_point_ft = 6600 WHERE id = 'wa_little_sister_west_face';
