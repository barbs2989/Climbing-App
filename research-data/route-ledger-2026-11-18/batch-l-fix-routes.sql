-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- 0 is invalid. MP: a 70 ft crack, so one pitch. Count implied, not stated: record as unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_orange_sunshine' and pitches = 0;

-- MP states 70 ft (21 m). Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_orange_sunshine' and length_m is null;

-- Rack empty. MP: gear to two inches, upper crack takes wires. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear to 2 in; the upper crack takes small wires.$q$ where id = 'wa_orange_sunshine' and detailed_rack is null;

-- access is empty. WDFW 2017 release places Royal Columns on WDFW's Oak Creek Wildlife Area (trail starts across the Tieton from the HQ off US 12); WDFW Oak Creek unit page: a Discover Pass is requir
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_orange_sunshine' and access is null;

-- permit is empty. Same official pages and same live value as wa_bridger (batch G). official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_orange_sunshine' and permit is null;

-- 0 is invalid. MP: a 60 ft crack, so one pitch. Count implied, not stated: record as unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_jam_exam' and pitches = 0;

-- MP states 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_jam_exam' and length_m is null;

-- '??' is a placeholder copied from MP's 'FA: ??' (first ascent unknown); it renders as junk. Null until a source names the party.
update routes set fa = null where id = 'wa_jam_exam' and fa = $q$??$q$;

-- Rack empty. MP: cams .5 to 3 in, some medium nuts, long webbing to extend a toprope over the edge. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 0.5 to 3 in plus a few medium nuts; a long sling helps extend a toprope over the edge.$q$ where id = 'wa_jam_exam' and detailed_rack is null;

-- access is empty. WDFW 2017 release places Royal Columns on WDFW's Oak Creek Wildlife Area (trail starts across the Tieton from the HQ off US 12); WDFW Oak Creek unit page: a Discover Pass is requir
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_jam_exam' and access is null;

-- permit is empty. Same official pages and same live value as wa_bridger (batch G). official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_jam_exam' and permit is null;

-- 0 is invalid. MP: 100 ft to a chain lower-off, so one pitch. Count implied, not stated: record as unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_twin_cracks' and pitches = 0;

-- MP states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_twin_cracks' and length_m is null;

-- anchor empty. MP: chains with permanent steel carabiners at the top of the wide left-hand crack. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_twin_cracks' and anchor is null;

-- Rack empty. MP: large stoppers and cams to 4 in, doubles/triples of #2-#3, small pieces optional. Paragraph, not lockable.
update routes set detailed_rack = $q$Large nuts and cams up to 4 in, with two or three each of the 2 and 3 in sizes; smaller pieces down to half an inch are optional in the side cracks.$q$ where id = 'wa_twin_cracks' and detailed_rack is null;

-- access is empty. WDFW 2017 release places Royal Columns on WDFW's Oak Creek Wildlife Area (trail starts across the Tieton from the HQ off US 12); WDFW Oak Creek unit page: a Discover Pass is requir
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_twin_cracks' and access is null;

-- permit is empty. Same official pages and same live value as wa_bridger (batch G). official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_twin_cracks' and permit is null;

-- 0 is invalid. MP describes a fist crack up two pillars on a single-pitch crag. Count implied, not stated: record as unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_journeyman_crack' and pitches = 0;

-- Rack empty. MP: gear to 3 in. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear to 3 in.$q$ where id = 'wa_journeyman_crack' and detailed_rack is null;

-- access is empty. WDFW 2017 release places Royal Columns on WDFW's Oak Creek Wildlife Area (trail starts across the Tieton from the HQ off US 12); WDFW Oak Creek unit page: a Discover Pass is requir
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_journeyman_crack' and access is null;

-- permit is empty. Same official pages and same live value as wa_bridger (batch G). official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_journeyman_crack' and permit is null;

-- 0 is invalid. MP: about 75 ft to a ledge, then ~15 ft more crack to a bolted lower-off at the top. Count implied, not stated: record as unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_slot_machine_3' and pitches = 0;

-- anchor empty. MP: a pair of bolts with steel lower-off carabiners (new in 2025), shared with Not So Easy. Single source; locked-1src after apply.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_slot_machine_3' and anchor is null;

-- Rack empty. MP quotes the guidebook: gear to 2.5 in; optional 4 in cam mid-route. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear to 2.5 in; a 4 in cam is optional for the middle section.$q$ where id = 'wa_slot_machine_3' and detailed_rack is null;

