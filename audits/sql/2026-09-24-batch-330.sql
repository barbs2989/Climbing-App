-- WA alpine audit batch 330 (pass 6)
-- Routes: wa_king_kong_gorillas_direct_direct, wa_klawatti_peak_southeast_face,
--         wa_klawatti_peak_sw_buttress, wa_koala_krack, wa_kololo_peaks_standard,
--         wa_kyes_peak_glaciated_scramble, wa_kyes_peak_northeast_ridge, wa_labor_pains

-- =========================================================================
-- Mount Stuart, King Kong - Gorillas Direct Direct -- wa_king_kong_gorillas_direct_direct
-- =========================================================================
-- The row contradicted itself: `fa` named Sol Wertkin's partner on the Sept 9, 2016 first
-- free ascent as "Tyree Johnson", while the row's own `beta` field said "First ascent:
-- September 9, 2016 by Sol Wertkin and Jon Gleason" for the same climb. Verified against
-- Wertkin's own trip report/blog post on this specific route and the AAC Publications
-- article "Mt. Stuart, King Kong" -- both independently name Jon Gleason as the Sept 9,
-- 2016 partner. Tyree Johnson does appear in Mount Stuart climbing history tied to
-- Wertkin (a headwall-crack pitch during the multi-year King Kong project, and separately
-- an Ulrich's Couloir splitboard descent), but no source ties him to this send -- he was
-- the wrong name in the wrong field. Correcting `fa` to match what `beta` already had right.
UPDATE routes
SET fa = 'Sol Wertkin & Jon Gleason, September 9, 2016'
WHERE id = 'wa_king_kong_gorillas_direct_direct'
  AND fa = 'Sol Wertkin & Tyree Johnson, 2016 (freed by Sol Wertkin)';
