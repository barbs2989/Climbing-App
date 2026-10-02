-- WA alpine audit batch 286 (pass 5)
-- Routes checked: wa_north_face_left_buttress, wa_north_face_var_right_directisimo,
-- wa_north_gardner_mountain_nw_couloir, wa_north_ridge_2, wa_north_ridge_3,
-- wa_north_ridge_4, wa_northeast_buttress_4, wa_northeast_face_direct

-- Fix 1: wa_north_face_left_buttress (Castle Peak, "Fight or Flight") --
-- bivy carried a 9-entry corridor-wide camp list (Harts Pass and Meadows campgrounds,
-- Windy Pass, Hopkins Lake and Castle Pass, Robinson Creek valley, Doris/Freds Lake
-- basins, Shellrock Pass, Lake of the Woods, Copper Glance Lake) that is the Harts Pass
-- Road (FR-5400) corridor serving Robinson Mountain, Osceola Peak, Blackcap Mountain,
-- Ptarmigan Peak, Dot Mountain, Monument Peak, Lake Mountain, Big Craggy and West Craggy
-- -- none of which is Castle Peak. Only one entry ("Hopkins Lake and Castle Pass") even
-- names Castle Peak, and it describes reaching it from the SOUTH via Harts Pass and the
-- PCT to Castle Pass, a completely different approach corridor from this route's own two
-- stated approaches (Manning Park, BC via Frosty Mountain/Princess Creek/Crow Creek, or
-- Ross Lake via Lightning Creek/Freezeout Creek Trail), both of which reach the peak's
-- NORTH side via a glacier at the base of the north face. This route's own approach/
-- approach_variants/descent_text fields never mention Harts Pass, Windy Pass, Castle
-- Pass, Robinson Creek, Doris Lake, Shellrock Pass, Lake of the Woods, or Copper Glance
-- Lake anywhere. Same corridor-contamination class as wa_neve_glacier_west_ridge in
-- batch 285 and wa_mount_spickard_silver_glacier in batch 282; cleared rather than
-- rewritten since nothing specific to this route's own approach was present to preserve.
UPDATE routes
SET bivy = NULL
WHERE id = 'wa_north_face_left_buttress'
  AND bivy::text LIKE '%Harts Pass and Meadows campgrounds%'
  AND bivy::text LIKE '%Robinson Creek valley campsites%';

