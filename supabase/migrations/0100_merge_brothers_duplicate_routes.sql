-- 0100: The Brothers exists twice, and so do both of its climbs. Step 1 of 2 — MERGE ONLY.
--
-- Found by the 0099 audit. `wa_the_brothers` (peak, 6,868 ft / 2,779 ft prominence) and
-- `wa_brothers_south_peak_the` (crag, no elevation) are 0.00 km apart — the same mountain,
-- filed twice — and each holds the same two climbs under different ids:
--
--     South Couloir      wa_the_brothers_south_couloir   <-  wa_south_couloir
--     Brothers Traverse  wa_the_brothers_traverse        <-  wa_brothers_traverse
--
-- THE OBVIOUS FIX WOULD HAVE DESTROYED DATA. "Keep the peak-scoped id, delete the legacy
-- one" is the right instinct on identity (peak-scoped ids are the correct scheme) and the
-- wrong one on content: a column-by-column comparison of the live rows shows the rows that
-- look disposable are the RICHER ones. Brothers Traverse holds 29 populated columns on the
-- legacy row that the peak-scoped row does not have -- dist_km, gain/loss, commitment,
-- difficulty, descent_text, bail, turnaround, itinerary, rack, timing -- against 1 the
-- other way. South Couloir is 11 against 10. Deleting first would have thrown away most of
-- the enrichment on this mountain while reporting success. This is the same shape as the
-- 2026-07-28 loss of Triple Couloirs, where "keep r4, delete triple_couloirs" deleted the
-- only real copy.
--
-- So: merge first, delete never in the same step. This migration ONLY fills blanks on the
-- peak-scoped keeper from the legacy row. Nothing is deleted, nothing is overwritten, and
-- re-running it is a no-op. The duplicate area and the two now-redundant route rows are
-- left in place for a follow-up, AFTER the keeper has been re-read and confirmed.
--
-- FORM. Written as a scalar subquery per column, not `UPDATE ... FROM routes`. The latter
-- SILENTLY CHANGES ZERO ROWS in this SQL environment -- it reported success and did
-- nothing on both the Guye Peak and Martin Peak merges. Column-to-column copying also
-- avoids hand-writing jsonb/array literals, which is how a REST applier once wrote numbers
-- as strings.
--
-- NOT COPIED, on purpose: id, area_id, name, overview, source, auto_generated, corrections.
-- Identity and provenance stay with the keeper, and the legacy row's `overview` describes
-- the route from a different framing.
--
-- TWO VALUES WORTH NAMING, because both are normally red flags here:
--   * loss_ft = gain_ft = 6042 on the traverse. Usually that pattern is arithmetic passed
--     off as a measurement, and it flips the planner tile to "Total ascent" via
--     gainCoversWholeOuting(). Here it is correct: outing_shape is `outback` from the Lena
--     Lake trailhead (~685 ft) to a 6,866 ft summit, so the descent really does equal the
--     ascent and the gain really does span the whole outing.
--   * dist_km = 14.5 is copied TOGETHER WITH outing_shape. dist_km holds two conventions in
--     this table and the app doubles it for round trips; copying the distance without the
--     shape that explains it is the actual bug to avoid.

-- South Couloir: fill 11 blank column(s) on wa_the_brothers_south_couloir from wa_south_couloir
update routes set
  alpine_draws = coalesce(alpine_draws, (select alpine_draws from routes where id = 'wa_south_couloir')),
  ascender = coalesce(ascender, (select ascender from routes where id = 'wa_south_couloir')),
  features = coalesce(features, (select features from routes where id = 'wa_south_couloir')),
  gear_confidence = coalesce(gear_confidence, (select gear_confidence from routes where id = 'wa_south_couloir')),
  grade_num = coalesce(grade_num, (select grade_num from routes where id = 'wa_south_couloir')),
  permit = coalesce(permit, (select permit from routes where id = 'wa_south_couloir')),
  pitches = coalesce(pitches, (select pitches from routes where id = 'wa_south_couloir')),
  rope_length_m = coalesce(rope_length_m, (select rope_length_m from routes where id = 'wa_south_couloir')),
  rope_note = coalesce(rope_note, (select rope_note from routes where id = 'wa_south_couloir')),
  rope_type = coalesce(rope_type, (select rope_type from routes where id = 'wa_south_couloir')),
  sling_rack = coalesce(sling_rack, (select sling_rack from routes where id = 'wa_south_couloir'))
