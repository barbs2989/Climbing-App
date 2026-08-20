-- Four gear lists that could not supply the rappel table stored beside them.
--
-- Follow-up to 0164, from triaging all 14 of check:rappel-lengths' report-only rule-3 candidates.
-- THE DECISIVE TEST TURNED OUT NOT TO BE PROSE-VERSUS-GEAR. It is: which rope configuration does
-- the stored TABLE encode, and can gear supply it? Reading prose alone gets this wrong — a route
-- that offers a single-rope alternative reads as fine until you notice its table is the two-rope
-- sequence. That mistake was made and corrected during this triage.
--
-- Nine of the fourteen are correct and need nothing: their notes already state the configuration
-- explicitly ("The five stations are the DOUBLE-ROPE count", "The three stations listed are the
-- two-rope sequence") and their gear agrees, or no rope is named at all so nothing contradicts.
--
--   wa_action_potential      "Single 70 m rope … not a double-rope rap" -> two ropes
--     PEER CONSENSUS, and the strongest evidence here. Three Burgundy Spire routes share this
--     descent and store the IDENTICAL stations [40,55,55,40,60]. wa_burgundy_spire_north_face
--     says "two ropes for descent"; wa_ultramega_ok says "two ropes recommended for the descent
--     (via the North Face rap line)". This row was the odd one out and went further than silence:
--     it explicitly denied a double-rope rap while its own note says the five stations ARE the
--     double-rope count.
--
--   wa_northwest_mox_peak_standard   "rope" -> two ropes
--     Its own `rappels` already said it: "…then one double-rope (~60 m) from the ridge saddle to
--     the Redoubt Glacier — two ropes required for the last". Table [30,30,60] matches exactly.
--
--   wa_inspiration_peak_west_ridge   "single 60m rope" -> two ropes for the stored line
--     The table is 7 stations of 55-60 m and its note calls that the "~7-rappel double-rope line".
--     A 60 m rope doubled reaches 30 m and cannot link ONE of them. The note's single-rope
--     alternative is a different descent, which the gear line now says rather than implying.
--
--   wa_sherpa_peak_east_ridge   "Single 30-40m rope is enough for … the descent rappels"
--     Table [30,30,30,50]; the last is "a double-rope rappel to the west notch". A 30-40 m rope
--     doubled reaches 15-20 m. The technical-sections half of the claim is kept, because it is true.
--
-- ONE LEFT UNRESOLVED AND DELIBERATELY NOT GUESSED: wa_east_face (Middle Gunsight) stores four
-- 55 m stations while its own `rappels` says "2 double-rope rappels … (~4 if you carry only one
-- 60 m rope)". Four 55 m stations match NEITHER — the two-rope sequence is 2 stations, and the
-- one-rope sequence is ~4 stations of 30 m or less. The table is internally wrong, and no source
-- in the row gives per-station lengths, so repairing it would mean inventing distances. Left for
-- research; nulling four lengths that a future pass would re-derive is not obviously better.

update routes set gear = array_replace(gear,
  'Single 70 m rope for the descent — parties rappel the North Face route''s existing anchors, not a double-rope rap',
  'Two ropes for the descent — the five stored stations are the North Face rap line''s double-rope count; on a single rope the same ground is 9-10 rappels')
where id = 'wa_action_potential';

update routes set gear = array_replace(gear, 'rope',
  'two ropes — the last rappel off the ridge saddle is a ~60 m double-rope rappel')
where id = 'wa_northwest_mox_peak_standard';

update routes set gear = array_replace(gear, 'single 60m rope',
  'two ropes for the stored 7-rappel West Ridge line; a single 60 m rope instead gives the ~5-rappel ridge sequence its note describes')
where id = 'wa_inspiration_peak_west_ridge';

update routes set gear = array_replace(gear,
  'Single 30-40m rope is enough for the short technical sections and the Balanced Rock/descent rappels',
  'Single 30-40 m rope covers the technical sections and the Balanced Rock; the stored West Ridge descent needs two ropes for its final ~50 m double-rope rappel to the west notch')
where id = 'wa_sherpa_peak_east_ridge';
