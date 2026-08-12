-- WA alpine audit — pass 2, batch 67 (2026-08-07)
-- Goat Mountain, Golden Horn, Mount Goode x3, Mount Stuart (Gorillas Direct), Gunnshy Peak,
-- Gunsight Range/Middle Peak (Gunrunner + Standard Route), Guye Peak

-- wa_goat_mountain_south_ridge: high_point_ft (6721) is the West/false-summit elevation, not this route's actual
-- destination. The row's own waypoints[6] ("East Peak, true summit"), its approach text, and the parent area row
-- (elevation_ft 6891) all agree the route tops out on the East Peak. Confirmed via SummitPost (West Peak 6,721 ft
-- / East Peak, true summit, 6,891 ft).
UPDATE routes SET high_point_ft = 6891 WHERE id = 'wa_goat_mountain_south_ridge';

-- wa_goat_mountain_south_ridge: hazards[5]/watch_out[0]/overview/descent all state the false (west) summit sits
-- at "~6,600 ft" -- unsupported by any source and contradicted by the row's own `beta` field, which already
-- correctly states 6,721 ft (confirmed via SummitPost). Fixed all four to the corroborated figure.
UPDATE routes SET hazards = jsonb_set(hazards, '{5}', '"easy to mistake the 6,721 ft false (west) summit for the true 6,891 ft east summit, which lies farther along an exposed ridge"') WHERE id = 'wa_goat_mountain_south_ridge';
UPDATE routes SET watch_out = jsonb_set(watch_out, '{0}', '"Don''t mistake the false (west) summit at ~6,721 ft for the true summit -- the true east summit at 6,891 ft is farther along an exposed, loose ridge"') WHERE id = 'wa_goat_mountain_south_ridge';
UPDATE routes SET overview = replace(overview, '~6,600 ft', '~6,721 ft') WHERE id = 'wa_goat_mountain_south_ridge';
UPDATE routes SET descent = replace(descent, '6,600 ft false (west) summit', '6,721 ft false (west) summit') WHERE id = 'wa_goat_mountain_south_ridge';

-- wa_goat_mountain_south_ridge: waypoints[6].note said the East Peak is "~120 ft higher than the West Peak" --
-- an arithmetic error given the elevations confirmed above (6,891 - 6,721 = 170 ft, not 120).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{6,note}', '"Rocky, narrow summit spine dropping off steeply on all sides; USGS Mount Sefrit quad benchmark, ~170 ft higher than the West Peak across the basin."') WHERE id = 'wa_goat_mountain_south_ridge';

-- wa_goat_mountain_south_ridge: gain_ft/loss_ft (4300/4800) contradict the row's own itinerary.days[0]
-- (gainFt/lossFt 5100/5100, matching totalNote's "5,000+ ft of gain/loss") for what is an out-and-back day hike.
UPDATE routes SET gain_ft = 5100, loss_ft = 5100 WHERE id = 'wa_goat_mountain_south_ridge';

-- wa_gorillas_direct (Mount Stuart): approach text sends south-face/Gorillas parties "to Longs Pass (6,200 ft) at
-- about mile 2.5" -- but this route's own waypoints[1] records the mile-2.5 point as "Ingalls Pass," 6,457 ft.
-- Longs Pass and Ingalls Pass are reached via two different forks of the shared Esmeralda trailhead trail system
-- (confirmed via SummitPost / Gaia GPS trail data); the Gorillas/West Ridge/King Kong routes use Ingalls Pass,
-- not Longs Pass -- same cross-route-contamination pattern flagged for King Kong in an earlier pass.
UPDATE routes SET approach = replace(approach, 'to Longs Pass (6,200 ft) at about mile 2.5.', 'to Ingalls Pass (~6,500 ft) at about mile 2.5.') WHERE id = 'wa_gorillas_direct';

-- wa_gunnshy_peak_standard_route: waypoints[0] (Barclay Lake Trailhead) lat/lng is ~500m off from this same row's
-- own approach_logistics.trailheadLat/trailheadLng for the identical point -- corrected to match, confirmed
-- against WTA's published Barclay Lake trailhead coordinates.
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,lat}', '47.7923'), '{0,lng}', '-121.4592') WHERE id = 'wa_gunnshy_peak_standard_route';