where id = 'wa_the_brothers_south_couloir';

-- Brothers Traverse: fill 29 blank column(s) on wa_the_brothers_traverse from wa_brothers_traverse
update routes set
  alpine_draws = coalesce(alpine_draws, (select alpine_draws from routes where id = 'wa_brothers_traverse')),
  aspect = coalesce(aspect, (select aspect from routes where id = 'wa_brothers_traverse')),
  bail = coalesce(bail, (select bail from routes where id = 'wa_brothers_traverse')),
  commitment = coalesce(commitment, (select commitment from routes where id = 'wa_brothers_traverse')),
  data_quality = coalesce(data_quality, (select data_quality from routes where id = 'wa_brothers_traverse')),
  descent_text = coalesce(descent_text, (select descent_text from routes where id = 'wa_brothers_traverse')),
  difficulty = coalesce(difficulty, (select difficulty from routes where id = 'wa_brothers_traverse')),
  dist_km = coalesce(dist_km, (select dist_km from routes where id = 'wa_brothers_traverse')),
  fa = coalesce(fa, (select fa from routes where id = 'wa_brothers_traverse')),
  features = coalesce(features, (select features from routes where id = 'wa_brothers_traverse')),
  gain_ft = coalesce(gain_ft, (select gain_ft from routes where id = 'wa_brothers_traverse')),
  gear_confidence = coalesce(gear_confidence, (select gear_confidence from routes where id = 'wa_brothers_traverse')),
  grade = coalesce(grade, (select grade from routes where id = 'wa_brothers_traverse')),
  grade_num = coalesce(grade_num, (select grade_num from routes where id = 'wa_brothers_traverse')),
  grade_system = coalesce(grade_system, (select grade_system from routes where id = 'wa_brothers_traverse')),
  itinerary = coalesce(itinerary, (select itinerary from routes where id = 'wa_brothers_traverse')),
  length_m = coalesce(length_m, (select length_m from routes where id = 'wa_brothers_traverse')),
  loss_ft = coalesce(loss_ft, (select loss_ft from routes where id = 'wa_brothers_traverse')),
  max_angle = coalesce(max_angle, (select max_angle from routes where id = 'wa_brothers_traverse')),
  outing_shape = coalesce(outing_shape, (select outing_shape from routes where id = 'wa_brothers_traverse')),
  permit = coalesce(permit, (select permit from routes where id = 'wa_brothers_traverse')),
  rack = coalesce(rack, (select rack from routes where id = 'wa_brothers_traverse')),
  rope_length_m = coalesce(rope_length_m, (select rope_length_m from routes where id = 'wa_brothers_traverse')),
  rope_note = coalesce(rope_note, (select rope_note from routes where id = 'wa_brothers_traverse')),
  rope_type = coalesce(rope_type, (select rope_type from routes where id = 'wa_brothers_traverse')),
  sling_rack = coalesce(sling_rack, (select sling_rack from routes where id = 'wa_brothers_traverse')),
  timing = coalesce(timing, (select timing from routes where id = 'wa_brothers_traverse')),
  turnaround = coalesce(turnaround, (select turnaround from routes where id = 'wa_brothers_traverse')),
  what_to_bring = coalesce(what_to_bring, (select what_to_bring from routes where id = 'wa_brothers_traverse'))
where id = 'wa_the_brothers_traverse';

-- Verify by RE-READING THE KEEPER, not by "it ran without error" -- the failure mode this
-- form exists to avoid is a statement that succeeds and changes nothing. No ltree
-- operators here: `!~` on an ltree column raised 42883 during 0097 and, because the SQL
-- Editor runs a paste as ONE transaction, rolled back the correct UPDATEs above it.
--   select id, dist_km, gain_ft, loss_ft, outing_shape, commitment, grade, pitches,
--          rope_length_m, gear_confidence
--     from routes
--    where id in ('wa_the_brothers_south_couloir','wa_the_brothers_traverse') order by id;
--   -- expect the traverse to now carry dist_km 14.5, gain/loss 6042, outing_shape outback,
--   -- commitment III, grade "Easy 5th"; and the couloir rope_length_m 30, pitches 0,
--   -- gear_confidence "verified". Any NULL still there means the copy did not land.
