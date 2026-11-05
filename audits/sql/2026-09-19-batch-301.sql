-- WA alpine audit batch 301

-- ==========================================================================
-- The Monk cluster (Cathedral Peak, Pasayten Wilderness) -- 5 routes on one
-- formation, audited together.
-- ==========================================================================

-- high_point_ft: all five routes stored 8606 ft, which is Cathedral Peak's OWN
-- summit elevation (confirmed via SummitPost/Mountain Project/willhiteweb: ~8,601 ft,
-- close to but not the same as the on-file 8606 -- plausibly a datum variant of the
-- SAME peak, left untouched). But none of these five routes climbs Cathedral Peak
-- itself -- every one of them tops out on "The Monk," a distinct, lower, semi-detached
-- tower "leaning against Cathedral Peak's flank" (this row's own overview text), whose
-- own Topout waypoint is already correctly recorded at 8300 ft on all five rows,
-- consistently. The row's own itinerary text explicitly treats Cathedral proper as a
-- SEPARATE objective ("Day 3: the Southeast Buttress or South Face on Cathedral
-- proper"). Corrected high_point_ft to match each route's own Topout waypoint (8300 ft)
-- rather than the neighboring, harder peak's summit.
UPDATE routes SET high_point_ft = 8300
  WHERE id = 'wa_the_monk_le_gibet' AND high_point_ft = 8606;
UPDATE routes SET high_point_ft = 8300
  WHERE id = 'wa_the_monk_odine' AND high_point_ft = 8606;
UPDATE routes SET high_point_ft = 8300
  WHERE id = 'wa_the_monk_scabo' AND high_point_ft = 8606;
UPDATE routes SET high_point_ft = 8300
  WHERE id = 'wa_the_monk_west_cracks_left_crack' AND high_point_ft = 8606;
UPDATE routes SET high_point_ft = 8300
  WHERE id = 'wa_the_monk_west_cracks_right_crack' AND high_point_ft = 8606;

-- outing_shape: all five Monk routes were NULL. Each route's own descent_text
-- describes returning to the base via the same NE-gully rappel line (or the route
-- itself, for the two shorter West Cracks lines), then walking back to Upper
-- Cathedral Lake and out via the same Andrews Creek Trailhead used on the way in --
-- an out-and-back to one trailhead. Filled so the app doubles dist_km for round-trip
-- display, matching the shared itinerary's stated multi-day out-and-back plan.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_the_monk_le_gibet' AND outing_shape IS NULL;
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_the_monk_odine' AND outing_shape IS NULL;
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_the_monk_scabo' AND outing_shape IS NULL;
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_the_monk_west_cracks_left_crack' AND outing_shape IS NULL;
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_the_monk_west_cracks_right_crack' AND outing_shape IS NULL;

-- loss_ft: Le Gibet, Odine, and West Cracks Left Crack all shared loss_ft = 1300 --
-- against a shared gain_ft = 6000 on the SAME approach/trailhead/descent for all five
-- Monk routes. The other two routes on this identical approach, Scabo (loss_ft 5450)
-- and West Cracks Right Crack (loss_ft 5200), both sit close to gain_ft (within
-- 550-800 ft, plausible trail-undulation variance) -- exactly what a round-trip
-- descent to the same trailhead should look like. 1300 ft is not: even using the
-- corrected 8300 ft high point, net rise from the 3050 ft trailhead is 5250 ft, so a
-- true out-and-back cannot lose only 1300 ft on the way down. This is the same
-- partial-figure-saved-as-the-total pattern documented repeatedly elsewhere in this
-- audit (e.g. batch 289's Phantom Peak, batch 291's Remmel Mountain NW Ridge).
-- Corrected to match gain_ft, following this audit's established out-and-back
-- convention (loss should equal gain absent a better anchor).
UPDATE routes SET loss_ft = 6000
  WHERE id = 'wa_the_monk_le_gibet' AND loss_ft = 1300 AND gain_ft = 6000;
UPDATE routes SET loss_ft = 6000
  WHERE id = 'wa_the_monk_odine' AND loss_ft = 1300 AND gain_ft = 6000;
UPDATE routes SET loss_ft = 6000
  WHERE id = 'wa_the_monk_west_cracks_left_crack' AND loss_ft = 1300 AND gain_ft = 6000;

-- watch_out: Le Gibet, Odine, West Cracks Left, and West Cracks Right were all
-- stored as a single newline-delimited string rather than the JSON array of strings
-- every other route (including this cluster's own Scabo sibling) uses -- the same
-- schema-shape defect documented repeatedly in prior batches. Converted via
-- string_to_array on the existing newlines; no content changed.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_the_monk_le_gibet'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = '5.8 route - part of The Monk multi-pitch section
Weather exposure on extended climbing
Route-finding complexity through multi-pitch terrain
Mixed terrain with loose rock
Descent rappel complexity through The Monk sections';
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_the_monk_odine'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = '5.8 route in The Monk complex
Weather exposure on extended climbing
Route-finding through multi-pitch terrain
Loose rock hazard in mixed sections
Descent rappel sequences';
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_the_monk_west_cracks_left_crack'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = '5.8 crack climbing - part of The Monk
Crack terrain with exposure
Weather exposure on climbing
Route-finding through multi-pitch terrain
Descent rappel complexity';
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_the_monk_west_cracks_right_crack'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = '5.7 crack climbing - part of The Monk system
Crack terrain with exposure hazard
Weather exposure on sustained crack climbing
Route-finding through The Monk crack system
Descent involves multiple rappels';

-- ==========================================================================
-- wa_the_hitchhiker (South Early Winters Spire)
-- ==========================================================================

-- waypoints[0] (Blue Lake Trailhead): stored elev/elevFt 5150 ft, contradicting this
-- SAME row's own approach_logistics.trailheadDirection ("~1.5 miles west of Washington
-- Pass, 5,400 ft") and its own bivy[0] entry ("Blue Lake trailhead roadside bivy",
-- elev 5400). This is the identical Blue Lake Trailhead elevation defect already
-- corrected on three other South Early Winters Spire routes in batch 295 (confirmed
-- there via WTA: Blue Lake Trailhead is 5,400 ft) and on Concord Tower's two South
-- Face routes in batch 296 -- The Hitchhiker was evidently not among the routes swept
-- either time. Corrected to match this row's own other two records and the
-- established external figure.
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '5400'::jsonb), '{0,elevFt}', '5400'::jsonb)
  WHERE id = 'wa_the_hitchhiker'
    AND waypoints->0->>'elev' = '5150'
    AND waypoints->0->>'elevFt' = '5150';

