-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- MP: 75 ft (23 m). Single source (theCrag gave a bot check); locked-1src after applying.
update routes set length_m = 23 where id = 'wa_air_guitar' and length_m is null;

-- MP: bolted anchor, permadraws at the anchor. Single source.
update routes set anchor = $q$Bolted anchor with permadraws$q$ where id = 'wa_air_guitar' and anchor is null;

-- WDFW Quincy Lakes Unit page: a Discover Pass is required on WDFW lands, or a Vehicle Access Pass; the WDFW parking page says the same for wildlife areas. The Frenchman Climbing Area is on the Quinc
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park on WDFW land in Frenchman Coulee.$q$ where id = 'wa_air_guitar' and permit is null;

-- WDFW Quincy Lakes Unit page lists the Frenchman Climbing Area and rock climbers on the unit, and carries the Frenchman Coulee road alert; the Columbia Basin Wildlife Area page lists Quincy Lakes as
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Columbia Basin Wildlife Area, Quincy Lakes Unit)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass"}$q$::jsonb where id = 'wa_air_guitar' and access is null;

-- 0 is invalid. MP: a single 90 ft trad line.
update routes set pitches = 1 where id = 'wa_party_in_your_pants' and pitches = 0;

-- MP: 90 ft (27 m). Single source; locked-1src after applying.
update routes set length_m = 27 where id = 'wa_party_in_your_pants' and length_m is null;

-- MP: gear to 3 in; small TCUs to 2s and 3s fit, most placements take hand-size cams. The stored 'to about 2 in' understates the rack.
update routes set gear = $q$Cams to 3 in, mostly hand sizes, with a few small units$q$ where id = 'wa_party_in_your_pants' and gear = $q$Cams to about 2 in; a #4 is handy for the belay$q$;

-- WDFW Quincy Lakes Unit page: a Discover Pass is required on WDFW lands, or a Vehicle Access Pass; the WDFW parking page says the same for wildlife areas. The Frenchman Climbing Area is on the Quinc
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park on WDFW land in Frenchman Coulee.$q$ where id = 'wa_party_in_your_pants' and permit is null;

-- WDFW Quincy Lakes Unit page lists the Frenchman Climbing Area and rock climbers on the unit, and carries the Frenchman Coulee road alert; the Columbia Basin Wildlife Area page lists Quincy Lakes as
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Columbia Basin Wildlife Area, Quincy Lakes Unit)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass"}$q$::jsonb where id = 'wa_party_in_your_pants' and access is null;

-- 0 is invalid. MP: a single 80 ft sport line to one set of anchors.
update routes set pitches = 1 where id = 'wa_throbbing_gristle' and pitches = 0;

-- MP: 80 ft (24 m). Single source; locked-1src after applying.
update routes set length_m = 24 where id = 'wa_throbbing_gristle' and length_m is null;

-- MP: draws, 13 bolts. Single source; locked-1src after applying.
update routes set bolts = 13 where id = 'wa_throbbing_gristle' and bolts is null;

-- MP: a set of anchors at the top, reached up the arete. Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_throbbing_gristle' and anchor is null;

-- WDFW Quincy Lakes Unit page: a Discover Pass is required on WDFW lands, or a Vehicle Access Pass; the WDFW parking page says the same for wildlife areas. The Frenchman Climbing Area is on the Quinc
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park on WDFW land in Frenchman Coulee.$q$ where id = 'wa_throbbing_gristle' and permit is null;

-- WDFW Quincy Lakes Unit page lists the Frenchman Climbing Area and rock climbers on the unit, and carries the Frenchman Coulee road alert; the Columbia Basin Wildlife Area page lists Quincy Lakes as
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Columbia Basin Wildlife Area, Quincy Lakes Unit)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass"}$q$::jsonb where id = 'wa_throbbing_gristle' and access is null;

-- 0 is invalid. MP: a single 75 ft crack to a bolted anchor.
update routes set pitches = 1 where id = 'wa_george_and_martha' and pitches = 0;

-- MP: 75 ft (23 m). Single source; locked-1src after applying.
update routes set length_m = 23 where id = 'wa_george_and_martha' and length_m is null;

-- MP: bolted top anchor with chains and mussy hooks; an independent 2014 trip report says it shares its anchor with Red M&Ms.
update routes set anchor = $q$Bolted anchor with chains$q$ where id = 'wa_george_and_martha' and anchor is null;

-- WDFW Quincy Lakes Unit page: a Discover Pass is required on WDFW lands, or a Vehicle Access Pass; the WDFW parking page says the same for wildlife areas. The Frenchman Climbing Area is on the Quinc
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park on WDFW land in Frenchman Coulee.$q$ where id = 'wa_george_and_martha' and permit is null;

