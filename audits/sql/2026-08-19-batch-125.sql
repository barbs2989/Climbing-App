-- wa_east_face (East Face, Middle Peak / Middle Gunsight, Gunsight Range): the route's own
-- "Summit" waypoint stored elev=8000, but high_point_ft=8200 for the same peak. Mountain
-- Project's Gunsight Range area page states the range's four summits run "between 8,000 and
-- 8,200 feet" and explicitly names Middle Gunsight as the range's highest point -- inconsistent
-- with an 8,000 ft reading. A secondary source (trailcatjim.com) independently cites 8,198 ft
-- for this same USGS-named "Gunsight Peak" coordinate. Corrected the waypoint to match
-- high_point_ft rather than leaving the two contradicting each other on the same screen.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '8200')
WHERE id = 'wa_east_face';

-- wa_east_face: the FA field names the second first-ascensionist "Martins Putelis" -- no
-- climber by that name could be found in any source. The real name is "Mahting Putelis," a
-- documented Cascades climber/guide credited elsewhere (alongside Sol Wertkin) for other
-- mid-2000s North Cascades first ascents. Reads as a transcription error of "Mahting"; year
-- (2006) and grade (5.10d) are independently corroborated and left unchanged.
UPDATE routes
SET fa = 'Sol Wertkin & Mahting Putelis, 2006'
WHERE id = 'wa_east_face';

-- wa_east_face_6 (Chimney Rock, East Face): stored alpine_grade/commitment of "Grade IV"/"IV"
-- for a 3-pitch 5.3 climb. Three independent sources describing this exact route/peak
-- (Mountaineers.org, bivy.com, trailcatjim.com) all grade it "Grade II" -- none call it Grade
-- IV. The row already contradicts itself: its own climbing_route notes for pitch 4 read
-- "...Grade II overall," which the top-level alpine_grade/commitment fields never matched.
UPDATE routes
SET alpine_grade = 'Grade II', commitment = 'II'
WHERE id = 'wa_east_face_6';

-- wa_east_ridge_2 (Snowking Mountain, East Ridge): the route's "Summit" waypoint stored
-- elev=7400, but high_point_ft=7433 for the same peak. Wikipedia and an independent GPS
-- coordinate database both give Snowking Mountain's true summit as 7,433 ft; Snowking also has
-- a subsidiary "Middle Peak" listed at 7,400 ft, which looks like the likely source of the
-- waypoint's contaminated value. Corrected the waypoint to match the summit, not the subpeak.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{2,elev}', '7433')
WHERE id = 'wa_east_ridge_2';

-- wa_east_ridge_4 (Inspiration Peak, East Ridge): the route's "Summit" waypoint stored
-- elev=7880, but high_point_ft=7891 for the same peak. Wikipedia gives Inspiration Peak's
-- elevation as 7,891 ft, matching high_point_ft; the waypoint was the outlier.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '7891')
WHERE id = 'wa_east_ridge_4';
