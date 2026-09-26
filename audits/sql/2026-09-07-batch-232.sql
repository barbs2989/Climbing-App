-- WA alpine audit batch 232 (pass 4)

-- wa_southwest_buttress (Dorado Needle, Southwest Buttress): dist_km stored as 6.44,
-- which is exactly half of 12.88 -- the value this row's OWN corrections history says
-- was set on 2026-08-05 to match its own approach text ("On-file round-trip distance
-- is about 25.75 km") and its own itinerary day-mileage sum (5.7 + 4 + 5.7 = 15.4 mi
-- round trip, matching itinerary.totalNote's "~16 mi round trip"). The live value has
-- regressed back to half the corrected figure, so the row now contradicts its own
-- approach-text sentence and itinerary under the app's dist_km*2 one-way convention.
-- Re-applying the same fix the row's own history already documents.
UPDATE routes SET dist_km = 12.88 WHERE id = 'wa_southwest_buttress';

-- wa_southern_man (South Early Winters Spire, Southern Man): pitch_detail's crux
-- pitch (P6) states as flat fact that the pitch was "freed by Bryan Burdo at 5.12a in
-- 2009" -- but this row's own overview and data_quality.gaps fields say this exact
-- claim is an UNRESOLVED discrepancy (a single secondhand blog mention, year and free
-- grade conflicting with the on-file FA credit) that could not be confirmed, and that
-- the on-file free-ascent credit was deliberately LEFT as "B. Matthews, B. Burdo
-- (2010)" at 5.11d because of that. pitch_detail asserting the unconfirmed 2009/5.12a
-- claim as settled fact contradicts the row's own documented editorial decision.
-- Corrected to match the hedged wording the row already uses in its own overview
-- field, rather than inventing anything new.
UPDATE routes
SET pitch_detail = jsonb_set(
  pitch_detail,
  '{5,notes}',
  '"The route''s crux: a short, bulgy face section with bad feet above thin pro; the FA party aided this at 5.9+ C1 in 2008. The on-file free ascent is B. Matthews and Bryan Burdo in 2010 at 5.11d; a September 2009 ascent by Burdo alone at 5.12a has also been reported but is unconfirmed (see data_quality.gaps)."'::jsonb
)
WHERE id = 'wa_southern_man';
