-- WA alpine/mountaineering audit -- batch 347 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_mount_pugh_pika_slab, wa_mount_rahm_standard, wa_mount_rainier_curtis_ridge,
--         wa_mount_rainier_disappointment_cleaver, wa_mount_rainier_edmunds_headwall,
--         wa_mount_rainier_emmons_glacier, wa_mount_rainier_fuhrer_finger,
--         wa_mount_rainier_fuhrer_thumb
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Mount Pugh, Pika Slab (wa_mount_pugh_pika_slab) -- road.status, access.closures
-- =========================================================================
-- Both fields presented the Dec 19, 2025 Mountain Loop Highway storm closure (landslide damage,
-- worst at a Shoofly Curve mudslide, ~$3.65M) as the still-current state, framed as ongoing
-- "as of April 2026". That is now stale: the Town of Darrington and Snohomish County's own Roads
-- Update both confirm the highway was fully reopened by mid-May 2026, and it remained open as of
-- September 2026 search results, with only unrelated single-lane closures for fiber-line
-- installation work reported since. The standing seasonal Deer Creek-Bedal winter gate is
-- unaffected and is kept in both fields.
UPDATE routes SET road = jsonb_set(road, '{status}',
  '"Mount Baker-Snoqualmie National Forest closed the Mountain Loop Highway in several sections between Granite Falls and Darrington after a December 19, 2025 storm, with the worst damage a mudslide at Shoofly Curve (~$3.65 million). The highway fully reopened by mid-May 2026 and remained open as of September 2026, with only unrelated single-lane closures for fiber-line installation work reported since. Separately, the Mountain Loop Highway still closes seasonally each winter between Deer Creek and Bedal Campground. Verify the current status on the Mt. Baker-Snoqualmie alerts page or with the Darrington Ranger Station before committing to the drive."'::jsonb)
WHERE id = 'wa_mount_pugh_pika_slab'
  AND road ->> 'status' = 'Access has been seriously disrupted. Mount Baker-Snoqualmie National Forest issued a Mountain Loop Highway closure alert on 19 December 2025 for landslide and storm damage, and as of February 2026 the highway was closed in several sections between Granite Falls and Darrington with the worst damage a mudslide at Shoofly Curve, estimated at around $3.65 million; the Forest Service also reports that access into the Glacier Peak Wilderness is extremely limited as of April 2026 because of the same December 2025 storm event. Verify the current status on the Mt. Baker-Snoqualmie alerts page or with the Darrington Ranger Station before committing to the drive.';

UPDATE routes SET access = jsonb_set(access, '{closures}',
  '"The December 19, 2025 storm closed the Mountain Loop Highway in several sections between Granite Falls and Darrington, with the worst damage a mudslide at Shoofly Curve (~$3.65 million). The highway fully reopened by mid-May 2026 and remained open as of September 2026, aside from unrelated single-lane fiber-line-installation closures. Separately, the Mountain Loop Highway closes seasonally each winter between Deer Creek and Bedal Campground. Check the Mt. Baker-Snoqualmie alerts page before travelling."'::jsonb)
WHERE id = 'wa_mount_pugh_pika_slab'
  AND access ->> 'closures' = 'Mountain Loop Highway closure alert opened 19 December 2025 for landslide/storm damage, with multiple sections closed between Granite Falls and Darrington as of February 2026 and the worst damage at Shoofly Curve. The Forest Service reported in April 2026 that access into the Glacier Peak Wilderness remains extremely limited because of road and trail damage from that storm. Separately, the Mountain Loop Highway closes seasonally each winter between Deer Creek and Bedal Campground. Check the Mt. Baker-Snoqualmie alerts page before travelling.';

-- =========================================================================
-- Mount Rainier, Edmunds Headwall (wa_mount_rainier_edmunds_headwall) -- access.fees
-- =========================================================================
-- $82 is the correct 2026 Climbing Cost Recovery Fee, but the row labeled it "(2024)" -- 2024's
-- rate was lower and 2025's was $70; $82 is the 2026 figure. Its own sibling rows on this same
-- peak (Disappointment Cleaver, Emmons-Winthrop, Fuhrer Finger, audited this same batch) already
-- carry the correct label and near-identical wording; this row is brought in line with them.
UPDATE routes SET access = jsonb_set(access, '{fees}',
  '"$82 per person per climb - Climbing Cost Recovery Fee (2026 rate). It is charged per climb, not per season. Separate from the park entrance fee."'::jsonb)
WHERE id = 'wa_mount_rainier_edmunds_headwall'
  AND access ->> 'fees' = '$82/climber climbing cost-recovery fee (2024) plus entrance fee';

-- =========================================================================
-- Mount Rainier, Fuhrer Thumb (wa_mount_rainier_fuhrer_thumb) -- access.fees, access.permit,
-- access.closures
-- =========================================================================
-- Three fields on this row were stale/self-contradictory relative to its own sibling routes on
-- the same peak, audited in the same batch:
--  * fees: same "(2024)" stale-year issue as Edmunds Headwall above -- $82 is the 2026 rate.
--  * permit: said "Free climbing permit at Paradise WIC", directly contradicted by this row's own
--    $82 fees field and inconsistent with siblings, which correctly call it the "Mount Rainier
--    Climbing Permit" (a paid climbing registration, not a free permit).
--  * closures: said "Paradise corridor sometimes uses timed-entry reservations in peak summer";
--    NPS's own Jan 2026 release ("Mount Rainier National Park Will Not Require Timed Entry
--    Reservations in 2026") confirms no timed-entry reservation is in effect for 2026, which
--    siblings' access.notes already state correctly.
UPDATE routes SET access = jsonb_set(
  jsonb_set(
    jsonb_set(access, '{fees}',
      '"$82 per person per climb - Climbing Cost Recovery Fee (2026 rate). It is charged per climb, not per season. Separate from the park entrance fee."'::jsonb),
    '{permit}', '"Mount Rainier Climbing Permit"'::jsonb),
  '{closures}', '"None specific to this route. No timed-entry vehicle reservation is in effect for the 2026 season."'::jsonb)
WHERE id = 'wa_mount_rainier_fuhrer_thumb'
  AND access ->> 'fees' = '$82/climber climbing cost-recovery fee (2024) plus entrance fee'
  AND access ->> 'permit' = 'Free climbing permit at Paradise WIC'
  AND access ->> 'closures' = 'None specific to this route; Paradise corridor sometimes uses timed-entry reservations in peak summer';

COMMIT;
