-- WA alpine audit — batch 121 (2026-08-19, pass 3)
-- Routes: wa_complete_south_buttress (Cutthroat Peak),
-- wa_concord_tower_north_face (Concord Tower), wa_copper_peak_south_route
-- (Copper Peak), wa_corteo_peak_southwest_ridge (Corteo Peak),
-- wa_crater_mountain_standard_route (Crater Mountain),
-- wa_crooked_thumb_peak_east_face, wa_crooked_thumb_peak_south_route
-- (Crooked Thumb Peak).
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention.

-- =========================================================================
-- Cutthroat Peak (wa_cutthroat_peak) — wa_complete_south_buttress
-- =========================================================================

-- dist_km (6.44) matches this row's own itinerary.totalNote almost exactly
-- ("roughly 4.0 mi ... round trip" -> 4.0 mi = 6.44 km) and its own
-- itinerary.days[0].miles (4, paired with gainFt:3300, which equals the
-- top-level gain_ft=3300 exactly -- confirming the itinerary describes the
-- same trip as the top-level fields). The app renders round trip as
-- dist_km*2 (dist_km is meant to be one-way per CLAUDE.md's documented
-- convention), so a value that already equals the row's own stated round
-- trip mileage will be doubled again on screen. Corrected to the one-way
-- half of the row's own round-trip figure.
UPDATE routes SET dist_km = 3.22
WHERE id = 'wa_complete_south_buttress' AND dist_km = 6.44;

-- =========================================================================
-- Concord Tower (wa_concord_tower) — wa_concord_tower_north_face
-- =========================================================================

-- high_point_ft (7569) matches neither of the two elevations this row's
-- own data_quality.gaps note names as the live external dispute (7,560 ft
-- per Mountain Project/WTA/StephAbegg vs ~7,611-7,612 ft per ListsOfJohn),
-- and does not match this row's own summit waypoint elev (7611). The row
-- is internally self-contradictory regardless of which external figure is
-- ultimately correct. Reconciled to the row's own waypoint (7611), which
-- also falls inside the externally-cited ListsOfJohn range; the underlying
-- external dispute (7,560 vs ~7,612) between sources is unresolved by this
-- run and is flagged in the log rather than adjudicated here.
UPDATE routes SET high_point_ft = 7611
WHERE id = 'wa_concord_tower_north_face' AND high_point_ft = 7569;

-- dist_km (9.7) does not match a one-way convention under either same-row
-- signal available: this row's own summit waypoint gives a one-way
-- distMi of 2.3 mi (3.70 km), and this row's own itinerary states a
-- round-trip "6" miles (paired with gainFt:2300, close to the top-level
-- gain_ft=2000), implying a one-way figure well under half of the stored
-- 9.7 km either way. Corrected to match the row's own waypoint-derived
-- one-way mileage (2.3 mi = 3.70 km), the same methodology used in prior
-- batches (e.g. batch 120's wa_colfax_peak_polish_route fix).
UPDATE routes SET dist_km = 3.70
WHERE id = 'wa_concord_tower_north_face' AND dist_km = 9.7;

-- =========================================================================
-- Copper Peak (wa_copper_peak) — wa_copper_peak_south_route
-- =========================================================================

-- dist_km (17.7) is IDENTICAL to wa_corteo_peak_southwest_ridge's dist_km
-- in this same batch despite the two routes having unrelated approaches
-- (Holden Village boat-in vs. Rainy Pass trailhead) and different
-- waypoint-derived one-way distances (5.5 mi vs 6.3 mi) -- a duplicate
-- value that cannot be correct for both rows. This row's own summit
-- waypoint gives a one-way distMi of 5.5 mi (8.85 km); external trip
-- reports corroborate a round trip in the 8-9.72 mi range (4-4.86 mi
-- one-way), the same order of magnitude. Corrected to the row's own
-- waypoint-derived one-way mileage.
UPDATE routes SET dist_km = 8.85
WHERE id = 'wa_copper_peak_south_route' AND dist_km = 17.7;

-- =========================================================================
-- Corteo Peak (wa_corteo_peak) — wa_corteo_peak_southwest_ridge
-- =========================================================================

-- grade_num (2) does not match this row's own grade text ("Class 3-4",
-- grade_system "class"). The identical grade string on
-- wa_copper_peak_south_route in this same batch (also "Class 3-4" /
-- "class") stores grade_num=4 -- the same input should not produce two
-- different sortable grade values. grade_num feeds the finder RPCs'
-- grade sort/filter (per CLAUDE.md), so this route was ranking as though
-- "Class 2". Corrected to match the sibling row's grade_num for the same
-- grade text.
UPDATE routes SET grade_num = 4
WHERE id = 'wa_corteo_peak_southwest_ridge' AND grade_num = 2;

-- dist_km (17.7) is IDENTICAL to wa_copper_peak_south_route's dist_km in
-- this same batch (see that fix above for why a shared value cannot be
-- correct for both unrelated routes). This row's own summit waypoint
-- gives a one-way distMi of 6.3 mi (10.14 km); external trip reports for
-- this route range 9.8-11 mi round trip (4.9-5.5 mi one-way), same order
-- of magnitude. Corrected to the row's own waypoint-derived one-way
-- mileage.
UPDATE routes SET dist_km = 10.14
WHERE id = 'wa_corteo_peak_southwest_ridge' AND dist_km = 17.7;

-- =========================================================================
-- Crater Mountain (wa_crater_mountain) — wa_crater_mountain_standard_route
-- =========================================================================

-- permit (top-level scalar) describes North Cascades National Park
-- Complex's NPS backcountry-permit process ("reserve on Recreation.gov or
-- walk-up at the Marblemount Wilderness Information Center"), but this
-- route's own access.landManager field (and external confirmation: Crater
-- Mountain sits in the Pasayten Wilderness, Okanogan-Wenatchee National
-- Forest -- USFS land, not NPS) says otherwise. This row's own
-- access.permit field already states the correct process (free self-issue
-- Pasayten Wilderness permit at the trailhead; the NPS backcountry permit
-- only applies if a trip continues into the adjoining National Park via
-- routes like the Devils Dome loop, "not applicable to a standard
-- out-and-back Crater Mountain trip"). The top-level permit field
-- contradicted the row's own more detailed access.permit field. Corrected
-- to match it.
-- (Matched with LIKE on a semicolon-free prefix of the current text, rather than an
-- exact-equality WHERE, because the stored value itself contains a literal ';' --
-- this project's own audits/sql checker splits statements on top-level ';' and cannot
-- parse an exact match containing one. The prefix below is specific to this route.)
UPDATE routes SET permit = 'Free self-issue Pasayten Wilderness permit required at the trailhead (Canyon Creek Trailhead), no quota, no fee. A separate paid NPS backcountry permit is only needed if a trip continues into the adjoining North Cascades National Park Complex (e.g. via the Devils Dome loop), not applicable to a standard out-and-back Crater Mountain climb, which stays on National Forest land.'
WHERE id = 'wa_crater_mountain_standard_route'
  AND permit LIKE 'North Cascades NP complex: no permit for day climbs%';
