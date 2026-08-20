-- Two routes whose GEAR LIST could not complete the descent printed beside it.
--
-- A rope doubled through an anchor reaches HALF its length, so a double-rope rappel needs a SECOND
-- STRAND. These two rows told a climber, in the same route page, to bring one rope and then to
-- make rappels that need two. Gear is what people pack from.
--
--   wa_east_face_3 (Minuteman Spire, East Face)
--     rappels: "4 double-rope rappels from slung anchors roughly 100 ft west of the true summit…"
--     gear:    "single 60m rope"
--
--   wa_mount_index_north_face (North Face, North Peak)
--     rappels: "…multiple double-rope rappels are needed, some on rockfall-damaged bolts…"
--     gear:    "single rope"
--
-- The replacement text is RE-HOMED from each row's own descent. No new fact is introduced; the
-- gear list just stops contradicting the prose next to it.
--
-- FOUND BY A DETECTOR THAT IS NOT WORTH SHIPPING, and that is the more useful half of this
-- commit. Asking "does the prose demand two strands while the gear says one rope is enough"
-- flags 9 routes of the 113 whose prose mentions two strands. Reading all 9 against their own
-- text, only these 2 are defects — roughly 22% precision, and the five clear false positives all
-- share one cause: "two ropes" is usually an ALTERNATIVE or a NEGATION, not a requirement.
--
--   wa_american_border_peak_southeast_face  "doubled-strand rappels off a 60m rope RATHER THAN
--                                            needing two ropes" — the gear is right
--   wa_argonaut_peak_east_ridge             "Two single-rope rappels, OR one double-rope rappel"
--   wa_east_ridge_4                         "An ALTERNATE all-West-Ridge variant instead uses…"
--   wa_mount_torment_torment_forbidden_trav "Two ropes roughly HALVES it" — an optimisation
--   wa_inspiration_peak_west_ridge          "two distinct descent options… or alternatively a
--                                            single-rope sequence"
--
-- That is the same shape check:rappel-lengths already records for its rule 3, which is REPORT-ONLY
-- for exactly this reason. A guard at 22% precision teaches people to ignore it, so this one is
-- written down rather than wired in. Two further routes (wa_mount_torment_south_ridge,
-- wa_sherpa_peak_east_ridge) are arguable — each offers an alternate descent — and are left alone.

update routes
set gear = array_replace(gear, 'single 60m rope', 'two 60m ropes (the descent is 4 double-rope rappels)')
where id = 'wa_east_face_3';

update routes
set gear = array_replace(gear, 'single rope', 'two ropes (the descent needs double-rope rappels)')
where id = 'wa_mount_index_north_face';
