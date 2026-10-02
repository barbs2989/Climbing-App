-- WA alpine audit batch 328 (pass 6)
-- Routes: wa_hozomeen_mountain_north_peak_north_route, wa_hozomeen_mountain_southeast_face,
--         wa_hurry_up_peak_south_ridge, wa_icy_peak_ruth_icy_traverse, wa_icy_peak_southwest_route,
--         wa_ingalls_peak_east_route, wa_ingalls_peak_south_ridge, wa_inner_constance_northwest_buttress

-- =========================================================================
-- Hozomeen Mountain, Southeast Face (Standard) -- wa_hozomeen_mountain_southeast_face
-- =========================================================================
-- This row's own pre-existing `corrections` note (from an earlier research pass) already
-- flagged that "Southeast Face (Standard)" does not match any documented route on Hozomeen's
-- North Peak, and that the real Southeast Buttress line (AAC-documented, FA 1988) is instead
-- on the separate South Peak, 8,003 ft, about a mile away. That pass evidently went on to
-- rewrite this row's `face` field to "South Peak (8,003 ft - the lower of Hozomeen's two main
-- summits)", `aspect` to E-SE, `fa` to explicitly say "this route climbs the SOUTH Peak (8,003
-- ft)" with Beckey's 30 May 1947 FA, and the `waypoints` array to a Southeast Buttress
-- approach/route ending at a "Hozomeen Mountain, South Peak" summit waypoint at 8,003 ft --
-- i.e. every other field on the row was already brought in line with the South Peak
-- identification. Only `high_point_ft` was left behind at 8,071 ft, which is North Peak's
-- elevation, not this route's own summit. Re-verified independently: Wikipedia and
-- ListsOfJohn both give Hozomeen North Peak 8,071 ft / South Peak 8,003 ft, matching what
-- this row's own `face`/`fa`/`waypoints` fields already settled on. Bringing `high_point_ft`
-- into line with the row's own already-made identification, not asserting a new judgment.
-- (The broader question the original corrections note raised -- whether this entry should be
-- renamed/re-pointed or split into a separate South Peak route -- is a structural/identity
-- call outside this fix's scope and is left for human review, same as it already was.)
UPDATE routes
SET high_point_ft = 8003
WHERE id = 'wa_hozomeen_mountain_southeast_face'
  AND high_point_ft = 8071
  AND face = 'South Peak (8,003 ft - the lower of Hozomeen''s two main summits)'
  AND waypoints->-1->>'name' = 'Hozomeen Mountain, South Peak'
  AND (waypoints->-1->>'elev')::int = 8003;
