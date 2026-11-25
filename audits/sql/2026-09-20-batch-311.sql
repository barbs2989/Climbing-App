-- WA alpine audit batch 311 (pass 6)
-- Routes: wa_big_snow_mountain_east_ridge_hardscrabble_route,
--         wa_big_snow_mountain_north_slope_dingford_route,
--         wa_black_peak_east_buttress, wa_black_peak_northeast_ridge,
--         wa_bonanza_peak_mary_green_glacier, wa_bonanza_peak_north_ridge
--         (bivy prune only -- see log for the larger flagged issue),
--         wa_bonanza_peak_northeast_buttress, wa_booker_mountain_northeast_face
-- Area: wa_bonanza_peak (elevation consistency, see below)

-- =========================================================================
-- Big Snow Mountain, East Ridge (Hardscrabble) Route
-- wa_big_snow_mountain_east_ridge_hardscrabble_route
-- =========================================================================
-- bivy carried 9 entries sharing the whole western-Alpine-Lakes-Wilderness
-- corridor (Pete Lake/Lemah, Chimney Glacier, Escondido Ridge, Waptus/
-- Spade Lake, Park Lakes Basin, Williams Lake, Peggy's Pond/Cathedral
-- Rock) -- all for entirely different peaks (Lemah Mountain, Chimney
-- Rock, Little Big Chief Mountain, Three Queens, Iron Cap Mountain,
-- Cathedral Rock) reached from different valleys. Only two entries name
-- THIS route: "Hardscrabble Horse Camp, Middle Fork Snoqualmie" (the
-- staging camp on the gated road this route's own approach text
-- describes) and "Upper Hardscrabble Lake," which states outright "The
-- high camp for BIG SNOW MOUNTAIN's east ridge, which is the easier and
-- much less confusing of that peak's two routes." Textbook
-- audit:camp-route-fit corridor contamination, same class documented in
-- many prior batches.
UPDATE routes SET bivy = jsonb_build_array(bivy->5, bivy->6)
  WHERE id = 'wa_big_snow_mountain_east_ridge_hardscrabble_route'
  AND jsonb_array_length(bivy) = 9
  AND bivy->5->>'name' = 'Hardscrabble Horse Camp, Middle Fork Snoqualmie'
  AND bivy->6->>'name' = 'Upper Hardscrabble Lake';

