-- WA alpine audit — batch 191 (pass 4)
-- Routes: wa_fortress_mountain_northeast_face, wa_fortress_mountain_southwest_face,
-- wa_fortune_peak_east_slope, wa_fortune_peak_standard_route, wa_free_mojo,
-- wa_frenzel_spitz_south_route, wa_frying_pan_whitman_glaciers,
-- wa_ghost_peak_south_route, wa_gilbert_peak_conrad_glacier

-- ============================================================================
-- wa_free_mojo (Free Mojo, South Early Winters Spire): gain_ft/loss_ft (2200/2200)
-- are below the floor set by the row's own two waypoints -- Blue Lake Trailhead
-- at 5,200 ft and the South Early Winters Spire summit at 7,807 ft (elevation
-- independently confirmed via web search: SEWS is 7,807 ft, the high point of
-- the Liberty Bell Group). Net rise = 7807-5200 = 2607 ft, which this route's
-- own descent_text confirms is climbed and then fully reversed (finish via the
-- South Arete to the summit, then descend the South Arete back to the same
-- basin/trailhead) -- so gain must equal loss and both must be at least 2607.
-- Corrected both to that floor.
--
-- dist_km (8.37) is also being stored as the ROUND-TRIP mileage rather than the
-- app's one-way convention: 8.37 km converts to exactly 5.2 mi, which is the
-- same figure the row's own `itinerary` gives for the whole "Car-to-car climb"
-- day (miles: 5.2) -- i.e. round trip, not one-way. Halved to 4.19 km (2.6 mi
-- one-way), consistent with this route's own waypoint distMi of 2.3 mi one-way
-- to the summit (the small remaining gap is the on-route pitch distance beyond
-- the approach trail, which distMi does not capture).
UPDATE routes
SET gain_ft = 2607, loss_ft = 2607, dist_km = 4.19
WHERE id = 'wa_free_mojo'
  AND gain_ft = 2200 AND loss_ft = 2200 AND dist_km = 8.37;

-- ============================================================================
-- wa_frying_pan_whitman_glaciers (Little Tahoma): gain_ft (7600) disagrees with
-- this row's own loss_ft (7338) on a route whose own descent_text is explicit
-- that the descent fully reverses the ascent line back to the same trailhead
-- ("Descent reverses the ascent line... From the summit, downclimb... descend
-- the Whitman Glacier back through Whitman Notch onto the Fryingpan Glacier and
-- down to Meany Crest... follow the Fryingpan Creek Trail back... to the
-- Fryingpan Creek Trailhead") -- for a route reversing its own ascent, gain
-- must equal loss. The row's own day-by-day `itinerary` breakdown supports the
-- loss_ft side exactly: summing itinerary gainFt (3550+3788+0) and lossFt
-- (0+5188+2150) both total 7338 ft, matching the existing loss_ft precisely.
-- gain_ft's stored 7600 has no support in the row's own itinerary breakdown.
-- Lowered gain_ft to match loss_ft (7338).
UPDATE routes
SET gain_ft = 7338
WHERE id = 'wa_frying_pan_whitman_glaciers'
  AND gain_ft = 7600 AND loss_ft = 7338;

-- ============================================================================
-- wa_ghost_peak_south_route (Northern Pickets): dist_km (70.81) is stored as
-- the full ROUND-TRIP mileage rather than the app's one-way convention: 70.81
-- km converts to exactly 44 mi, matching this row's own itinerary totalNote
-- ("~44-mile round trip") and the sum of its six day-by-day itinerary `miles`
-- values (8.2+8+7.5+4+9+7 = 43.7 mi). The row's own waypoint chain gives the
-- one-way distance to the summit directly as distMi: 22 (miles), which is very
-- close to half of the round-trip total and converts to 35.4 km. Halved
-- dist_km to 35.41 km to match the app's one-way convention and this route's
-- own waypoint-stated one-way distance.
UPDATE routes
SET dist_km = 35.41
WHERE id = 'wa_ghost_peak_south_route'
  AND dist_km = 70.81;

-- ============================================================================
-- wa_gilbert_peak_conrad_glacier (Goat Rocks): road.name/status/seasonalGate
-- were all null, with only a Mazamas driving-distance-from-Portland note in
-- driveNote. Filled in the road name from multiple independently-agreeing
-- authoritative sources (USFS Okanogan-Wenatchee National Forest trail page,
-- multiple hiking guides) identifying the access road as South Fork Tieton
-- Road / Forest Road 1000, reached via Forest Road 1200 (Tieton Reservoir
-- Road) off US-12 near Naches -- and appended that route to driveNote,
-- preserving the existing Mazamas note rather than overwriting it. status and
-- seasonalGate are left null: no current-condition source was found to verify,
-- and inventing one would be exactly the kind of guess this audit avoids.
UPDATE routes
SET road = jsonb_set(
      jsonb_set(
        road,
        '{name}',
        '"South Fork Tieton Road (Forest Road 1000)"'
      ),
      '{driveNote}',
      '"From Naches, take US-12 west ~22 mi, turn onto Forest Road 1200 (Tieton Reservoir Road) for ~4.5 mi, then Forest Road 1000 (South Fork Tieton Road) ~12.6 mi to the Conrad Meadows trailhead at the road end. Roughly 200 miles / ~3 hours'' drive from Portland to the trailhead (Mazamas), allow extra time for gravel forest roads."'
    )
WHERE id = 'wa_gilbert_peak_conrad_glacier'
  AND road->>'name' IS NULL
  AND road->>'status' IS NULL
  AND road->>'seasonalGate' IS NULL;
