-- WA alpine audit — batch 372 (2026-10-01, pass 6)
-- Routes: wa_the_direct_north_ridge_w_gendarme (Mount Stuart), wa_the_fin_northeast_face,
-- wa_the_fin_scramble (The Fin), wa_the_hitchhiker (South Early Winters Spire),
-- wa_the_horn_scramble (The Horn), wa_the_incisor_scramble (The Incisor / The Needles),
-- wa_the_monk_le_gibet, wa_the_monk_odine, wa_the_monk_scabo,
-- wa_the_monk_west_cracks_left_crack (The Monk / Cathedral Peak).
-- All WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so each statement is a no-op if the row has already changed.

-- =========================================================================
-- The Horn (wa_the_horn) — area row
-- =========================================================================

-- areas.parent_id is currently 'wa_north_central_olympics', but that region's
-- other peaks (Mount Deception, Mount Mystery, Mount Anderson, Gray Wolf
-- Ridge, Sundial, etc.) all cluster ~30 km north around 47.8 deg N (the
-- Deception-Gray Wolf drainage). The Horn's own stored coordinates
-- (47.558215, -123.321115) instead sit within ~150-600 m of its Southern
-- Olympics siblings The Fin (47.559455, -123.320255), Mount Cruiser
-- (47.564407, -123.315692) and Mount Lincoln (47.550265, -123.327715) --
-- i.e. directly on Sawtooth Ridge in the Mount Skokomish Wilderness. This
-- route's own descent_text also places The Horn immediately adjacent to "The
-- Fin's west face" on the same ridge, and The Mountaineers' own trip-report
-- page ("Sawtooth Ridge: The Fin & The Horn") treats the two as the same
-- Flapjack Lakes/Sawtooth Ridge outing. Corrected parent_id to match its own
-- coordinates and its immediate neighbors.
UPDATE areas SET parent_id = 'wa_southern_olympics'
WHERE id = 'wa_the_horn' AND parent_id = 'wa_north_central_olympics';
