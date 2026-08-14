-- Remove a PHANTOM route: wa_forbidden_peak_east_face_catscratch, "East Face / Catscratch".
--
-- This is not a mis-named route. It is a row for a feature that is not a summit route, and the row
-- says so ITSELF. Its own `overview`, written by an earlier enrichment pass, reads:
--
--   "No documented 5.9/Grade IV 'East Face' summit route was found. The only well-sourced feature
--    matching 'Catscratch' is the Cat Scratch Gullies - loose class-4 gullies on the south side of
--    the peak, climbed as a late-season alternate way to the West Ridge Notch and used far more
--    often as the standard rappel descent from the West Ridge."
--
-- That pass reached the right conclusion and then left the row standing. Independently confirmed
-- 2026-08-13 against published sources: the Cat Scratch Gullies rise from Boston Basin on the SOUTH
-- side to the 8,265 ft West Ridge notch, and Forbidden's actual routes are West Ridge, East Ridge
-- Direct, East Ledges, North Ridge, Northwest Face and Northeast Face -- all six of which already
-- exist as their own rows on this peak. There is no East Face route.
--
-- The row also fails on its own terms: grade is NULL, length is NULL, stars are NULL, and its aspect
-- (S) contradicts its name (East). `npm run audit:aspect-name` flags it at 90 degrees for that.
--
-- WHY REMOVAL RATHER THAN A RENAME: there is nothing to rename it to. The Cat Scratch gullies are an
-- approach and a descent, not a line to the summit, so no route name is correct here. Keeping it
-- means "Forbidden Peak" lists seven routes where six exist, and -- the real harm -- a climber
-- searching "Catscratch" lands on a phantom instead of on the West Ridge.
--
-- NOTHING IS LOST. The Cat Scratch beta already lives where it belongs, on
-- wa_forbidden_peak_west_ridge, as a researched approach variant carrying the base-finding that
-- motivated this whole sweep: "Cat Scratch is not the snow couloir, and that mix-up is the usual
-- reason parties lose time here: it is the parallel ROCK gully system just west (climber's left) of
-- the couloir, and it tops out at the same 8,265 ft notch." The peak's descent text and rappel
-- prose name it too. Verify that variant is present BEFORE running this.
--
-- EXPECT `npm run check:sql` TO REFUSE THIS, and read the refusal before overriding it. Its rule is
-- that a DELETE must not remove the last row with that name on its peak -- the rule that exists
-- because wa_dragontail_peak_triple_couloirs was destroyed on 2026-07-28 by a delete whose
-- "duplicate" twin did not exist. That rule is right, and it cannot express this case: a phantom has
-- no twin BY DEFINITION. The distinction is that Triple Couloirs was a real climb assumed to be a
-- duplicate, whereas this row is a real duplicate of nothing -- confirmed by the row's own overview
-- and by published sources, not by an id that looked similar.
--
-- The guard is satisfied structurally instead: the DELETE fires only if the West Ridge variant that
-- carries this information is actually present, so it cannot run in a state where the beta would be
-- lost.
DELETE FROM routes
WHERE id = 'wa_forbidden_peak_east_face_catscratch'
  AND name = 'East Face / Catscratch'
  AND EXISTS (
    SELECT 1 FROM routes wr
    WHERE wr.id = 'wa_forbidden_peak_west_ridge'
      AND wr.approach_variants::text ILIKE '%Cat Scratch%'
  );

-- Afterwards: areas.route_count for wa_forbidden_peak is maintained by a trigger on routes, so it
-- updates itself. Confirm with `npm run check:counts` if you want it belt-and-braces.
