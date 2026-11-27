-- WA alpine audit — batch 582 (pass 9)
-- Routes checked: wa_hadley_peak_cougar_divide, wa_hadley_peak_skyline_divide,
-- wa_hagan_mountain_north_slopes_blum_lakes, wa_hagan_mountain_south,
-- wa_half_moon_southwest_slopes, wa_half_moon_uncle_wehrly_s_toupee,
-- wa_helmet_butte_standard_route, wa_hibox_mountain_south_face,
-- wa_himmelhorn_southeast_route, wa_himmelhorn_stonehenge.
-- All WHERE clauses include the current (wrong) value as a safety check per project
-- convention. Apply each UPDATE individually rather than pasting the whole file at once.

-- =========================================================================
-- Hadley Peak (wa_hadley_peak) — area elevation vs. its own routes
-- =========================================================================

-- areas.wa_hadley_peak.elevation_ft is stored as 7522, but both of its own routes
-- (wa_hadley_peak_cougar_divide, wa_hadley_peak_skyline_divide) give high_point_ft 7515
-- and place their own summit waypoints at elev/elevFt 7515 -- and every outside source
-- found (SummitPost object 561479, Mountaineers.org's Hadley Peak routes-places page, a
-- cascadeclimbers.com trip report titled "Hadley Peak (7515)...") gives 7,515 ft, with no
-- source found for 7,522. Aligning the area to match its own routes and the outside
-- sources; the area's own blurb text repeats the stale figure too.
UPDATE areas SET elevation_ft = 7515 WHERE id = 'wa_hadley_peak' AND elevation_ft = 7522;

UPDATE areas SET blurb = replace(blurb, '(7,522 ft)', '(7,515 ft)')
WHERE id = 'wa_hadley_peak' AND blurb LIKE '%(7,522 ft)%';

-- =========================================================================
-- Hadley Peak, Skyline Divide Route — wa_hadley_peak_skyline_divide
-- =========================================================================

-- gain_ft/loss_ft is stored as 2818/2818, but the SAME row's own itinerary.days[0] gives
-- gainFt/lossFt of 3300/3300 and a totalNote of "about 14-15 miles round trip" with
-- miles: 14.5 -- matching this route's own dist_km (11.9 km one-way, ~14.8 mi round trip)
-- far better than 2818 does. The top-level figure is the outlier against the row's own
-- itinerary block; aligning it to match rather than guessing from the noisier raw track
-- (which is one-way only, so summing its deltas would overcount per this codebase's own
-- check:profile-gain reasoning).
UPDATE routes SET gain_ft = 3300, loss_ft = 3300
WHERE id = 'wa_hadley_peak_skyline_divide' AND gain_ft = 2818 AND loss_ft = 2818;

-- =========================================================================
-- Hagan Mountain, South Slopes — wa_hagan_mountain_south
-- =========================================================================

-- The `gear` list carries ice axe, helmet, trekking poles, map/compass and insect
-- repellent, but never crampons -- while the route's own waypoint directions for the
-- Hagan Glacier crossing say explicitly to "put crampons on" and call them "recommended
-- even in midsummer." `what_to_bring` and `rack` describe the rest of the glacier kit
-- (harness, crevasse-rescue kit, rope) but don't name crampons either, so the gap isn't
-- disclosed anywhere in the row. Appending it so the stored kit list matches what the
-- route's own prose tells a climber to bring.
UPDATE routes SET gear = gear || '["Crampons for the Hagan Glacier crossing"]'::jsonb
WHERE id = 'wa_hagan_mountain_south'
  AND gear = '["ice axe (early season)", "helmet", "trekking poles", "map and compass or GPS (route is mostly cross-country and unmarked past Diobsud Lakes)", "insect repellent/head net (blackflies and mosquitoes reported in mid-to-late summer)"]'::jsonb;

-- =========================================================================
-- Half Moon, "North Ridge" — wa_half_moon_southwest_slopes
-- =========================================================================

