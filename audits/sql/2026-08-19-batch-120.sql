-- WA alpine audit — batch 120 (2026-08-19, pass 3)
-- Routes: wa_colchuck_peak_east_ridge, wa_colchuck_peak_holsten_hilden,
-- wa_colchuck_peak_north_buttress_couloir, wa_colchuck_peak_northeast_couloir
-- (Colchuck Peak); wa_colfax_peak_cosley_houston, wa_colfax_peak_kimchi_
-- suicide_volcano, wa_colfax_peak_polish_route (Colfax Peak);
-- wa_colonial_peak_west_ridge (Colonial Peak).
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention.

-- =========================================================================
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_east_ridge
-- =========================================================================

-- gain_ft (2800) didn't reconcile with this row's own trailhead waypoint
-- (Stuart Lake Trailhead, 3400 ft) and summit waypoint (Colchuck Peak,
-- 8705 ft) -- 5305 ft net. All three sibling Colchuck Peak routes sharing
-- this identical trailhead/summit pair already carry the correct value
-- (wa_colchuck_peak_colchuck_glacier: 5300, wa_colchuck_peak_holsten_hilden:
-- 5300, wa_colchuck_peak_northeast_couloir: 5305) -- this row was the one
-- outlier.
UPDATE routes SET gain_ft = 5305
WHERE id = 'wa_colchuck_peak_east_ridge' AND gain_ft = 2800;

-- =========================================================================
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_holsten_hilden
-- =========================================================================

-- grade ("Grade IV, M6, AI3+") contradicts this row's own corrections
-- field, which documents choosing Mountain Project's "Grade III, WI3, M6"
-- as the primary listed value over the 2011 AAC first-ascent account's
-- "IV, M6, AI3+" ("Kept Mountain Project's III/WI3 as the primary listed
-- value since it reflects current guidebook consensus") -- the stored
-- grade is the opposite of what the row's own documented decision says.
UPDATE routes SET grade = 'Grade III, WI3, M6'
WHERE id = 'wa_colchuck_peak_holsten_hilden' AND grade = 'Grade IV, M6, AI3+';

-- =========================================================================
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_north_buttress_couloir
-- =========================================================================

-- gain_ft (6600) didn't reconcile with this row's own trailhead waypoint
-- (Stuart Lake Trailhead, 3400 ft) and summit waypoint (Colchuck Peak,
-- 8705 ft) -- 5305 ft net, matching all three sibling Colchuck Peak routes
-- sharing this exact trailhead/summit (see east_ridge fix above). The
-- approach text describes no elevation loss/regain that would explain the
-- extra ~1,300 ft, and Wenatchee Outdoors' independent trip report puts
-- this climb at "3,300 ft" tent-to-tent from a camp near Colchuck Lake
-- (5574 ft) -- 5574+3300=8874, close enough to the 8705 ft summit to
-- corroborate a ~5,300-5,500 ft total rather than 6,600.
UPDATE routes SET gain_ft = 5305
WHERE id = 'wa_colchuck_peak_north_buttress_couloir' AND gain_ft = 6600;

-- =========================================================================
-- Colfax Peak (wa_colfax_peak) — wa_colfax_peak_polish_route
-- =========================================================================

-- dist_km (14.48) is roughly double the sibling wa_colfax_peak_cosley_
-- houston's dist_km (7.49) despite this row's own approach text stating
-- "Same trailhead and lower approach as Cosley-Houston" and this row's own
-- summit waypoint carrying the identical one-way distMi (4.5 mi = 7.24 km)
-- as the Cosley-Houston row's summit waypoint. Corrected to match the
-- one-way distance both the shared approach text and this row's own
-- waypoint mileage agree on.
UPDATE routes SET dist_km = 7.49
WHERE id = 'wa_colfax_peak_polish_route' AND dist_km = 14.48;
