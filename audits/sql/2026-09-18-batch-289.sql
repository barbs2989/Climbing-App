-- WA alpine route audit batch 289 (pass 5)
-- Routes checked: wa_olympus_traverse, wa_open_book_2, wa_ottohorn_southeast_route,
-- wa_ottohorn_west_ridge, wa_overcoat_peak_southeast_route, wa_pernod_spire_standard,
-- wa_phantom_peak_south_route, wa_phantom_peak_west_ridge

-- Fix 1: wa_overcoat_peak_southeast_route (Overcoat Peak, Southeast Route) --
-- gain_ft (6032) and loss_ft (5800) both disagree with this row's own 3-day
-- itinerary.days[] sum (gain 5200+900+100=6200, loss 0+2900+3300=6200), which is
-- internally symmetric as expected for an out-and-back returning to the same
-- trailhead, and corroborated by this row's own itinerary.totalNote ("~40 miles
-- round trip and ~6,000 ft net gain"). loss_ft (5800) additionally falls below
-- the hard floor implied by this row's own Dingford Creek Trailhead waypoint
-- (1,450 ft) and high_point_ft (7,432 ft) = 5,982 ft minimum -- a party returning
-- to the trailhead cannot lose less than it climbed. FA (July 1897, Sylvester &
-- Charlton) and elevation (7,432 ft) independently confirmed via web search
-- (Wikipedia's Overcoat Peak article) and left unchanged. outing_shape was null;
-- set to 'outback' -- this row's own descent/approach text says "reverse the
-- ascent" and "reverse the approach" back to the same trailhead, a 3-day/2-night
-- round trip per itinerary.totalNote.
UPDATE routes
SET gain_ft = 6200,
    loss_ft = 6200,
    outing_shape = 'outback'
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND gain_ft = 6032
  AND loss_ft = 5800
  AND outing_shape IS NULL;

-- Fix 2: wa_open_book_2 (Unicorn Peak, Open Book) --
-- gain_ft/loss_ft (2,397/2,397) disagree with this row's own single-day itinerary
-- (2,600/2,600 for the identical car-to-car day), which is symmetric as required
-- for a round trip back to the trailhead. Corrected the top-level columns to
-- match. Two siblings sharing this exact approach (wa_the_roof, wa_classic_route_2
-- -- area wa_unicorn_peak, out of scope for this batch, not touched here) show the
-- SAME mismatch with the SAME two numbers, which is corroborating rather than
-- incidental -- flagged below for whoever's batch reaches them next.
-- NOTE: the underlying Snow Lake Trailhead elevation this floor is built on is NOT
-- settled -- this row's own waypoint (and the two siblings') states 4,400 ft, but
-- a fourth sibling (wa_unicorn_peak_r1, more heavily researched, full waypoint
-- chain) states 4,574 ft, AND this row's own approach text ("~1 mile, about 700 ft
-- gain, to Snow Lake") implies roughly 4,000 ft given Snow Lake's externally-
-- confirmed 4,688 ft elevation (AllTrails/WTA-sourced search results). All three
-- candidate trailhead elevations were left as recorded; only the internal
-- top-level/itinerary mismatch was corrected. See the flagged note below.
UPDATE routes
SET gain_ft = 2600,
    loss_ft = 2600
WHERE id = 'wa_open_book_2'
  AND gain_ft = 2397
  AND loss_ft = 2397;

