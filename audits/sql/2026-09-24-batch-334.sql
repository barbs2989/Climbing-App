-- wa_little_sister_north_face: stored high_point_ft (6526) contradicts this app's OWN areas
-- row for the same peak (wa_little_sister.elevation_ft = 6600), and three independent external
-- sources agree closely with the app's own area value: SummitPost (6,600 ft), Peakbagger and
-- ListsOfJohn (6,620 ft). No source supports 6526. Correcting to 6600 ft to match the app's own
-- area record and the converging external figure.
UPDATE routes SET high_point_ft = 6600 WHERE id = 'wa_little_sister_north_face';

-- wa_lincoln_peak_north_ridge: watch_out lists "Glacier travel hazards (Sherpa, Stuart glaciers)
-- particularly late season" as a hazard for this route. Sherpa Glacier and Stuart Glacier are on
-- Mount Stuart in the Alpine Lakes Wilderness (Chelan County), roughly 90+ miles from Lincoln
-- Peak/the Black Buttes near Mount Baker (Whatcom County) -- confirmed via Wikipedia/Mountaineers
-- pages for both glaciers. This route's own approach text and waypoints name only the Coleman
-- Glacier, including an explicit icefall/serac hazard note ("you pass directly beneath active
-- serac bands on the Coleman Glacier's upper icefall"). This looks like boilerplate hazard text
-- copied from a Mount Stuart-area route and left unedited. Replacing the wrong glacier names with
-- the glacier this route actually crosses.
UPDATE routes
SET watch_out = to_jsonb(
  replace(
    watch_out #>> '{}',
    'Glacier travel hazards (Sherpa, Stuart glaciers) particularly late season',
    'Glacier travel hazards (Coleman Glacier icefall/seracs) particularly late season'
  )
)
WHERE id = 'wa_lincoln_peak_north_ridge';