-- WDFW Quincy Lakes Unit page lists the Frenchman Climbing Area and rock climbers on the unit, and carries the Frenchman Coulee road alert; the Columbia Basin Wildlife Area page lists Quincy Lakes as
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Columbia Basin Wildlife Area, Quincy Lakes Unit)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass"}$q$::jsonb where id = 'wa_george_and_martha' and access is null;

-- 0 is invalid. MP: a single 85 ft chimney to a two-bolt anchor.
update routes set pitches = 1 where id = 'wa_seven_virgins_and_a_mule' and pitches = 0;

-- MP: 85 ft (26 m). Single source; locked-1src after applying.
update routes set length_m = 26 where id = 'wa_seven_virgins_and_a_mule' and length_m is null;

-- MP: two bolts with chains. Single source.
update routes set anchor = $q$Two bolts with chains$q$ where id = 'wa_seven_virgins_and_a_mule' and anchor is null;

-- WDFW Quincy Lakes Unit page: a Discover Pass is required on WDFW lands, or a Vehicle Access Pass; the WDFW parking page says the same for wildlife areas. The Frenchman Climbing Area is on the Quinc
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park on WDFW land in Frenchman Coulee.$q$ where id = 'wa_seven_virgins_and_a_mule' and permit is null;

-- WDFW Quincy Lakes Unit page lists the Frenchman Climbing Area and rock climbers on the unit, and carries the Frenchman Coulee road alert; the Columbia Basin Wildlife Area page lists Quincy Lakes as
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Columbia Basin Wildlife Area, Quincy Lakes Unit)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass"}$q$::jsonb where id = 'wa_seven_virgins_and_a_mule' and access is null;

-- 0 is invalid. Mountain Project: 2 pitches; Abegg's topo labels P1 and P2 as Dreamer Direct; a 2010 trip blog describes 2 Direct pitches. Lockable agree-2 after apply.
update routes set pitches = 2 where id = 'wa_dreamer_direct' and pitches = 0;

-- Mountain Project 125 ft (38 m); single source - approve only if an MP-only length is acceptable.
update routes set length_m = 38 where id = 'wa_dreamer_direct' and length_m is null;

-- Templated Glacier Peak Wilderness text is wrong: the Forest Service wilderness boundary layer puts Green Giant Buttress (48.1476,-121.6625) inside the Boulder River Wilderness, about 790 m from the
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Green Giant Buttress lies inside the Boulder River Wilderness, where groups are capped at 12.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":null}$q$::jsonb where id = 'wa_dreamer_direct' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 0 is invalid. Mountain Project: 7 pitches (800 ft). A 2007 CascadeClimbers trip report counts 8 including a nondescript last pitch to the ridge top. 7 proposed (the counted route); not lockable yet
update routes set pitches = 7 where id = 'wa_safe_sex' and pitches = 0;

-- Mountain Project 800 ft (244 m; MP's own conversion prints 242); single source - approve only if an MP-only length is acceptable.
update routes set length_m = 244 where id = 'wa_safe_sex' and length_m is null;

-- Templated Glacier Peak Wilderness text is wrong: the Forest Service wilderness boundary layer puts Green Giant Buttress (48.1476,-121.6625) inside the Boulder River Wilderness, about 790 m from the
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Green Giant Buttress lies inside the Boulder River Wilderness, where groups are capped at 12.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":null}$q$::jsonb where id = 'wa_safe_sex' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 0 is invalid. Mountain Project: 2 pitches, 150 ft. Abegg ties pitch 3 to Urban Bypass and places the next 5.9 pitch under it in the text; alpinedave describes one bypass pitch. 2 proposed; not lock
update routes set pitches = 2 where id = 'wa_urban_bypass' and pitches = 0;

-- Mountain Project 150 ft (46 m; MP prints 45); single source - approve only if an MP-only length is acceptable.
update routes set length_m = 46 where id = 'wa_urban_bypass' and length_m is null;

-- Templated Glacier Peak Wilderness text is wrong: the Forest Service wilderness boundary layer puts Green Giant Buttress (48.1476,-121.6625) inside the Boulder River Wilderness, about 790 m from the
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Green Giant Buttress lies inside the Boulder River Wilderness, where groups are capped at 12.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":null}$q$::jsonb where id = 'wa_urban_bypass' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- Access is empty. Copied from the live, batch-G-corrected access of wa_silent_running (same crag, same Eightmile trailhead). The Forest Service wilderness layer puts Three O'Clock Rock inside the Bo
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"The Eightmile trail enters the Boulder River Wilderness: groups are capped at 12.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":null}$q$::jsonb where id = 'wa_three_o_clock_rock_big_tree_2000' and access is null;