-- Fix 2: wa_north_face_var_right_directisimo (Concord Tower) --
-- dist_km (9.7) matches this row's own itinerary.days[0].miles (6, i.e. 9.66 km) almost
-- exactly, which is the ROUND-TRIP car-to-car mileage this row itself states in
-- itinerary.totalNote ("about 9 hrs car-to-car"). The app's display convention doubles
-- dist_km to render round-trip distance (per CLAUDE.md), so a value already equal to the
-- round trip renders as double the true distance once the app doubles it again -- the
-- documented "stores the already-doubled round-trip figure instead of the one-way value"
-- pattern (same class as wa_mount_stuart_ice_cliff_glacier's dist_km fix in batch 283).
-- Corrected to half (4.85), which the app will then double back to ~9.7 km / 6 mi,
-- matching this row's own itinerary. Not a bulk fix -- this single row's own itinerary
-- field is the corroborating evidence.
UPDATE routes
SET dist_km = 4.85
WHERE id = 'wa_north_face_var_right_directisimo'
  AND dist_km = 9.7;

-- Fix 3: wa_north_ridge_3 (Cutthroat Peak, "North Ridge") --
-- gain_ft/loss_ft (2,800/2,800) are below the hard floor implied by this route's own
-- waypoints: Trailhead (4,947 ft) -> Summit (8,050 ft, per this row's own summit
-- waypoint elev/elevFt) is a minimum net rise of 3,103 ft -- a party cannot summit having
-- gained less than that. (high_point_ft on this row is 8,065, a difference from the
-- summit waypoint's 8,050 that is a genuine, independently-documented survey discrepancy
-- for this peak -- Wikipedia gives 8,066 ft, SummitPost gives 8,050 ft for the south/true
-- summit -- and is left alone rather than "resolved" one way; either figure still leaves
-- gain_ft short of the floor.) itinerary.days[0].gainFt/lossFt mirror the same wrong
-- 2,800 figure and totalNote restates it in prose ("an estimated ~2,800 ft round trip");
-- all three are corrected together to the row's own waypoint-derived floor of 3,103 ft,
-- the same "check:gain-floor-stated" class as wa_mount_terror_north_face (batch 284) and
-- wa_mount_stuart_stuart_glacier_couloir (batch 283).
UPDATE routes
SET gain_ft = 3103,
    loss_ft = 3103,
    itinerary = jsonb_set(
      jsonb_set(
        jsonb_set(itinerary, '{days,0,gainFt}', '3103'::jsonb),
        '{days,0,lossFt}', '3103'::jsonb
      ),
      '{totalNote}',
      '"A shorter single-day outing than Cutthroat''s other lines: roughly 4.0 mi and an estimated ~3,100 ft round trip, typically well under 10 hours."'::jsonb
    )
WHERE id = 'wa_north_ridge_3'
  AND gain_ft = 2800
  AND loss_ft = 2800;

-- Fix 4: wa_north_ridge_4 (Primus Peak, "North Ridge") --
-- This row disagrees with itself on the first-ascent year: fa = "1986" (matching
-- external corroboration -- SummitPost/AAC sources independently give the Mark Bebie
-- first ascent as 1986), while beta states "First recorded climbed by Mark Bebie on
-- September 7, 1987". The AAJ report on this climb was published in the 1987 American
-- Alpine Journal (which reports on the PRECEDING climbing season), which is almost
-- certainly the source of the year confusion in beta -- the climb itself was in 1986.
-- Corrected the year in beta to match fa and the external sources; the day/month
-- (September 7) could not be independently re-verified beyond search snippets and is
-- left unchanged since nothing contradicts it.
UPDATE routes
SET beta = replace(beta, 'September 7, 1987', 'September 7, 1986')
WHERE id = 'wa_north_ridge_4'
  AND beta LIKE '%September 7, 1987%'
  AND fa = '1986';

-- Fix 5: wa_northeast_buttress_4 (Colchuck Peak, "Northeast Buttress") --
-- watch_out was stored as a single string (every sibling row in this dataset stores
-- watch_out as a JSON array) describing an entirely different, unrelated climb: mixed
-- M4 pitches, an "ice bulge (A2-3 rating)", an "S-shaped gully", cornice-collapse risk,
-- and "wind-loaded terrain near Snoqualmie Pass" -- none of which has any connection to
-- this route, a dry granite alpine rock buttress on Colchuck Peak in the Enchantments
-- (nowhere near Snoqualmie Pass) with no ice grade, no mixed-climbing pitches, and no
-- cornices anywhere else on this row. This row's own hazards/beta/approach_variants
-- fields, independently corroborated by American Alpine Institute and SummitPost trip
-- reports (loose rock throughout, a moat crossing that guards the buttress toe, rockfall,
-- an icy glacier descent late-season, difficult routefinding around a crux dihedral that
-- is frequently never located), describe the real character of this climb. Replaced the
-- contaminated string with a proper array drawn entirely from facts already stated
-- elsewhere on this same row (hazards, beta, approach_variants[0].baseFinding,
-- climbing_route[2].notes) plus the confirming external sources -- no new facts
-- introduced.
UPDATE routes
SET watch_out = '["Loose and occasionally mossy rock throughout the route, especially on the lower pitches and the long ledge traverse", "Difficult routefinding — the crux dihedral higher on the route is frequently never located, and this route has a real reputation for parties bailing", "Two established starts, the Kearney and Beckey variations, that do not converge until around pitch 5 — mixing them up is the routine error here", "Crossing the moat at the base of the buttress can be the technical crux of the day in a lean snow year — some parties rope up for it", "A very long 17-21 hour car-to-car day, often finishing the Colchuck Glacier descent by headlamp — fatigue-driven routefinding on the descent is the bigger hazard, not the technical climbing"]'::jsonb
WHERE id = 'wa_northeast_buttress_4'
  AND watch_out::text LIKE '%Snoqualmie Pass%';
