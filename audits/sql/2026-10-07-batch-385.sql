-- WA alpine audit, pass 7, batch 385 (2026-10-07)
-- Routes checked: wa_big_snow_mountain_north_slope_dingford_route,
-- wa_big_snow_mountain_southwest_ridge, wa_black_peak_northeast_ridge,
-- wa_blizzard_peak_standard, wa_bonanza_peak_cascadian_route,
-- wa_bonanza_peak_mary_green_glacier, wa_bonanza_peak_northeast_buttress,
-- wa_bonanza_peak_oregonian_route

BEGIN;

-- wa_big_snow_mountain (areas row): stored prominence_ft (1402) matches no
-- source found. Wikipedia's "Big Snow Mountain" infobox (corroborated by a
-- PeakVisor listing) gives 1,360 ft (415 m), with Overcoat Peak (7,432 ft) as
-- the parent and 3.74 mi isolation -- consistent with the area blurb's own
-- "taller parent, Overcoat Peak, 3.75 mi to the ESE" text. No source found
-- gives 1402.
UPDATE areas
SET prominence_ft = 1360
WHERE id = 'wa_big_snow_mountain'
  AND prominence_ft = 1402;

-- wa_blizzard_peak (areas row) and wa_blizzard_peak_standard (routes row):
-- stored elevation_ft / high_point_ft (7622) matches no source. TopoQuest's
-- USGS-derived place record for Blizzard Peak, Okanogan County, WA (USGS 1:24K
-- Castle Peak quad) gives coordinates 48.94097,-120.75539 -- an exact match to
-- this row's stored lat/lng (48.940705,-120.755275) -- at an elevation of
-- 7,601 ft. No source found gives 7622. (The row's own prose -- the area
-- blurb, route overview/approach text, and the waypoints/pitch_detail/
-- itinerary JSON sub-fields that spell out "7,622 ft" -- still needs a
-- separate prose sweep; see the flagged note below. This batch only corrects
-- the two value columns.)
UPDATE areas
SET elevation_ft = 7601
WHERE id = 'wa_blizzard_peak'
  AND elevation_ft = 7622;

UPDATE routes
SET high_point_ft = 7601
WHERE id = 'wa_blizzard_peak_standard'
  AND high_point_ft = 7622;

COMMIT;

-- Flagged for human review, not fixed this batch:
--
-- wa_big_snow_mountain_southwest_ridge: a near-empty stub row (id/area_id/
-- name/discipline/auto_generated/classic only). No source found names a
-- "Southwest Ridge" line on Big Snow Mountain -- documented routes turning up
-- are an East Ridge/"Hardscrabble" route, a Northeast Ridge, and the North
-- Slope (Dingford) route already in the catalog. Not proof the line doesn't
-- exist (Smoot's guidebook isn't indexed online), but worth a human check
-- before investing enrichment effort here.
--
-- wa_big_snow_mountain_north_slope_dingford_route: routes.permit text ("...No
-- parking fee is currently charged at the Dingford Creek Trailhead") and
-- routes.access->passRequired ("not listed as required by the current USFS
-- trailhead page") sit in tension with three independent listings
-- (Mountaineers.org, two WTA pages) that all tag a Northwest Forest Pass as
-- the trailhead's parking pass/entry fee. May be a legitimate distinction
-- (unstaffed trailhead vs. a fee-booth site) rather than an error -- needs a
-- human to check the current USFS Snoqualmie Ranger District page directly.
--
-- wa_black_peak_northeast_ridge: routes.alpine_grade / routes.commitment are
-- both "II", but Mountaineers.org and Outdoor Project both independently call
-- this route Grade III, while SummitPost's dedicated route page calls it
-- Grade I. Three sources, three different grades -- no single correction is
-- supportable; if a human picks III (the majority/more-authoritative read),
-- the area row's own blurb text ("...offers a moderate Grade II alpine-rock
-- outing...") would also need updating to match.
-- Also: routes.gain_ft (4130) / routes.dist_km (16.1, ~10 mi) sit between two
-- conflicting secondary sources (SummitPost: ~11 mi/~5,000 ft; Outdoor
-- Project: ~6 mi/~4,100 ft) -- not confirmable either way.
--
-- wa_bonanza_peak (areas row): elevation_ft is 9516, but this route's own
-- wa_bonanza_peak_mary_green_glacier and wa_bonanza_peak_northeast_buttress
-- rows both carry high_point_ft = 9511 -- an internal split that mirrors a
-- real split in sources (Wikipedia/PeakVisor say 9,516 ft; SummitPost/
-- Mountaineers.org say 9,511 ft). Needs a human call on which figure the
-- catalog should standardize on, then a sweep to make the area row and both
-- route rows agree.
--
-- wa_bonanza_peak_mary_green_glacier: the area blurb and this route's own
-- fa/overview text state the 1937 first ascent (Mazamas) climbed "what's now
-- the standard Mary Green Glacier route." Wikipedia's "Bonanza Peak" and
-- "Company Glacier" articles (citing Beckey's Cascade Alpine Guide) instead
-- credit the 1937 FA to a line via the Company Glacier (north side), with
-- Mary Green Glacier (east side) described elsewhere as today's separate,
-- modern standard/easiest route. Needs an editorial rewrite distinguishing
-- "first ascent of the peak" from "first ascent of this specific route,"
-- not a simple value swap.
-- Separately: this route's fa spells the FA climber "Curtis Ijames," but the
-- area blurb spells the same person "Curtis James" -- an internal mismatch
-- that mirrors a real split between sources (Wikipedia: "Curtis I. James";
-- NPS North Cascades Historic Resource Study: "Curtis Ijames"). Needs a human
-- judgment call on which spelling to standardize, then align the two rows.
--
-- wa_bonanza_peak_northeast_buttress: strong, unresolved doubt about this
-- entire route row. Its fa field names "Kurt Buchwald, Peter Avolio, and
-- Martin Volken, August 21-22, 2004" as "the first leg of the first
-- three-summit traverse of Bonanza." Despite Bonanza Peak being extensively
-- documented (AAJ/AAC Publications, SummitPost, Wikipedia, Mountaineers.org,
-- CascadeClimbers all index well), repeated searches found zero mentions of
-- these three climbers' names in connection with Bonanza or North Cascades
-- climbing at all, zero mentions of a "three-summit traverse of Bonanza" in
-- any year, and zero mentions of a route named "Northeast Buttress" on this
-- peak anywhere. The real, well-documented second technical route to
-- Bonanza's true/main summit (beyond the 1937 line) is the Northwest Ridge
-- (V, 5.8), first climbed in 2007 by Blake Herrington and Tim Haider via Dark
-- Peak/Dark Glacier (AAC Publications) -- a different aspect, different
-- party, different year, and different approach than this row describes.
-- This row's own `corrections` field already hedges in a way consistent with
-- a pipeline that could not find a source and asserted a specific party/date
-- anyway. Recommend a human decide whether to pull/rewrite the fa field and
-- "three-summit traverse" framing, or re-attribute this row to the real
-- Northwest Ridge (2007) if that is the line the catalog meant to represent.
-- Secondary to the above: grade/grade_num say "5.7"/7, but rock_grade says
-- "5.7/5.8" and the body text repeatedly says "5.6-5.7" -- not worth fixing
-- independently of resolving the FA/existence question first.
