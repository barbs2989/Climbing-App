-- WA alpine audit batch 238 (pass 4)
-- Routes: wa_trapper_mountain_north_couloir, wa_trapper_mountain_south_slopes,
-- wa_traverse_of_mount_index, wa_tricouni_peak_southwest_slopes, wa_true_grit_2,
-- wa_ultramega_ok, wa_upper_north_ridge_w_great_gendarme, wa_vasiliki_ridge_standard

-- wa_trapper_mountain_north_couloir (Trapper Mountain, North Couloir): the `bivy`
-- array is wholesale contamination from a different massif. All six entries --
-- Basin Creek Camp, Cottonwood Camp, Pelton Basin Camp, Sahale Glacier Camp,
-- Doubtful Lake Camp, "Buckner cross-country zone bivy" -- describe camps that
-- serve Mount Buckner / the Horseshoe Basin group (their own notes say so
-- explicitly: "puts you on the right side of the divide for Buckner's north
-- aspect", "high bivies ... under Buckner's north side and the Ripsaw Ridge
-- peaks", "the closest designated camp to the Horseshoe Basin trail junction").
-- None of them is the camp this route's own approach/waypoints/approach_variants
-- text actually names -- Trapper Lake (4,170 ft), reached via Cascade Pass/Pelton
-- Basin or via Stehekin/Devore Creek -- which does not appear in the bivy list at
-- all. Removing the contaminated list rather than inventing a replacement; the
-- route's own approach text still fully describes where to camp (Trapper Lake).
UPDATE routes SET bivy = NULL
WHERE id = 'wa_trapper_mountain_north_couloir'
  AND bivy @> '[{"name": "Buckner cross-country zone bivy"}]'::jsonb;

-- wa_trapper_mountain_south_slopes (Trapper Mountain, South Slopes): identical
-- Buckner/Horseshoe Basin bivy contamination as its sibling route above (same
-- six entries, same mismatch with this peak's own Trapper Lake approach).
UPDATE routes SET bivy = NULL
WHERE id = 'wa_trapper_mountain_south_slopes'
  AND bivy @> '[{"name": "Buckner cross-country zone bivy"}]'::jsonb;

-- Same route: dist_km stored as 30.58 (19.0 mi), which the app doubles for a
-- displayed round trip of 38.0 mi. The row's own itinerary already totals to
-- 19 mi round trip (day 1: 7 mi, day 2: 4 mi, day 3: 8 mi = 19 mi; itinerary's
-- own totalNote reads "~19 mi ... round-trip gain"), and 19 mi is exactly the
-- value stored -- i.e. the round-trip figure itself was stored where the app
-- expects the one-way distance it doubles for display (the same doubling bug
-- documented on this massif's neighbors in batches 236/237: wa_three_fingers_r1,
-- r2, and south_peak_lookout). Corrected to half the itinerary's stated round
-- trip (19 mi / 2 = 9.5 mi = 15.29 km).
UPDATE routes SET dist_km = 15.29
WHERE id = 'wa_trapper_mountain_south_slopes' AND dist_km = 30.58;

-- wa_traverse_of_mount_index: NOT fixed, flagged for human review below. Two
-- issues found, neither with a source-backed replacement value available:
--   1. The route's own waypoint list gives the "North Peak" summit (first of
--      the three peaks climbed) coordinates lat=47.77453, lng=-121.58093 --
--      which is (to five decimal places) identical to the AREA record's own
--      coordinate for "Main Peak" (wa_main_peak_2: lat=47.77453,
--      lng=-121.58094), and to Wikipedia's published coordinate for Mount
--      Index's Main Peak summit (47°46'28"N 121°34'51"W = 47.7744,-121.5808).
--      Main Peak is the SOUTHERNMOST and LAST of the three summits on this
--      traverse, not the first. This route's North Peak waypoint appears to
--      have been given the Main Peak's coordinates by mistake, but North
--      Peak's own correct coordinates could not be confirmed from an
--      accessible source (Peakbagger/SummitPost/Mountain Project pages for
--      the North Peak entry are blocked from this audit's network access).
--   2. dist_km is stored as 5.8 (3.6 mi), which is smaller than the 4.1 mi
--      the route's own waypoint list already gives for reaching Lake Serene
--      alone (i.e. before any of the technical traverse). This is internally
--      inconsistent under either a one-way or round-trip reading and no
--      confirmed correct total could be sourced for this three-summit,
--      different-line-descent traverse.

-- wa_tricouni_peak_southwest_slopes: reviewed, clean. Peak identity (Skagit
-- County, North Cascades NP, near the Klawatti/Borealis Glacier, elevation
-- 8,102 ft), FA (Elwyn Elerding, Jeanne Elerding, Les Carlson, 1951), and
-- dist_km (19.3 km = 12.0 mi, matching the route's own waypoint chain to
-- Lucky Pass at 11.5 mi plus the final push to the summit -- correctly stored
-- as the one-way distance the app doubles for display) all independently
-- corroborated. No changes.

-- wa_true_grit_2 (Vesper Peak, True Grit): dist_km stored as 13.68 (8.5 mi),
-- which the app doubles to a displayed 17.0 mi round trip. The route's own
-- waypoint chain gives the technical route's start (topout/ledge-access notch)
-- at ~4.3 mi one-way from the Sunrise Mine Trailhead (4.0 mi to the north face
-- topout waypoint + 0.3 mi ledge traverse to the route start), and Vesper's
-- well-documented standard approach is ~4.4 mi one-way / ~8.8 mi round trip.
-- 8.5 mi already matches that known ROUND TRIP figure, so it was stored where
-- the app expects a one-way distance (the same doubling bug as the Trapper
-- Mountain and Wine Spires routes fixed in this batch). Corrected to half of
-- the stored value, which also lines up with the route's own ~4.3 mi one-way
-- waypoint chain (8.5 mi / 2 = 4.25 mi = 6.84 km).
UPDATE routes SET dist_km = 6.84
WHERE id = 'wa_true_grit_2' AND dist_km = 13.68;

-- Same route: bivy array mixes four camps that, by their OWN note text, serve
-- different peaks/trailheads reached from other spurs off the Mountain Loop
-- Highway -- not Vesper Peak's Sunrise Mine Trailhead (FR-4065). "Sloan Peak
-- high camp" is explicit about serving a Sloan attempt via the separate North
-- Fork Sauk/Cougar Creek trailhead; "Foggy Lake, Gothic Basin" serves "Del
-- Campo and Gothic" via the Barlow Pass old-road-grade trailhead; "Monte
-- Cristo townsite" says outright it is used "rather than for Vesper or
-- Sloan"; "Bedal Campground" says it is "the closest road camp to the Sloan
-- Peak and Bedal Creek trailheads ... the standard place to sleep ... before
-- a Sloan attempt." The remaining two entries are both explicitly this
-- route's own: "Vesper Creek basin and Lake Elan, beyond Headlee Pass" is
-- named as "the working base camp for Vesper Peak's north side," and "Verlot
-- corridor campgrounds" is named as "the fallback base for Vesper ... closer
-- to the Sunrise Mine ... trailheads." Removing the four mismatched entries.
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' NOT IN (
    'Sloan Peak high camp — heather benches above Cougar Creek',
    'Foggy Lake, Gothic Basin',
    'Monte Cristo townsite, walk-in from Barlow Pass',
    'Bedal Campground, Mountain Loop Highway'
  )
)
WHERE id = 'wa_true_grit_2'
  AND bivy @> '[{"name": "Sloan Peak high camp — heather benches above Cougar Creek"}]'::jsonb;