-- Fix 3: wa_phantom_peak_south_route (Phantom Peak, South/Southwest Route) --
-- gain_ft (1,916) and loss_ft (1,000) are far below the hard floor implied by this
-- row's own waypoints: Hannegan Pass Trailhead (3,120 ft, elev AND elevFt agree)
-- to the summit (8,016 ft per this row's own high_point_ft) is a minimum net rise
-- of 4,896 ft for a 5-day, ~30-mile round trip -- physically impossible at 1,916/
-- 1,000 ft. The stored gain_ft (1,916) exactly equals this row's OWN 'Southwest
-- buttress saddle' waypoint (6,100 ft) subtracted from the summit (8,016 ft) --
-- i.e. only the final summit-push segment's gain was stored as if it were the
-- whole route's total, the same sub-component-mistaken-for-the-total class
-- documented in CLAUDE.md for wa_northwest_mox_peak_standard_route (batch 288).
-- This row's own 5-day itinerary.days[] sum is internally consistent and gives the
-- real total: gain 2500+3000+2400+300+200=8400, loss 200+300+2400+3000+2500=8400
-- (symmetric, correct for a round trip back to the same trailhead), well above the
-- 4,896 ft floor and consistent with a multi-day approach crossing Whatcom Pass,
-- Perfect Pass and the Challenger Glacier. Corrected gain_ft/loss_ft to match.
--
-- dist_km (51.5 km = 32.0 mi) is roughly DOUBLE what this row's own itinerary
-- implies: itinerary.days[].miles sums to 30 mi (the round-trip total, matching
-- itinerary.totalNote's own "~30-32 mile round trip"), and the app's own
-- effDistKm() (RouteDetail.jsx) halves that sum for an out-and-back to get the
-- one-way distance it displays -- (30 mi * 1.60934) / 2 = 24.14 km. The stored
-- 51.5 km looks like the round-trip figure was stored directly instead of being
-- halved first, the same class already documented and fixed for
-- wa_north_face_var_right_directisimo (batch 286) and
-- wa_mount_stuart_ice_cliff_glacier (batch 283). Corrected to 24.14.
--
-- outing_shape was null; set to 'outback' -- this row's own itinerary explicitly
-- returns to the Hannegan Pass Trailhead over 5 days (days 4-5 reverse days 2-1).
UPDATE routes
SET gain_ft = 8400,
    loss_ft = 8400,
    dist_km = 24.14,
    outing_shape = 'outback'
WHERE id = 'wa_phantom_peak_south_route'
  AND gain_ft = 1916
  AND loss_ft = 1000
  AND dist_km = 51.5
  AND outing_shape IS NULL;

-- wa_phantom_peak_south_route: waypoints[6] (the summit) stored elev/elevFt as
-- 8,000 ft, disagreeing with this row's own top-level high_point_ft (8,016 ft).
-- External corroboration (peakery.com lists 8,015 ft, essentially the same figure
-- within normal source variance) favors 8,016/high_point_ft over the waypoint's
-- rounder 8,000. Corrected the waypoint to match.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{6,elev}', '8016'::jsonb),
      '{6,elevFt}', '8016'::jsonb
    )
WHERE id = 'wa_phantom_peak_south_route'
  AND waypoints#>>'{6,elev}' = '8000'
  AND waypoints#>>'{6,elevFt}' = '8000';

-- wa_phantom_peak_south_route: descent_text names "the 1959 second-ascent party
-- (Josendal, Sharpe, Spickard)". External corroboration (web search on the AAC's
-- New Climbs in the Northern Pickets article and independent trip-report summaries)
-- indicates the second ascent itself was made in 1958 -- 18 years after the 1940
-- Beckey first ascent, per the summit register -- and was reported the following
-- year in the 1959 American Alpine Journal. Same AAJ-publication-year-vs-actual-
-- climb-year confusion class already documented and fixed for wa_north_ridge_4
-- (batch 286). Corrected the ascent year and kept the journal-year context.
UPDATE routes
SET descent_text = replace(
  descent_text,
  'the 1959 second-ascent party (Josendal, Sharpe, Spickard)',
  'the 1958 second-ascent party (Josendal, Sharpe, Spickard; reported the following year in the 1959 American Alpine Journal)'
)
WHERE id = 'wa_phantom_peak_south_route'
  AND descent_text LIKE '%the 1959 second-ascent party (Josendal, Sharpe, Spickard)%';

-- Fix 4: wa_pernod_spire_standard (Pernod Spire, Standard Rock Route) --
-- waypoints[1] (Burgundy Col) and waypoints[2] (Pernod Spire Summit) both had no
-- elev/elevFt at all. Burgundy Col's own note text already states its elevation
-- ("7,770-ft notch separating the Wine Spires from Vasiliki Ridge"); filled elev/
-- elevFt from that row's own figure. The note text also carried a leaked pair of
-- wrapping quote marks around the whole sentence (as if pasted from a quoted
-- source) -- stripped, matching the cleanup already done to this row's other
-- waypoint note per its own corrections field ("previously a leaked internal-
-- research artifact"). The summit waypoint had no elev at all; filled from this
-- row's own high_point_ft (8,507 ft). outing_shape was null; set to 'outback' --
-- this row's own itinerary/descent text describes a rappel descent back to the
-- same SR-20 pullout ("hike all the way out").
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(waypoints, '{1,elev}', '7770'::jsonb),
        '{1,elevFt}', '7770'::jsonb
      ),
      '{1,note}', '"7,770-ft notch separating the Wine Spires from Vasiliki Ridge, reached via steep talus/scree above the Bench camp."'::jsonb
    ),
    outing_shape = 'outback'
