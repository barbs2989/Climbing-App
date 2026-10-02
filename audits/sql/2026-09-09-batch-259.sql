-- Batch 259 (pass 5) -- wa_gunrunner, wa_goode_mountain_southwest_couloir
--
-- wa_gunrunner: `access._raw` describes the Lake Serene / Bridal Veil Falls
-- Trailhead (off US-2 near Gold Bar/Index, Skykomish Ranger District) --
-- an entirely different trailhead, ~100 mi from and administered by a
-- different ranger district than the one this route actually uses.
-- Every other field on this row (approach, road, waypoints, emergency,
-- the OUTER access.* keys) consistently and correctly describes the
-- Downey Creek Trailhead / Suiattle River Road approach to the Gunsight
-- Range in Glacier Peak Wilderness (Darrington Ranger District).
-- Confirmed via WebSearch that Lake Serene/Bridal Veil is its own
-- distinct, well-documented trail near Index, WA, unrelated to this
-- peak. `git grep -n "_raw" -- ClimbMatch.jsx ClimbMatchCore.jsx lib/`
-- returns no hits, so this sub-key is never read by the app -- it is
-- dead data, but it is also flatly wrong and should not be left as
-- contamination in the row.
UPDATE routes
SET access = access - '_raw'
WHERE id = 'wa_gunrunner';

-- wa_goode_mountain_southwest_couloir: dist_km was stored as 59.5, which
-- the app doubles to render an approximate round-trip distance (per
-- CLAUDE.md's documented dist_km convention) -- i.e. ~119 km / ~74 mi
-- round trip. The route's OWN itinerary field states in its own words,
-- "The standard 3-day trip: ~35-37 mi round trip", and its day-1/day-3
-- one-way approach legs are both independently given as 15 mi (a
-- genuine symmetric out-and-back via the PCT/North Fork Bridge Creek
-- Trail -- unlike sibling wa_goode_mountain_megalodon_ridge, whose
-- descent uses a different, asymmetric line and is correctly left
-- unfixed here for the same reason wa_glacier_peak_frostbite_ridge was
-- left unfixed in an earlier batch). 15 mi = 24.14 km. Sibling route
-- wa_goode_mountain_northeast_face shares essentially the same
-- trailhead and already has a well-calibrated dist_km (25.7 km, which
-- doubles to ~32 mi against its own stated "~33 mi round trip"),
-- corroborating that ~24-26 km is the right order of magnitude here,
-- not 59.5 km.
UPDATE routes
SET dist_km = 24.14
WHERE id = 'wa_goode_mountain_southwest_couloir';