-- wa_ultramega_ok (Burgundy Spire, Northeast Buttress): high_point_ft (and the
-- matching waypoint elevation for "Burgundy Spire Summit") stored as 8483 ft.
-- Independent sources converge on 8,492 ft: listsofjohn.com's LiDAR-informed
-- entry explicitly titled "Burgundy Spire - 8,492' Washington", corroborated by
-- general web consensus citing the same figure. No source found supports 8483.
-- Corrected to 8492, matching the sourcing style already used on this route's
-- neighbors in this batch (Tricouni, Ares Tower).
UPDATE routes SET high_point_ft = 8492
WHERE id = 'wa_ultramega_ok' AND high_point_ft = 8483;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{5,elev}', '8492'::jsonb)
WHERE id = 'wa_ultramega_ok'
  AND waypoints->5->>'name' = 'Burgundy Spire Summit'
  AND waypoints->5->>'elev' = '8483';

UPDATE routes
SET corrections = 'high_point_ft (and the Burgundy Spire Summit waypoint elevation) was stored as 8,483 ft with no prior corrections note. listsofjohn.com''s survey-grade entry and general web consensus converge on 8,492 ft; no source found supports 8,483 ft. Corrected to 8,492 ft.'
WHERE id = 'wa_ultramega_ok' AND corrections IS NULL AND high_point_ft = 8492;

