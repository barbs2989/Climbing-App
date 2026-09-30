-- Clear five drawn lines that follow the WRONG approach (research round 2, 2026-09-30); the map then shows
-- the corrected pins only, as audits/route-leftovers did with clear_line. Old lines: gpx-cleared-backup-2026-09-30.json.
-- Each UPDATE matches only while the row still holds that exact line (length + first + last point), so a re-run
-- changes nothing. Expected row counts: 1, 1, 1, 1, 1.
begin;

-- 1. wa_beckey_tate: recorded track to Kangaroo Pass; the route cuts east to the Big Kangaroo-Half Moon ridge and never goes to the pass.
update routes set gpx = null
 where id = 'wa_beckey_tate' and jsonb_array_length(gpx) = 91 and gpx->0 = '[48.514131,-120.642886]'::jsonb and gpx->-1 = '[48.50176,-120.62226]'::jsonb;

-- 2. wa_big_kangaroo_west_face: same Kangaroo Pass track; the route's own text says to leave that trail and cross Early Winters Creek.
update routes set gpx = null
 where id = 'wa_big_kangaroo_west_face' and jsonb_array_length(gpx) = 91 and gpx->0 = '[48.514131,-120.642886]'::jsonb and gpx->-1 = '[48.50176,-120.62226]'::jsonb;

-- 3. wa_blue_s_buttress: 2-point sketch from 48.5233,-120.655, which is neither trailhead; the approach starts at the SR-20 hairpin (4 sources).
update routes set gpx = null
 where id = 'wa_blue_s_buttress' and jsonb_array_length(gpx) = 2 and gpx->0 = '[48.5233,-120.655]'::jsonb and gpx->-1 = '[48.50271,-120.63726]'::jsonb;

-- 4. wa_east_face_3: 2-point sketch from 48.5233,-120.655; the approach starts at a pond a few hundred yards east of the pass that no source locates.
update routes set gpx = null
 where id = 'wa_east_face_3' and jsonb_array_length(gpx) = 2 and gpx->0 = '[48.5233,-120.655]'::jsonb and gpx->-1 = '[48.51229,-120.65397]'::jsonb;

-- 5. wa_south_early_winter_spire_east_buttress: recorded track of the west-side Blue Lake approach; the East Buttress is approached from the hairpin up Spire Gully (3 sources, and the row's own text).
update routes set gpx = null
 where id = 'wa_south_early_winter_spire_east_buttress' and jsonb_array_length(gpx) = 162 and gpx->0 = '[48.519603,-120.674303]'::jsonb and gpx->-1 = '[48.5123,-120.655411]'::jsonb;

commit;
