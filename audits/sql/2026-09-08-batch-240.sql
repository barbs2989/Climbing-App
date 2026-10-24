-- wa_whitehorse_mountain_r1 (Northwest Shoulder/Northwest Face ice/snow variant):
-- gain_ft/loss_ft stored as 7000, contradicting the row's OWN itinerary object, which states
-- gainFt/lossFt=6400 in itinerary.days[0] AND repeats "about 6,400 ft gain" in itinerary.totalNote
-- (two independent mentions inside the same field agreeing with each other, against a lone
-- top-level column). The route's own waypoint chain (900 ft trailhead -> 6,852 ft summit, summing
-- each leg) gives ~5,952 ft, closer to 6,400 than to 7,000, corroborating the itinerary over the
-- top-level column.
UPDATE routes SET gain_ft = 6400, loss_ft = 6400 WHERE id = 'wa_whitehorse_mountain_r1';

-- wa_windy_peak_trail ("Windy Peak Trail (Standard Walk-up)" via Long Swamp Campground, Trail #342):
-- approach_logistics.trailhead named "Cathedral Driveway Trailhead" -- but this route's own
-- waypoints[0] is "Windy Peak Trailhead / Long Swamp Campground" (48.855663, -119.946697), its own
-- approach text describes driving FR-39 to Long Swamp Campground as "the standard trailhead for
-- Windy Peak Trail #342", and that SAME approach text explicitly warns not to confuse this with
-- "the Windy Creek/Cathedral Driveway trailhead about 3 miles farther west" -- a sibling route's
-- trailhead cross-contaminated into this row's approach_logistics. Corrected to match the row's own
-- waypoint/approach text, and trailheadLat/trailheadLng added (previously absent) from that same
-- waypoint since only peakLat/peakLng existed. Trail #342 total length (11.5 mi) and the 2.5 mi
-- wilderness-boundary waypoint were independently confirmed against USFS trail data, so the row's
-- own waypoint chain is trustworthy here.
UPDATE routes
SET approach_logistics = jsonb_set(
    jsonb_set(
      jsonb_set(approach_logistics, '{trailhead}', '"Windy Peak Trailhead / Long Swamp Campground"'),
      '{trailheadLat}', '48.855663'
    ),
    '{trailheadLng}', '-119.946697'
  )
WHERE id = 'wa_windy_peak_trail';

-- wa_windy_peak_iron_gate_trail ("Windy Peak via Iron Gate Trailhead"):
-- waypoints[0] (Iron Gate Trailhead) had a null elevFt. Filled from external confirmation
-- (Colville National Forest trailhead listing, corroborated by a second independent source):
-- Iron Gate Trailhead sits at 6,160 ft. This also matches the row's own approach directions
-- (Loomis -> FR-39 ~14 mi -> FR-3900-500 ~6 mi), which closely match the USFS-published
-- 2.2 mi + 13.6 mi + 5.7 mi routing to the same trailhead.
UPDATE routes
SET waypoints = jsonb_set(
    jsonb_set(waypoints, '{0,elevFt}', '6160'),
    '{0,elev}', '6160'
  )
WHERE id = 'wa_windy_peak_iron_gate_trail';

-- wa_witches_tower_south_face ("South Face / Standard Route"):
-- length_m stored as 488, but the row's own pitch_detail lists exactly 2 pitches
-- (lengthM 25 + lengthM 15 = 40m total), and every other field on this row (grade II 5.4,
-- "quick summit add-on", "short technical crux") describes a very short route consistent with
-- ~40m of roped climbing on a small alpine tower (Witches Tower is a minor sub-summit near
-- Dragontail Peak). 488m is off by more than an order of magnitude from the row's own stated
-- pitch breakdown. Corrected to match the sum of its own pitch_detail lengths.
-- NOTE: this row's beta/descent_text also closely duplicate sibling route
-- wa_witches_tower_southwest_corner's beta almost verbatim (the "ascend the sharp ridge ~100 ft
-- ... 5.5 step-up move ... jumping a 4-ft slot" language appears in both) -- flagged separately
-- for human review as a likely content-conflation between sibling routes, not auto-fixed here.
UPDATE routes SET length_m = 40 WHERE id = 'wa_witches_tower_south_face';