-- Same route: dist_km stored as 10.62 (6.6 mi), which the app doubles to a
-- displayed 13.2 mi round trip. The route's own waypoint chain gives the
-- one-way distance from the SR-20 pullout to the Burgundy Spire summit as
-- 3.3 mi (distMi on the "Burgundy Spire Summit" waypoint) = 5.31 km. 10.62 is
-- exactly double that one-way figure, i.e. the round-trip total was stored
-- where the app expects a one-way distance (same doubling bug as elsewhere in
-- this batch). Corrected to the route's own one-way waypoint distance.
UPDATE routes SET dist_km = 5.31
WHERE id = 'wa_ultramega_ok' AND dist_km = 10.62;

-- wa_upper_north_ridge_w_great_gendarme (Mount Stuart, Upper North Ridge
-- w/Great Gendarme): the `fa` field credits "Great Gendarme: John Rupley &
-- Don Gordon, 1956" -- but multiple independent sources agree Rupley and
-- Gordon's 1956 first ascent of the North Ridge BYPASSED the Great Gendarme
-- (a short rappel around its base), and that James Wickwire and Fred Stanley
-- made the first ascent of the Great Gendarme itself in 1964, completing the
-- upper ridge as a continuous line. The existing field has this backwards --
-- attributing the Gendarme's first ascent to the party that avoided it.
-- Corrected to credit the bypass and the Gendarme's first ascent separately.
UPDATE routes
SET fa = 'North Ridge (bypassing the Great Gendarme via a short rappel around its base): John Rupley & Don Gordon, 1956. First ascent of the Great Gendarme itself, completing the upper ridge as a continuous line: James Wickwire & Fred Stanley, 1964.'
WHERE id = 'wa_upper_north_ridge_w_great_gendarme'
  AND fa = 'Great Gendarme: John Rupley & Don Gordon, 1956; complete upper-ridge linkup (from the Stuart Glacier notch): James Wickwire & Fred Stanley, 1964';

-- Same route: NOT fixed, flagged for human review. dist_km is stored as 6.4
-- (4.0 mi), smaller than the 6.5 mi the route's own waypoint list already
-- gives for reaching just the top of the Sherpa Glacier notch (before the
-- summit push). Internally inconsistent under either a one-way or round-trip
-- reading; no confirmed correct one-way total for this specific "Upper North
-- Ridge" variant's long Esmeralda Basin/Ingalls/Goat Pass approach could be
-- sourced from an accessible reference.

-- wa_vasiliki_ridge_standard (Vasiliki Ridge, Standard Route / Ares Tower):
-- dist_km stored as 11.27 (7.0 mi), which the app doubles to a displayed
-- 14.0 mi round trip. The route's own waypoint chain gives the one-way
-- distance from the SR-20 Wine Spires pullout to the Ares Tower summit as
-- 3.5 mi (distMi on the "Ares Tower summit" waypoint) = 5.63 km. 11.27 is
-- exactly double that one-way figure -- same doubling bug as wa_ultramega_ok
-- above, which shares this route's trailhead. Corrected to half the stored
-- value, matching the route's own one-way waypoint distance almost exactly.
UPDATE routes SET dist_km = 5.64
WHERE id = 'wa_vasiliki_ridge_standard' AND dist_km = 11.27;