-- access is empty. WDFW 2017 release places Royal Columns on WDFW's Oak Creek Wildlife Area (trail starts across the Tieton from the HQ off US 12); WDFW Oak Creek unit page: a Discover Pass is requir
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_slot_machine_3' and access is null;

-- permit is empty. Same official pages and same live value as wa_bridger (batch G). official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_slot_machine_3' and permit is null;

-- 0 is invalid. MP states 2 pitches; most parties rappel from the second anchors (two short extension pitches exist above). Lock (locked-1src) after apply.
update routes set pitches = 2 where id = 'wa_magic_bus' and pitches = 0;

-- MP states 200 ft (61 m) for the 2-pitch route. Single source (theCrag 403). Lock (locked-1src) after apply.
update routes set length_m = 61 where id = 'wa_magic_bus' and length_m is null;

-- Rack empty; MP says bolts plus an optional small cam at the start, 8 draws. Paragraph, not lockable.
update routes set detailed_rack = $q$Eight quickdraws; a small cam is optional for the moves to the first bolt.$q$ where id = 'wa_magic_bus' and detailed_rack is null;

-- Land manager: the Forest Service Eight-Mile Trail 654.02 page (Darrington Ranger District) says the trail is popular with climbers bound for Three O'Clock Rock and that it enters the Boulder River 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","group_limit":12,"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb where id = 'wa_magic_bus' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- MP states chains are in place at every belay. Lock (locked-1src) after apply.
update routes set anchor = $q$Chain anchors$q$ where id = 'wa_three_o_clock_rock_total_soul' and anchor is null;

-- Rack empty; MP lists gear 0.3-2 in, 10-11 draws, a #1 Camalot saved for the end of P4, nuts rarely used. Paragraph, not lockable.
update routes set detailed_rack = $q$10-11 quickdraws and cams from 0.3 to 2 in; keep a #1 Camalot for the end of pitch 4. Most parties leave the nuts behind.$q$ where id = 'wa_three_o_clock_rock_total_soul' and detailed_rack is null;

-- Land manager: the Forest Service Eight-Mile Trail 654.02 page (Darrington Ranger District) says the trail is popular with climbers bound for Three O'Clock Rock and that it enters the Boulder River 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","group_limit":12,"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined."}$q$::jsonb where id = 'wa_three_o_clock_rock_total_soul' and access is null;

-- MP's type line states 5 pitches. Ledger unconfirmed: the same page's description also describes a sixth pitch ending at anchors.
update routes set pitches = 5 where id = 'wa_three_o_clock_rock_till_broad_daylight' and pitches is null;

-- MP states 400 ft (121 m). Single source (theCrag 403). Lock (locked-1src) after apply.
update routes set length_m = 121 where id = 'wa_three_o_clock_rock_till_broad_daylight' and length_m is null;

-- Rack empty; MP lists a light rack to 1.5 in and a dozen runners and draws, with long runners for the wandering line. Paragraph, not lockable.
update routes set detailed_rack = $q$Light rack of cams to 1.5 in plus about 12 draws and slings; bring several long ones, as the line zigzags.$q$ where id = 'wa_three_o_clock_rock_till_broad_daylight' and detailed_rack is null;

-- Land manager: the Forest Service Eight-Mile Trail 654.02 page (Darrington Ranger District) says the trail is popular with climbers bound for Three O'Clock Rock and that it enters the Boulder River 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","group_limit":12,"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined."}$q$::jsonb where id = 'wa_three_o_clock_rock_till_broad_daylight' and access is null;

-- Land manager: the Forest Service Eight-Mile Trail 654.02 page (Darrington Ranger District) says the trail is popular with climbers bound for Three O'Clock Rock and that it enters the Boulder River 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","group_limit":12,"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined."}$q$::jsonb where id = 'wa_three_o_clock_rock_conan_s_crack' and access is null;

-- Land manager: the Forest Service Eight-Mile Trail 654.02 page (Darrington Ranger District) says the trail is popular with climbers bound for Three O'Clock Rock and that it enters the Boulder River 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","group_limit":12,"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined."}$q$::jsonb where id = 'wa_three_o_clock_rock_rubber_soul' and access is null;

-- Rack empty. MP: an extensive rack down through wired stoppers; mattsea: gear to 3.5 in and 13 draws. Paragraph, not lockable; wording our own.
update routes set detailed_rack = $q$A full rack to 3.5 in, wired stoppers included, and about 13 quickdraws.$q$ where id = 'wa_blueberry_hill_proxima_wall_rainman' and detailed_rack is null;

