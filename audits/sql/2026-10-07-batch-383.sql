-- WA alpine/mountaineering audit -- batch 383 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_beckey_tate, wa_beyond_redlining, wa_big_chiwaukum_mount_temple_ridge,
--         wa_big_chiwaukum_three_musketeers_ridge, wa_big_craggy_peak_scramble,
--         wa_big_four_mountain_northwest_ridge, wa_big_four_mountain_spindrift_couloir,
--         wa_big_four_mountain_tower_route
-- All values below were re-read from the live DB immediately before this file was written;
-- the UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Big Four Mountain, Spindrift Couloir (wa_big_four_mountain_spindrift_couloir)
-- max_angle wrong -- contradicted by the route's own other fields and by the
-- primary source
-- =========================================================================
-- max_angle is stored as 90, but the AAC Publications first-ascent note for this
-- route ("On March 2, Bart Paull and Doug Littauer climbed a new route, the
-- Spindrift Couloir (4,000 feet, IV+ 5.9 95 degrees) on the north face of Big
-- Four Mountain") states 95 degrees. This row's own `gear` field ("sustained
-- thin ice up to roughly WI5/95 degrees") and `pitch_detail` crux entry
-- ("80-95 degrees") already say 95 -- so 90 is also an internal inconsistency
-- within the row itself, not just a source mismatch.
UPDATE routes SET max_angle = 95
WHERE id = 'wa_big_four_mountain_spindrift_couloir'
  AND max_angle = 90;

COMMIT;

-- =========================================================================
-- Flagged for human review (no SQL -- genuinely unresolved, not guessed):
-- =========================================================================
-- wa_beckey_tate -- grade stored 5.9+ vs. stephabegg.com's trip report/route title,
--   which gives plain "5.9" (already noted in this row's own data_quality.gaps as a
--   deliberate modern-vs-older-source choice; nothing new found to adjudicate it).
--   aspect "S" also disagrees with stephabegg's "SE-facing wall," though AAC
--   Publications and skisickness.com both independently call it "south face" --
--   genuine naming-convention disagreement between reputable sources, not a clear
--   error. Exact FA date "May 29, 1967" could not be confirmed or refuted beyond the
--   year 1967, which every source agrees on -- needs a primary Beckey-guide check.
-- wa_beyond_redlining -- the row calls the formation "Vega North Tower (Eros Tower)".
--   "Vega North Tower" is corroborated by an independent Mountain Project photo
--   caption, but "Eros Tower" surfaced only via AI-synthesized search summaries with
--   no direct source quote behind it -- recommend pulling the actual Mountain Project
--   page before trusting that parenthetical. Separately, this row's own `season`
--   ("Jun-Sep") is internally inconsistent with its own `seasonal_guidance.
--   monthBreakdown`, which rates June "marginal" and gives the real window as
--   mid-July-mid-September (matching `best_season`) -- a self-contradiction worth
--   tightening, not an external-source error.
-- wa_big_chiwaukum_mount_temple_ridge / wa_big_chiwaukum_three_musketeers_ridge --
--   both rows are empty stubs (every field null except id/area_id/name/discipline/
--   auto_generated/classic/name_search), so there is nothing stored to confirm or
--   refute. Neither "Mount Temple Ridge" nor "Three Musketeers Ridge" could be found
--   documented as a named route on Big Chiwaukum in any source reachable by search
--   (SummitPost's Big Chiwaukum pages list only "West Route" and "East Route"); both
--   names exist elsewhere in WA climbing literature attached to different peaks
--   (Stuart Range / Enchantments area), so this may be a real but obscure Beckey-guide
--   line, or a name mix-up -- needs someone with the physical Cascade Alpine Guide or
--   direct Mountain Project access to confirm before any enrichment builds on these
--   names. Separately, Big Chiwaukum's elevation has two source-level values in
--   circulation (8,081 ft per WTA/Mountaineers, matching the stored areas row, vs.
--   8,098 ft per Wikipedia/PeakVisor/ListsOfJohn) -- looks like contour-estimate vs.
--   spot-elevation rather than a typo; not changed without a LIDAR/USGS source.
-- wa_big_craggy_peak_scramble -- access.rules cites a "campfires prohibited above
--   5,000 ft" rule for the Pasayten Wilderness. Multiple USFS Okanogan-Wenatchee
--   sources found via search attach that specific elevation-based ban to the Alpine
--   Lakes Wilderness, not Pasayten -- no source found either confirms or denies a
--   Pasayten-specific version of the rule. May be a conflation with Alpine Lakes;
--   needs a direct check of the current Okanogan-Wenatchee NF wilderness-regulations
--   page before trusting this line.
-- wa_big_four_mountain_northwest_ridge / wa_big_four_mountain_tower_route -- shared
--   peak elevation 6170 ft falls within the normal spread of published figures
--   (Wikipedia gives "6,160+ ft"; other secondary sources ~6,135 ft) but no single
--   source nails 6170 exactly -- not a confident error. Tower Route's FA ("Ben
--   Guydelkon and Ron Miller, July 25, 1972") and overall grade "5.7" could not be
--   corroborated against any source found. Tower Route's `aspect`/`face` are stored
--   as "N"/"North Face (rock towers)", but independent sources (SummitPost's main
--   Big Four page, sverdina.com) consistently place this route on the NE Ridge, not
--   the North Face -- the row's own overview/approach text already hedges with
--   "north side/NE ridge," so the structured `aspect` field may be flattening a more
--   specific fact. Also, Tower Route's `length_m` (1219) is identical to Spindrift
--   Couloir's figure -- the measured height of the full North Face -- even though
--   the Tower Route is a shorter, distinct line over three towers; looks like it may
--   have been copy-pasted rather than route-specific, though no source gives an exact
--   length for the Tower Route to confirm or refute this. None of the three routes
--   contradict each other on the boilerplate facts they share (trailhead, access
--   fees, land manager, ice-cave closure, summit coordinates).
