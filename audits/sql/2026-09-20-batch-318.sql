-- WA alpine audit batch 318 (pass 6)
-- Routes: wa_diamond_in_the_rough, wa_direct_north_buttress,
--         wa_direct_southwest_buttress, wa_direct_west_face, wa_dolphin_chimney,
--         wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer,
--         wa_dorado_needle_east_ridge
--
-- All four statements below are gated on the exact live value, re-checked
-- directly against the table immediately before this file was written.
--
-- OPERATIONAL NOTE, restated once more (see batches 248/249/250/317 and the
-- log entry for detail): the accumulated concern that audit SQL is not
-- reliably applied to the live DB was not independently re-checked this
-- batch (no time spent re-verifying batches 315-317's application status),
-- but nothing here should be read as evidence the backlog has cleared.

-- =========================================================================
-- Dome Peak -- area row, not a single route (shared by wa_dome_peak_dome_glacier
-- and wa_dome_peak_indian_summer, both already correct at 8920 ft)
-- FINDING: areas.elevation_ft (8926) disagrees with BOTH of the peak's own
-- route rows (high_point_ft: 8920 on each) and with external sourcing.
-- Wikipedia's Dome Peak article states "8,920+ ft (2,720+ m)"; the FA date
-- on both route rows (George Freed and Eric Larson, August 1, 1936) matches
-- Wikipedia exactly, corroborating the same source family. mountain-forecast
-- lists 2719m (~8921 ft), consistent with 8920. No source found for 8926.
-- The route rows are left untouched -- they already carry the correct figure.
UPDATE areas
SET elevation_ft = 8920
WHERE id = 'wa_dome_peak'
  AND elevation_ft = 8926;

-- =========================================================================
-- Bear Mountain, Direct North Buttress -- wa_direct_north_buttress
-- FINDING: ice_grade stored "WI5+" (sustained vertical-to-overhanging water
-- ice), which is unsupported by and directly inconsistent with every other
-- field on this row: gear calls for only "crampons, lightweight ice axe
-- (helpful for a steep snow section near the route base, not mandatory)",
-- and every external source found (Mountain Project, StephAbegg's neighboring
-- trip report on the same buttress, a WebSearch specifically for ice/WI5
-- content on this route) describes this as a 21-pitch ROCK route (5.10-,
-- Grade V) with, at most, a low-angle "pocket glacier" crossing done in
-- crampons using flat-footing (French) technique on the approach -- nothing
-- resembling a graded vertical ice pitch. No source supports any ice grade
-- for this route. Nulled rather than guessed at a replacement value.
UPDATE routes
SET ice_grade = NULL
WHERE id = 'wa_direct_north_buttress'
  AND ice_grade = 'WI5+';

-- =========================================================================
-- Pernod Spire, Direct West Face -- wa_direct_west_face
-- FINDING: alpine_grade stored "UIAA VII+", which is not a commitment grade
-- (this app's alpine_grade convention, confirmed by every sibling route in
-- this batch, holds either an NCCS roman-numeral commitment grade matching
-- the `commitment` column, or the F/PD/AD/D/TD/ED alpine-adjective scale --
-- never a UIAA rock-difficulty grade). Mountain Project's own multi-scale
-- grade string for this exact route ("5.10+ 6b+ 21 VII+ 20 E3 5b R") shows
-- "VII+" is simply the UIAA-scale equivalent of the YDS 5.10+ already stored
-- in rock_grade -- a duplicate of the rock grade in a second scale, sitting
-- in the wrong column. The row's own `commitment` field already holds the
-- correct value ("III/IV"); alpine_grade is brought into agreement with it,
-- matching how every other route in this batch stores the two fields.
UPDATE routes
SET alpine_grade = 'III/IV'
WHERE id = 'wa_direct_west_face'
  AND alpine_grade = 'UIAA VII+'
  AND commitment = 'III/IV';

-- =========================================================================
-- Dorado Needle, East Ridge / Inspiration Glacier -- wa_dorado_needle_east_ridge
-- FINDING: fa field carries a self-applied uncertainty hedge, "(this
-- attribution is not certain)", on a fact that is independently confirmed.
-- Wikipedia's Dorado Needle article states the identical four-person FA
-- party and identical date without qualification: "Joan and Joe Firey, Hans
-- Hoesli, Dave Knudson and Peter Renz on July 4, 1971." Removing the hedge
-- now that a reliable secondary source corroborates it verbatim.
UPDATE routes
SET fa = 'Joan and Joe Firey, Hans Hoesli, Dave Knudson, and Peter Renz — July 4, 1971'
WHERE id = 'wa_dorado_needle_east_ridge'
  AND fa = 'Joan and Joe Firey, Hans Hoesli, Dave Knudson, and Peter Renz — July 4, 1971 (this attribution is not certain)';