-- loss_ft was null and outing_shape was null. descent_text explicitly
-- retraces the ascent ("retrace the east ridge onto the north-slope
-- granite slab, climb back up to the col, and descend the gully to upper
-- Hardscrabble Lake; follow the inlet-side climbers path back down...
-- and rejoin the old road") -- a genuine out-and-back to the same
-- trailhead, so loss should equal the row's own gain_ft.
UPDATE routes SET loss_ft = 5300, outing_shape = 'outback'
  WHERE id = 'wa_big_snow_mountain_east_ridge_hardscrabble_route'
  AND loss_ft IS NULL AND outing_shape IS NULL AND gain_ft = 5300;

-- =========================================================================
-- Big Snow Mountain, North Slope (Dingford) Route
-- wa_big_snow_mountain_north_slope_dingford_route
-- =========================================================================
-- bivy carried the IDENTICAL 9-entry regional-corridor list as the sibling
-- East Ridge route above, and here NONE of the nine name this route's own
-- camps -- this route's own itinerary explicitly says parties camp at
-- "Myrtle Lake or Big Snow Lake" (both named as waypoints on this row),
-- neither of which appears anywhere in the bivy list. Even "Upper
-- Hardscrabble Lake" and "Hardscrabble Horse Camp," which serve the
-- sibling East Ridge route, are reached via a different trail from the
-- same trailhead (this route leaves via the maintained Dingford Creek
-- Trail toward Myrtle Lake; the East Ridge route walks the gated FSR 56
-- road toward Hardscrabble Lakes) and are not on this route's path.
-- Pruned to zero, matching the established wa_scramble_route (Eagle Peak)
-- precedent for a corridor list with no entry serving the row it sits on.
UPDATE routes SET bivy = NULL
  WHERE id = 'wa_big_snow_mountain_north_slope_dingford_route'
  AND jsonb_array_length(bivy) = 9
  AND bivy->0->>'name' = 'Pete Lake and the Lemah Meadows camps'
  AND bivy->8->>'name' = 'Peggy''s Pond and Squaw Lake, Cathedral Pass';

-- loss_ft was null and outing_shape was null. descent_text explicitly
-- retraces the ascent ("Downclimb the same chutes/couloir used on
-- ascent... traverse back around Snowflake Lake, drop to Big Snow Lake,
-- then pick a line down through brush to Myrtle Lake and follow the
-- Dingford Creek Trail out") -- an out-and-back to the same trailhead.
UPDATE routes SET loss_ft = 5280, outing_shape = 'outback'
  WHERE id = 'wa_big_snow_mountain_north_slope_dingford_route'
  AND loss_ft IS NULL AND outing_shape IS NULL AND gain_ft = 5280;

-- =========================================================================
-- Black Peak, East Buttress -- wa_black_peak_east_buttress
-- =========================================================================
-- bivy carried 7 entries: the first three (Wing Lake, Lewis Lake, Rainy
-- Pass trailhead lots) serve this route's own stated approach ("Rainy
-- Pass/Lake Ann trailhead on SR-20, via Heather Pass and Lewis Lake to
-- Wing Lake camp"); the remaining four (Easy Pass trailhead, Mesahchie
-- basin, Ragged Ridge crest bivy, Fisher Camp) are all explicitly for the
-- separate Ragged Ridge cluster (Mesahchie, Katsuk, Kimtah, Mount
-- Arriva), reached from a different trailhead (Easy Pass, not Rainy
-- Pass) -- regional corridor contamination, same class documented in
-- many prior batches.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1, bivy->2)
  WHERE id = 'wa_black_peak_east_buttress'
  AND jsonb_array_length(bivy) = 7
  AND bivy->0->>'name' = 'Wing Lake'
  AND bivy->1->>'name' = 'Lewis Lake'
  AND bivy->2->>'name' = 'Rainy Pass trailhead lots, and the quarter-mile camping closures'
  AND bivy->3->>'name' = 'Easy Pass trailhead, SR 20';

-- No gain_ft/loss_ft/dist_km/grade fix attempted: this route has none of
-- these on file, and unlike the standard South Ridge/Northeast Ridge
-- lines, no primary source (SummitPost, Mountain Project, AAC, guidebook)
-- gives route-specific figures for the East Buttress beyond "about 3
-- hours from Wing Lake" -- candidly sparse published information for a
-- little-repeated line, same class as wa_big_four_mountain_northwest_ridge
-- (batch 310). Not guessed.

-- =========================================================================
-- Black Peak, Northeast Ridge -- wa_black_peak_northeast_ridge
-- =========================================================================
-- Same corridor-contamination bivy list and same fix as East Buttress
-- above (this route shares the identical Wing Lake/Rainy Pass approach).
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1, bivy->2)
  WHERE id = 'wa_black_peak_northeast_ridge'
  AND jsonb_array_length(bivy) = 7
  AND bivy->0->>'name' = 'Wing Lake'
  AND bivy->1->>'name' = 'Lewis Lake'
  AND bivy->2->>'name' = 'Rainy Pass trailhead lots, and the quarter-mile camping closures'
  AND bivy->3->>'name' = 'Easy Pass trailhead, SR 20';

-- outing_shape was null and loss_ft was null. This route's own
-- descent_text does NOT reverse the ascent: "From the summit, work down
-- and south toward the South Ridge route... continuing south to the
-- south col. From there the descent follows the South Ridge's loose,
-- cairned gully... back down to snow slopes and Wing Lake" -- a genuine
-- loop (ascend the Northeast Ridge, descend via the South Ridge) that
-- returns to the same Wing Lake camp/trailhead, matching this row's own
-- approach_variants.baseFinding, which spells out the same
-- ascend-one-line/descend-another shape explicitly. A loop returning to
-- the same trailhead implies net elevation change of zero, so loss should
-- equal this row's own gain_ft.
UPDATE routes SET outing_shape = 'loop', loss_ft = 4130
  WHERE id = 'wa_black_peak_northeast_ridge'
  AND outing_shape IS NULL AND loss_ft IS NULL AND gain_ft = 4130;

