-- WA alpine audit, pass 2, batch 72 (2026-08-07)
-- Routes: Mount Stone (Lena Lake to Mt Stone traverse), Gunn Peak (Lewis Creek
-- Route), Lexington Tower (East Face), Liberty Bell Mountain (Beckey Route,
-- East Face, Independence Route, Liberty and Injustice for All, Northwest
-- Face, Overexposure, Serpentine Crack).

-- Lewis Creek Route (Gunn Peak): dist_km stored as 6 km, but the route's own
-- itinerary.sourceNote explicitly cites the on-file distance as 12.07 km /
-- 7.5 mi, and itinerary.days[0].miles=7.5 agrees -- 6 km is implausible for
-- the stated 11-hr, 5,200 ft-gain car-to-car day.
UPDATE routes SET dist_km = 12.07 WHERE id = 'wa_lewis_creek_route';

-- Lexington Tower (area blurb): East Face parenthetical listed Grade "III",
-- contradicting the route's own on-file alpine_grade='IV' and
-- commitment='IV' fields. Confirmed externally as Grade IV, 5.9+ (FA Steve
-- Marts & Don McPherson, June 1966, matches on-file FA exactly).
UPDATE areas
SET blurb = replace(blurb, '(5.9+, III, 10 pitches)', '(5.9+, IV, 10 pitches)')
WHERE id = 'wa_lexington_tower';

-- Liberty Bell Independence Route: grade_num=12 doesn't match "5.12a" under
-- this app's own gradeNum() formula (scripts/pipeline/import-alpine.mjs:
-- int + (letter_index+1)/4), which correctly yields 12.5 for sibling
-- wa_liberty_and_injustice_for_all's "5.12b" in this same table. 5.12a ->
-- 12 + (0+1)/4 = 12.25.
UPDATE routes SET grade_num = 12.25 WHERE id = 'wa_liberty_bell_independence_route';

-- Liberty Bell Independence Route: approach text describes the Blue Lake
-- Trailhead / west side ("Same as the Beckey Route... West Face"),
-- contradicting this row's own aspect='E', face='East Face', and
-- pitch_detail (P1 "right edge of the East Face"). This is a documented
-- East Face line (Beckey's Cascade Alpine Guide / Nelson-Potterfield
-- Selected Climbs) approached from the SR-20 hairpin/pond pullout east of
-- Washington Pass, the same approach used by this table's other East Face
-- routes.
UPDATE routes SET approach = 'Park at the pullout on WA-20 at the hairpin curve east of Washington Pass -- not the Blue Lake Trailhead, which serves the west/southwest side of the mountain. Walk back toward the pass to a small pond on the south side of the highway, round its east end, and follow the cairned climbers'' path north into the forest and up the talus to the base of the East Face, roughly 20-30 minutes and about a mile from the car (600-800 ft gain) -- the same approach used by the neighboring East Face lines (Liberty Crack, Thin Red Line, Liberty and Injustice for All).'
WHERE id = 'wa_liberty_bell_independence_route';

-- Liberty Bell Independence Route: approach_logistics pointed at the Blue
-- Lake Trailhead, same contamination as above -- corrected to the
-- Hairpin/Pond Pullout coordinates used consistently by this table's other
-- East Face routes.
UPDATE routes SET approach_logistics = '{"peakLat":48.515435,"peakLng":-120.658365,"trailhead":"SR-20 Hairpin / Pond Pullout (east of Washington Pass)","trailheadLat":48.51454,"trailheadLng":-120.64332,"trailheadDirection":"From the hairpin-turn/pond pullout on SR-20 just east of Washington Pass (~5,100 ft), via the cairned climbers'' path -- not the Blue Lake Trailhead, which serves the west side of the mountain"}'::jsonb
WHERE id = 'wa_liberty_bell_independence_route';

-- Liberty Bell Independence Route: waypoints[0] was labeled "Blue Lake
-- Trailhead" with Blue Lake TH coordinates -- same contamination, fixed to
-- the correct East Face trailhead.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0}', '{"lat":48.51454,"lng":-120.64332,"elev":5100,"name":"SR-20 Hairpin / Pond Pullout","note":"Roadside pullout on SR-20 at the hairpin curve east of Washington Pass -- this route''s actual East Face trailhead per its own approach text/approach_logistics (not the Blue Lake Trailhead used by the Beckey Route/west-side lines).","type":"Trailhead","distMi":0}'::jsonb)
WHERE id = 'wa_liberty_bell_independence_route';

