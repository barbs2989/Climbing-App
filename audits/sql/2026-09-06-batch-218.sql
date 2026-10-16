-- WA alpine audit -- batch 218 (2026-09-06, pass 4)
-- Routes: wa_mount_stuart_the_gendarme, wa_mount_stuart_west_ridge,
-- wa_mount_teneriffe_kamikaze_trail, wa_mount_teneriffe_standard_route,
-- wa_mount_terror_north_face, wa_mount_terror_southeast_face,
-- wa_mount_terror_stoddard_buttress, wa_mount_terror_west_ridge,
-- wa_mount_thomson_west_ridge, wa_mount_tom_scramble.
-- Each WHERE clause includes the current (wrong) value as a safety check.
-- Apply each UPDATE individually.
--
-- Re-audit (pass 4) of routes covered in pass 3 (2026-08-27, batches
-- 153-154). Two pass-3 fixes are STILL unapplied and are not repeated here:
-- see audits/sql/2026-08-27-batch-153.sql (Stuart summit waypoint lng on
-- the_gendarme/north_face; Teneriffe I-90 Exit 31->32) and
-- audits/sql/2026-08-27-batch-154.sql (Terror gain_ft 6000->7551, all 4
-- routes). Re-verified against fresh sources this run; still needed.

-- Mount Stuart West Ridge: dist_km (32.2 km, ~40mi RT per this app's
-- dist_km*2 convention) is far above what the row's own waypoint chain
-- supports. Esmeralda Basin Trailhead (distMi 0) -> Longs Pass -> ridge
-- crest -> summit waypoint at distMi 6 = 6.0 mi = 9.66 km one-way,
-- mechanically derived from the row's own data. External trip reports
-- (Trailforks et al.) independently give ~10-11 mi round trip via this
-- exact trailhead/Longs Pass approach (~5-5.5 mi one-way), the same order
-- of magnitude, not ~40 mi RT. gain_ft (5175) already matches this
-- trailhead's net rise (9415-4243=5172 ft) and is untouched. Corrected to
-- 9.7, the row's own waypoint-derived one-way mileage.
UPDATE routes
SET dist_km = 9.7
WHERE id = 'wa_mount_stuart_west_ridge'
  AND dist_km = 32.2
  AND high_point_ft = 9415;

-- Mount Terror North Face: flagged, not fixed, in pass 3 (batch 154) for
-- lack of a specific value -- 28.97 km (~36mi RT) looked roughly double an
-- external ~19-mi-RT trip report but no mechanically-derived number was
-- available. The row's own waypoint chain supplies one: Goodell Creek
-- Trailhead (distMi 0, 600 ft) through the Terror Basin notch/bivy/glacier
-- crossing and 5.7 crux to the summit waypoint at distMi 8 = 8.0 mi = 12.87
-- km one-way, computed from the row's own recorded mileage. Far closer to
-- the external ~19-mi-RT figure (~9.5 mi/15.3 km one-way) than the stored
-- 28.97 km; both independent lines agree the stored value is roughly
-- double what it should be. Corrected to 12.9, the row's own
-- waypoint-derived mileage.
UPDATE routes
SET dist_km = 12.9
WHERE id = 'wa_mount_terror_north_face'
  AND dist_km = 28.97
  AND high_point_ft = 8151;
