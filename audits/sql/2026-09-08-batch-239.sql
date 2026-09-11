-- WA alpine audit batch 239 (pass 4)
-- Routes: wa_vesper_peak_north_face_ragged_edge, wa_warrior_peak_standard,
-- wa_washington_ellinor_traverse_ridge, wa_west_craggy_peak_standard_route,
-- wa_west_face_2, wa_west_twin_needle_south_route, wa_whatcom_peak_southwest_route,
-- wa_whitehorse_mountain_nw_shoulder

-- wa_vesper_peak_north_face_ragged_edge (Vesper Peak, North Face/Ragged Edge):
-- dist_km stored as 13.7 (8.51 mi), which the app doubles to a displayed 17.0 mi
-- round trip. This route shares Vesper's Sunrise Mine Trailhead with
-- wa_true_grit_2, whose identical-shaped defect was fixed in batch 238: that
-- route's stored 13.68 km (8.5 mi) was shown to be Vesper's well-documented
-- ROUND-TRIP figure (~8.8 mi) sitting in the one-way slot the app expects. This
-- route's 13.7 km is effectively the same number, and the route's own approach
-- text and waypoint chain corroborate a similar one-way distance: 2.7 mi to
-- Headlee Pass, then on to the ~5,600-5,700 ft basin/summit-trail area, then a
-- short traverse to the 5,800 ft route start -- consistent with the ~4.4 mi
-- one-way figure already established for this trailhead, not 8.5 mi. Corrected
-- to half the stored value.
UPDATE routes SET dist_km = 6.85
WHERE id = 'wa_vesper_peak_north_face_ragged_edge' AND dist_km = 13.7;

-- wa_warrior_peak_standard (Warrior Peak, Southeast Peak Standard / Home Lake
-- approach): dist_km stored as 32.99 (20.5 mi), which the app doubles to a
-- displayed 41.0 mi round trip -- implausible for a route whose own approach
-- text describes reaching the final cirque in well under 10 miles. The route's
-- own waypoint chain gives a one-way distance to the summit of 10.5 mi (Upper
-- Dungeness Trailhead -> Camp Handy 3.4 mi -> Boulder Shelter 6.4 mi -> Home
-- Lake 9.3 mi -> cirque entry 9.8 mi -> summit 10.5 mi), which is also
-- consistent with the approach text's own stated mileage (6.4 mi to Boulder
-- Camp, plus "approximately 1.5-2 miles" plus "approximately 1 mile" to the
-- cirque = 8.9-9.4 mi to the cirque, matching the waypoint chain's 9.8 mi within
-- the text's own stated range). 32.99 km is almost exactly double the route's
-- own 10.5 mi one-way total (16.5 km vs the correct 16.9 km) -- the same
-- doubling-bug shape already fixed repeatedly elsewhere in this catalog.
-- Corrected to the route's own one-way waypoint-chain distance.
UPDATE routes SET dist_km = 16.9
WHERE id = 'wa_warrior_peak_standard' AND dist_km = 32.99;

-- wa_west_face_2 (North Peak, West Face -- the Gunsight Range's "North
-- Gunsight" summit near Dome Peak, Glacier Peak Wilderness; confirmed via
-- Mountain Project's "The Gunsight Range" area page and stephabegg.com's
-- "North Gunsight Peak, West Face (5.11+, 6p, 600')" trip report, which match
-- this route's grade/pitch count exactly): the `approach` text opens with a
-- self-flagged note claiming the area's stored coordinates are a "geocoding
-- error" placing it at Washington Pass on SR-20. This claim is itself wrong and
-- stale -- the area's actual stored coordinates (48.3068, -120.994) match the
-- independently published coordinates for Gunsight Peak in this exact massif
-- (48.30667N, 120.99389W per Wikipedia/topozone, Chelan County, next to Dome
-- Peak) to four decimal places, roughly 34 km from Washington Pass, not "at"
-- it. The area's own ltree path also already files it correctly under
-- Glacier Peak Wilderness > Gunsight Range, not under the Hwy20/Washington-Pass
-- corridor. There is no geocoding error to flag; the note is an obsolete
-- artifact of an earlier (evidently already-corrected) data state. Also fixes
-- a second, unrelated internal inconsistency in the same paragraph: the closing
-- sentence refers to "South Peak's granite faces," contradicting the route's
-- own name ("West Face"), its area ("North Peak"), and its own `overview` field
-- ("The West Face of North Peak is one of the Cascades' sheerest..."). Removed
-- the false geocoding claim and corrected "South Peak" to "North Peak" for
-- internal consistency; nothing else in the paragraph was altered.
UPDATE routes
SET approach = 'The standard approach is from the Downey Creek Trailhead (off Suiattle River Road) via the southern end of the Ptarmigan Traverse — a rugged, largely off-trail alpine route over Itswoot Ridge/Cub Lake and Bachelor Creek involving glacier travel and significant bushwhacking. Climbers typically budget a full day (or two) of approach before reaching the base of North Peak''s granite faces; this is an experienced-mountaineers-only objective, not a roadside crag.'
WHERE id = 'wa_west_face_2'
  AND approach = 'Note: this area''s stored coordinates place it at Washington Pass on SR-20, but the real-world Gunsight Range is a remote granite sub-range near Dome Peak in the Glacier Peak Wilderness, roughly 20+ miles south/southwest of Washington Pass — not reachable from the SR-20 pass corridor, likely a data/geocoding error worth flagging for correction. The genuine standard approach is from the Downey Creek Trailhead (off Suiattle River Road) via the southern end of the Ptarmigan Traverse — a rugged, largely off-trail alpine route over Itswoot Ridge/Cub Lake and Bachelor Creek involving glacier travel and significant bushwhacking. Climbers typically budget a full day (or two) of approach before reaching the base of South Peak''s granite faces; this is an experienced-mountaineers-only objective, not a roadside crag.';

-- wa_whitehorse_mountain_nw_shoulder (Whitehorse Mountain, Northwest Shoulder):
-- the "Niederprum Trailhead" waypoint stores elevFt: null (and carries no
-- `elev` key at all), though the route's own approach text gives the figure
-- explicitly: "Start at the Niederprum Trailhead (Trail #653, ~918 ft)". The
-- sibling summit waypoint in this same array carries both `elev` and `elevFt`
-- set to the same value, so both are set here too for consistency. Populated
-- from the row's own approach text; no external research involved.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elevFt}', '918'::jsonb),
  '{0,elev}', '918'::jsonb
)
WHERE id = 'wa_whitehorse_mountain_nw_shoulder'
  AND waypoints->0->>'name' = 'Niederprum Trailhead'
  AND waypoints->0->'elevFt' = 'null'::jsonb;

