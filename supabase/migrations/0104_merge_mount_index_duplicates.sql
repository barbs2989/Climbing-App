-- 0104: Mount Index is filed twice too — merge only, delete nothing.
--
-- Renumbered from 0103. #728 and #729 were written in parallel and both took 0103, which is
-- the exact ambiguity README-numbering.md exists to prevent — "has 0103 been applied?" had
-- two answers. This one merged second, so it moved; `0103_profile_discoverable.sql` keeps the
-- number. The number is a label, not an ordering key (these are applied by hand), so nothing
-- about the applied state changes — but if you already ran this file as "0103", it is this
-- same file.
--
-- The third and last real hit from the co-located-area sweep (2,543 pairs, 3 real). The
-- other two are done: 0100/0101 (The Brothers) and 0102 (McLellan).
--
-- `wa_mount_index` [peak, 5,991 ft] and `wa_north_peak_2` [crag, no elevation] sit 2 m
-- apart under the same parent, and hold the same two climbs:
--
--   North Face of North Peak   wa_mount_index_north_face          <- wa_north_face_6
--   N-M-Main traverse          wa_mount_index_north_peak_traverse <- wa_traverse_of_mount_index
--
-- I flagged this pair as "needs the guidebook" when 0102 shipped, because the summary
-- columns looked like different lines: trad with no pitch count against ice 5.6 with 12
-- pitches, and "Main Peak via North Approach" against "Traverse of Mount Index". That was
-- wrong, and the FIRST-ASCENT fields settle it — they are the same two climbs:
--
--   both North Face rows:  Lionel Chute & Victor Kaartinen, 1929
--   both traverse rows:    Fred Beckey & Schoening, August 1950, first full N-M-Main traverse
--                          (same 4 pitches, same 1,524 m, same 5.8 km)
--
-- The discipline and pitch differences are two enrichment passes describing one route, not
-- two routes. Read the provenance fields before trusting a discipline label.
--
-- WHICH SIDE IS RICHER DIFFERS PER PAIR, so "keep the peak-scoped id" would lose data
-- exactly as it would have on The Brothers:
--   North Face: the CRAG row has 16 columns the peak-scoped row lacks (pitches,
--               pitch_detail, rappels, gpx, difficulty, itinerary, ice_grade, grade,
--               length_m, max_angle) — 53 populated columns against 39.
--   Traverse:   the other way round, 66 against 62, with 3 unique on the crag row.
--
-- Keeper is the peak-scoped id in both cases: it sits on a `peak` area that has elevation
-- and prominence, so the TECHNICAL STATS peak panel renders at all, and it carries the
-- `source: wa-enrich-batch` provenance from the WA alpine audit.
--
-- MERGE ONLY. Nothing is deleted here and nothing is overwritten; re-running is a no-op.
-- The duplicate rows and the `wa_north_peak_2` area stay until the keepers have been
-- re-read and confirmed — the split that made 0100/0101 safe, and the discipline that
-- would have saved Triple Couloirs.
--
-- Scalar subquery per column, not `UPDATE ... FROM routes`: the latter silently changes
-- zero rows in this SQL environment (it reported success and did nothing on the Guye Peak
-- and Martin Peak merges). Not copied: id, area_id, name, overview, source,
-- auto_generated, corrections.
--
-- Checked first that this is not in flight: PR #468 owns WA alpine enrichment and works
-- alphabetically; it covered Index in batches 27, 82 and 83 and is now at batch 91 (S-T),
-- so it is well past this peak.

-- North Face of North Peak: fill 16 blank column(s) on wa_mount_index_north_face from wa_north_face_6
update routes set
  alpine_grade = coalesce(alpine_grade, (select alpine_grade from routes where id = 'wa_north_face_6')),
  bail = coalesce(bail, (select bail from routes where id = 'wa_north_face_6')),
  comms = coalesce(comms, (select comms from routes where id = 'wa_north_face_6')),
  data_quality = coalesce(data_quality, (select data_quality from routes where id = 'wa_north_face_6')),
  difficulty = coalesce(difficulty, (select difficulty from routes where id = 'wa_north_face_6')),
  gpx = coalesce(gpx, (select gpx from routes where id = 'wa_north_face_6')),
  grade = coalesce(grade, (select grade from routes where id = 'wa_north_face_6')),
  ice_grade = coalesce(ice_grade, (select ice_grade from routes where id = 'wa_north_face_6')),
  itinerary = coalesce(itinerary, (select itinerary from routes where id = 'wa_north_face_6')),
  length_m = coalesce(length_m, (select length_m from routes where id = 'wa_north_face_6')),
  max_angle = coalesce(max_angle, (select max_angle from routes where id = 'wa_north_face_6')),
  pitch_detail = coalesce(pitch_detail, (select pitch_detail from routes where id = 'wa_north_face_6')),
  pitches = coalesce(pitches, (select pitches from routes where id = 'wa_north_face_6')),
  rappel_count_note = coalesce(rappel_count_note, (select rappel_count_note from routes where id = 'wa_north_face_6')),
  rappel_detail = coalesce(rappel_detail, (select rappel_detail from routes where id = 'wa_north_face_6')),
  rappels = coalesce(rappels, (select rappels from routes where id = 'wa_north_face_6'))
where id = 'wa_mount_index_north_face';

-- N-M-Main traverse: fill 3 blank column(s) on wa_mount_index_north_peak_traverse from wa_traverse_of_mount_index
update routes set
  pitch_detail = coalesce(pitch_detail, (select pitch_detail from routes where id = 'wa_traverse_of_mount_index')),
  rappel_count_note = coalesce(rappel_count_note, (select rappel_count_note from routes where id = 'wa_traverse_of_mount_index')),
  rappel_detail = coalesce(rappel_detail, (select rappel_detail from routes where id = 'wa_traverse_of_mount_index'))
where id = 'wa_mount_index_north_peak_traverse';

-- Verify by RE-READING THE KEEPERS, not by "it ran without error":
--   select id, pitches, length_m, grade, ice_grade, alpine_grade, max_angle
--     from routes
--    where id in ('wa_mount_index_north_face','wa_mount_index_north_peak_traverse')
--    order by id;
--   -- expect north_face to now carry pitches 12, a grade, an ice_grade and length_m;
--   -- any NULL still there means the copy did not land.
