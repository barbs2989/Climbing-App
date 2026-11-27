-- wa_monte_cristo_peak_standard_route_variation_2: fa stored the first ascensionist's
-- middle initial as "James K. Keyes" -- the same typo already fixed on its sibling
-- route wa_monte_cristo_peak_standard_route_variation_1 in batch 595. Wikipedia's Monte
-- Cristo Peak entry (citing Beckey's Cascade Alpine Guide) and this DB's own
-- wa_monte_cristo_peak_scramble ("North Col") on the same peak both give "James M. Keyes
-- and W. Zerum, 1923". Correcting the initial to match.
UPDATE routes SET fa = 'James M. Keyes, W. Zerum, 1923' WHERE id = 'wa_monte_cristo_peak_standard_route_variation_2';
