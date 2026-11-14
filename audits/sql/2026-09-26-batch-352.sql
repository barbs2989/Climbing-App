-- WA alpine/mountaineering audit -- batch 352 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_stuart_the_gendarme, wa_mount_stuart_west_ridge,
--         wa_mount_teneriffe_kamikaze_trail, wa_mount_teneriffe_standard_route,
--         wa_mount_terror_north_face, wa_mount_terror_southeast_face,
--         wa_mount_terror_stoddard_buttress, wa_mount_terror_west_ridge
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount Teneriffe, Kamikaze Trail (wa_mount_teneriffe_kamikaze_trail) -- waypoints
-- =========================================================================
-- The waypoints array lists the SAME physical point (Teneriffe/Kamikaze Falls,
-- 47.50209/-121.70807, 2633 ft) twice, with two disagreeing distances from the
-- trailhead: 2.4 mi ("Teneriffe Falls (Kamikaze Falls)", type Junction) and 2.8 mi
-- ("Teneriffe Falls / Kamikaze Trail junction", type landmark). This row's own
-- `approach` text states the falls junction is reached "at about 2.8 miles",
-- matching the second entry -- so the 2.4 mi entry is a stray duplicate. Removing it.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
  WHERE NOT (
    elem ->> 'name' = 'Teneriffe Falls (Kamikaze Falls)'
    AND elem ->> 'type' = 'Junction'
    AND (elem ->> 'distMi')::numeric = 2.4
  )
)
WHERE id = 'wa_mount_teneriffe_kamikaze_trail'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(waypoints) e
    WHERE e ->> 'name' = 'Teneriffe Falls (Kamikaze Falls)'
      AND e ->> 'type' = 'Junction'
      AND (e ->> 'distMi')::numeric = 2.4
  );

-- =========================================================================
-- Mount Teneriffe, Standard Route (wa_mount_teneriffe_standard_route) -- waypoints
-- =========================================================================
-- Same bug, same falls point: duplicate entries at 2.7 mi ("Teneriffe Falls
-- (Kamikaze Falls)", type Junction) and 2.8 mi ("Teneriffe Falls (aka Kamikaze
-- Falls)", type landmark). This row's own `approach` text also gives "roughly
-- 2.8 miles" for the falls spur -- removing the 2.7 mi duplicate.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
  WHERE NOT (
    elem ->> 'name' = 'Teneriffe Falls (Kamikaze Falls)'
    AND elem ->> 'type' = 'Junction'
    AND (elem ->> 'distMi')::numeric = 2.7
  )
)
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(waypoints) e
    WHERE e ->> 'name' = 'Teneriffe Falls (Kamikaze Falls)'
      AND e ->> 'type' = 'Junction'
      AND (e ->> 'distMi')::numeric = 2.7
  );

-- =========================================================================
-- Mount Terror, North Face / North Buttress (wa_mount_terror_north_face) -- comms
-- =========================================================================
-- This row's `comms` field claims "a call from the summit area was critical in a
-- 2009 rescue after a rockfall accident on this face" (i.e. the original 1961
-- North Buttress line). That 2009 rockfall/rescue (Steve Trent, femur fracture,
-- July 2009) actually happened during an attempt on the Stoddard Buttress route,
-- per National Parks Traveler's contemporaneous coverage and Steph Abegg's own
-- trip report of the incident -- not on this route. Removing the misattributed
-- anecdote; the general cell-coverage claim (reachable near the summit) still
-- holds and is left in place.
UPDATE routes
SET comms = 'Cell service is largely absent in the Terror Basin/Crescent Creek cirques, but has been reported reachable from near the summit.'
WHERE id = 'wa_mount_terror_north_face'
  AND comms = 'Cell service is largely absent in the Terror Basin/Crescent Creek cirques, but has been reported reachable from near the summit — a call from the summit area was critical in a 2009 rescue after a rockfall accident on this face.';

-- =========================================================================
-- Mount Terror, Stoddard Buttress (wa_mount_terror_stoddard_buttress) -- comms
-- =========================================================================
-- Moving the corrected 2009 rescue detail here, since it belongs to this route:
-- Steve Trent fell ~60 ft and fractured his femur on the Stoddard Buttress in
-- July 2009; a call placed from near the summit while continuing upward to find
-- signal was critical to the rescue (National Parks Traveler, "Mount Terror
-- Lives Up To Its Name"; Steph Abegg trip report of the same trip/accident).
UPDATE routes
SET comms = 'No reliable cell coverage in the McMillan/Crescent Creek basins; carry a satellite communicator/PLB. Cell service has been reported reachable from near the summit — a call placed from there was critical to the July 2009 rescue after a rockfall injury on this route.'
WHERE id = 'wa_mount_terror_stoddard_buttress'
  AND comms = 'No reliable cell coverage in the McMillan/Crescent Creek basins; carry a satellite communicator/PLB.';

COMMIT;
