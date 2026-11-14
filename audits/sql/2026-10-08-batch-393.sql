-- wa_colfax_peak_cosley_houston: length_m (305m, ~1000ft) is almost certainly carried
-- over from the Polish Route's correct 305m/1000ft figure -- this route's own `overview`
-- text already says "~600 ft", and Alpinist's route list for the Colfax north face
-- independently gives "Cosley-Houston (WI4, ca. 700'...)". Correcting to 213m (700ft),
-- the more specific externally-sourced figure; ~100ft variance from the in-app overview's
-- "~600ft" remains (both agree it is nowhere near 1000ft/305m) -- a human may want to
-- tighten the overview prose or length_m further with a precise pitch-by-pitch total.
UPDATE routes SET length_m = 213
WHERE id = 'wa_colfax_peak_cosley_houston';

-- wa_concord_tower_north_face: high_point_ft (7611 ft) is the ListsOfJohn-sourced figure
-- the row's own data_quality.gaps already flags as disputed. Four independent sources
-- (Mountain Project, Mountaineers.org, SummitPost, wenatcheeoutdoors.org) all converge on
-- 7,560 ft instead, with no other source found supporting 7,611/7,612 ft. Correcting to
-- the better-corroborated value and updating the gaps note to reflect the resolution.
UPDATE routes SET high_point_ft = 7560,
  data_quality = jsonb_set(data_quality, '{gaps}', '[
    "Summit elevation corrected to 7,560 ft (2026-10-08 audit): Mountain Project, Mountaineers.org, SummitPost and wenatcheeoutdoors.org all independently give 7,560 ft, the ~7,611-7,612 ft figure (ListsOfJohn) was an outlier with no other corroborating source.",
    "No public GPS track found for this route as of this research pass.",
    "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file, not a researched or crowd-sourced rating. Users can blend in their own read via the UI."
  ]'::jsonb)
WHERE id = 'wa_concord_tower_north_face';

-- wa_copper_peak_south_route: the row's own `corrections` field hedges toward this being
-- the Olympic Mountains "Copper Mountain" (non-technical Class 2-3), which directly
-- contradicts the row's own coordinates, area description and glaciated SE Glacier/roped
-- content. The stored lat/lng (48.1745741, -120.803989) match Wikipedia's and SummitPost's
-- coordinates for the Entiat Mountains Copper Peak (near Mt. Fernow, Glacier Peak
-- Wilderness) to within ~15m -- confirming this row correctly describes that peak, not the
-- Olympics one. Replacing the confusing/self-contradictory note with an accurate one.
UPDATE routes SET corrections = 'Coordinates (48.1745741, -120.803989) confirmed via Wikipedia/SummitPost to be the Entiat Mountains Copper Peak near Mt. Fernow, Glacier Peak Wilderness, not the Olympic Mountains'' "Copper Mountain." The route''s glaciated Southeast Glacier approach and roped-crossing content are correct for this peak. An earlier research pass incorrectly hedged toward the Olympics peak despite the row''s own coordinates pointing here (resolved 2026-10-08 audit).'
WHERE id = 'wa_copper_peak_south_route';