-- Rack empty. MP: bolted pitches, small cams for P4 overlaps, medium rack for the summit extension; mattsea: small gear to 2 in and eight draws. Paragraph; wording our own.
update routes set detailed_rack = $q$Eight or so quickdraws and a few small cams and nuts to 2 in for the bolted pitches; carry a medium rack of cams and nuts if you go on to the summit.$q$ where id = 'wa_blueberry_hill_proxima_wall_westward_ho' and detailed_rack is null;

-- MP: pitches 1-4 bolted with fixed anchors; mattsea: four pitches to a chain belay. Two sources.
update routes set anchor = $q$Bolted chain anchors$q$ where id = 'wa_blueberry_hill_proxima_wall_westward_ho' and anchor is null;

-- The protection rating is welded into grade; it belongs in prot_rating (proposed together). grade_num stays 9. MP: 5.9 PG13.
update routes set grade = $q$5.9$q$ where id = 'wa_witch_doctor_wall_witch_doctor_s_elixir' and grade = $q$5.9 PG13$q$;

-- Split from grade (proposed together). MP only.
update routes set prot_rating = $q$PG13$q$ where id = 'wa_witch_doctor_wall_witch_doctor_s_elixir' and prot_rating is null;

-- MP: no bolts or fixed gear. Single source (locked-1src after apply).
update routes set bolts = 0 where id = 'wa_witch_doctor_wall_witch_doctor_s_elixir' and bolts is null;

-- MP: descend by rappels from trees down the gully/corner; bring spare webbing. Single source.
update routes set anchor = $q$Trees$q$ where id = 'wa_witch_doctor_wall_witch_doctor_s_elixir' and anchor is null;

-- Rack empty. MP only. Paragraph; wording our own.
update routes set detailed_rack = $q$Double cams to 4 in, a set of wired stoppers, and spare webbing for the tree rappels; two ropes.$q$ where id = 'wa_witch_doctor_wall_witch_doctor_s_elixir' and detailed_rack is null;

-- 0 is invalid. MP states 7 pitches (5.7, 5.8+, 5.4, 5.8, 5.8+, 5.7, 5.6). Single source (locked-1src after apply).
update routes set pitches = 7 where id = 'wa_snagglepuss' and pitches = 0;

-- MP states 1000 ft (303 m). Single source (locked-1src after apply).
update routes set length_m = 303 where id = 'wa_snagglepuss' and length_m is null;

-- MP: bolted rap/belay stations, chains at the first belay. Single source.
update routes set anchor = $q$Bolted anchors$q$ where id = 'wa_snagglepuss' and anchor is null;

-- Rack empty. MP only. Paragraph; wording our own.
update routes set detailed_rack = $q$Mostly bolts: a single rack of cams from the smallest to 2 in is enough, nuts optional; two 60 m ropes for the rappels.$q$ where id = 'wa_snagglepuss' and detailed_rack is null;

-- Templated text is wrong: it puts Snagglepuss in the Glacier Peak Wilderness (12-person group cap, campfire rule, wilderness permits). Official USFS EDW layers: the Salami Slabs / Exfoliation Dome a
update routes set access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb where id = 'wa_snagglepuss' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- access is empty. Official WA State Parks GIS layer 'Park Boundaries' (State Parks GIS Program, updated 2026-06-01): the Upper Town Wall cliff (OSM way 37319530, 'Index Town Wall' natural=cliff) fal
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_dana_s_arch_area_dana_s_arch' and access is null;

-- access is empty. Official WA State Parks GIS layer 'Park Boundaries' (State Parks GIS Program, updated 2026-06-01): the Upper Town Wall cliff (OSM way 37319530, 'Index Town Wall' natural=cliff) fal
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_d_dana_s_arch_area_wildest_dreams' and access is null;

-- access is empty. Official WA State Parks GIS layer 'Park Boundaries' (State Parks GIS Program, updated 2026-06-01): the Upper Town Wall cliff (OSM way 37319530, 'Index Town Wall' natural=cliff) fal
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_d_dana_s_arch_area_the_back_road' and access is null;

-- access is empty. Official WA State Parks GIS layer 'Park Boundaries' (State Parks GIS Program, updated 2026-06-01): the Upper Town Wall cliff (OSM way 37319530, 'Index Town Wall' natural=cliff) fal
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_d_dana_s_arch_area_legends_ride_free' and access is null;

-- access is empty. Official WA State Parks GIS layer 'Park Boundaries' (State Parks GIS Program, updated 2026-06-01): the Upper Town Wall cliff (OSM way 37319530, 'Index Town Wall' natural=cliff) fal
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_c_the_beach_merman' and access is null;

commit;