-- This row's own `name` ("North Ridge") and content are correct and documented
-- (SummitPost's "Darkside of the Moon" page, Mountain Project's dedicated Half Moon
-- "North Ridge" entry, a 2018 Cascade Climbers trip report of "the north ridge of Half
-- Moon" at 5.7 from the notch) -- the area's own blurb lists Half Moon's three known
-- lines as "Southwest Ridge, North Ridge, South Face," never "Southwest Slopes," and this
-- row's own `corrections` field already says the content was rewritten to the real North
-- Ridge because "Half Moon has no scramble route, and the previous description matched no
-- documented line." Only the `id` is stale, implying a line that doesn't exist -- same
-- family as wa_big_kangaroo_southwest_rib (batches 3/244). Not renaming the id here (needs
-- a human check for FK/UI dependencies per that precedent); flagging via data_quality.gaps
-- the same way that case was flagged.
UPDATE routes SET data_quality = jsonb_set(
  data_quality, '{gaps}',
  (data_quality->'gaps') || '["Route ID mismatch: id = ''wa_half_moon_southwest_slopes'' (implying a Southwest Slopes line) but no such route is documented for Half Moon -- this row correctly describes the real, documented North Ridge (notch-to-summit, 5.7, Grade III). Same family as wa_big_kangaroo_southwest_rib. Recommend renaming id to wa_half_moon_north_ridge after checking for FK/UI dependencies."]'::jsonb
)
WHERE id = 'wa_half_moon_southwest_slopes'
  AND jsonb_array_length(data_quality->'gaps') = 5
  AND data_quality->'gaps'->>0 = 'No verified GPS track or pin for the notch at the start of the route';

-- =========================================================================
-- Helmet Butte Standard Route — wa_helmet_butte_standard_route
-- =========================================================================

-- waypoints[1] ("Helmet Butte Summit") still carries elev/elevFt = 7420, the pre-
-- correction ListsOfJohn figure this row's own `corrections` field already rejected in
-- favor of 7,400 ft (matching high_point_ft and the area's own elevation_ft, and the
-- better-supported figure per Wikipedia). An earlier correction pass updated high_point_ft
-- and the area row but never propagated the fix to this waypoint.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{1,elev}', '7400'::jsonb),
  '{1,elevFt}', '7400'::jsonb
)
WHERE id = 'wa_helmet_butte_standard_route'
  AND waypoints->1->>'name' = 'Helmet Butte Summit'
  AND waypoints->1->>'elev' = '7420'
  AND waypoints->1->>'elevFt' = '7420';

-- =========================================================================
-- Himmelhorn, Standard Route — wa_himmelhorn_southeast_route
-- =========================================================================

-- The top-level `season` ("Jul-Oct") self-contradicts this same row's own `best_season`
-- text ("early-fall storms often close the window by mid-September") and its own
-- `seasonal_guidance.monthBreakdown`, which carries no October entry at all. The nested
-- `approach_variants[0].season` repeats the same wrong value. Correcting both to match
-- what the row's own prose already says.
UPDATE routes SET season = 'Jul-Sep'
WHERE id = 'wa_himmelhorn_southeast_route' AND season = 'Jul-Oct';

UPDATE routes SET approach_variants = jsonb_set(approach_variants, '{0,season}', '"Jul-Sep"')
WHERE id = 'wa_himmelhorn_southeast_route' AND approach_variants->0->>'season' = 'Jul-Oct';

-- =========================================================================
-- Himmelhorn, Stonehenge — wa_himmelhorn_stonehenge
-- =========================================================================

