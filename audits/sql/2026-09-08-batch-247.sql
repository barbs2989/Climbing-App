-- WA alpine audit batch 247 (pass 5)
-- Routes: wa_chair_peak_north_face, wa_chair_peak_northeast_buttress,
-- wa_chair_peak_northwest_ridge, wa_chalangin_peak_little_giant_pass_luahna_col,
-- wa_chianti_spire_east_face, wa_chimney_rock_east_face_direct,
-- wa_chimney_rock_west_face, wa_chiwawa_mountain_southwest, wa_chockstone_route,
-- wa_clark_mountain_west_ridge

-- wa_chianti_spire_east_face, fix 1 of 2: `high_point_ft` is stored as 8400, but
-- this row's OWN "Chianti Spire Summit" waypoint gives elev/elevFt 8420 --
-- contradicting the column that actually feeds the app's Plan-tab time estimates.
-- Independently confirmed via WebSearch: listsofjohn.com's peak-list entry titled
-- "Chianti Spire" - 8,420' Washington gives the identical figure the row's own
-- waypoint already carries; a second source (SummitPost/Mountain Project synthesis)
-- gives ~8,380-8,400 ft "within the resolution of USGS maps," i.e. genuine
-- source disagreement in the 8,380-8,420 range, with 8,420 being the one precise,
-- named peak-list figure and the one this row's own waypoint already states.
-- Corrected high_point_ft to agree with both.
UPDATE routes
SET high_point_ft = 8420
WHERE id = 'wa_chianti_spire_east_face' AND high_point_ft = 8400;

-- wa_chianti_spire_east_face, fix 2 of 2: `dist_km` is stored as 12.55 km (7.8 mi).
-- The route's own itinerary gives day-by-day one-way mileage of 3.9 mi in (day 1,
-- "Approach to Burgundy Col camp") and 3.9 mi to hike the "full approach back out
-- the same day" (day 2's closing leg) -- i.e. the SAME 3.9-mile approach walked
-- once each direction, for a genuine round trip of 7.8 mi. 7.8 mi = 12.55 km,
-- exactly the stored value -- i.e. the round-trip figure was stored where the app
-- expects the one-way distance it doubles for display (the same doubling bug
-- documented on this exact trailhead's neighboring Wine Spires routes,
-- wa_ultramega_ok and wa_ares_tower, in a prior batch). Corrected to the one-way
-- distance (3.9 mi = 6.28 km).
UPDATE routes
SET dist_km = 6.28
WHERE id = 'wa_chianti_spire_east_face' AND dist_km = 12.55;

-- wa_chockstone_route: `road.seasonalGate` states "closed Dec 12, 2025-June 14,
-- 2026 in the 2025-26 season." Independently confirmed via WebSearch (WSDOT's own
-- press release, titled "SR 20 North Cascades Highway closes for season Thursday,
-- Dec. 4 at 6 p.m.," plus WSDOT Blog / Methow Valley News coverage of the spring
-- 2026 reopening): SR-20 actually closed for the 2025-26 season on Dec. 4, 2025,
-- not Dec. 12, and fully reopened June 14, 2026 (the reopening date this row
-- already has correct). Corrected the closure start date only.
UPDATE routes
SET road = jsonb_set(
  road,
  '{seasonalGate}',
  to_jsonb('SR-20 closes seasonally over Washington Pass due to avalanche danger (closed Dec 4, 2025-June 14, 2026 in the 2025-26 season, with exact dates varying by year).'::text)
)
WHERE id = 'wa_chockstone_route'
  AND road ->> 'seasonalGate' = 'SR-20 closes seasonally over Washington Pass due to avalanche danger (closed Dec 12, 2025-June 14, 2026 in the 2025-26 season, with exact dates varying by year).';