-- wa_goode_mountain_megalodon_ridge: approach text and approach_logistics.trailhead/trailheadLat/trailheadLng
-- still say "Rainy Pass trailhead" (48.5181/-120.7331), but this route's own waypoints[0] and gpx[0] were already
-- corrected in a prior pass to "Bridge Creek Trailhead" (48.5049/-120.7191, ~1 mi east of Rainy Pass) -- two
-- sibling fields never got synced to that earlier fix.
UPDATE routes SET approach = replace(approach, 'Start at the Rainy Pass trailhead on Highway 20 (large paved lot at ~4,800 ft)', 'Start at the Bridge Creek Trailhead on Highway 20 (~4,500 ft, about 1 mile east of Rainy Pass)') WHERE id = 'wa_goode_mountain_megalodon_ridge';
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(approach_logistics, '{trailhead}', '"Bridge Creek Trailhead (Hwy 20 MP 159)"'), '{trailheadLat}', '48.5049'), '{trailheadLng}', '-120.7191') WHERE id = 'wa_goode_mountain_megalodon_ridge';

-- wa_goode_mountain_megalodon_ridge / wa_goode_mountain_northeast_face / wa_goode_mountain_southwest_couloir:
-- access.rules on all three Mount Goode routes describes Boston Basin-specific camping restrictions (Low/High
-- Camp) -- Boston Basin is a different, unrelated NCNP corridor (Cascade River Road side, serving
-- Sahale/Forbidden/Torment), nowhere near the Bridge Creek approach these three routes actually use.
UPDATE routes SET access = jsonb_set(access, '{rules}', '"Group size capped at 6 in off-trail cross-country zones, 12 in on-trail corridors. Bear canisters required in some zones -- free loaners at permit offices."') WHERE id = 'wa_goode_mountain_megalodon_ridge';
UPDATE routes SET access = jsonb_set(access, '{rules}', '"Group size capped at 6 in off-trail cross-country zones, 12 in on-trail corridors. Bear canisters required in some zones -- free loaners at permit offices."') WHERE id = 'wa_goode_mountain_northeast_face';
UPDATE routes SET access = jsonb_set(access, '{rules}', '"Group size capped at 6 in off-trail cross-country zones, 12 in on-trail corridors. Bear canisters required in some zones -- free loaners at permit offices."') WHERE id = 'wa_goode_mountain_southwest_couloir';

-- wa_goode_mountain_northeast_face: approach_logistics.trailhead/trailheadLat/trailheadLng has the same stale
-- "Rainy Pass" value Megalodon Ridge carried before this batch's fix; this route shares the same Bridge Creek
-- Trailhead approach.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(approach_logistics, '{trailhead}', '"Bridge Creek Trailhead (Hwy 20 MP 159)"'), '{trailheadLat}', '48.5049'), '{trailheadLng}', '-120.7191') WHERE id = 'wa_goode_mountain_northeast_face';

-- wa_goode_mountain_southwest_couloir: same stale approach_logistics trailhead as above (this route's own
-- `approach` text already correctly says "Bridge Creek/PCT trailhead" -- only the logistics sub-object was stale).
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(approach_logistics, '{trailhead}', '"Bridge Creek Trailhead (Hwy 20 MP 159)"'), '{trailheadLat}', '48.5049'), '{trailheadLng}', '-120.7191') WHERE id = 'wa_goode_mountain_southwest_couloir';

-- wa_goode_mountain_northeast_face: fa ("Fred Beckey and John Parrott, 1954") directly contradicts this same row's
-- own data_quality.gaps ("No confirmed first-ascent party/date found for this specific line"). No external source
-- corroborates a Beckey/Parrott 1954 ascent of a distinct NE Face line -- Beckey's well-documented NE-side FA on
-- Goode is the Northeast Buttress, with Tom Stewart, August 6 1966 (SummitPost / Mountaineers.org /
-- climberkyle.com), a different, already-tracked route. Nulled rather than guessed at a replacement.
UPDATE routes SET fa = NULL WHERE id = 'wa_goode_mountain_northeast_face';

-- wa_goode_mountain_northeast_face: top-level grade ("IV") disagrees with this row's own commitment ("III") and
-- alpine_grade ("Grade III (historic, snow/ice + rock)") -- two of three internal fields agree on III.
UPDATE routes SET grade = 'III' WHERE id = 'wa_goode_mountain_northeast_face';

