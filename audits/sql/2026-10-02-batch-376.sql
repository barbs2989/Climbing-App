-- WA alpine audit — batch 376 (2026-10-02, pass 6)
-- Routes: wa_tricouni_peak_southwest_slopes; wa_true_grit_2 (Vesper Peak);
-- wa_tupshin_peak_east_face; wa_tye_peak_e_route; wa_ultramega_ok (Burgundy
-- Spire); wa_union_peak_se_route; wa_up_in_arms (Concord Tower);
-- wa_upper_north_ridge_w_great_gendarme (Mount Stuart); wa_vasiliki_ridge_standard.
-- All WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so each statement is a no-op if the row has already changed.

-- =========================================================================
-- Vasiliki Ridge — Standard Route / Ares Tower (wa_vasiliki_ridge_standard)
-- =========================================================================

-- high_point_ft is stored as 8190, but this row's own `corrections` field says
-- "the more precise 8,203 ft figure is used here as highPointFt" -- it never
-- was. This row's own summit waypoint ("Ares Tower summit", note: "surveyed
-- 8,202.8 ft") already reads 8203, and the parent area row (wa_vasiliki_ridge,
-- elevation_ft) already reads 8203 too. The route's high_point_ft is the one
-- field that was never brought into line with its own documented correction.
UPDATE routes SET high_point_ft = 8203
WHERE id = 'wa_vasiliki_ridge_standard' AND high_point_ft = 8190;

-- =========================================================================
-- Union Peak — Southeast Slopes Scramble (wa_union_peak_se_route)
-- =========================================================================

-- dist_km is stored as 1.6 (about 1 mile), but this row's own itinerary
-- states the round trip is "about 5.4 miles round trip" (itinerary.totalNote
-- and itinerary.days[0].miles both say 5.4 mi), and the route's own waypoint
-- list already places the summit 2.7 miles out from the trailhead (distMi),
-- so 1.6 km is roughly a third of even the one-way distance this row already
-- documents. 5.4 mi = 8.69 km, matching the app's existing round-trip
-- dist_km convention used elsewhere on this same route (gain_ft/loss_ft of
-- 1696/1696 match the itinerary day's gainFt/lossFt of 1696/1696 exactly).
UPDATE routes SET dist_km = 8.69
WHERE id = 'wa_union_peak_se_route' AND dist_km = 1.6;