-- wa_chimney_rock_west_face: `dist_km` is stored as 29.77 km (18.5 mi). The
-- route's own itinerary day-by-day breakdown gives 6.5 mi (day 1, approach to high
-- camp) + 5 mi (day 2, round-trip summit day) + 7 mi (day 3, hike out) = 18.5 mi
-- round trip -- 18.5 mi = 29.77 km exactly, i.e. the round-trip total was stored
-- where the app expects the one-way distance it doubles for display (the same
-- doubling bug already fixed on several other routes in this catalog, e.g.
-- wa_trapper_mountain_south_slopes / wa_true_grit_2 in a prior batch). The row's
-- own waypoint chain corroborates a one-way distance close to half that (summit
-- waypoint distMi: 9.3 mi = 14.97 km). Corrected to half the stored (buggy)
-- round-trip value, consistent with both the itinerary and the waypoint chain.
UPDATE routes
SET dist_km = 14.89
WHERE id = 'wa_chimney_rock_west_face' AND dist_km = 29.77;

-- wa_chiwawa_mountain_southwest, fix 1 of 2: `gain_ft`/`loss_ft` are stored as
-- 5,659 ft each -- exactly the NET elevation change from the Trinity trailhead
-- (2,800 ft) to the summit (8,459 ft), which ignores the route's own documented
-- saddle-crossing profile. The row's own itinerary day breakdown (day 1: +3,300
-- ft to high camp; day 2: +3,900/-3,900 ft round-trip summit day via the
-- Fortress-Chiwawa saddle; day 3: -3,300 ft hike out) sums to 7,200 ft of
-- cumulative gain and 7,200 ft of cumulative loss, and the same itinerary's own
-- `totalNote` independently states "roughly 7,300 ft cumulative gain/loss" --
-- both of which agree with each other and disagree with the stored 5,659.
-- Corrected gain_ft/loss_ft to match the row's own day-by-day breakdown.
UPDATE routes
SET gain_ft = 7200, loss_ft = 7200
WHERE id = 'wa_chiwawa_mountain_southwest' AND gain_ft = 5659 AND loss_ft = 5659;

-- wa_chiwawa_mountain_southwest, fix 2 of 2: `dist_km` is stored as 30.58 km
-- (19.0 mi). This route's own itinerary `totalNote` states the trip is
-- "~19-20 miles round trip," and the day-by-day breakdown (7 + 6 + 7 mi) sums to
-- 20 mi round trip -- i.e. the round-trip total was stored where the app expects
-- the one-way distance it doubles for display (the identical doubling bug found
-- on wa_trapper_mountain_south_slopes, which coincidentally shares this exact
-- stored dist_km value of 30.58, in a prior batch). Corrected to half the stored
-- value, matching that prior fix's method.
UPDATE routes
SET dist_km = 15.29
WHERE id = 'wa_chiwawa_mountain_southwest' AND dist_km = 30.58;

-- wa_chair_peak_northwest_ridge: `fa` was "unknown". Independently confirmed via
-- two separate WebSearch results (a Mountaineers.org route page and a Beckey
-- Cascade Alpine Guide-sourced summary): the Northwest Ridge's first WINTER
-- ascent was made by Kit Lewis and Rob(ert) Harris in 1975 -- the same climbers
-- this row's sibling route (wa_chair_peak_north_face) currently credits (with two
-- additional names) for a January 1975 first ascent of the NORTH FACE instead.
-- No source found credits Lewis/Harris's 1975 winter first ascent to the North
-- Face; both independent sources instead tie it specifically to the Northwest
-- Ridge, matching this row's own name. Filling this row's previously-"unknown" fa
-- with the well-corroborated fact; wa_chair_peak_north_face's fa is left
-- unchanged and flagged separately below for human review, since a possible
-- (but unconfirmed) conflation is not the same as a confirmed error.
UPDATE routes
SET fa = 'Kit Lewis and Rob Harris (first winter ascent, 1975)'
WHERE id = 'wa_chair_peak_northwest_ridge' AND fa = 'unknown';

-- wa_clark_mountain_west_ridge, fix 1 of 2: `loss_ft` was NULL while `gain_ft` is
-- populated (6,500 ft) for a car-to-car round trip that returns to the same
-- trailhead -- matching this catalog's own consistent convention elsewhere
-- (gain_ft == loss_ft for a round-trip route). Filling the gap from the row's own
-- already-populated gain_ft; no new figure is invented.
UPDATE routes
SET loss_ft = 6500
WHERE id = 'wa_clark_mountain_west_ridge' AND loss_ft IS NULL AND gain_ft = 6500;

