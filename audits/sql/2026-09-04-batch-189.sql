-- WA alpine audit — batch 189 (pass 4)
-- Routes: wa_eldorado_peak_east_ridge, wa_eldorado_peak_eldorado_glacier_nw,
-- wa_eldorado_peak_north_ridge, wa_eldorado_peak_northeast_face,
-- wa_eldorado_peak_west_arete, wa_elephant_butte_standard_route,
-- wa_elephant_head_standard, wa_energizer_bunny, wa_fire_on_the_mountain,
-- wa_fish_whistle

-- ============================================================================
-- wa_eldorado_peak_eldorado_glacier_nw (Eldorado Peak, NW Couloir): gain_ft
-- was 4000, well below the gain-floor test (high_point_ft 8872 minus the
-- row's own trailhead waypoint elev 2160 = 6712) and contradicting the row's
-- own structured itinerary, whose three days sum to gainFt 5400+1300+0=6700
-- and lossFt 0+1300+5400=6700 -- i.e. a symmetric out-and-back trip. The
-- already-correct loss_ft (6712) confirms the intended figure. Corrected
-- gain_ft to match.
UPDATE routes
SET gain_ft = 6712
WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw'
  AND gain_ft = 4000;

-- ============================================================================
-- wa_eldorado_peak_northeast_face: dist_km (19.47 km = 12.10 mi) matches the
-- row's OWN itinerary total mileage almost exactly (3.9+4.3+3.9 = 12.1 mi,
-- and the itinerary's own totalNote says "~12 mi round trip") -- i.e. it is
-- already storing the round-trip figure. Every other measurable route in
-- this catalog stores dist_km as ONE-WAY (the app doubles it for display;
-- confirmed on the sibling wa_eldorado_peak_east_ridge, whose dist_km=8 km
-- matches its own one-way waypoint chain and whose itinerary totalNote
-- "~10 mi round trip" = 2x8km). Storing the round-trip figure here means the
-- app would display ~24 mi round trip, double the ~12 mi this row's own
-- itinerary describes. Halved to restore the one-way convention.
UPDATE routes
SET dist_km = 9.74
WHERE id = 'wa_eldorado_peak_northeast_face'
  AND dist_km = 19.47;

-- ============================================================================
-- wa_elephant_butte_standard_route: loss_ft was 1788 against gain_ft 9700,
-- for a route whose own descent_text explicitly reverses the ascent ridge
-- back to the same Diablo trailhead ("retrace the approach... regain the
-- ridge crest... Drop onto the maintained trail and switchback down...to the
-- trailhead at Diablo"). For any true out-and-back route, cumulative gain
-- must equal cumulative loss (same start/end elevation) -- confirmed by
-- every other out-and-back route in this batch, where gain_ft and loss_ft
-- match closely. Corrected loss_ft to match the already-plausible gain_ft
-- (9700 well exceeds the simple net-rise gain floor of 7380-900=6480 ft, as
-- expected for an undulating ridge walk with "a significant drop and
-- reclimb" noted on the row's own summit waypoint).
UPDATE routes
SET loss_ft = 9700
WHERE id = 'wa_elephant_butte_standard_route'
  AND loss_ft = 1788;

-- ============================================================================
-- wa_elephant_head_standard: `permit` was null even though the row's own
-- trailhead waypoint note already states the requirement ("self-issue
-- Glacier Peak Wilderness permit and NW Forest Pass/day-fee kiosk at the
-- trailhead"). Re-homed into the empty permit column (no external research
-- -- the fact was already on the row, just not in the column the app's
-- PERMITS section reads).
UPDATE routes
SET permit = 'Glacier Peak Wilderness: free self-issue wilderness permit available at the Downey Creek Trailhead kiosk — Northwest Forest Pass (or day fee) required to park at the trailhead.'
WHERE id = 'wa_elephant_head_standard'
  AND permit IS NULL;

-- ============================================================================
-- wa_fire_on_the_mountain (Sloan Peak, SW Face): `pitches` was 8, but the
-- row's own `pitch_detail` lists exactly 7 pitches with individual grades
-- (matching `overview`'s "7 pitches") and three independent published
-- sources (AAC Publications, StephAbegg.com trip report, Mountaineers.org)
-- all describe this as a "seven pitch 5.10d" route. `pitches` feeds the
-- app's climbing-time estimate (techHrs) directly. Corrected to 7.
UPDATE routes
SET pitches = 7
WHERE id = 'wa_fire_on_the_mountain'
  AND pitches = 8;

-- Same route: dist_km (16.09 km = 10.0 mi) matches the row's own 2-day
-- itinerary total mileage exactly (4.5+5.5 = 10 mi, a single car-to-car
-- round trip with no separate hike-out day) -- i.e. it is storing the
-- round-trip figure rather than one-way. The row's own waypoint chain gives
-- the summit at 4.5 mi one-way, matching half of the stored dist_km almost
-- exactly. Halved to restore the one-way convention used elsewhere in this
-- catalog (see wa_eldorado_peak_northeast_face above for the same bug).
UPDATE routes
SET dist_km = 8.05
WHERE id = 'wa_fire_on_the_mountain'
  AND dist_km = 16.09;

-- ============================================================================
-- wa_energizer_bunny (Prusik Peak): `watch_out` was stored as one string
-- joined with literal `\n` characters instead of a JSON array of 5 items --
-- the recurring array-shape bug this audit keeps finding (see batch 186's
-- notes: Sharkfin Tower, Mount Shuksan SE Ridge, Chockstone Route, Colchuck
-- Peak Northeast Couloir, Dark Side of Liberty, Dolphin Chimney). Converted
-- to a proper array. Also corrected one item's altitude figure: "(8,900+
-- ft)" contradicted the row's own high_point_ft (8008 ft, Prusik Peak's
-- summit) -- corrected to "(8,000+ ft)" to match the row's own stored
-- elevation rather than an apparently-templated/generic number.
UPDATE routes
SET watch_out = '["Sustained 5.10 climbing with exposure", "Altitude weather hazard (8,000+ ft)", "Route-finding complexity on upper pitches", "Loose rock hazard in mixed sections", "Descent rappel complexity"]'::jsonb
WHERE id = 'wa_energizer_bunny'
  AND watch_out = 'Sustained 5.10 climbing with exposure
Altitude weather hazard (8,900+ ft)
Route-finding complexity on upper pitches
Loose rock hazard in mixed sections
Descent rappel complexity';

-- ============================================================================
-- wa_fish_whistle (Vesper Peak, North Face): `watch_out` had the same
-- array-shape bug (one newline-joined string instead of a JSON array of 8
-- items). Converting it also surfaced two items that directly contradict
-- this row's own other fields and were dropped rather than reformatted:
--   - "Descent via rappels and down-climbing...inspect anchor quality
--     carefully" implies an established rappel descent, but this row's own
--     `descent`/`descent_text` explicitly and at length document this as a
--     non-technical walk-off with "No rappel anchors or rap-specific beta
--     for this route were found in any published or trip-report account"
--     (rappelling is only an unlikely retreat contingency, "not the
--     documented standard descent").
--   - "Altitude and sustained climbing—8000+ feet" is flatly false: this
--     row's own high_point_ft is 6214 (matching the summit waypoint's
--     6221 ft and the parent area's elevation_ft of 6214), nowhere near
--     8,000+ ft. This item reads as boilerplate copied from a much higher
--     peak's hazard list rather than route-specific content.
-- The remaining 6 items are route-appropriate and were kept as-is.
UPDATE routes
SET watch_out = '["Sustained 5.9/5.10- friction and seam climbing with real runouts between bolts on slab pitches—protection strategy critical; runout potential of 20+ feet on some pitches if protection fails; requires bold climbing and good bolt reading", "Route-finding through short connector pitch (P4)—easy to miss or take variant that increases difficulty; study topo and photos; clear marking or experience essential to identify correct line", "Slab exposure on upper pitches—significant consequence if protection fails; route-finding errors can lead to unprotectable climbing; thorough topo study mandatory", "Weather exposure on open northeast face—afternoon storm potential; exposed position dangerous with lightning; wind common on slab sections; start early and monitor weather", "Approach terrain loose and exposed—scrambling on granite requires caution; early season snow/ice possible on approach; late season loose rock hazard", "Friable rock on some sections—typical North Cascades granite; test holds and placements; helmet recommended due to rockfall potential from above"]'::jsonb
WHERE id = 'wa_fish_whistle'
  AND watch_out = 'Sustained 5.9/5.10- friction and seam climbing with real runouts between bolts on slab pitches—protection strategy critical; runout potential of 20+ feet on some pitches if protection fails; requires bold climbing and good bolt reading
Route-finding through short connector pitch (P4)—easy to miss or take variant that increases difficulty; study topo and photos; clear marking or experience essential to identify correct line
Slab exposure on upper pitches—significant consequence if protection fails; route-finding errors can lead to unprotectable climbing; thorough topo study mandatory
Weather exposure on open northeast face—afternoon storm potential; exposed position dangerous with lightning; wind common on slab sections; start early and monitor weather
Approach terrain loose and exposed—scrambling on granite requires caution; early season snow/ice possible on approach; late season loose rock hazard
Descent via rappels and down-climbing—route-finding important; terrain can be confusing in darkness; headlamps required; inspect anchor quality carefully
Altitude and sustained climbing—8000+ feet with continuous elevation; altitude sickness possible; hydration and energy management critical
Friable rock on some sections—typical North Cascades granite; test holds and placements; helmet recommended due to rockfall potential from above';

-- Same route: gain_ft was 4115 against the row's own itinerary, whose single
-- day entry states gainFt: 4400 (matching the already-correct loss_ft:
-- 4400) for this symmetric single-day car-to-car out-and-back route.
-- Corrected gain_ft to match.
UPDATE routes
SET gain_ft = 4400
WHERE id = 'wa_fish_whistle'
  AND gain_ft = 4115;
