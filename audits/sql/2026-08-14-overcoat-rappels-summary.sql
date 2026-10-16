-- Overcoat Peak SE Route: the `rappels` summary contradicts the two fields that explain it.
--
-- wa_overcoat_peak_southeast_route currently stores:
--
--   rappels = "2 rappels on a 60m rope, plus a downclimbed dihedral, back to the top of the
--              Overcoat Glacier"
--
-- "plus a downclimbed dihedral" presents the dihedral as descended IN ADDITION to the two
-- rappels. Both other fields say the two rappels ARE the dihedral:
--
--   descent_text: "Where the ledges pinch down at a dihedral feature (a damp, water-streaked
--                  corner ...), most parties do NOT free-downclimb the full corner — instead,
--                  build two rappels (roughly full 30m/60m-rope-length pitches) DOWN THE
--                  DIHEDRAL to regain the glacier below."
--   rappel_count_note: "Two rappels of roughly 30m each ... this is the commonly reported
--                  method where the descent ledges pinch out at the damp dihedral."
--
-- Two fields against one, and the outlier is the SUMMARY rather than the detail — so the
-- summary is what changes. This is not cosmetic: `rappels` is the field the route header
-- leads with, and as written it tells a party to rappel twice and then downclimb a damp,
-- water-streaked corner, which is precisely the thing the other two fields say parties
-- rappel in order to AVOID. The rest of the string is accurate and is kept verbatim.
--
-- No count changes. The route still has two rappels on a 60 m rope; only the clause
-- describing what they descend is corrected. Surfaced by `npm run audit:rappel-claims`,
-- whose other two candidates this round are both correct data (see the triage note).
--
-- Guarded on the exact current value, so a row edited since this was written is left alone.

begin;

update routes
   set rappels = '2 rappels on a 60m rope down the damp dihedral, back to the top of the Overcoat Glacier'
 where id = 'wa_overcoat_peak_southeast_route'
   and rappels = '2 rappels on a 60m rope, plus a downclimbed dihedral, back to the top of the Overcoat Glacier';

commit;

-- Verify separately:
--   select id, rappels from routes where id = 'wa_overcoat_peak_southeast_route';
--   npm run check:rappel-lengths   -- must stay ok; this changes prose, not a station length
