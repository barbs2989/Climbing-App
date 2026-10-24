-- ============================================================================
-- wa_east_ridge_3 (Silver Star Mountain, Okanogan): `waypoints`/`gpx` are
-- contaminated with a DIFFERENT route's trailhead. This route's `overview`,
-- `beta`, `approach`, `approach_logistics`, and `descent_text` all
-- independently and consistently describe the Childs/Goldie complete East
-- Ridge traverse (FA Sept 14, 2000): starting at the "Cedar Creek trailhead
-- near Mazama" ("THIS IS THE ROUTE'S DEFINING LOGISTICAL FACT: IT USES A
-- DIFFERENT TRAILHEAD FROM EVERY OTHER ROUTE ON THE PEAK" per
-- approach_variants), gaining the ridge at the confluence of Cedar and Early
-- Winters Creeks, and descending via the Silver Star Glacier/Burgundy Col
-- back to Highway 20 near milepost 166 -- explicitly "several miles of
-- highway from the Cedar Creek Trailhead used for the approach."
--
-- The stored `waypoints[0]` instead places the trailhead at "Silver Star
-- Creek Trailhead (Hwy 20 pullout, ~MP 165-166)" -- and its own embedded
-- note says that pullout is "used by the North-East Ridge and Glacier
-- routes," i.e. a different route on the same peak. Confirmed by DB
-- cross-check: wa_silver_star_ne_ridge.approach_logistics stores
-- trailheadLat/Lng (48.549, -120.630965), essentially identical to this
-- row's waypoints[0] coordinate (48.552069, -120.630763). `gpx` is just a
-- straight 2-point line between that wrong trailhead and the summit -- not a
-- real recorded track.
--
-- Web research (WA Trails Assoc / USFS listings) confirms a "Cedar Creek
-- Trailhead" exists on SR-20 near milepost 175-176 via FR 5310-200 (matching
-- this row's own waypoints[0].note, which independently names "the Cedar
-- Creek trailhead near milepost 175-176" as the *correct* line's start) --
-- but a second, unrelated "Cedar Creek Trail" also exists near Mazama
-- (Sawtooth Wilderness, leads to Cedar Falls/Abernathy Pass, drains a
-- different valley entirely), so no single sourced GPS pin for the correct
-- trailhead was confirmed strongly enough to write in. Removing the wrong
-- data (which would send a climber to the wrong trailhead with a misleading
-- straight-line "track") is the safe fix; the correct trailhead coordinate
-- itself is left for human research (flagged in the audit log).
UPDATE routes
SET waypoints = '[{"lat": 48.548, "lng": -120.58517, "elev": 8876, "name": "Silver Star Mountain - East/Main Summit", "type": "Summit", "elevFt": 8876}]'::jsonb,
    gpx = NULL
WHERE id = 'wa_east_ridge_3'
  AND area_id = 'wa_silver_star_mountain_okanogan';

-- ============================================================================
-- wa_east_ridge_2 (Snowking Mountain, East Ridge): top-level `loss_ft` (1100)
-- is wildly inconsistent with this route's own day-by-day `itinerary`
-- breakdown, which sums to 4700+2600=7300 ft of gain and 300+6100=6400 ft of
-- loss. The route is an explicit out-and-back ("Reverse the East Ridge back
-- to Cyclone Lake, then retrace... down to the FR-1570 parking area" -- same
-- trailhead, no shuttle), so gain and loss should be close, as they are for
-- every other route audited this batch (all symmetric to within a few
-- percent). Corrected loss_ft to match the row's own itinerary sum rather
-- than inventing a new figure; gain_ft (6800) already sits close to the
-- itinerary's own sum (7300, ~7% off) and is left as-is.
UPDATE routes
SET loss_ft = 6400
WHERE id = 'wa_east_ridge_2'
  AND area_id = 'wa_snowking_mountain'
  AND loss_ft = 1100;

-- ============================================================================
-- wa_east_ridge_6 (Mount Thomson, East Ridge): top-level `gain_ft` (3600)
-- disagrees with this route's own single-day `itinerary` entry, which states
-- gainFt: 4900 -- matching the symmetric loss_ft (4900) already on file for
-- this out-and-back route. 4900 also sits inside the row's own
-- partner_requirements.fitnessSpec.hiking range ("3,550-5,000 ft gain
-- depending on trailhead/variation"), corroborating the itinerary figure
-- over the stale top-level one. Corrected gain_ft to match.
UPDATE routes
SET gain_ft = 4900
WHERE id = 'wa_east_ridge_6'
  AND area_id = 'wa_mount_thomson'
  AND gain_ft = 3600;

-- verify
SELECT id, waypoints, gpx FROM routes WHERE id = 'wa_east_ridge_3';
SELECT id, gain_ft, loss_ft FROM routes WHERE id = 'wa_east_ridge_2';
SELECT id, gain_ft, loss_ft FROM routes WHERE id = 'wa_east_ridge_6';