-- =========================================================================
-- Bonanza Peak, Mary Green Glacier (Standard Route)
-- wa_bonanza_peak_mary_green_glacier
-- =========================================================================
-- overview and the summit waypoint both cite "9,516 ft" for the true
-- summit, while this row's OWN high_point_ft column (and both of its
-- sibling routes' high_point_ft, wa_bonanza_peak_north_ridge and
-- wa_bonanza_peak_northeast_buttress) already store 9,511 ft. The sibling
-- North Ridge route's own `corrections` field explicitly settles this:
-- "Elevation is best sourced as 9,511 ft (matches AAC and most
-- trip-report sources); a Wikipedia infobox figure of 9,516 ft and a
-- cited LIDAR re-survey figure of 9,503 ft also appear in circulation."
-- Confirmed externally via WebSearch: SummitPost and multiple named trip
-- reports (trailcatjim.com titles the peak "Bonanza Peak (9511/9503 ft)")
-- use 9,511 ft; 9,516 ft traces to the Wikipedia infobox alone. Corrected
-- the two stray 9,516 occurrences on this row to match the figure this
-- row's own high_point_ft, and both siblings, already use.
UPDATE routes SET overview = replace(overview, 'Bonanza Peak (9,516'')', 'Bonanza Peak (9,511'')')
  WHERE id = 'wa_bonanza_peak_mary_green_glacier'
  AND overview LIKE 'Bonanza Peak (9,516'')%';

UPDATE routes SET waypoints = jsonb_set(waypoints, '{6,elev}', '9511')
  WHERE id = 'wa_bonanza_peak_mary_green_glacier'
  AND jsonb_array_length(waypoints) = 7
  AND waypoints->6->>'name' = 'Bonanza Peak summit'
  AND (waypoints->6->>'elev')::numeric = 9516;

-- FLAGGED, not fixed: dist_km (12.8 km / 7.95 mi) runs somewhat ahead of
-- this row's own waypoint chain, whose cumulative distMi to the summit
-- totals exactly 7.0 mi (11.27 km) -- about a 13% gap. Not corrected:
-- this row's own overview independently states "roughly 14 miles round
-- trip," i.e. 7.0 mi one-way, matching the waypoint chain and NOT the
-- stored dist_km, but several trip reports for this exact climb cite a
-- 16-mile round trip (8.0 mi / 12.9 km one-way), which is what the
-- stored value appears to track instead. Two internally-cited figures in
-- tension; left for human review rather than picked without a stronger
-- external tiebreaker.

-- =========================================================================
-- Bonanza Peak, North Ridge -- wa_bonanza_peak_north_ridge
-- =========================================================================
-- bivy carried 9 entries; only the first four (Holden Village, Holden
-- Ballpark Campground, Holden Lake, Holden Pass and the slab bivies
-- above) serve this row's own Railroad Creek/Holden approach. The
-- remaining five (Lyman Lakes/Cloudy Pass, Spider Meadow/Phelps Basin,
-- Leroy Basin, Ice Lakes, Phelps Creek Campground) are all explicitly for
-- the separate Chiwawa River/Phelps Creek corridor peaks (North Star,
-- Cloudy Peak, Chiwawa Mountain, Dumbell Mountain, Mount Maude, Seven
-- Fingered Jack, Mount Fernow), reached from an entirely different road
-- and trailhead system -- regional corridor contamination, same class
-- documented in many prior batches.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1, bivy->2, bivy->3)
  WHERE id = 'wa_bonanza_peak_north_ridge'
  AND jsonb_array_length(bivy) = 9
  AND bivy->0->>'name' = 'Holden Village'
  AND bivy->3->>'name' = 'Holden Pass and the slab bivies above'
  AND bivy->4->>'name' = 'Lyman Lakes and Cloudy Pass';

