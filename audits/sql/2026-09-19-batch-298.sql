-- WA alpine audit batch 298

-- wa_southwest_buttress (Dorado Needle): dist_km had drifted back to 6.44, exactly half of
-- the 12.88 this row's own `corrections` field already documents as the fix applied on
-- 2026-08-05. Something after that date silently halved it again (looks like a later,
-- unrelated pass mistook the already-corrected one-way figure for a round-trip figure and
-- "fixed" it a second time in the wrong direction). Re-verified the 12.88 figure
-- independently from this row's own fields rather than trusting the corrections text
-- blindly: the `approach` field states outright "The recorded round-trip distance is about
-- 25.75 km" (25.75/2 = 12.88); the itinerary's three day-mile entries (5.7 + 4 + 5.7 = 15.4
-- mi round trip = 24.78 km, half = 12.39 km) agree to within measurement rounding; and
-- itinerary.totalNote's "~16 mi round trip" (16 mi = 25.75 km) matches the approach text
-- exactly. Per this app's distKm*2 display convention (dist_km is one-way), 6.44 would show
-- the route's round-trip approach as ~12.9 km/8.0 mi on screen -- half of what every other
-- field on this same row says it actually is. Restoring 12.88, guarded on the drifted value
-- so this cannot silently re-apply if a future pass has already fixed it correctly again.
UPDATE routes SET dist_km = 12.88 WHERE id = 'wa_southwest_buttress' AND dist_km = 6.44;
