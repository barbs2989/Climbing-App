-- wa_mount_christie (areas table): areas.elevation_ft stored 6182, one foot off from
-- this DB's own routes.high_point_ft (6181) on wa_mount_christie_west. Wikipedia
-- (6,181 ft NAVD 88) and TopoQuest (6181 ft MSL, NAD83) independently agree on
-- 6,181 ft; SummitPost's 6,177 ft and a stale Wikipedia mirror's 6,183 ft are the
-- only outliers. Correcting areas.elevation_ft to match the two agreeing sourced
-- figures and this route's own already-correct high_point_ft.
UPDATE areas SET elevation_ft = 6181 WHERE id = 'wa_mount_christie';