-- wa_whatcom_peak_southwest_route: NOT fixed, flagged for human review.
-- dist_km is stored as 13.7 (8.5 mi one-way), but this route's own approach
-- text states "roughly 14 trail miles" just to reach Graybeal Camp -- an
-- intermediate waypoint well before Whatcom Pass, the Whatcom Glacier, or the
-- summit -- and the route's own waypoint chain gives Whatcom Pass at 16.5 mi
-- and the Whatcom Glacier traverse point at 18 mi, both already more than
-- double the stored one-way figure before the final summit push is even
-- counted. Independently corroborated externally: The Mountaineers and
-- multiple trip reports describe "the main trail system to Whatcom Pass being
-- 17 miles" one-way from the Hannegan Pass Trailhead. The stored dist_km is
-- confidently wrong (by more than 2x), but no source gives a precise one-way
-- mileage to Whatcom Peak's summit specifically (the route's own summit
-- waypoint carries no distMi) to pin an exact replacement value; the true
-- one-way distance is almost certainly in the 18-20 mile range. This also
-- affects the app's Est. summit / Est. return time estimates on this route,
-- which are currently based on a distance roughly half of what the route
-- actually requires.

-- wa_washington_ellinor_traverse_ridge: checked, not confidently fixable.
-- dist_km stored as 9.7 (6.03 mi one-way / ~12.06 mi as displayed round trip).
-- External sources disagree with each other on this traverse's total distance
-- (one source states roughly 12.8 mi for the point-to-point traverse; another
-- gives roughly 8 mi "round trip" but flags that this may describe a different
-- variation of the route). The stored value falls within the range implied by
-- the conflicting sources and is not confidently wrong under either reading;
-- no change made.

-- wa_west_craggy_peak_standard_route: reviewed, clean. Elevation (8,372 ft)
-- independently confirmed via multiple sources (WTA, Mountaineers, peak
-- databases converge on 8,366-8,372 ft). dist_km (8.9 km / 5.53 mi one-way) is
-- consistent with the route's own approach text, which states the Copper
-- Glance Basin camp alone is "about 3.3-3.5 miles one-way" with the summit
-- push continuing beyond it. No changes.

-- wa_west_twin_needle_south_route: reviewed, clean. First ascent (William
-- Degenhardt, James Martin, Herb Strandberg, August 17, 1932) and summit
-- elevation (7,936 ft) independently confirmed via Wikipedia's Twin Needles
-- entry. dist_km (15.7 km / 9.76 mi one-way) is confirmed correct: the route's
-- own approach text states "Total round trip from the trailhead runs about
-- 19.5 miles (~31 km)," which is almost exactly double the stored value, and
-- the route's own waypoint chain independently gives the summit at 9.5 mi
-- one-way. No changes.

-- wa_warrior_peak_standard: first ascent (Fred Beckey, solo, 1945, both
-- summits in one push, named the peak) independently confirmed via multiple
-- sources. No changes to this field.

-- wa_whitehorse_mountain_nw_shoulder: first ascent (Nels Bruseth, 1909)
-- independently confirmed. Summit distance (5.94 mi per the route's own
-- summit waypoint) matches the stored dist_km (9.7 km / 6.03 mi) closely;
-- no change to dist_km.