-- wa_clark_mountain_west_ridge, fix 2 of 2: `itinerary.totalNote`'s closing clause
-- reads "...roughly 26 miles and 7,300 ft gained/lost total" -- but this
-- contradicts the SAME field's own day-by-day breakdown two sentences earlier in
-- the same totalNote (~8 mi + ~5 mi + ~8 mi = ~21 mi, not 26) and the itinerary's
-- own `days` array (7.5 + 5 + 7.5 = 20 mi; day gainFt/lossFt of 3,100 + 3,000 =
-- 6,100 ft, close to the row's own gain_ft/loss_ft of 6,500, not 7,300). This is a
-- self-contained arithmetic error verifiable purely from the row's own data, with
-- no external source needed. Corrected the closing tally to match the row's own
-- day breakdown and persisted gain_ft/loss_ft columns.
UPDATE routes
SET itinerary = jsonb_set(
  itinerary,
  '{totalNote}',
  to_jsonb('A 3-day backpack trip: ~8 mi/~3,100 ft up to Boulder Basin camp on day 1, an ~5-mile, ~11.5-hour round-trip summit push via the Walrus Glacier on day 2, and the ~8-mile hike out on day 3 — roughly 20 miles and 6,500 ft gained/lost total.'::text)
)
WHERE id = 'wa_clark_mountain_west_ridge'
  AND itinerary ->> 'totalNote' = 'A 3-day backpack trip: ~8 mi/~3,100 ft up to Boulder Basin camp on day 1, an ~5-mile, ~11.5-hour round-trip summit push via the Walrus Glacier on day 2, and the ~8-mile hike out on day 3 — roughly 26 miles and 7,300 ft gained/lost total.';

-- wa_chair_peak_north_face: NOT fixed, flagged for human review. `fa` credits
-- "Kit Lewis, Charlie Hampson, Rob Harris, Greg Jacobson (January 1975)" for the
-- North Face. Two independent WebSearch sources (Mountaineers.org, a Beckey-guide
-- summary) instead credit the near-identical pairing "Kit Lewis and Rob(ert)
-- Harris" with the 1975 first WINTER ascent of the sibling Northwest Ridge route
-- (now recorded on that row, above) -- and neither source mentions a North Face
-- first ascent by Hampson/Jacobson. It's plausible a single larger party split
-- into two rope teams and climbed both routes the same winter (which would make
-- this row correct as-is), but no source could be found confirming a distinct
-- North Face first ascent, so this is flagged rather than altered.

-- wa_chair_peak_north_face, wa_chair_peak_northeast_buttress,
-- wa_chalangin_peak_little_giant_pass_luahna_col, wa_chimney_rock_east_face_direct:
-- confirmed clean on the facts checked. Chair Peak's elevation (6,238 ft, matching
-- all three Chair Peak routes' high_point_ft and both trailhead/summit waypoint
-- pairs) independently confirmed via Wikipedia/Facebook (Summit at Snoqualmie).
-- Chalangin Peak's elevation (8,371 ft) and the Butterfly Butte camp area (~5,850
-- ft, in the same ballpark as this row's "~6,200 ft" approach-text estimate)
-- independently confirmed via WebSearch (countryhighpoints.com, onehikeaweek.com
-- synopsis); Little Giant Pass's 6,409 ft and the Napeequa Valley floor's
-- 4,400-5,000 ft range are also independently confirmed and consistent with this
-- row's "descend roughly 2,200 ft" approach text. Chimney Rock's main/central
-- summit (7,727 ft) matches this row's high_point_ft and waypoint, and its `fa`
-- of "Cornelius Molenaar, Elvis R. Johnson (1954)" for this specific technical
-- variant could not be confirmed OR contradicted (Wikipedia only documents the
-- peak's overall 1930 first ascent via a different line, which this row's sibling
-- West Face route already correctly cites separately) -- left as-is per audit
-- policy of not altering unverifiable claims. No changes.
