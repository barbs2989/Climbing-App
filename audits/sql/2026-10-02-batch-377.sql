-- WA alpine audit — batch 377 (2026-10-02, pass 6)
-- Routes: wa_wallaby_peak_standard; wa_warrior_peak_standard;
-- wa_washington_ellinor_traverse_ridge; wa_west_craggy_peak_standard_route;
-- wa_west_face_2 (North Gunsight Peak); wa_west_twin_needle_south_route;
-- wa_white_mountain_olympics_scramble; wa_whitehorse_mountain_nw_shoulder.
-- All WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so each statement is a no-op if the row has already changed.

-- =========================================================================
-- Warrior Peak — Southeast Peak Standard / Home Lake approach (wa_warrior_peak_standard)
-- =========================================================================

-- high_point_ft is stored as 7320, but this route's own summit waypoint
-- ("Warrior Peak (Southeast Summit)", elev 7314) already reads 7314, and the
-- parent area row (wa_warrior_peak.elevation_ft = 7314, prominence_ft = 804)
-- already matches Peakbagger's precise figure (7,313.9 ft / 804 ft
-- prominence) exactly. 7320 appears to be a rounding of the looser "7,320+ ft"
-- figure quoted on Wikipedia/SummitPost; the route's own more precise data
-- (waypoint + area row) was never brought into line on this one field.
UPDATE routes SET high_point_ft = 7314
WHERE id = 'wa_warrior_peak_standard' AND high_point_ft = 7320;
