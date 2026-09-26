-- WA alpine/mountaineering audit -- batch 349 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_rainier_sunset_ridge, wa_mount_rainier_tahoma_glacier,
--         wa_mount_rainier_willis_wall, wa_mount_redoubt_south_face,
--         wa_mount_sefrit_bloody_head_couloir, wa_mount_sefrit_southeast_ridge,
--         wa_mount_shuksan_fisher_chimneys, wa_mount_shuksan_hanging_glacier
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount Rainier, Willis Wall (wa_mount_rainier_willis_wall) -- lat/lng
-- =========================================================================
-- Stored coordinates (46.8529, -121.76047) are essentially the mountain's summit-crater
-- coordinates (matches this same catalog's own approach_logistics.peakLat/peakLng for the
-- whole mountain, 46.8528/-121.7603) -- not the location of Willis Wall itself, which is the
-- north-face headwall of the Carbon Glacier cirque, roughly 1.2 mi north of the summit.
-- Willis Wall's own GNIS/Wikipedia/Wikidata coordinates: 46.8703855N, 121.7589858W
-- (GNIS Feature ID 1528182).
UPDATE routes SET lat = 46.8704, lng = -121.7590
WHERE id = 'wa_mount_rainier_willis_wall'
  AND lat = 46.8529 AND lng = -121.76047;

-- =========================================================================
-- Mount Rainier, Tahoma Glacier (wa_mount_rainier_tahoma_glacier) -- access.notes
-- =========================================================================
-- access.notes claimed "Northwest Forest Pass required ($5/day or $30/annual). No specific
-- climbing permit." -- self-contradicted by this same row's own access.parking_pass ("Northwest
-- Forest Pass does not apply inside the park"), access.permit ("Mount Rainier Climbing Permit"),
-- and access.overnight_permit (climbing registration required above 10,000 ft/on glaciers --
-- this route summits at 14,406+ ft). Northwest Forest Pass is a US Forest Service pass and does
-- not apply inside Mount Rainier National Park; the sibling Sunset Ridge/Willis Wall rows for the
-- same park correctly omit it. Replaced with wording consistent with those sibling rows.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"NPS entrance pass or America the Beautiful annual pass required for park entry (Northwest Forest Pass does not apply inside the park). Climbing registration and fee required above 10,000 ft or on any glacier, per access.permit / access.overnight_permit."'::jsonb)
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND access ->> 'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.';

COMMIT;
