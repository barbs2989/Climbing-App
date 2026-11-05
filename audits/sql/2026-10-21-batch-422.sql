-- Middle Peak (Gunsight Range) North Face: fa field was lifted from an unrelated
-- climb. The stored text ("Doug Klewin and Dan McNerthney in December 1978, climbing
-- the entire route on snow and ice") matches an AAC Publications report titled
-- "Middle Peak of Mount Index, North Face" -- Mount Index, near the town of Index, WA,
-- is a completely different mountain from this area's Middle Peak in the Gunsight
-- Range (Glacier Peak Wilderness, east of the Cascades crest). No verified first
-- ascent was found for this peak's actual North Face, so the misattributed credit is
-- cleared rather than replaced with a guess.
UPDATE routes SET fa = NULL WHERE id = 'wa_middle_peak_north_face';
