-- WA alpine audit, batch 552 (pass 8)
-- wa_whistler_mountain_north_ridge (Whistler Mountain, Washington Pass / Okanogan): high_point_ft
-- is stored as 7792, but the route's own "Whistler Mountain summit" waypoint already carries
-- elev: 7790, and the areas table's own elevation_ft for wa_whistler_mountain_okanogan is also
-- 7790 -- matching the figure Wikipedia most commonly cites for this peak (7,790 ft; a lower
-- USGS-quad-derived figure of 7,769 ft also circulates, but it is the outvoted minority reading
-- and isn't what the row's own other two fields agree on). high_point_ft was the one field left
-- on a different number than the row's own waypoint and the parent area record. Fixing it to
-- match what the rest of the row (and the area) already say.
UPDATE routes SET high_point_ft = 7790 WHERE id = 'wa_whistler_mountain_north_ridge';
