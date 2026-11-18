-- WA alpine/mountaineering audit -- batch 357 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_northwest_mox_peak_standard, wa_northwest_ridge, wa_northwest_ridge_2,
--         wa_nw_face_var_remsberg_variation, wa_nw_ridge_2,
--         wa_old_guard_peak_east_side_route, wa_old_guard_peak_southwest_route,
--         wa_old_snowy_mountain_r1
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Northwest Ridge, Dorado Needle (wa_northwest_ridge)
-- -- top-level gain_ft/loss_ft disagree with this route's own itinerary breakdown
-- =========================================================================
-- gain_ft/loss_ft are stored as 7000/7000, but this route's own itinerary.days[]
-- breakdown sums to exactly 6400 ft gain and 6400 ft loss (day1 gainFt 5300, day2
-- gainFt 1100/lossFt 1100, day3 lossFt 5300), and the route's own
-- itinerary.totalNote explicitly states "~14 mi, ~6,400 ft total gain" -- two
-- independent parts of this row's own data agree on 6400; nothing on the row
-- supports 7000. Syncing the top-level summary columns to the row's own detail.
UPDATE routes SET gain_ft = 6400
WHERE id = 'wa_northwest_ridge'
  AND gain_ft = 7000;

UPDATE routes SET loss_ft = 6400
WHERE id = 'wa_northwest_ridge'
  AND loss_ft = 7000;

-- =========================================================================
-- NW Face Var. (Remsberg Variation), Liberty Bell Mountain (wa_nw_face_var_remsberg_variation)
-- -- short `descent` field undercounts rappels vs this route's own rappels/rope fields
-- =========================================================================
-- The short `descent` field says "2 single-rope rappels," but this contradicts the
-- route's own `rappels` field ("3") and its own `descent_text`, which spells out the
-- sequence: a downclimb, then a tree-anchor single-rope rappel, then a bolted
-- double-rope-rated rappel done as two single-rope raps (this route's own
-- rope_type is "single" with no second rope) -- giving 1 + 2 = 3 total single-rope
-- rappels, matching `rappels: "3"`. The `descent` field is the outlier; syncing it
-- to what the row's other fields (`rappels`, `rope_type`/`rope_length_m`,
-- `descent_text`) already agree on. Pure internal-consistency fix, no external
-- source needed.
UPDATE routes SET descent = 'Standard Liberty Bell descent — 3 single-rope rappels from fixed anchors to the Liberty-Concord notch'
WHERE id = 'wa_nw_face_var_remsberg_variation'
  AND descent = 'Standard Liberty Bell descent — 2 single-rope rappels from fixed anchors to the Liberty-Concord notch';

-- =========================================================================
-- Northwest Ridge / PCT approach, Old Snowy Mountain (wa_old_snowy_mountain_r1)
-- -- loss_ft disagrees with gain_ft on a same-trail out-and-back
-- =========================================================================
-- This is a car-to-car out-and-back on the same trail (approach text: "round trip
-- is roughly 15.5 miles"; bail/descent_text confirm the descent reverses the
-- ascent line), so total loss must equal total gain. The route's own gain_ft
-- (3600) and its own itinerary.days[0].lossFt (3600) already agree with each
-- other; loss_ft at 3100 is the sole outlier. Syncing loss_ft to the value two of
-- this row's own sibling fields already establish.
UPDATE routes SET loss_ft = 3600
WHERE id = 'wa_old_snowy_mountain_r1'
  AND loss_ft = 3100
  AND gain_ft = 3600;

COMMIT;
