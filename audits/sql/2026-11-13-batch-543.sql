-- WA alpine audit, pass 8, batch 543
-- wa_soviet_route (Bonanza Peak, Southwest Peak, "Soviet Route" / West Buttress): pitches is
-- stored as 14, but the route's own rope_note field already says "22-pitch route on the North
-- Face/West Buttress of Bonanza's SW peak" -- a self-contradiction on this same row. Two
-- independent external sources agree with rope_note, not with pitches: Steph Abegg's route
-- page (stephabegg.com, already this row's cited source for gain_ft) describes it as a
-- 22-pitch route, and the 1976 American Alpine Journal first-ascent account (Bertulis,
-- already named in this row's own data_quality note as corroborating its FA facts) likewise
-- describes the route in terms of 22 pitches. The stored pitch_detail array (14 entries,
-- summing to 700 m, matching length_m 701 almost exactly) looks like a later reconstruction
-- from a modern trip report that linked pitches with doubled 60 m ropes -- internally
-- consistent with itself, but not with the route's own historical/guidebook pitch count that
-- pitches should track (as for every other route audited this batch, where pitches matches
-- the commonly cited guidebook/Mountain-Project count). Correcting pitches up to 22 to match
-- rope_note and both external sources; pitch_detail is left alone rather than fabricating 8
-- more entries with no topo to source them from, and that gap is now recorded explicitly.
UPDATE routes
SET pitches = 22,
    data_quality = jsonb_set(
      data_quality,
      '{gaps}',
      (data_quality->'gaps') || '["pitch_detail breaks down only 14 of this route'\''s 22 pitches (per rope_note and the AAJ 1976/Steph Abegg sources) -- it reflects a modern doubled-rope trip report'\''s longer linked pitches, not a topo of the original 22. A fresh topo-based pass could reconcile the two."]'::jsonb
    )
WHERE id = 'wa_soviet_route'
  AND pitches = 14
  AND rope_note LIKE '22-pitch route%';
