-- WA alpine route audit, pass 4, batch 210 (2026-09-05)
-- Scope: wa_mount_howard_south_slope .. wa_mount_logan_r1

-- wa_mount_johnson_standard: dist_km stored as 30.9 km (19.2 mi). This route's
-- own itinerary (day 1: 8 mi Upper Dungeness TH -> Upper Royal Basin camp;
-- day 2: 3.2 mi round trip summit push; day 3: 8 mi hike out) sums to exactly
-- 19.2 mi round trip, and the route's OWN summit waypoint independently
-- records distMi=9.6 (one-way trailhead-to-summit distance) -- i.e. the row
-- itself already states the one-way distance is half of 19.2 mi, not 19.2 mi
-- itself. The app displays "Approach (one way)" from dist_km and doubles it
-- for round-trip display, so storing the full round-trip mileage (19.2 mi =
-- 30.9 km) rather than the one-way distance double-counts the hiking leg
-- in the planner's time estimate. Corrected to the one-way distance implied
-- by the route's own summit waypoint (9.6 mi = 15.4 km).
UPDATE routes SET dist_km = 15.4
WHERE id = 'wa_mount_johnson_standard' AND dist_km = 30.9;

-- wa_mount_larrabee_south_ridge: two related fixes, both settled by the
-- route's own data plus one external corroborating source.
--
-- (1) dist_km stored as 6.4 km (4.0 mi one-way). The route's own summit
-- waypoint independently records distMi=5.0 (Twin Lakes Trailhead to summit,
-- one-way) -- an exact, internally-recorded figure that was not being used to
-- derive dist_km. Corrected to match: 5.0 mi = 8.0 km.
--
-- (2) gain_ft/loss_ft stored as 3900/3900. The route's own itinerary sums to
-- 4225 ft gain and 4225 ft loss for the single car-to-car day, and the
-- route's own totalNote already says "about 4,200 ft of gain" -- both
-- disagreeing with the stored 3900. Externally corroborated by The
-- Mountaineers' route page for Mount Larrabee, which states "roughly 10 miles
-- and 4,400 feet of elevation gain" for this exact South Ridge line from Twin
-- Lakes -- close to the row's own 4225 and nowhere near the stored 3900.
-- Corrected to match the row's own itinerary (4225), which sits between the
-- app's own totalNote figure and the external source's figure.
UPDATE routes SET dist_km = 8.0
WHERE id = 'wa_mount_larrabee_south_ridge' AND dist_km = 6.4;

UPDATE routes SET gain_ft = 4225, loss_ft = 4225
WHERE id = 'wa_mount_larrabee_south_ridge' AND gain_ft = 3900 AND loss_ft = 3900;

-- wa_mount_logan_fremont_glacier: gain_ft stored as 8900, loss_ft as 9600 --
-- asymmetric despite descent_text saying "Descend by reversing the ascent
-- line" (a true out-and-back via the identical trail, which physically
-- requires round-trip gain to equal round-trip loss). The route's own
-- totalNote already says "~9,600 ft gain" (matching the currently-stored
-- loss_ft, not gain_ft), and this is independently corroborated by a
-- WebSearch-confirmed detailed trip report for this exact route (Thunder
-- Creek Trail / Park Creek Pass / Fremont Glacier) stating "approximately 36
-- miles traveled with 9,600 feet of elevation gain AND LOSS" -- matching the
-- app's own round-trip mileage display (dist_km 29 km one-way * 2 = 58 km =
-- 36.0 mi) almost exactly. Corrected gain_ft to match the already-correct
-- loss_ft and the corroborated 9,600 ft figure.
UPDATE routes SET gain_ft = 9600
WHERE id = 'wa_mount_logan_fremont_glacier' AND gain_ft = 8900 AND loss_ft = 9600;

-- wa_mount_logan_r1 (Banded Glacier): three issues on one row.
--
-- (1) gain_ft/loss_ft stored as 7027/13000 -- both wrong, and inconsistent
-- with each other despite descent_text saying "Reverse the route" (an
-- out-and-back via Easy Pass both ways, which requires round-trip gain to
-- equal round-trip loss). The route's own totalNote already states "~29-mile
-- round trip (~12,500 ft gain)", and this is independently corroborated by a
-- WebSearch-confirmed trip report titled "Logan (Banded Glacier, 29 mi,
-- 12,500 ft, 13h35)" for this exact route -- matching the app's own 29-mile
-- round-trip mileage (itinerary days sum to 31.0 mi; totalNote says ~29 mi)
-- almost exactly. Corrected both gain_ft and loss_ft to the corroborated,
-- symmetric 12,500 ft figure.
UPDATE routes SET gain_ft = 12500, loss_ft = 12500
WHERE id = 'wa_mount_logan_r1' AND gain_ft = 7027 AND loss_ft = 13000;

-- (2) gpx: the route's own data_quality.gaps note explicitly states "a
-- Thunder-Creek-Trail track was previously attached but removed since it
-- depicts the alternate approach, not the primary line -- re-attach only a
-- track that actually follows Easy Pass -> Fisher Basin -> Banded Glacier
-- basin." This is false as a description of the row's current state: the
-- `gpx` column still holds a 58-point track running from the Thunder Creek
-- Trailhead (48.685336, -121.092664, matching the "Thunder Creek Trailhead"
-- waypoint exactly) directly to the Mount Logan summit -- i.e. the very
-- Thunder-Creek track the note claims was removed was never actually
-- cleared. Every other current field (road, descent_text, itinerary,
-- data_quality) describes Easy Pass as the primary approach, with Thunder
-- Creek only as a longer year-round alternate exit. Drawing this stale track
-- on the route map/GPX-download and labeling it "ROUTE TRACK" misrepresents
-- the primary approach the row itself now documents. Nulled out per the
-- row's own stated intent, rather than left populated with the superseded
-- track; no replacement track is invented (none exists on file for the Easy
-- Pass line, per the same data_quality note).
UPDATE routes SET gpx = NULL
WHERE id = 'wa_mount_logan_r1' AND gpx IS NOT NULL
  AND (gpx->0->>0)::numeric = 48.685336 AND (gpx->0->>1)::numeric = -121.092664;

-- NOTE (not a SQL fix -- flagged for human/editorial review): wa_mount_logan_r1's
-- `approach` column still reads "Follow Thunder Creek Trail from Colonial
-- Creek Campground ... about 9 miles to the Fisher Creek Trail junction, then
-- Fisher Creek Trail about 3 miles to a lake camp" -- describing the Thunder
-- Creek approach as the way IN, which contradicts the itinerary
-- (day 1: "Hike the Easy Pass Trail up and over the pass ... then leave trail
-- to reach a basin lake camp"), descent_text ("hike back out over Easy Pass
-- to the trailhead (or exit via the longer Thunder Creek Trail alternate)"),
-- and road/data_quality, all of which agree Easy Pass is now the primary
-- approach and Thunder Creek only the longer alternate. This needs an
-- editorial rewrite of the `approach` prose to describe the Easy Pass line
-- (which the row's own itinerary.days[0].note already does, in less formal
-- language), not a targeted UPDATE -- the same class of issue as batch 209's
-- wa_mount_fairchild_standard flag.
