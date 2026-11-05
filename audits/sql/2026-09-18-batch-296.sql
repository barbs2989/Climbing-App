-- WA alpine/mountaineering audit -- batch 296 (pass 5)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_south_face_3, wa_south_face_4, wa_south_face_5, wa_south_face_center,
--         wa_south_gully_south_spur, wa_south_headwall, wa_south_rib, wa_south_ridge_2
-- All values below were re-read from the live DB immediately before this file was written;
-- every UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Concord Tower (area wa_concord_tower) -- Blue Lake Trailhead elevation
-- =========================================================================
-- Blue Lake Trailhead's real elevation is 5,400 ft (WTA, already established in batch 295
-- for this same trailhead: "the trailhead is located at 5,400 feet elevation ... from there
-- the hike has only 1,050 feet of elevation gain to reach Blue Lake, which sits at 6,254
-- feet"). Both Concord Tower South Face routes store a stale ~5,200 ft figure in their own
-- Trailhead waypoint despite each row's own approach and approach_logistics.trailheadDirection
-- fields already correctly saying "~5,400 ft" / "5,400 ft" for the identical coordinate --
-- the same defect, on the immediately neighboring peak sharing the same trailhead, that batch
-- 295 fixed on South Early Winters Spire.

-- South Face (wa_south_face_3): waypoints[0].elev 5200 -> 5400.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_south_face_3'
  AND waypoints #> '{0,elev}' = '5200'::jsonb;

-- South Face Center (wa_south_face_center): waypoints[0].elev 5200 -> 5400 (same trailhead,
-- same defect).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_south_face_center'
  AND waypoints #> '{0,elev}' = '5200'::jsonb;

-- South Face Center (wa_south_face_center): itinerary described the route in the present
-- tense as an aid climb ("5.7 A3", "aid/free... for two pitches"), while this row's own
-- overview, beta, grade (5.8+), pitches (1) and pro_tips all agree the route is now FREED --
-- overview says outright it was "[h]istorically climbed with a short bit of aid (5.7 A3)
-- before being freed at its current, harder free grade," and pitch_detail describes it as a
-- single 70m-rope pitch (or two with a 60m rope). Confirmed against Mountain Project's route
-- description (one pitch, crack/bulge/two right-facing corners to a tree below the summit
-- block -- no aid or A3 mentioned). Rewritten to match this row's own already-established
-- free description; the historical-aid fact is kept (as this row's own pro_tips already state
-- it) rather than deleted, and no new facts are introduced. Numeric day fields (hours, miles,
-- gainFt, lossFt, packLb) are unchanged.
UPDATE routes SET itinerary = jsonb_set(
    jsonb_set(
      jsonb_set(itinerary, '{days,0,note}', '"Approach as for the standard South Face to the Concord-Lexington col, then free-climb the obvious center crack of the south face (5.8+) \u2014 one long pitch with a 70m rope, or split into two with a 60m rope \u2014 trending left through two right-facing corners to a tree just below the summit block, and joining the upper portion of the North Face route to the summit. Protection is thin and sometimes marginal on sections that were originally climbed with aid before the route was freed."'::jsonb),
      '{days,0,objective}', '"Climb South Face Center (5.8+), joining the North Face route''s upper pitch to the summit"'::jsonb
    ),
    '{totalNote}', '"A long single day (about 10 hrs car-to-car) \u2014 one of the slower lines on the tower because of thin, marginal protection on sections that were originally climbed with aid (5.7 A3) before being freed at the current, harder free grade."'::jsonb
  )
WHERE id = 'wa_south_face_center'
  AND itinerary #> '{days,0,objective}' = '"Climb South Face Center (5.7 A3) finishing via the North Face''s last pitch"'::jsonb;

-- =========================================================================
-- Inspiration Peak (wa_south_face_5)
-- =========================================================================
-- pitches corrected 8 -> 4. This row's own overview ("about 600 ft (4 pitches) of clean
-- rock"), its own itinerary day-2 note ("climb just 4 pitches (5.8) to the summit -- the
-- shortest of Inspiration's three technical lines") and schedule ("Only 4 pitches of 5.8, a
-- shorter climb than the East or West Ridge"), and its own pitch_detail array (exactly 4
-- entries, base to summit) all independently agree on 4 -- only the bare top-level pitches
-- scalar said 8. Same class of fix as wa_rapple_grapple's pitches 4->3 in a prior batch.
UPDATE routes SET pitches = 4 WHERE id = 'wa_south_face_5' AND pitches = 8;

