-- WA alpine audit, pass 8, batch 542
-- wa_south_face_4 (Kangaroo Temple, South Face): pitches was stored as 7, but the route's own
-- primary source -- Mountain Project's dedicated South Face route page, which independently
-- matches this row's exact first-ascent party (Bill Marts, Steve Marts, Don McPherson, 1965),
-- length (800 ft / 242 m, close to this row's 244 m), and grade (5.8) -- states "8 pitches,
-- Grade III" in its own info box. A 2026-08-05 correction on this row only reconciled the
-- overview/rope_note text DOWN to match the stored pitches=7 (and the 7-entry pitch_detail
-- breakdown), rather than checking the stored count itself against the source; this undoes
-- that by correcting pitches up to match Mountain Project, and the two description fields
-- that were changed to say "seven-pitch"/"7-pitch" back to "eight-pitch"/"8-pitch" to match.
-- pitch_detail itself is left alone (not fabricating an 8th entry) -- noted as a data_quality
-- gap instead: it now under-counts the route's own pitches field by one.
UPDATE routes
SET pitches = 8,
    overview = 'An eight-pitch, III 5.8 line up Kangaroo Temple''s South Face — the longest and most sustained of the peak''s moderate routes, with variable rock quality and genuine route-finding challenge.',
    rope_note = '8-pitch III 5.8 route up slabs/cracks/chimneys (also referenced as Southwest Face). Descent via hidden 3-bolt anchors (no chains) atop the North Face and at the P1 belay, 3 single-rope raps with a 60m rope.',
    data_quality = jsonb_set(
      data_quality,
      '{gaps}',
      (data_quality->'gaps') || '["pitch_detail breaks down only 7 of this route''s own 8 pitches, per Mountain Project, and a fresh pitch-by-pitch pass could split or add the missing pitch."]'::jsonb
    )
WHERE id = 'wa_south_face_4'
  AND pitches = 7
  AND overview LIKE 'A seven-pitch%'
  AND rope_note LIKE '7-pitch%';
