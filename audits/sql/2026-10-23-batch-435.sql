-- wa_mount_rainier_mowich_face: fa field names the Central Mowich Face FA party
-- (Dee Molenaar, Gene Prater, Jim Wickwire, Dick Pargeter) but omits the date.
-- Confirmed via Mountain Project's "Central Mowich Face" route page, corroborated
-- by the American Alpine Club Journal 1968 "Climbs and Expeditions" note for
-- Mount Rainier (the AAJ note's unnamed author -- "...Pargeter, Prater, Wickwire
-- and me" -- is consistent with Molenaar, a known AAJ Rainier-area contributor of
-- the era): July 23-24, 1967.
UPDATE routes
SET fa = replace(fa, 'Dick Pargeter (Central Mowich Face)', 'Dick Pargeter, July 23-24, 1967 (Central Mowich Face)')
WHERE id = 'wa_mount_rainier_mowich_face';

-- wa_mount_rainier_mowich_face: descent held the literal leftover placeholder
-- "see prose fix" -- not a real descent summary. RouteDetail.jsx's overview
-- "Descent" fact tile (~L1036) reads route.descent directly whenever it is
-- <=140 chars, with no fallback to the route's own (correct, already-researched)
-- descent_text -- so the placeholder string itself was being shown to climbers
-- as this route's descent. Replaced with a one-line summary of the route's own
-- descent_text (no new research -- condensing data already on this row).
UPDATE routes
SET descent = 'No walk-off: carry over via Emmons-Winthrop Glacier to White River, or Disappointment Cleaver to Paradise.'
WHERE id = 'wa_mount_rainier_mowich_face';

-- wa_mount_rainier_sunset_ridge: same "see prose fix" placeholder bug as Mowich
-- Face above. This route's descent_text is already a single short sentence, so
-- it is copied in verbatim rather than re-summarized.
UPDATE routes
SET descent = 'The usual way down is the Tahoma Glacier or its Sickle shortcut, which skirts the crevasses of the main glacier.'
WHERE id = 'wa_mount_rainier_sunset_ridge';
