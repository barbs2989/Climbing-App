-- WA alpine audit — batch 46 (2026-08-05)
-- Routes: wa_swiss_peak_standard_route (Swiss Peak), wa_tenpeak_mountain_north_couloir,
--         wa_tenpeak_mountain_southeast (Tenpeak Mountain), wa_the_brothers_south_couloir,
--         wa_the_brothers_traverse (The Brothers), wa_the_cave_route (Concord Tower),
--         wa_the_chopping_block_south_route (The Chopping Block / Pinnacle Peak),
--         wa_the_devils_club (Southeast Mox Peak), wa_the_direct_north_ridge_w_gendarme
--         (Mount Stuart), wa_the_hitchhiker (South Early Winters Spire)
-- Researched via 8 parallel agents, one peak-group each. Confirmed fixes below --
-- see audits/wa-alpine-audit-log.md for items independently verified as correct
-- and items flagged for human review rather than auto-fixed.

-- =========================================================================
-- Tenpeak Mountain (wa_tenpeak_mountain) — wa_tenpeak_mountain_southeast
-- =========================================================================

-- wa_tenpeak_mountain_southeast: pitches (3) contradicted this row's own beta
-- text ("the final two pitches involve Class 4 scrambling... followed by a
-- longer pitch...") and its own 2-entry pitch_detail array (Class 4 gully,
-- then a 5.0 face/chimney pitch). No source found describing a 3rd pitch.
UPDATE routes
SET pitches = 2,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: pitches corrected from 3 to 2 -- contradicted this row''s own beta text ("the final two pitches") and its own 2-entry pitch_detail array. No source found for a 3rd pitch.'
WHERE id = 'wa_tenpeak_mountain_southeast'
  AND pitches = 3;

-- =========================================================================
-- The Chopping Block / Pinnacle Peak (wa_the_chopping_block) — wa_the_chopping_block_south_route
-- =========================================================================

-- wa_the_chopping_block_south_route: this row's own `corrections` field already
-- flagged a grade discrepancy (DB: "Grade II-III, 5.4" vs sources: "5.5/Grade II")
-- but the fix was never applied to the actual grade/grade_num/rock_grade columns.
-- Confirmed via Mountaineers.org's route description and corroborating references
-- to Beckey's Cascade Alpine Guide, both citing 5.5/Grade II, 5 pitches. Also
-- fills the null `pitches` field with that sourced pitch count -- this row's own
-- pitch_detail array only enumerates 2 of the 5 documented pitches (access gully
-- plus one representative 5.4 step), which was not expanded since a full pitch-
-- by-pitch breakdown could not be sourced.
UPDATE routes
SET grade = 'Grade II, 5.5',
    grade_num = 5,
    rock_grade = '5.5',
    pitches = 5,
    corrections = 'Grade corrected from "Grade II-III, 5.4" to "Grade II, 5.5" and pitches filled in as 5, per Mountaineers.org''s route description (corroborated by references to Beckey''s Cascade Alpine Guide). This row''s own pitch_detail array still only lists 2 of the 5 documented pitches and needs expansion by a future pass.'
WHERE id = 'wa_the_chopping_block_south_route'
  AND grade = 'Grade II-III, 5.4';

-- =========================================================================
-- Southeast Mox Peak / "Hard Mox" (wa_southeast_mox_peak) — wa_the_devils_club
-- =========================================================================

-- wa_the_devils_club: rope_note said "(23 pitches)", contradicting this row's
-- own top-level `pitches` field (25) and its own fully-detailed 25-entry
-- pitch_detail array (individual grades documented for pitches 1-25, matching
-- the ~25-pitch figure independently found in AAJ/Climbing.com/CascadeClimbers
-- sources). No source found supporting 23 -- corrected to match the internally
-- consistent, more granular pair.
UPDATE routes
SET rope_note = 'Southeast Mox Peak, 2,500ft East Face big-wall alpine route (25 pitches). First ascent placed no bolts and rappelled the route entirely on gear anchors, extremely remote/serious. Full trad rack plus abundant rap-anchor cord essential.'
WHERE id = 'wa_the_devils_club'
  AND rope_note LIKE '%23 pitches%';

-- =========================================================================
-- Mount Stuart (wa_mount_stuart) — wa_the_direct_north_ridge_w_gendarme
-- =========================================================================

-- wa_the_direct_north_ridge_w_gendarme: fa field omitted the North Ridge's
-- actual original first ascent (Don Claunch & John Rupley, Sept 9 1956, who
-- bypassed the Great Gendarme) and mislabeled the 1963 Beckey/Marts ascent as
-- simply "Upper ridge" when multiple sources (American Alpine Institute route
-- profile, SummitPost, Cascades climbing-history writeups) identify it as the
-- first ascent climbing directly over the Great Gendarme, not the ridge's
-- original FA. The 1970 Hargis/Ossiander direct-lower-start credit was already
-- correct and is unchanged.
UPDATE routes
SET fa = 'North Ridge (original line, bypassing the Great Gendarme): Don Claunch & John Rupley, September 9, 1956. First ascent climbing directly over the Great Gendarme: Fred Beckey & Steve Marts, 1963. Direct lower-ridge start variation (from the true toe): Mead Hargis & Jay Ossiander, 1970',
    corrections = 'fa corrected to include the North Ridge''s actual 1956 original ascent (Claunch & Rupley, bypassing the Great Gendarme), previously omitted. 1963 Beckey/Marts re-labeled as the first ascent climbing directly over the Gendarme rather than the route''s original FA, per American Alpine Institute / SummitPost / Cascades climbing-history sources. Rest of the row''s beta was pulled directly from Mountain Project and is unchanged.'
WHERE id = 'wa_the_direct_north_ridge_w_gendarme'
  AND fa LIKE 'Upper ridge: Fred Beckey & Steve Marts, 1963%';
