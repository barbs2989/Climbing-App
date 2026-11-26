-- wa_monte_cristo_peak_standard_route_variation_1: fa stored the first ascensionist's
-- middle initial as "James K. Keyes" -- a typo. Wikipedia's Monte Cristo Peak entry
-- (citing Beckey's Cascade Alpine Guide) gives "James M. Keyes and W. Zerum, 1923",
-- and this DB's own sibling route on the same peak, wa_monte_cristo_peak_scramble
-- ("North Col"), already stores the correct "James M. Keyes and W. Zerum — 1923" for
-- the same 1923 first ascent. Correcting the initial to match.
UPDATE routes SET fa = 'James M. Keyes, W. Zerum, 1923' WHERE id = 'wa_monte_cristo_peak_standard_route_variation_1';
