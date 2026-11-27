-- wa_mount_barnes (areas table): areas.elevation_ft stored 5986, one foot off from
-- this DB's own routes.high_point_ft (5987) on wa_mount_barnes_scramble. Wikipedia
-- (47°47'02"N 123°34'34"W, 5,987 ft), TopoQuest (47.78392N/123.57609W, 5,987 ft) and
-- Lists of John (47.78399N/123.57621W, 5,987' LiDAR) all agree on 5,987 ft -- and the
-- coordinates on all three match this DB's stored area lat/lng (47.783995/-123.576185)
-- to within normal rounding. Correcting areas.elevation_ft to match the sourced figure
-- and this route's own already-correct high_point_ft.
UPDATE areas SET elevation_ft = 5987 WHERE id = 'wa_mount_barnes';
