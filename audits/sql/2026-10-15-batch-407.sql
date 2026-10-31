-- Batch 407 (Pass 7) -- Gunrunner / Gunsight Peak Standard Route (Gunsight Range,
-- filed under Middle Peak), Guye Peak x4, Hadley Peak x2.
-- Run `npm run check:sql -- fix.sql` against this file before applying, per
-- docs/codebase/hand-written-sql.md.

-- 1. wa_gunsight_peak_standard: the glacier west of Gunsight Peak is misspelled
-- "Chikamin" (missing the second "g") throughout most of this row's prose/JSON
-- fields, while one field (obj_haz) already has it right. USGS/GNIS, Wikipedia, and
-- the AAC's own account of the sibling route (Gunrunner, below) all consistently
-- spell it "Chickamin". Mechanical substring replace across every column that
-- carries the misspelling on this row; the word has no other legitimate meaning to
-- collide with.
UPDATE routes
SET
  overview = replace(overview, 'Chikamin', 'Chickamin'),
  turnaround = replace(turnaround, 'Chikamin', 'Chickamin'),
  descent = replace(descent, 'Chikamin', 'Chickamin'),
  approach = replace(approach, 'Chikamin', 'Chickamin'),
  descent_text = replace(descent_text, 'Chikamin', 'Chickamin'),
  best_season = replace(best_season, 'Chikamin', 'Chickamin'),
  hazards = (SELECT array_agg(replace(h, 'Chikamin', 'Chickamin')) FROM unnest(hazards) h),
  waypoints = replace(waypoints::text, 'Chikamin', 'Chickamin')::jsonb,
  timing = replace(timing::text, 'Chikamin', 'Chickamin')::jsonb,
  pro_tips = replace(pro_tips::text, 'Chikamin', 'Chickamin')::jsonb,
  watch_out = replace(watch_out::text, 'Chikamin', 'Chickamin')::jsonb,
  itinerary = replace(itinerary::text, 'Chikamin', 'Chickamin')::jsonb,
  emergency = replace(emergency::text, 'Chikamin', 'Chickamin')::jsonb,
  approach_variants = replace(approach_variants::text, 'Chikamin', 'Chickamin')::jsonb,
  bivy = replace(bivy::text, 'Chikamin', 'Chickamin')::jsonb
WHERE id = 'wa_gunsight_peak_standard'
  AND overview LIKE '%Chikamin%';

-- 2. wa_gunrunner (same Gunsight massif, sibling traverse route): the same glacier
-- name is independently misspelled "Chikamin" in this row's own `bail` field, found
-- via the same name search rather than a full re-audit of this route this pass (it
-- was otherwise checked clean in batch 407's companion research).
UPDATE routes
SET bail = replace(bail, 'Chikamin', 'Chickamin')
WHERE id = 'wa_gunrunner'
  AND bail LIKE '%Chikamin%';
