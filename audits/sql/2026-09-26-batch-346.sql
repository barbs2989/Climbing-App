-- WA alpine/mountaineering audit -- batch 346 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_norton_scramble, wa_mount_olympus_blue_glacier, wa_mount_olympus_west_ridge,
--         wa_mount_persis_the_hexorcist, wa_mount_persis_west_ridge, wa_mount_pilchuck_east_ridge,
--         wa_mount_pilchuck_standard_route, wa_mount_price_hester_lake_route
-- All values below were re-read from the live DB immediately before this file was written;
-- the UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Blue Glacier / Standard Route (wa_mount_olympus_blue_glacier) -- road.status
-- =========================================================================
-- road.status says the Dec 2024 Upper Hoh Road washout's repairs "reopened it in May 2026."
-- The washout and closure date are correct (Jefferson County closed the road Dec 20, 2024
-- after a storm spiked the Hoh River from ~2,600 cfs to over 27,000 cfs in under 24 hours),
-- but the reopening year is wrong by one year: construction began mid-April 2025 and the road
-- reopened to traffic May 8, 2025, with a ribbon-cutting attended by Gov. Ferguson -- confirmed
-- independently via KOMO News and Washington State Standard coverage of the WA-state-funded
-- repair. The sibling wa_mount_olympus_west_ridge route (same Upper Hoh Road approach, audited
-- in this same batch) already has this correct: its own road.status says "access was restored
-- as of May 8, 2025" -- so the two routes sharing one physical road were contradicting each
-- other on when it reopened, and the West Ridge row is the one that matches the outside source.
UPDATE routes SET road = jsonb_set(road, '{status}',
  '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS). The road has a real closure history — storm damage shut it from December 2024 until repairs reopened it in May 2025 — so confirm current NPS road conditions before driving."'::jsonb)
WHERE id = 'wa_mount_olympus_blue_glacier'
  AND road ->> 'status' = 'Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS). The road has a real closure history — storm damage shut it from December 2024 until repairs reopened it in May 2026 — so confirm current NPS road conditions before driving.';

COMMIT;
