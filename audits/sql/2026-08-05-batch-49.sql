-- WA alpine audit — batch 49 (2026-08-05)
-- Routes: wa_tomyhoi_peak_southeast_ridge (Tomyhoi Peak), wa_tooth_and_claw
--         (Lexington Tower), wa_tooth_chair_traverse (The Tooth), wa_tower_mountain_southwest_route
--         (Tower Mountain), wa_trapper_mountain_north_couloir, wa_trapper_mountain_south_slopes
--         (Trapper Mountain), wa_tricouni_peak_southwest_slopes (Tricouni Peak),
--         wa_true_grit_2 (Vesper Peak)
-- Researched via parallel agents (elevation/FA verification for Tomyhoi/Lexington/Chair
-- Peak; Trapper Mountain approach geography, 2 passes; Tricouni Peak route identity;
-- Vesper Peak elevation). See audits/wa-alpine-audit-log.md for the full writeup,
-- including the significant Trapper Mountain South Slopes contamination that was
-- confirmed but NOT auto-fixed here (needs a human rewrite, not a field patch).
-- Every confirmed fix's "current value" was independently re-verified against a
-- fresh full-row fetch of the live DB before this file was written. All WHERE
-- clauses include the current (wrong) value as a safety check per project convention.

-- =========================================================================
-- Vesper Peak (wa_vesper_peak) — elevation outlier resolved in favor of the
-- majority EXTERNAL source (Wikipedia + Peakbagger.com + USGS-derived topo,
-- all 6,221 ft), not the majority IN-DB value. wa_true_grit_2's high_point_ft
-- (6,221 ft) already carried this correct figure with its own `corrections`
-- field explaining the Wikipedia/Peakbagger-vs-Mountain-Project split; the
-- area row and its other 3 routes had never been updated to match. Verified
-- independently this pass: Wikipedia and Peakbagger.com both list 6,221 ft;
-- Mountain Project's area page is the outlier at 6,214 ft.
-- =========================================================================

UPDATE areas SET elevation_ft = 6221,
  blurb = replace(blurb, 'Vesper Peak (6,214 ft)', 'Vesper Peak (6,221 ft)')
WHERE id = 'wa_vesper_peak' AND elevation_ft = 6214;

UPDATE routes SET high_point_ft = 6221
WHERE id = 'wa_ragged_edge' AND high_point_ft = 6214;

UPDATE routes SET high_point_ft = 6221
WHERE id = 'wa_vesper_peak_north_face_ragged_edge' AND high_point_ft = 6214;

UPDATE routes SET high_point_ft = 6221
WHERE id = 'wa_fish_whistle' AND high_point_ft = 6214;

-- No other confirmed errors this batch. wa_tomyhoi_peak_southeast_ridge,
-- wa_tooth_chair_traverse, wa_tower_mountain_southwest_route, and
-- wa_trapper_mountain_north_couloir all audited clean against external
-- sources. wa_tooth_and_claw's null high_point_ft was checked and left
-- alone -- see log for why filling it with Lexington Tower's true-summit
-- elevation (7,560 ft) would likely be wrong. wa_tricouni_peak_southwest_slopes
-- and wa_trapper_mountain_south_slopes have real, significant open questions
-- but no confirmed, safely-sourced field-level fix -- both flagged in the
-- log rather than patched here.