-- FLAGGED, not fixed (see log for full detail): this row's own
-- `corrections` field already states that "North Ridge" does not
-- correspond to any independently documented technical line -- primary
-- sources describe this exact approach/summit as the "Mary Green
-- Glacier" route, and this entry says it is "document[ing] that
-- standard/easiest route under the given name." Consistent with that,
-- this row's approach/descent_text/pitch_detail/gear/itinerary all
-- describe genuine roped glacier travel and Class 3-4 rock (matching the
-- sibling Mary Green Glacier route almost exactly), while this row's OWN
-- `grade` field ("Class 2") and its `overview`/`beta`/`hazards`/
-- `watch_out` fields describe an unrelated, generic, benign talus
-- scramble ("straightforward Class 2 scramble... solid rock and stable
-- talus... well-marked by cairns") that contradicts the rest of the row.
-- This route's gain_ft/loss_ft (3,800/3,800) also exactly match the
-- sibling Mary Green Glacier route's DAY-1 hike-to-camp gain alone
-- (itinerary.days[0].gainFt = 3800 on that row), not a full
-- trailhead-to-summit round trip -- suggesting these figures were copied
-- from only part of that sibling's data. This needs a human decision on
-- whether the route should be merged into/removed as a duplicate of Mary
-- Green Glacier, or have its overview/beta/grade/gain/loss fields
-- rewritten wholesale to match its own approach/pitch_detail/gear -- too
-- large a rewrite for a mechanical SQL fix, so left untouched here beyond
-- the bivy prune above.

-- =========================================================================
-- Bonanza Peak, Northeast Buttress -- wa_bonanza_peak_northeast_buttress
-- =========================================================================
-- Same 9-entry bivy list and same fix as the North Ridge route above.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1, bivy->2, bivy->3)
  WHERE id = 'wa_bonanza_peak_northeast_buttress'
  AND jsonb_array_length(bivy) = 9
  AND bivy->0->>'name' = 'Holden Village'
  AND bivy->3->>'name' = 'Holden Pass and the slab bivies above'
  AND bivy->4->>'name' = 'Lyman Lakes and Cloudy Pass';

-- Same stray "9,516 ft" figures as the Mary Green Glacier route above,
-- appearing in this row's overview, its own summit waypoint, and its
-- itinerary's day-2 schedule detail -- all corrected to 9,511 ft to match
-- this row's own high_point_ft column and both sibling routes.
UPDATE routes SET overview = replace(overview, 'true (9,516'') summit', 'true (9,511'') summit')
  WHERE id = 'wa_bonanza_peak_northeast_buttress'
  AND overview LIKE '%true (9,516'') summit%';

UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '9511')
  WHERE id = 'wa_bonanza_peak_northeast_buttress'
  AND jsonb_array_length(waypoints) = 8
  AND waypoints->7->>'name' = 'Bonanza Peak summit'
  AND (waypoints->7->>'elev')::numeric = 9516;

UPDATE routes SET itinerary = jsonb_set(
  itinerary, '{days,1,schedule,2,detail}',
  to_jsonb(replace(itinerary->'days'->1->'schedule'->2->>'detail', '(9,516 ft)', '(9,511 ft)'))
)
  WHERE id = 'wa_bonanza_peak_northeast_buttress'
  AND itinerary->'days'->1->'schedule'->2->>'detail' =
    'Roughly 4 hours of Class 4-5.7 ridge climbing to the true summit (9,516 ft).';

