-- WA alpine audit, pass 4, batch 229 (2026-09-07)
-- Routes checked: wa_south_early_winter_spire_direct_east_buttress,
-- wa_south_early_winter_spire_east_buttress, wa_south_early_winter_spire_passenger,
-- wa_south_early_winter_spire_southwest_couloir, wa_south_face_10 (Cathedral Peak),
-- wa_south_face_12 (Argonaut Peak), wa_south_face_2 (Pernod Spire),
-- wa_south_face_3 (Concord Tower).

-- wa_south_face_10 (Cathedral Peak South Face): watch_out[0] says "The 1969 FA account
-- notes protection on 'assorted blocks and horns'..." but this same row's own `fa` field
-- ("Fred Beckey, Dave Wagner, John Brottem, Doug Leen - September 1968") and `overview`
-- field ("The original 1968 Beckey line...") both correctly date the first ascent to
-- September 26-27, 1968 -- confirmed independently against AAC Publications' historical
-- record, which describes the same four-person party covering 18 miles to a timberline
-- camp on Sept 26-27, 1968 and using pitons "on assorted blocks and horns" during the
-- climb (the exact phrase this row's watch_out quotes). The "1969" in watch_out[0] is an
-- internal date inconsistency against the row's own corroborated fa/overview fields --
-- corrected to 1968.
UPDATE routes SET watch_out = jsonb_set(
  watch_out, '{0}',
  '"The 1968 FA account notes protection on '\''assorted blocks and horns'\'' in places — inspect placements on the original aid pitches."'::jsonb
)
WHERE id = 'wa_south_face_10'
  AND watch_out->>0 = 'The 1969 FA account notes protection on ''assorted blocks and horns'' in places — inspect placements on the original aid pitches.';

-- verify: should return 0 rows
select id from routes
where id = 'wa_south_face_10'
  and watch_out->>0 like '%1969 FA account%';
