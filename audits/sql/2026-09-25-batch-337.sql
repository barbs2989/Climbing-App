-- wa_milk_n_honey: permit was NULL. Milk n' Honey climbs Colchuck Balanced Rock via the
-- Stuart Lake/Colchuck Lake Trailhead, the same Enchantment Permit Area trailhead used by
-- every other route on this peak and on neighboring Colchuck Peak/Dragontail Peak -- all of
-- which already carry this exact permit text (e.g. wa_nw_ridge_2 on this same peak,
-- wa_colchuck_peak_north_buttress_couloir, wa_dragontail_peak_r3). USFS Okanogan-Wenatchee
-- confirms: free self-issued day-use wilderness permit at the trailhead for day trips (this
-- route's own approach text describes a 3.5-4hr car-to-base day outing), and a Recreation.gov
-- advance-lottery quota permit for any overnight stay May 15-Oct 31. Filled with the app's
-- own established wording for this permit zone rather than inventing new phrasing.
UPDATE routes SET permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.' WHERE id = 'wa_milk_n_honey' AND permit IS NULL;