-- =========================================================================
-- Guye Peak (area wa_guye_peak)
-- =========================================================================

-- South Gully/South Spur (wa_south_gully_south_spur): itinerary converted from a bare
-- narrative string to the standard {cal,days,totalNote} object shape every other route in
-- the catalog uses -- the same schema-shape defect documented repeatedly in prior batches.
-- The existing narrative text is preserved verbatim as totalNote, days is an honest empty
-- array since no day-by-day breakdown was ever recorded, no content invented.
UPDATE routes SET itinerary = '{"cal": "", "days": [], "totalNote": "A half day in good conditions and most of a day in bad ones. From the Summit West lot in firm winter snow, about an hour of approach up Commonwealth to the base of the gully, then three rope lengths to the first chockstone, a second chockstone and the short ice or rock step above it, and out onto the South Spur to the south summit. If you want the true traverse, continue over the middle summit, make the rappel, and finish up the north summit. Descend west to Alpental or east down Commonwealth. One party in poor conditions - fog to 20 ft visibility, verglas, fresh snow - took most of a day and noted that in good conditions this is a great half-day outing, which is the honest range."}'::jsonb
WHERE id = 'wa_south_gully_south_spur'
  AND jsonb_typeof(itinerary) = 'string'
  AND itinerary #>> '{}' = 'A half day in good conditions and most of a day in bad ones. From the Summit West lot in firm winter snow, about an hour of approach up Commonwealth to the base of the gully, then three rope lengths to the first chockstone, a second chockstone and the short ice or rock step above it, and out onto the South Spur to the south summit. If you want the true traverse, continue over the middle summit, make the rappel, and finish up the north summit. Descend west to Alpental or east down Commonwealth. One party in poor conditions - fog to 20 ft visibility, verglas, fresh snow - took most of a day and noted that in good conditions this is a great half-day outing, which is the honest range.';

-- South Rib (wa_south_rib): same schema-shape fix -- itinerary converted from a bare
-- narrative string to the standard {cal,days,totalNote} object, narrative preserved
-- verbatim as totalNote, no content invented.
UPDATE routes SET itinerary = '{"cal": "", "days": [], "totalNote": "A half day to a full day, car to car, and a genuinely realistic after-work or short-weather-window objective given the drive from Seattle is under an hour. Park on Alpental Road, walk the ski track and boulder field to the base, and climb five pitches or simulclimb the easier ground. One fit party moving fast on a steep variation of this side of the peak reached the true south summit an hour and a half after leaving the car, which is the low end; a roped party of two on the standard rib should plan on the better part of a day. Descend north over the subsummits and out via the Southeast Couloir and the Cave Ridge trail. No camping needed or wanted."}'::jsonb
WHERE id = 'wa_south_rib'
  AND jsonb_typeof(itinerary) = 'string'
  AND itinerary #>> '{}' = 'A half day to a full day, car to car, and a genuinely realistic after-work or short-weather-window objective given the drive from Seattle is under an hour. Park on Alpental Road, walk the ski track and boulder field to the base, and climb five pitches or simulclimb the easier ground. One fit party moving fast on a steep variation of this side of the peak reached the true south summit an hour and a half after leaving the car, which is the low end; a roped party of two on the standard rib should plan on the better part of a day. Descend north over the subsummits and out via the Southeast Couloir and the Cave Ridge trail. No camping needed or wanted.';

-- =========================================================================
-- Luna Peak -- South Ridge (wa_south_ridge_2)
-- =========================================================================
-- outing_shape set to 'outback' (was null) -- this row's own 3-day itinerary is an explicit
-- out-and-back (day 1 approaches to a high camp; day 3's gainFt/lossFt, 700/3400, are the
-- exact reverse of day 1's 3400/700, and day 3's title is literally "Hike out to Ross Dam"),
-- and descent_text says outright that the descent "reverses the ascent line."
UPDATE routes SET outing_shape = 'outback'
WHERE id = 'wa_south_ridge_2' AND outing_shape IS NULL;

COMMIT;
