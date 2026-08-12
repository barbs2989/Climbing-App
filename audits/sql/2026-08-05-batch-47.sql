-- WA alpine audit — batch 47 (2026-08-05)
-- Routes: wa_the_monk_le_gibet, wa_the_monk_odine, wa_the_monk_scabo,
--         wa_the_monk_west_cracks_left_crack, wa_the_monk_west_cracks_right_crack
--         (Cathedral Peak / The Monk, Pasayten Wilderness), wa_the_needle_neve_glacier
--         (The Needle), wa_the_pleiades_scramble (The Pleiades), wa_the_pyramid_picket_south_route
--         (The Pyramid, Southern Pickets), wa_the_rake_traverse_route (The Rake, Southern Pickets),
--         wa_the_roof (Unicorn Peak)
-- Researched via 6 parallel agents, one peak-group each. Confirmed fixes below --
-- see audits/wa-alpine-audit-log.md for items independently verified as correct
-- and items flagged for human review rather than auto-fixed. All WHERE clauses
-- include the current (wrong) value as a safety check per project convention.

-- =========================================================================
-- The Pleiades (wa_the_pleiades) — wa_the_pleiades_scramble
-- =========================================================================
-- This route's own `corrections` field already flagged suspicion that the
-- "Glacier/Scramble Route" name didn't match a literal glacier crossing --
-- the suspicion was correct: partner_requirements/seasonal_hazards/access
-- carried content copy-pasted from an unrelated Mount Baker glacier route
-- (Park Glacier via Ptarmigan Ridge/Camp Kiser, a different mountain/
-- trailhead ~15 miles away), contradicting this route's own approach text,
-- waypoints, itinerary, hazards, and rope_type ("none").

-- wa_the_pleiades_scramble: partner_requirements described a multi-day
-- glaciated approach via Ptarmigan Ridge/Camp Kiser (Mount Baker's Park
-- Glacier route) instead of this route's own single-day, no-glacier,
-- Twin Lakes/High Pass Trail approach (confirmed via USFS Ptarmigan Ridge
-- Trail 682.1 page and this row's own approach/waypoints/itinerary/rope_type).
UPDATE routes
SET partner_requirements = '{
  "fitnessSpec": {
    "hiking": "strong single-day hiking/scrambling fitness -- ~7.5 mi round trip with sustained exposed Class 3-4 scrambling on loose rock, no glacier travel",
    "packWeight": "day-pack only, no glacier or overnight kit needed -- roughly 15-20 lb pack"
  },
  "approachTime": "long single day - about 4 miles one-way via Twin Lakes and the High Pass Trail to the base of the Pleiades ridge, then sustained Class 3-4 scrambling to the summit -- not an overnight or glacier objective",
  "requiredSkills": ["Class 3-4 scrambling on loose/friable rock", "route-finding on an unmarked ridge", "comfort with sustained exposure and no fixed retreat line", "judgment for rapid North Cascades weather changes"],
  "experienceLevel": "experienced scrambler comfortable with loose rock and exposure -- no glacier travel or crevasse rescue skills needed"
}'::jsonb
WHERE id = 'wa_the_pleiades_scramble'
  AND partner_requirements->>'approachTime' LIKE '%Camp Kiser%';

-- wa_the_pleiades_scramble: seasonal_hazards.crevasses claimed active glacier
-- travel "per on-file hazards," but no glacier/crevasse content exists
-- anywhere in this row's hazards/obj_haz, and rope_type = "none" -- same
-- contamination as above.
UPDATE routes
SET seasonal_hazards = jsonb_set(
  seasonal_hazards, '{crevasses}',
  '"No glacier travel on this route -- the only significant hazard is the loose, friable rock on the Class 3-4 summit scramble (see on-file hazards)."'::jsonb
)
WHERE id = 'wa_the_pleiades_scramble'
  AND seasonal_hazards->>'crevasses' LIKE '%glacier travel is required%';

-- wa_the_pleiades_scramble: access.land_manager claimed "some upper routes
-- crossing into North Cascades National Park," contradicted by this same
-- row's access.permit field ("this is Mount Baker Wilderness... not North
-- Cascades National Park"). The Pleiades/Twin Lakes/Mount Larrabee cluster
-- sits entirely within the Mount Baker Wilderness (Mt. Baker-Snoqualmie NF).
UPDATE routes
SET access = jsonb_set(
  access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) - Mount Baker Wilderness"'::jsonb
)
WHERE id = 'wa_the_pleiades_scramble'
  AND access->>'land_manager' LIKE '%North Cascades National Park%';

-- wa_the_pleiades_scramble: approach_logistics.trailhead named "Tomyhoi Lake
-- Trailhead," but this row's own approach text and waypoints[0] both name
-- Twin Lakes Trailhead (2 mi of high-clearance road past the Tomyhoi Lake
-- trailhead) as the actual start/end point.
UPDATE routes
SET approach_logistics = jsonb_set(
  approach_logistics, '{trailhead}', '"Twin Lakes Trailhead"'::jsonb
)
WHERE id = 'wa_the_pleiades_scramble'
  AND approach_logistics->>'trailhead' = 'Tomyhoi Lake Trailhead';