-- gain_ft/loss_ft (6,300/6,300) exactly match the sibling Mary Green
-- Glacier route's figures, but this row's OWN approach text says this
-- route's "noticeably larger overall gain (~7,500')" compared to that
-- standard line, and this row's own itinerary day-by-day figures sum to
-- exactly 7,300 ft both ways (day 1 gainFt 4,000 + day 2 gainFt 3,300 =
-- 7,300; day 2 lossFt 3,300 + day 3 lossFt 4,000 = 7,300) -- corrected to
-- match the row's own itemized itinerary, which is closely consistent
-- with its own approach-text estimate.
UPDATE routes SET gain_ft = 7300, loss_ft = 7300
  WHERE id = 'wa_bonanza_peak_northeast_buttress'
  AND gain_ft = 6300 AND loss_ft = 6300;

-- dist_km (23.34 km / 14.5 mi one-way) is roughly DOUBLE what this row's
-- own records support: the waypoint chain's cumulative distMi to the
-- summit totals 7.0 mi (11.3 km) one-way, and the itinerary's own
-- day-2 note describes a round-trip camp-to-summit-to-camp distance of
-- 4 mi (i.e. ~2 mi one-way from camp), which added to day 1's 5.5 mi
-- gives the same ~7.5 mi one-way -- both close to Mary Green Glacier's
-- own dist_km (12.8 km), as expected since the two routes share nearly
-- the entire approach. Corrected to match this row's own waypoint chain.
UPDATE routes SET dist_km = 11.3
  WHERE id = 'wa_bonanza_peak_northeast_buttress'
  AND dist_km = 23.34;

-- =========================================================================
-- Booker Mountain, Northeast Face -- wa_booker_mountain_northeast_face
-- =========================================================================
-- bivy carried 6 entries along the Thunder Creek/Park Creek Pass
-- corridor; five explicitly serve this route's own stated approach
-- ("Thunder Creek Trail out of Colonial Creek Campground" toward "Park
-- Creek Pass/the head of Park Creek"), with two of them (Thunder Basin
-- Hiker Camp, Five Mile Camp) explicitly naming Booker by name as a peak
-- they stage. The sixth, "Fremont Glacier moraine high camp," is
-- explicitly and solely for "the Fremont Glacier side of MOUNT LOGAN,"
-- a different peak/objective reached from the far side of Park Creek
-- Pass -- regional corridor contamination, same class documented in
-- many prior batches.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1, bivy->2, bivy->3, bivy->5)
  WHERE id = 'wa_booker_mountain_northeast_face'
  AND jsonb_array_length(bivy) = 6
  AND bivy->3->>'name' = 'Thunder Basin Hiker Camp'
  AND bivy->4->>'name' = 'Fremont Glacier moraine high camp'
  AND bivy->5->>'name' = 'Five Mile Camp, Park Creek trail';

-- No gain_ft/loss_ft/dist_km fix attempted: confirmed via WebSearch (AAC
-- Publications' first-ascent account, matching this row's fa/overview/
-- approach fields exactly -- Dan Davis and John Holland, August 22 1964,
-- 3,000+ ft face averaging ~70 degrees) that no source publishes
-- route-specific mileage or gain figures for this rarely-repeated 1964
-- line. Candidly sparse, same class as wa_big_four_mountain_northwest_ridge
-- (batch 310) and Black Peak's East Buttress above. Not guessed.

-- =========================================================================
-- Area: wa_bonanza_peak (elevation consistency)
-- =========================================================================
-- Same 9,516-vs-9,511 discrepancy as above, on the peak's own area row:
-- elevation_ft stored 9,516 ft while every route on this peak stores
-- 9,511 ft in high_point_ft, and the North Ridge route's own corrections
-- field explicitly cites 9,511 ft as the best-sourced figure (AAC, most
-- trip reports), against 9,516 ft as a Wikipedia-infobox-only figure.
-- Corrected the area row's elevation_ft and its own blurb text to match.
UPDATE areas SET elevation_ft = 9511
  WHERE id = 'wa_bonanza_peak' AND elevation_ft = 9516;

UPDATE areas SET blurb = replace(blurb, 'Bonanza Peak (9,516'')', 'Bonanza Peak (9,511'')')
  WHERE id = 'wa_bonanza_peak'
  AND blurb LIKE 'Bonanza Peak (9,516'')%';