-- Single pitch: chossclimbers calls it a single-pitch base route; Mountain Project gives 160 ft to a bolted anchor with a two-rope rappel and no pitch count. Lockable agree-2 after apply.
update routes set pitches = 1 where id = 'wa_three_o_clock_rock_charlie_chan_s_number_one_suspect' and pitches is null;

-- Mountain Project 160 ft (49 m; MP prints 48); single source.
update routes set length_m = 49 where id = 'wa_three_o_clock_rock_charlie_chan_s_number_one_suspect' and length_m is null;

-- Mountain Project: ten clips including intermediate bolts; single source.
update routes set bolts = 10 where id = 'wa_three_o_clock_rock_charlie_chan_s_number_one_suspect' and bolts is null;

-- Mountain Project: bolted chain anchors; chossclimbers says it shares an anchor with 20th Century Clock. Single source on the type.
update routes set anchor = $q$Bolted chain anchor$q$ where id = 'wa_three_o_clock_rock_charlie_chan_s_number_one_suspect' and anchor is null;

-- Access is empty. Copied from the live, batch-G-corrected access of wa_silent_running (same crag, same Eightmile trailhead). The Forest Service wilderness layer puts Three O'Clock Rock inside the Bo
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"The Eightmile trail enters the Boulder River Wilderness: groups are capped at 12.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":null}$q$::jsonb where id = 'wa_three_o_clock_rock_charlie_chan_s_number_one_suspect' and access is null;

-- pitches must be >= 1 or null; a glacier route has no pitch count in any source (MP lists none).
update routes set pitches = null where id = 'wa_glacier_peak_cool_glacier_gerdine' and pitches = 0;

-- The stored sentence calls the Suiattle the primary access (this route starts from the North Fork Sauk) and gives no closure facts; USFS order 06-05-26-25 states them.
update routes set access = $q${"fees":"None beyond the parking or entrance fee this route already lists.","notes":"Free wilderness permit required at trailhead (Glacier Peak Wilderness). Day-use parking fee: $5/vehicle/day or $30 annual pass. No strict seasonal closure, but route inaccessible before June due to snow depth. Avalanche danger highest May-June; check Northwest Avalanche Center. Recommended May-October overall, with July as optimal month.","rules":"Group size capped at 12 (people + stock combined) in Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.","permit":"Self-Issue Wilderness Permit","seasonal":"Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May. Suiattle River Road (FSR 26) is closed to vehicles from milepost 12 to the Suiattle River Trailhead, 5 Nov 2026 to 1 Oct 2028 (order 06-05-26-25); this route starts from the North Fork Sauk instead.","group_limit":12,"land_manager":"U.S. Forest Service","parking_pass":"Northwest Forest Pass","overnight_permit":{"url":null,"what":"Free self-issue Glacier Peak Wilderness permit","where":"Fill one out at the trailhead kiosk and carry it with you."}}$q$::jsonb where id = 'wa_glacier_peak_cool_glacier_gerdine' and access = $q${"fees":"None beyond the parking or entrance fee this route already lists.","notes":"Free wilderness permit required at trailhead (Glacier Peak Wilderness). Day-use parking fee: $5/vehicle/day or $30 annual pass. No strict seasonal closure, but route inaccessible before June due to snow depth. Avalanche danger highest May-June; check Northwest Avalanche Center. Recommended May-October overall, with July as optimal month.","rules":"Group size capped at 12 (people + stock combined) in Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.","permit":"Self-Issue Wilderness Permit","seasonal":"Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May. Suiattle River Road (FSR 26), the primary Glacier Peak access, has had storm-damage closures — check current conditions before a trip.","group_limit":12,"land_manager":"U.S. Forest Service","parking_pass":"Northwest Forest Pass","overnight_permit":{"url":null,"what":"Free self-issue Glacier Peak Wilderness permit","where":"Fill one out at the trailhead kiosk and carry it with you."}}$q$::jsonb;