-- wa_the_pleiades_scramble: approach_logistics.trailheadDirection was
-- truncated mid-sentence ("...on SR 542 (Mt."); full text exists in this
-- row's own approach field.
UPDATE routes
SET approach_logistics = jsonb_set(
  approach_logistics, '{trailheadDirection}',
  '"From Glacier, WA, drive east about 12 miles on SR 542 (Mt. Baker Highway) to the WSDOT Shuksan maintenance facility, then onto Twin Lakes Road (FS-3065) for 6.5 miles to Twin Lakes."'::jsonb
)
WHERE id = 'wa_the_pleiades_scramble'
  AND approach_logistics->>'trailheadDirection' = 'From Glacier, WA, drive east about 12 miles on SR 542 (Mt.';

-- wa_the_pleiades_scramble: access.permit said no permit is required at all,
-- contradicting this same row's top-level `permit` field and its own
-- waypoints[0] note (both: free self-issue Mount Baker Wilderness permit at
-- the trailhead kiosk) -- standard USFS Region 6 wilderness practice.
UPDATE routes
SET access = jsonb_set(
  access, '{permit}',
  '"Free self-issue Mount Baker Wilderness permit at the trailhead kiosk -- no quota or fee. This is Mount Baker Wilderness (USFS land), not North Cascades National Park, so no NPS backcountry permit applies."'::jsonb
)
WHERE id = 'wa_the_pleiades_scramble'
  AND access->>'permit' LIKE '%No wilderness or climbing permit is required%';

-- =========================================================================
-- Unicorn Peak (wa_unicorn_peak) — wa_the_roof
-- =========================================================================

-- wa_the_roof: length_m (122) contradicted this route's own single-pitch
-- pitch_detail array (lengthM: 15) -- pitches=1, so length_m should equal
-- the one pitch's length. The same wrong 122 value appears verbatim on two
-- other single-15m-pitch Unicorn Peak routes (wa_open_book_2,
-- wa_classic_route_2) -- a copy-paste artifact, not three independent
-- measurements; those two are outside this batch's scope, flagged in the
-- log for a follow-up pass.
UPDATE routes
SET length_m = 15
WHERE id = 'wa_the_roof'
  AND length_m = 122;

-- =========================================================================
-- Cathedral Peak / The Monk (wa_cathedral_peak_pasayten) — wa_the_monk_odine
-- =========================================================================

-- wa_the_monk_odine: this row's own `corrections` field already documents
-- that Mountain Project lists the route at 5.9 (not 5.8) -- that fix WAS
-- applied to grade/grade_num/rock_grade (all already 5.9), but the
-- watch_out prose was never updated and still opens "5.8 route," directly
-- contradicting this row's own (already-corrected) grade fields.
UPDATE routes
SET watch_out = '5.9 route in The Monk complex
Weather exposure on extended climbing
Route-finding through multi-pitch terrain
Loose rock hazard in mixed sections
Descent rappel sequences'
WHERE id = 'wa_the_monk_odine'
  AND watch_out = '5.8 route in The Monk complex
Weather exposure on extended climbing
Route-finding through multi-pitch terrain
Loose rock hazard in mixed sections
Descent rappel sequences';

-- =========================================================================
-- The Pyramid, Southern Pickets (wa_the_pyramid_picket) — wa_the_pyramid_picket_south_route
-- =========================================================================

-- wa_the_pyramid_picket_south_route: road.status/seasonalGate claimed a
-- winter closure gate at the Goodell Creek trailhead, directly contradicted
-- by this same row's own access.closures field ("No seasonal gate affects
-- the Goodell Creek trailhead itself -- SR-20 stays open year-round to
-- Newhalem") and confirmed via WSDOT (the SR-20 winter gate is well east,
-- at Ross Dam/Early Winters, far from Goodell Creek/Newhalem).
UPDATE routes
SET road = jsonb_set(
             jsonb_set(road, '{status}', '"Year-round"', true),
             '{seasonalGate}', '"None -- SR-20 stays open year-round through Newhalem/Goodell Creek; only the high-country segment (Ross Dam to Early Winters) closes for winter"', true
           )
WHERE id = 'wa_the_pyramid_picket_south_route'
  AND road->>'status' = 'Seasonal'
  AND road->>'seasonalGate' = 'Winter closures';

-- wa_the_pyramid_picket_south_route: name field said "South Route" but this
-- row's own aspect (W), face ("West/connecting ridge to Mt. Degenhardt"),
-- pro_tips, and waypoint notes all describe a west-side line, and the
-- itinerary's own sourceNote already hedges "South Route/West Ridge." The
-- cited source trip report (Steph Abegg, "Southern Pickets 2") titles this
-- exact climb "Pyramid West Ridge." Note: this route's id keeps the
-- "_south_route" suffix -- renaming the id is a separate, riskier migration
-- left for a human, per this row's own id-vs-content mismatch pattern.
UPDATE routes
SET name = 'West Ridge'
WHERE id = 'wa_the_pyramid_picket_south_route'
  AND name = 'South Route';
