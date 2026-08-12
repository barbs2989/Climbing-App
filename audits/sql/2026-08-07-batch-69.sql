-- WA alpine audit, pass 2, batch 69 (2026-08-07)
-- Routes: Hozomeen Mountain (x2), Hurry-Up Peak, Icy Peak (x2), Ingalls Peak (x2), Inner
-- Constance (x2), Inspiration Peak. Each statement's comment explains the source basis.

-- wa_hozomeen_mountain (area): prominence_ft (3938) disagrees with both Wikipedia and
-- Peakbagger, which independently agree on 3,932 ft.
UPDATE areas SET prominence_ft = 3932 WHERE id = 'wa_hozomeen_mountain';

-- wa_hozomeen_mountain_southeast_face: overview text misdates the North Face route's FA
-- (cited here only as a comparison to this row's own line) as "2019 by Rolf Larson & partner".
-- AAC Publications ("South Hozomeen Mountain, North Face") and a matching CascadeClimbers.com
-- trip report both date it August 13-14, 2016, party Rolf Larson & Eric Wehrly.
UPDATE routes SET overview = replace(overview, 'FA 2019 by Rolf Larson & partner', 'FA 2016 by Rolf Larson & Eric Wehrly') WHERE id = 'wa_hozomeen_mountain_southeast_face';

-- wa_hozomeen_mountain_southeast_face: waypoints[0] ("Lightning Creek boat landing / trail
-- junction") distMi (11) contradicts this same waypoint's own note field, which already says
-- "this is mile ~16 of the SR-20 approach trail" -- corroborated by WTA's East Bank Ross Lake
-- trail description ("At mile 16 (26 km) the trail leaves Ross Lake to follow Lightning Creek").
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,distMi}', '16') WHERE id = 'wa_hozomeen_mountain_southeast_face';

-- wa_hurry_up_peak_south_ridge: waypoints[4] ("Kool-Aid Lake") elev (6200) contradicts this
-- same row's own approach text ("Kool-Aid Lake (6,320 ft)") and itinerary.days[0].note
-- ("~6,320 ft"), and matches Ptarmigan Traverse trip-report sources at 6,320 ft.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{4,elev}', '6320') WHERE id = 'wa_hurry_up_peak_south_ridge';

-- wa_hurry_up_peak_south_ridge: road.status claims the foot/bike-only stretch past the
-- Eldorado/milepost-20 gate to the Cascade Pass Trailhead is "~2.3 miles", contradicted by
-- this same row's own access.closures ("about 3 miles short") and road.driveNote ("roughly 6
-- miles round trip" = 3 mi one-way); NPS-sourced trip content also cites 3 miles for this gate.
UPDATE routes SET road = jsonb_set(road, '{status}', '"Closed to vehicles at Eldorado/milepost 20 (2026 season) due to flooding/landslide damage; open beyond the gate to foot and bicycle traffic on the remaining ~3 miles to the Cascade Pass Trailhead."') WHERE id = 'wa_hurry_up_peak_south_ridge';

-- wa_hurry_up_peak_south_ridge: partner_requirements.fitnessSpec.hiking and .approachTime both
-- reference a "Horseshoe Basin" camp, which this same row's own overview field explicitly rules
-- out ("It is not part of the Sahale-Boston/Horseshoe Basin group on the opposite side of the
-- pass; instead it's reached from a Kool-Aid Lake camp") -- boilerplate contamination from a
-- different North Cascades route.
UPDATE routes SET partner_requirements = jsonb_set(jsonb_set(partner_requirements, '{fitnessSpec,hiking}', '"Strong off-trail/cross-country fitness for the approach into a basin camp near Kool-Aid Lake, plus a full scramble day on summit day"'), '{approachTime}', '"Multi-day trip: roughly a full day off-trail to establish camp at Kool-Aid Lake, then a shorter round trip from camp to the summit via the south ridge"') WHERE id = 'wa_hurry_up_peak_south_ridge';

-- wa_hurry_up_peak_south_ridge: approach_logistics.trailheadDirection cites "~3,660 ft" for the
-- Cascade Pass Trailhead, contradicted by this same row's own waypoints[0].elev (3600), approach
-- text ("~3,600 ft"), and the NPS-published Cascade Pass Trail trailhead elevation (3,600 ft).
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}', '"From the Cascade Pass Trailhead at the end of Cascade River Road (~3,600 ft)"') WHERE id = 'wa_hurry_up_peak_south_ridge';

-- wa_icy_peak_southwest_route: high_point_ft (7073) and the final summit waypoint both claim
-- this route reaches Icy Peak's true, higher Southeast summit -- but this same row's own
-- approach text says the described 100-ft gully "leads to the northwest summit" and that "the
-- true high point is a separate southeast tower about 11 ft higher... many parties only tag the
-- northwest summit". Beckey's Cascade Alpine Guide (via search corroboration) gives the
-- Northwest Peak at 7,062 ft -- exactly matching this row's own stated "11 ft" gap from 7,073.
-- As described, the route as documented tops out at the NW/register summit, not the true high point.
UPDATE routes SET high_point_ft = 7062 WHERE id = 'wa_icy_peak_southwest_route';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '7062') WHERE id = 'wa_icy_peak_southwest_route';
UPDATE routes SET overview = replace(overview, 'the true, higher Southeast summit (7,073 ft) reached by this route', 'the true, higher Southeast summit (7,073 ft); this route reaches the lower, more-visited Northwest summit (7,062 ft) where the register sits') WHERE id = 'wa_icy_peak_southwest_route';