-- Liberty Bell East Face: waypoints[0] labeled "Blue Lake Trailhead" (Blue
-- Lake TH coords), contradicting this row's OWN approach text and
-- approach_logistics field, which both already correctly say the trailhead
-- is the SR-20 hairpin/pond pullout, not Blue Lake TH.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0}', '{"lat":48.51454,"lng":-120.64332,"elev":5100,"name":"SR-20 Hairpin / Pond Pullout","note":"Roadside pullout on SR-20 at the hairpin curve east of Washington Pass -- this route''s actual trailhead per its own approach text and approach_logistics field (not the Blue Lake Trailhead used by the Beckey Route/west-side lines).","type":"Trailhead","distMi":0}'::jsonb)
WHERE id = 'wa_liberty_bell_east_face';

-- Liberty Bell East Face: beta described a completely different, longer
-- route (ten pitches, offwidth crux passing a fixed 2x4 and two bolts to an
-- alcove), contradicting this row's own on-file pitch_detail (4 pitches, no
-- offwidth/2x4/bolts, lengths summing exactly to length_m=125). Rewritten
-- to match the row's own already-verified pitch_detail.
UPDATE routes SET beta = 'Four pitches of moderate crack and face climbing on Liberty Bell''s East Face: a 5.4 opening pitch off the talus, a sustained 5.6 crack/face crux pitch, then two easing pitches (5.5, 5.4) to a scramble near the summit.'
WHERE id = 'wa_liberty_bell_east_face';

-- Liberty Bell East Face: overview called the route "popular," contradicting
-- this same row's own crowds field ("Rarely climbed" / "Overshadowed by the
-- Beckey Route... low traffic").
UPDATE routes SET overview = 'A moderate, lightly-traveled rock route on the east side of Liberty Bell, giving accessible alpine rock climbing on good Washington Pass granite to the summit -- overshadowed by the Beckey Route and less documented than the peak''s other East Face lines.'
WHERE id = 'wa_liberty_bell_east_face';

-- Liberty and Injustice for All: waypoints[0] labeled "Blue Lake Trailhead"
-- (Blue Lake TH coords), contradicting this row's own approach text ("park
-- at the hairpin turn... east of Washington Pass") and its own
-- approach_logistics field (Hairpin/Pond Pullout, 48.51454, -120.64332).
UPDATE routes SET waypoints = '[{"lat":48.51454,"lng":-120.64332,"elev":5100,"name":"SR-20 Hairpin / Pond Pullout","note":"Roadside pullout on SR-20 at the hairpin curve east of Washington Pass -- the shared East Face approach trailhead for Liberty Crack, Thin Red Line, Independence Route and Liberty and Injustice for All (not the Blue Lake Trailhead, which serves the west side of the mountain).","type":"Trailhead","distMi":0},{"lat":48.5155,"lng":-120.6588,"elev":7720,"name":"Liberty Bell Mountain","note":"True summit of Liberty Bell Mountain.","type":"Summit","distMi":2}]'::jsonb
WHERE id = 'wa_liberty_and_injustice_for_all';

-- Liberty and Injustice for All: dist_km=8.05 is almost exactly double its
-- two sibling East-Face-pullout routes in this table
-- (wa_liberty_bell_east_face / wa_liberty_bell_independence_route both
-- =4.02, sharing the identical trailhead/approach) -- 8.05 / 2 = 4.025.
-- Matches the documented one-way-vs-round-trip dist_km contamination
-- pattern; corrected to the one-way value shared by its same-trailhead
-- siblings.
UPDATE routes SET dist_km = 4.02 WHERE id = 'wa_liberty_and_injustice_for_all';

-- Liberty Bell Overexposure: aspect/face stored as "Southwest", contradicting
-- this row's own overview text ("Liberty Bell's west face") and a waypoint
-- coordinate ("Exposed opening moves off the notch") identical to sibling
-- wa_liberty_bell_nw_face's waypoint at the same point, which that route
-- explicitly labels the west-side bench distinct from the SW-facing Beckey
-- gully.
UPDATE routes SET aspect = 'W', face = 'West Face / Liberty-Concord Notch' WHERE id = 'wa_liberty_bell_overexposure';

-- Liberty Bell Overexposure: emergency.county trimmed to "Chelan" alone,
-- contradicting this same row's own emergency.notes ("Washington Pass
-- straddles the Chelan/Okanogan county boundary") and the area blurb; sibling
-- wa_liberty_bell_nw_face already correctly carries both counties.
UPDATE routes SET emergency = jsonb_set(emergency, '{county}', '"Chelan / Okanogan (summit straddles county line)"'::jsonb) WHERE id = 'wa_liberty_bell_overexposure';

-- Liberty Bell Serpentine Crack: same emergency.county defect as
-- Overexposure above -- "Chelan" alone contradicts this row's own
-- emergency.notes and the area/sibling data.
UPDATE routes SET emergency = jsonb_set(emergency, '{county}', '"Chelan / Okanogan (summit straddles county line)"'::jsonb) WHERE id = 'wa_liberty_bell_serpentine_crack';