-- The stored sentence calls the Suiattle the primary access (this route starts from the North Fork Sauk) and gives no closure facts; USFS order 06-05-26-25 states them.
update routes set access = $q${"fees":"None beyond the parking or entrance fee this route already lists.","notes":"Northwest Forest Pass required for parking. No climbing permits or camping fees required. Trail status: The White Chuck River Trail was severely damaged by a 2003 flood; contact Darrington Ranger Station for current conditions.","rules":"Group size capped at 12 (people + stock combined) in Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.","permit":"Self-Issue Wilderness Permit","closures":"Closed: White Chuck Road (FR 23) is closed to vehicles from milepost 3.7 to its end, and Rat Trap Pass Road (FR 27) from milepost 4, for flood damage, since 19 March 2025, with no end date given, as listed on the Mt. Baker-Snoqualmie National Forest alert last updated 30 June 2026. White Chuck River Trail #643 is listed as inaccessible, with no road or trail access, since the 2003 flood. Use the North Fork Sauk River Trailhead and the Pacific Crest Trail instead. Darrington Ranger District: (360) 436-1155.","seasonal":"Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May. Suiattle River Road (FSR 26) is closed to vehicles from milepost 12 to the Suiattle River Trailhead, 5 Nov 2026 to 1 Oct 2028 (order 06-05-26-25); this route starts from the North Fork Sauk instead.","group_limit":12,"land_manager":"U.S. Forest Service","parking_pass":"Northwest Forest Pass","overnight_permit":{"url":null,"what":"Free self-issue Glacier Peak Wilderness permit","where":"Fill one out at the trailhead kiosk and carry it with you."}}$q$::jsonb where id = 'wa_glacier_peak_sitkum_glacier' and access = $q${"fees":"None beyond the parking or entrance fee this route already lists.","notes":"Northwest Forest Pass required for parking. No climbing permits or camping fees required. Trail status: The White Chuck River Trail was severely damaged by a 2003 flood; contact Darrington Ranger Station for current conditions.","rules":"Group size capped at 12 (people + stock combined) in Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.","permit":"Self-Issue Wilderness Permit","closures":"Closed: White Chuck Road (FR 23) is closed to vehicles from milepost 3.7 to its end, and Rat Trap Pass Road (FR 27) from milepost 4, for flood damage, since 19 March 2025, with no end date given, as listed on the Mt. Baker-Snoqualmie National Forest alert last updated 30 June 2026. White Chuck River Trail #643 is listed as inaccessible, with no road or trail access, since the 2003 flood. Use the North Fork Sauk River Trailhead and the Pacific Crest Trail instead. Darrington Ranger District: (360) 436-1155.","seasonal":"Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May. Suiattle River Road (FSR 26), the primary Glacier Peak access, has had storm-damage closures — check current conditions before a trip.","group_limit":12,"land_manager":"U.S. Forest Service","parking_pass":"Northwest Forest Pass","overnight_permit":{"url":null,"what":"Free self-issue Glacier Peak Wilderness permit","where":"Fill one out at the trailhead kiosk and carry it with you."}}$q$::jsonb;

-- pitches must be >= 1 or null; a trail-and-scramble route has no pitch count in any source.
update routes set pitches = null where id = 'wa_mount_pugh_stujack' and pitches = 0;

-- Round trip: 17.7 km is 2.4x the route's own summit pin distMi (4.5 mi = 7.2 km) and ~2x the sibling Corkscrew one-way 7.65 km; no published one-way figure for this route.
update routes set dist_km = null where id = 'wa_northwest_buttress' and dist_km = 17.7;

-- The stored line is only three of the route pins joined, out of order (route-waypoints rule: a pins-only line is removed).
update routes set gpx = null where id = 'wa_northwest_buttress' and gpx is not null;

-- Same summit as wa_mount_daniel_daniel_glacier, whose high_point_ft 7,960 is locked (Mountaineers + ListsOfJohn map figure, batch C); the stored Summit pin already says 7960.
update routes set high_point_ft = 7960 where id = 'wa_mount_daniel_lynch_glacier' and high_point_ft is null;

-- Same trailhead as the Daniel Glacier row; that permit text is locked official-1 from the USFS Tucquala Meadows page (batch C, to 2027-11-18).
update routes set permit = $q$Free self-issue Alpine Lakes Wilderness permit at the trailhead; no quota or fee. Northwest Forest Pass to park at most trailheads.$q$ where id = 'wa_mount_daniel_lynch_glacier' and permit is null;

-- No source gives 5.7 for the Direct (5.7 is the ORIGINAL Dreamer start). Abegg: Direct P1 5.5, P2 5.8; Mountain Project 5.8-. Both are the 5.8 grade; the minus is MP's alone, so 5.8 is proposed. gra
update routes set grade = $q$5.8$q$ where id = 'wa_dreamer_direct' and grade = $q$5.7$q$;

-- gradeNumFrom("5.8","yds") with the grade change (5.8- also gives 8).
update routes set grade_num = 8 where id = 'wa_dreamer_direct' and grade_num = 7;

commit;