-- wa_icy_peak_southwest_route: season ("Jun-Aug") excludes September despite this same row's
-- own seasonal_guidance.monthBreakdown rating September "good" and its own best_season text
-- ("Mid-July through September for the standard route") -- and rates June "risky" ("Full winter/
-- spring snowpack still typical... road often still gated"), which the season field wrongly includes.
UPDATE routes SET season = 'Jul-Sep' WHERE id = 'wa_icy_peak_southwest_route';

-- wa_ingalls_peak (area): prominence_ft (1248) disagrees with both Wikipedia and Peakbagger,
-- which independently agree on 1,222 ft (372 m).
UPDATE areas SET prominence_ft = 1222 WHERE id = 'wa_ingalls_peak';

-- wa_ingalls_peak_south_ridge: top-level permit field wrongly describes this route as inside
-- the Enchantment Permit Area (quota lottery). Lake Ingalls/Ingalls Peak is reached via the
-- separate Esmeralda/North Fork Teanaway trailhead, not any Enchantment-zone trailhead (Stuart
-- Lake/Snow Lakes off Icicle Creek Road) -- press coverage (Spokesman-Review, "For hikers
-- skunked on Enchantment permits, Lake Ingalls area offers gorgeous alternative") explicitly
-- cites Lake Ingalls as a non-quota alternative. This row's own access.permit field already has
-- it right; the top-level field contradicted it.
UPDATE routes SET permit = 'Free self-issue wilderness permit at the trailhead, required for all entry into the Alpine Lakes Wilderness. Not part of the quota-permit Enchantment Permit Area -- no lottery required.' WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_ingalls_peak_south_ridge: pitches (4) contradicts this same row's own pitch_detail array
-- (3 entries), length_m (91, matching the 3 pitch lengths summed: 50+20+20=90), and its own
-- beta/timing/itinerary/schedule text, which says "3 pitches" in four separate places.
UPDATE routes SET pitches = 3 WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_ingalls_peak_south_ridge: top-level rappels text ("about 4 rappels... Two 60m ropes are
-- recommended -- single-rope rappels have gotten stuck") contradicts this same row's own
-- descent_text ("most parties do the descent in three rappels with a single 60m rope... a 70m
-- rope makes the middle rappel more comfortable but is not required") and rappel_detail array
-- (exactly 3 entries, 30m/55m/30m); no external source found describes stuck ropes.
UPDATE routes SET rappels = 'Rappel the route: 3 rappels (30m/55m/30m) from the summit anchor with a single 60m rope. A 70m rope makes the middle rappel more comfortable but is not required.' WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_ingalls_peak_south_ridge: waypoints[0] ("Esmeralda (Ingalls Way) Trailhead") elev (4200)
-- contradicts the East Route's waypoint for the identical trailhead (elev 4269, same
-- coordinates 47.4367/-120.9369) and a USFS/komoot trailhead listing (4,269 ft).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '4269') WHERE id = 'wa_ingalls_peak_south_ridge';
UPDATE routes SET road = jsonb_set(road, '{driveNote}', '"~22-23 mi from the SR 970 turnoff (about 8.5 mi on SR 970 + ~13 mi on Teanaway River Rd + ~9.6 mi on FR-9737) to the Esmeralda/Ingalls Way Trailhead (~4,269 ft)."') WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_ingalls_peak_south_ridge: approach text gives Lake Ingalls' elevation as "6,480 ft",
-- contradicting this same row's own waypoints[2] ("Lake Ingalls", elev 6467) and matching
-- neither Wikipedia (6,466 ft) nor the East Route's own Lake Ingalls waypoint (elev 6466).
UPDATE routes SET approach = replace(approach, 'Lake Ingalls (6,480 ft)', 'Lake Ingalls (6,467 ft)') WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_inner_constance_northwest_buttress: waypoints[0] and approach_logistics both describe the
-- Dosewallips Road washout as this route's trailhead -- but this same row's own approach text
-- describes driving to the Upper Dungeness Trailhead (Trail #833.2) instead, and its own
-- pro_tips explicitly warns the Dosewallips/Lake Constance side "deposits you in Avalanche
-- Canyon on the wrong aspect for this route". Mountain Project's Inner Constance area page
-- corroborates: "the easiest approach from Upper Dungeness trailhead". This looks like
-- boilerplate copied from the Standard Route's Dosewallips approach.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0}', '{"lat": 47.877572, "lng": -123.136927, "name": "Upper Dungeness Trailhead (Trail #833.2)", "type": "Trailhead"}') WHERE id = 'wa_inner_constance_northwest_buttress';
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(approach_logistics, '{trailhead}', '"Upper Dungeness Trailhead (Trail #833.2)"'), '{trailheadLat}', '47.877572'), '{trailheadLng}', '-123.136927') WHERE id = 'wa_inner_constance_northwest_buttress';
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}', '"From the Upper Dungeness Trailhead: hike the Upper Dungeness/Home Lake climbers'' route toward Home Lake/Home Creek basin below Inner Constance''s northwest side"') WHERE id = 'wa_inner_constance_northwest_buttress';

-- wa_inner_constance_standard: approach text calls the Dosewallips/Crystal Pass approach "about
-- 16 mi one-way, matching the ~25.75 km on file" -- but dist_km (12.9, doubling to 25.8 km per
-- this app's documented one-way convention) and this same row's own itinerary.totalNote
-- ("roughly 16 miles round trip") both show 16 mi is the round-trip figure, not one-way.
UPDATE routes SET approach = replace(approach, 'about 16 mi one-way, matching the ~25.75 km on file', 'about 16 mi round trip (~8 mi one-way), matching the ~25.75 km round-trip figure on file') WHERE id = 'wa_inner_constance_standard';

-- wa_inspiration_peak_west_ridge: dist_km (11.9) is inconsistent with this same row's own
-- waypoints (cumulative distMi to the summit = 10.6 mi one-way) and itinerary.totalNote ("~21
-- mi round trip"); 10.6 mi one-way = ~17.06 km, which doubles to ~21.2 mi round trip matching
-- the itinerary, while doubling the stored 11.9 km (23.8 km = 14.8 mi) does not.
UPDATE routes SET dist_km = 17.1 WHERE id = 'wa_inspiration_peak_west_ridge';