-- gain_ft/loss_ft and the itinerary's day-1 gainFt/lossFt: top-level gain_ft (2600)
-- and loss_ft (2200) disagreed with each other on what should be an out-and-back to
-- the same trailhead (this row's own descent_text ends "hike out via the climber's
-- trail to Blue Lake Trail" -- the same trailhead used on approach). The itinerary's
-- day-1 figures (gainFt 2200, lossFt 2200) were self-consistent with each other but,
-- using the now-corrected 5400 ft trailhead against the 7807 ft summit (net rise
-- 2407 ft), a gain of only 2200 ft is below the physical floor -- cumulative gain on
-- an ascending approach cannot be less than the net elevation change. Top-level
-- gain_ft (2600) clears that floor with a plausible undulation margin; loss_ft and
-- the itinerary are brought in line with it for round-trip symmetry.
UPDATE routes
SET loss_ft = 2600,
    itinerary = jsonb_set(jsonb_set(itinerary, '{days,0,gainFt}', '2600'::jsonb), '{days,0,lossFt}', '2600'::jsonb)
WHERE id = 'wa_the_hitchhiker'
  AND gain_ft = 2600
  AND loss_ft = 2200
  AND itinerary->'days'->0->>'gainFt' = '2200'
  AND itinerary->'days'->0->>'lossFt' = '2200';

-- outing_shape: NULL, though this row's own descent_text and itinerary both already
-- describe a same-trailhead round trip (Blue Lake TH out and back). Filled so the app
-- doubles dist_km for round-trip display.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_the_hitchhiker' AND outing_shape IS NULL;

-- watch_out: stored as a single newline-delimited string rather than the JSON array
-- of strings every other route uses -- the same schema-shape defect documented
-- repeatedly in prior batches. Converted via string_to_array on the existing
-- newlines; no content changed.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_the_hitchhiker'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = 'Sustained 5.11- climbing with exposure on upper pitches
Mixed terrain with loose rock throughout
Weather hazard - afternoon electrical activity on exposed terrain
Route-finding complexity requiring careful commitment
Descent involves navigation through loose rock sections';

-- ==========================================================================
-- wa_the_pleiades_scramble (The Pleiades)
-- ==========================================================================

-- partner_requirements, crowds, and seasonal_hazards.exposure all described a
-- fundamentally different trip -- a multi-day GLACIATED climb approached via Mount
-- Baker's Ptarmigan Ridge to Camp Kiser, with glacier travel and crevasse rescue --
-- while every other field on this row (waypoints, approach, descent_text, road,
-- bivy, approach_variants, itinerary, gear, pro_needs) consistently and in detail
-- describes a single-day, non-glaciated rock scramble reached via the Twin Lakes
-- Trailhead and the High Pass Trail, with no glacier crossing anywhere on it. This
-- row's own `corrections` field already flags the discrepancy in the route's naming
-- ("Could not confirm which specific Pleiades summit this route_id refers to, nor
-- find a literal glacier crossing despite the 'Glacier/Scramble' naming") but a prior
-- pass evidently did not carry that finding through to clean up the contaminated
-- fields, which read like they were copied from an actual Mount Baker glacier route.
-- Rewrote all three to match the approach/gear/itinerary this row already, correctly,
-- describes -- no new facts invented, only re-homing this row's own established
-- Twin Lakes / High Pass / loose-rock-scramble content into the fields that had
-- disagreed with it.
UPDATE routes SET partner_requirements = '{"fitnessSpec": {"hiking": "Strong, sustained all-day scrambling fitness -- a long day-trip approach via the Twin Lakes/High Pass Trail plus cross-country scree, snow, and gully travel to the ridge before any technical climbing begins", "packWeight": "Day-trip kit typical -- most parties do this car-to-car in a single long day (~10 hrs); a 30-40m rope and a few slings for Peak 1''s short roped section, plus a helmet given the loose rock"}, "approachTime": "Long day-trip approach -- Twin Lakes Trailhead via the High Pass Trail (~2 mi, losing ~300 ft) to High Pass, then cross-country scree/snow to the col on Larrabee''s south arm and a basin/gully traverse to the peaks; not an overnight for most parties", "requiredSkills": ["Class 3-4 scrambling on notoriously loose, rotten rock", "route-finding on an exposed ridge/gully traverse with no fixed retreat line", "comfort roping up for Peak 1''s short technical section", "judgment for the high-clearance, washout-prone access road and fast-moving North Cascades weather"], "experienceLevel": "Experienced scrambler comfortable on sustained loose rock and route-finding; not a glaciated climb, but Peak 1''s short roped section benefits from basic rock-climbing/belay skills"}'::jsonb
  WHERE id = 'wa_the_pleiades_scramble'
    AND partner_requirements = '{"fitnessSpec": {"hiking": "strong, sustained multi-day alpine fitness; long approach via Ptarmigan Ridge to Camp Kiser plus additional glaciated approach to the Pleiades ridge before any technical climbing begins", "packWeight": "overnight/glacier kit expected - rope, crevasse rescue hardware, camping gear; roughly 35-45+ lb pack on the approach"}, "approachTime": "long, multi-day approach - miles of trail and glacier travel to Camp Kiser via Ptarmigan Ridge, then further glacier/snow travel toward the Pleiades ridge; not a day-trip from the trailhead for most parties", "requiredSkills": ["glacier travel and crevasse rescue", "roped travel and self-arrest", "Class 3 scrambling on loose/friable rock", "route-finding in glaciated, unmarked terrain", "judgment for rapid weather changes high on the Baker massif"], "experienceLevel": "advanced/experienced alpine climber - comfortable with unroped Class 3 scrambling on loose rock and with roped glacier travel; not appropriate for a first alpine objective"}'::jsonb;
UPDATE routes SET crowds = '{"peakTraffic": "rarely climbed; if any traffic occurs it would cluster in the July-August optimal window", "solitudeRating": 5, "estimatePerSeason": "unknown - low-traffic; likely well under 10 parties/season based on remoteness (no trip reports found; the Pleiades is overshadowed by standard Mt. Baker/Larrabee objectives)"}'::jsonb
  WHERE id = 'wa_the_pleiades_scramble'
    AND crowds = '{"peakTraffic": "rarely climbed; if any traffic occurs it would cluster in the July-August optimal window, likely as a side objective for parties already in Ptarmigan Ridge/Camp Kiser terrain", "solitudeRating": 5, "estimatePerSeason": "unknown - low-traffic; likely well under 10 parties/season based on remoteness (no trip reports found; the Pleiades is overshadowed by standard Mt. Baker routes and even by nearby named objectives like the Cockscomb and Border Peaks that share the Ptarmigan Ridge approach)"}'::jsonb;
UPDATE routes SET seasonal_hazards = jsonb_set(seasonal_hazards, '{exposure}', '"Moderate-high: friable volcanic rock on the Class 3-4 summit scramble, with no fixed retreat line -- a slip on the notoriously loose rock could have serious consequences, compounded by the risk of rapid weather changes on the exposed ridge"'::jsonb)
  WHERE id = 'wa_the_pleiades_scramble'
    AND seasonal_hazards->>'exposure' = 'Moderate-high: friable volcanic rock on the Class 3 summit scramble combines with glacier travel exposure below it - a slip on loose rock or an unroped misstep near crevasses could have serious consequences, compounded by the risk of rapid weather changes';