-- emergency.rangerStation names "810 State Route 20, Sedro-Woolley, WA 98284,
-- (360) 854-7200" as the Wilderness Information Center, but per NPS's own current
-- contact pages that address/number is North Cascades NP's Sedro-Woolley headquarters
-- line, not the Wilderness Information Center -- which NPS places at 7280 Ranger
-- Station Rd, Marblemount, WA, (360) 854-7245. The sibling route on this same peak,
-- wa_himmelhorn_southeast_route, already has it right. Correcting to match.
UPDATE routes SET emergency = jsonb_set(
  emergency, '{rangerStation}',
  '"North Cascades National Park Wilderness Information Center, 7280 Ranger Station Rd, Marblemount, WA 98267 -- (360) 854-7245 (permits, current trail/route conditions, and backcountry emergency coordination)."'::jsonb
)
WHERE id = 'wa_himmelhorn_stonehenge'
  AND emergency->>'rangerStation' = 'North Cascades NP Wilderness Information Center, 810 State Route 20, Sedro-Woolley, WA 98284, (360) 854-7200';

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_hadley_peak_skyline_divide: `permit` text ("No wilderness permit is required; a
--    climbing register is optional") differs in substance from sibling Cougar Divide's
--    ("Free self-issue Mount Baker Wilderness permit or trailhead registration") for the
--    same Wilderness area. General USFS guidance leans toward Cougar Divide's wording,
--    but no page specific to these two trailheads was found to settle it.
--  - wa_hagan_mountain_south: `approach`/`descent_text`/`bail` describe a Baker River
--    Trailhead -> Sulphide Creek Camp -> "Hidden Lake" approach, while `waypoints[1:]`,
--    `itinerary`, `access`, `road`, and `approach_logistics` independently and
--    consistently describe a different, externally-verified approach (Watson Lakes
--    Trailhead -> Anderson-Watson Lakes Trail 611 -> Diobsud Lakes -> a different "Hidden
--    Lake" at the Bacon-Hagan saddle) -- and `waypoints[0]` itself names "Baker River
--    Trailhead" while `waypoints[1]`'s own directions say to start on Trail 611. Looks like
--    two research passes' content got merged into one row without reconciliation (same
--    kind of mix-up as the Baring/Garfield FA mislabel in batch 577); fixing it means
--    picking a canonical approach and rewriting prose/waypoints, not swapping one value.
--    Secondary signal: the itinerary's three days sum to 6,900 ft of loss vs. top-level
--    loss_ft = 6,600 on what should be a round trip -- a ~300 ft (4.5%) imbalance spread
--    across all three days, not pinned to one field.
--  - wa_himmelhorn_southeast_route: the id says "southeast_route," but every descriptive
--    field (aspect NW, face "Northwest Aspect", overview, approach, climbing_route -- all
--    externally confirmed correct) describes a northwest-facing line via the Himmel-Otto
--    col. The row's own `corrections` field separately references an unrelated "SE-route"
--    Beckey quote and names "the better-documented Himmelhorn line" as "the East
--    Ridge/North Face (II 5.10+)," a route/grade appearing nowhere else on this row --
--    reads like a leftover identity/aspect mix-up from an earlier research pass. Per
--    docs/codebase/route-identity.md, an id rename isn't a plain field UPDATE, so flagging
--    rather than guessing a fix.
--  - wa_himmelhorn_stonehenge: `emergency.nearestHospital` says "Skagit Valley Hospital,
--    Mount Vernon, WA," while the sibling route on the same peak/same Goodell Creek
--    trailhead says "PeaceHealth United General Medical Center, Sedro-Woolley, WA" for the
--    identical approach. Sedro-Woolley sits on the same SR-20 corridor out from Newhalem,
--    well short of Mount Vernon, so the sibling's answer looks more plausible, but no hard
--    sourced mileage comparison was found strong enough to call this a clean confirmed
--    error on its own.
--
-- Checked clean this batch, no issues found:
--  wa_hadley_peak_cougar_divide, wa_hagan_mountain_north_slopes_blum_lakes,
--  wa_half_moon_uncle_wehrly_s_toupee, wa_hibox_mountain_south_face (this last one is
--  mostly unenriched -- high_point_ft, waypoints, gain_ft/loss_ft, descent, permit,
--  season, hazards, aspect and gear are all null, so there was nothing to contradict).
-- =========================================================================

-- Verify afterward:
select id, elevation_ft from areas where id = 'wa_hadley_peak';
select id, gain_ft, loss_ft from routes where id = 'wa_hadley_peak_skyline_divide';
select id, gear from routes where id = 'wa_hagan_mountain_south';
select id, data_quality from routes where id = 'wa_half_moon_southwest_slopes';
select id, waypoints from routes where id = 'wa_helmet_butte_standard_route';
select id, season, approach_variants from routes where id = 'wa_himmelhorn_southeast_route';
select id, emergency from routes where id = 'wa_himmelhorn_stonehenge';