WHERE id = 'wa_pernod_spire_standard'
  AND waypoints#>>'{1,name}' = 'Burgundy Col'
  AND outing_shape IS NULL;

UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{2,elev}', '8507'::jsonb),
      '{2,elevFt}', '8507'::jsonb
    )
WHERE id = 'wa_pernod_spire_standard'
  AND waypoints#>>'{2,name}' = 'Pernod Spire Summit'
  AND waypoints#>'{2,elev}' IS NULL;

-- Fix 5: wa_ottohorn_southeast_route (Ottohorn, Southeast Route) --
-- waypoints[0] (Goodell Creek Trailhead) had lat/lng of 48.68276,-121.26928, which
-- disagrees by roughly 450 m with this SAME row's own approach_logistics.
-- trailheadLat/trailheadLng (48.68664,-121.27121) for the identical trailhead --
-- and that second coordinate also matches the sibling wa_ottohorn_west_ridge's own
-- waypoint AND approach_logistics for the same Goodell Creek trailhead (3 records
-- agree, 1 is the outlier). Corrected the waypoint's lat/lng to the agreeing value
-- (declared from this row's own approach_logistics, no coordinate invented). Also
-- filled elev (previously absent) from this row's own approach text, which states
-- the trailhead is "at about 600 feet".
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(waypoints, '{0,elev}', '600'::jsonb),
          '{0,lat}', '48.68664'::jsonb
        ),
        '{0,lng}', '-121.27121'::jsonb
      ),
      '{0,note}', '"Unpaved pullout off Goodell Creek Rd, just before Goodell Creek Campground, across SR-20 from Newhalem; standard access for all Southern Pickets objectives via the Terror Creek climbers'' trail. Coordinate corrected 2026-09-18 to match this row''s own approach_logistics and the sibling West Ridge route''s waypoint for the same trailhead."'::jsonb
    )
WHERE id = 'wa_ottohorn_southeast_route'
  AND waypoints#>>'{0,name}' = 'Goodell Creek Trailhead'
  AND waypoints#>>'{0,lat}' = '48.68276';

-- wa_ottohorn_southeast_route: dist_km (27.68 km = 17.2 mi) is roughly DOUBLE this
-- row's own itinerary-implied one-way distance: itinerary.days[].miles sums to
-- 17.5 mi (the round-trip total: 7.5 out + 2.5 summit day + 7.5 return), which the
-- app's own effDistKm() halves for this outing_shape='outback' route to get
-- (17.5 * 1.60934) / 2 = 14.08 km. Same doubled-instead-of-halved dist_km class as
-- this batch's wa_phantom_peak_south_route fix above. Corrected to 14.08.
UPDATE routes
SET dist_km = 14.08
WHERE id = 'wa_ottohorn_southeast_route'
  AND dist_km = 27.68;

-- Fix 6: wa_ottohorn_west_ridge (Ottohorn, West Ridge) --
-- waypoints[0] (the Goodell Creek trailhead) had no elev at all; this row's own
-- approach text gives the trailhead's coordinates AND elevation explicitly
-- ("Trailhead at 48.6733, -121.2658, roughly 600 ft"). Filled elev = 600 from that.
-- The SAME approach-text sentence's coordinate (48.6733,-121.2658) also disagrees
-- with this row's OWN waypoints[0] lat/lng (48.68664,-121.27121) and its OWN
-- approach_logistics.trailheadLat/Lng (48.68664,-121.27121, i.e. those two agree
-- with each other) for the identical trailhead -- corrected the approach-text
-- coordinate to match the row's own agreeing structured records.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '600'::jsonb),
    approach = replace(
      approach,
      '(48.6733, -121.2658, about 600 ft)',
      '(48.68664, -121.27121, about 600 ft)'
    )
WHERE id = 'wa_ottohorn_west_ridge'
  AND waypoints#>>'{0,name}' = 'Goodell Creek / Upper Goodell Group Camp trailhead (SR-20, Newhalem)'
  AND approach LIKE '%(48.6733, -121.2658, about 600 ft)%';