-- wa_goode_mountain_northeast_face: gain_ft/loss_ft (4799/7000) don't match this row's own itinerary.days gain/loss
-- sums (4600+2600+0=7200 / 0+2600+4600=7200) for an out-and-back route.
UPDATE routes SET gain_ft = 7200, loss_ft = 7200 WHERE id = 'wa_goode_mountain_northeast_face';

-- wa_gunrunner (Middle Peak, Gunsight Range): access._raw and access.parking_pass reference "Lake Serene
-- Trailhead," "Lake Serene/Bridal Veil Trailhead," "Mt. Baker Wilderness," and "Sunrise Mine TH for Vesper Peak"
-- -- none relate to this route's actual Downey Creek Trailhead / Glacier Peak Wilderness approach (confirmed
-- against this route's own approach/road fields and sibling wa_gunsight_peak_standard's correct access block for
-- the identical approach). Cross-route contamination from an unrelated Mountain Loop Highway route.
UPDATE routes SET access = jsonb_set(jsonb_set(jsonb_set(jsonb_set(access, '{_raw,parking_pass}', '"Northwest Forest Pass ($5 day / $30 annual) or America the Beautiful Pass required at Downey Creek Trailhead"'), '{_raw,permit_pickup}', '"Self-issued at trailhead; optional registration at ranger stations; access via Downey Creek Trailhead"'), '{_raw,group_size_limit}', '"Max 12 people in Glacier Peak Wilderness"'), '{parking_pass}', '"Northwest Forest Pass required at Downey Creek Trailhead (Suiattle River Road, FR-26) -- $5/day or $30/year."') WHERE id = 'wa_gunrunner';

-- wa_gunrunner: emergency.county/rangerStation/nearestHospital/sheriffDispatch all reference a Skagit/Chelan
-- county border, Chelan Ranger District (Chelan, WA), Cascade Medical Center (actually in Leavenworth, not
-- Concrete) and a nonexistent "Skykomish Valley Hospital" -- all wrong for this route's Downey Creek/Snohomish
-- County approach. Corrected against sibling wa_gunsight_peak_standard's already-verified emergency block for the
-- identical approach.
UPDATE routes SET emergency = jsonb_set(jsonb_set(jsonb_set(jsonb_set(emergency, '{county}', '"Chelan County (summit); Snohomish County (Downey Creek Trailhead/west approach)"'), '{rangerStation}', '"Darrington Ranger District, Mt. Baker-Snoqualmie NF, 1405 Emens Ave N, Darrington WA, (360) 436-1155"'), '{nearestHospital}', '"Cascade Valley Hospital (Skagit Regional Health), 330 S Stillaguamish Ave, Arlington, WA -- 24-hr Level IV Emergency Dept, nearest hospital for the west/Downey Creek approach"'), '{sheriffDispatch}', '"911 (Snohomish County SO covers the Darrington/Suiattle/Downey Creek approach; Chelan County SO covers the summit/east side)"') WHERE id = 'wa_gunrunner';

-- wa_gunrunner: comms repeats the same wrong "Chelan Ranger District" claim fixed in emergency.rangerStation above.
UPDATE routes SET comms = 'Cell coverage unreliable throughout approach and on peaks. The area is in a deep valley with no reliable signal. Emergency communication may require satellite communicator (InReach, Spot). The nearest ranger station is Darrington Ranger District, Mt. Baker-Snoqualmie National Forest.' WHERE id = 'wa_gunrunner';

-- wa_gunrunner: dist_km (16.1, implying ~10.0 mi) contradicts this row's own waypoints[1].distMi (17 mi to the
-- Middle Peak summit) and sibling wa_gunsight_peak_standard's dist_km (27.35, ~17.0 mi) for the identical Downey
-- Creek approach to the same peak.
UPDATE routes SET dist_km = 27.4 WHERE id = 'wa_gunrunner';

-- wa_gunsight_peak_standard: access.parking_pass carries the same "Mountain Loop Highway trailheads" contamination
-- found on sibling wa_gunrunner (a Vesper-Peak-area reference) -- this route's own `fees` field already correctly
-- names Downey Creek Trailhead for the identical approach.
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"Northwest Forest Pass or America the Beautiful interagency pass required to park at Downey Creek Trailhead (~$5/day or $30/yr)."') WHERE id = 'wa_gunsight_peak_standard';
