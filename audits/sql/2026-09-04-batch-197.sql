-- WA alpine audit — batch 197 (pass 4)
-- Routes: wa_johannesburg_mountain_northeast_buttress, wa_kimtah_peak_scramble,
--         wa_king_kong_gorillas_direct_direct, wa_klawatti_peak_southeast_face,
--         wa_klawatti_peak_sw_buttress, wa_koala_krack, wa_kololo_peaks_standard,
--         wa_kyes_peak_glaciated_scramble

-- wa_king_kong_gorillas_direct_direct: fa field named the FA climber's partner as
-- "Tyree Johnson". AAC Publications ("Mt. Stuart, King Kong") and Sol Wertkin's own
-- trip report (solclimbs.blogspot.com, Oct 2016) both confirm the free-ascent partner
-- on Sept 9, 2016 was Jon Gleason, not Tyree Johnson. The row's own `beta` field
-- already had it right ("First ascent: September 9, 2016 by Sol Wertkin and Jon
-- Gleason") — only `fa` was wrong. Idempotent: only fires if `fa` still holds the
-- pre-correction string.
UPDATE routes
SET fa = 'Sol Wertkin & Jon Gleason, 2016 (freed by Sol Wertkin)'
WHERE id = 'wa_king_kong_gorillas_direct_direct'
  AND fa = 'Sol Wertkin & Tyree Johnson, 2016 (freed by Sol Wertkin)';

-- wa_kyes_peak_glaciated_scramble: loss_ft (707) is far below the geometric floor
-- for this route. The route's own descent_text states plainly that the descent
-- "reverses" the identical south-ridge climbers' trail back down to the same
-- trailhead used on the ascent (no separate loop/alternate line) — so total
-- descent must equal total ascent for the single up-and-down day described by
-- `timing`/`pitch_detail`/`itinerary` (one "Car-to-car ascent" day). gain_ft
-- (6023) already clears the simple net-rise floor from the row's own waypoints
-- (trailhead 1,950 ft -> high_point_ft 7,280 ft = 5,330 ft), so it is used as the
-- source for loss_ft rather than any external figure. Idempotent: only fires if
-- loss_ft still holds the pre-correction value.
UPDATE routes
SET loss_ft = gain_ft
WHERE id = 'wa_kyes_peak_glaciated_scramble'
  AND loss_ft = 707
  AND gain_ft = 6023;
