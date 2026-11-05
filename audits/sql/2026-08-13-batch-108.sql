-- === wa_the_west_face (The West Face, North Early Winters Spire) ===

-- fa misspells the second-ascent-party's name as "Dave Beckstad". Multiple independent
-- sources (theCrag's route listing "West Face (Beckey-Beckstead)", general aggregated
-- climbing-history search results) agree the correct spelling is "Dave Beckstead" for
-- Fred Beckey's June 17, 1965 partner on this route.
UPDATE routes
SET fa = 'Fred Beckey and Dave Beckstead, 1965 (FFA: Steve Risse and Dave Tower, 1985)'
WHERE id = 'wa_the_west_face';

-- overview states the route is "roughly 500 ft (152 m)", contradicting this same row's own
-- length_m (201, i.e. ~660 ft) two paragraphs of prose away from the number it's supposed to
-- describe. External sources corroborate the 660 ft figure, not 500 ft: theCrag lists this
-- line at 200 m (~656 ft), closely matching length_m=201; no source found supports ~500 ft/
-- 152 m. Fixing the prose to match the structured field, per CLAUDE.md's rule that a display
-- column should carry the derivable fact and not fork from its own sibling column.
UPDATE routes
SET overview = 'The West Face (III 5.11-) is a 6-pitch, roughly 660 ft (201 m) route first climbed (with aid) by Fred Beckey and Dave Beckstead in 1965, with Steve Risse and Dave Tower making the first free ascent in 1985.'
WHERE id = 'wa_the_west_face';

-- === wa_three_fingers_south_peak_lookout (South Peak via Lookout, Three Fingers) ===

-- loss_ft (4200) is far below gain_ft (5750) for a route whose own descent field says
-- "Reverse the route past the historic fire lookout" -- i.e. a walk-off retracing the ascent
-- back to the same trailhead, which should net gain roughly equal loss. No source describes
-- an alternate lower-elevation exit or car shuttle that would explain a 1,550 ft asymmetry;
-- this reads as a data-entry bug rather than a real route feature. Setting loss_ft to match
-- gain_ft, consistent with the row's own "reverse the route" description.
UPDATE routes
SET loss_ft = 5750
WHERE id = 'wa_three_fingers_south_peak_lookout';

-- === wa_three_queens_middle_peak (Middle Peak via South Face - South Chimney, Three Queens) ===

-- dist_km (4.3) is roughly half the true one-way distance for this route. The row's own
-- primary source (trailcatjim.com's July 1, 2007 trip report for this exact line -- already
-- the source for this row's gain_ft/loss_ft and timing figures, which check out exactly)
-- states the route covers "approximately 10 miles" round trip. Per this app's documented
-- convention (dist_km is one-way; the UI doubles it for round-trip display), 10 mi round
-- trip converts to ~8.05 km one-way, not 4.3 km. 4.3 km is suspiciously close to a *partial*
-- leg the same report separately mentions (a "2.8-mile hike back to the car" covering only
-- the descent from the base of the talus slope to the trailhead) -- likely that partial-leg
-- figure was recorded in place of the full one-way route distance.
UPDATE routes
SET dist_km = 8.05
WHERE id = 'wa_three_queens_middle_peak';

-- === wa_tooth_and_claw (Tooth and Claw, Lexington Tower) ===

-- gpx's first two points are byte-identical (48.5144, -120.6575), and that same low-precision
-- pair duplicates waypoints[0]'s topout coordinate rather than the higher-precision summit fix
-- (48.514154, -120.65743, confirmed via Peakbagger pid 16600) that already appears correctly
-- as the track's last point. An 8-pitch face-climb track starting at an approximation of the
-- summit, running ~0.9km away, then returning to the summit at full precision is geometrically
-- backwards for an approach-to-summit line and reads as a copy-paste artifact from assembling
-- the array from two sources without dedup. Dropping the duplicate leading point; the
-- authoritative topout coordinate is the higher-precision one already present at the end of
-- the array.
UPDATE routes
SET gpx = '[[48.521, -120.644], [48.514154, -120.65743]]'::jsonb
WHERE id = 'wa_tooth_and_claw';
