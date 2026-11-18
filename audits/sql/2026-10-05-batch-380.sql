-- WA alpine audit — batch 380 (2026-10-05, pass 7)
-- Routes: wa_amphitheater_mountain_finger_of_fatwa; wa_amphitheater_mountain_middle_finger_buttress_left_side;
-- wa_amphitheater_mountain_middle_finger_buttress_right_side; wa_amphitheater_mountain_north_ridge;
-- wa_amphitheater_mountain_pilgrimage_to_mecca; wa_amphitheater_mountain_west_route;
-- wa_andersons_thumb_standard; wa_argonaut_peak_east_ridge; wa_argonaut_peak_northeast_couloir;
-- wa_around_the_cave_we_go.
-- All WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so each statement is a no-op if the row has already changed.

-- =========================================================================
-- Finger of Fatwa, Amphitheater Mountain (wa_amphitheater_mountain_finger_of_fatwa)
-- =========================================================================

-- fa is stored as "Scott Bennett and Blake Herrington, 2012", but the FA
-- year is wrong. Blake Herrington's own trip-report blog post ("(New)
-- International Trade Routes", posted Aug 25, 2011) describes an Aug 10-17,
-- 2011 trip on which he and Scott Bennett put up a new route on Amphitheater
-- Mountain's north face ("Middle Finger Buttress") alongside a new route on
-- Cathedral Peak ("Last Rites"). The AAC Publications article "Amphitheater
-- Peak, Cathedral Peak, Deacon Peak, Three New Routes" lists exactly those
-- same two new routes -- "(Middle) Finger of Fatwa" (160m, 5.11) on
-- Amphitheater and "Last Rites" (300m, 5.11+) on Cathedral -- confirming this
-- is the same trip. The AAC article appears in the 2012 American Alpine
-- Journal, which reports on the PRIOR season's climbs; the climb itself
-- happened in August 2011, and "2012" in this row looks like the AAJ
-- publication year bleeding into the fa field instead of the ascent year.
UPDATE routes SET fa = 'Scott Bennett and Blake Herrington, 2011'
WHERE id = 'wa_amphitheater_mountain_finger_of_fatwa' AND fa = 'Scott Bennett and Blake Herrington, 2012';

-- verify: should return the corrected row only
SELECT id, fa FROM routes WHERE id = 'wa_amphitheater_mountain_finger_of_fatwa';
