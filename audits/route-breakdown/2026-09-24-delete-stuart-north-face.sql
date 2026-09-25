-- NOT YET RUN — awaiting the owner's yes.
-- wa_mount_stuart_north_face names a route that does not exist: no "North Face" in Mountain
-- Project's 15 Stuart routes or any other source, its "IV 5.8 AI2" numbers were lifted from the
-- catalog's own Ice Cliff Glacier row, and its own beta says so (2026-09-24-stuart-north-face.json).
-- References checked 2026-09-24 as the database owner: 0 rows in all 12 tables that hold a route id
-- (climb_logs, comments, content_reports, contributions, crew_listings, crews, gps_submissions,
-- hazard_votes, objectives, route_base_checkins, topo_lines, user_itineraries).
-- check:sql warns that 108 other rows are named "North Face" and asks for the twin: there is none
-- by design — this is not a de-duplication, the route itself does not exist.
-- Pinned on area + name + grade so nothing else can match. Afterwards: npm run check:counts.
delete from routes
 where id = 'wa_mount_stuart_north_face' and area_id = 'wa_mount_stuart' and name = 'North Face' and grade = '5.8';
