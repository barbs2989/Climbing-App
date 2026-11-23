-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project: one 50 ft length from below Grassy Ledges to the bolted anchor at the top of Jill's Thrill, then rappel (one length to one anchor). Count implied, not stated
update routes set pitches = 1 where id = 'wa_crazy_horse' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Single source (theCrag answered Forbidden in the owner's Chrome); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_crazy_horse' and length_m is null;

-- Mountain Project: ends at the bolted anchor shared with the top of Jill's Thrill. House spelling 'bolted anchor' (stored on 10 routes). Single source, locked-1src after apply.
update routes set anchor = $q$bolted anchor$q$ where id = 'wa_crazy_horse' and anchor is null;

-- Rack empty. Mountain Project lists gear to 1.5 in with an emphasis on small pieces. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams and nuts up to 1.5 in, mostly in the small sizes.$q$ where id = 'wa_crazy_horse' and detailed_rack is null;

-- access is empty. Copied field for field from the live researched sibling wa_jill_s_thrill (same object on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: the park page still says the s
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_crazy_horse' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill (same on wa_south_face_4_blownout_to_1st_anchor); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_crazy_horse' and permit is null;

-- pitches 0 is invalid. Mountain Project states 3 pitches. Single source (theCrag Forbidden; no other publisher lists the route); locked-1src after apply.
update routes set pitches = 3 where id = 'wa_jensen_s_ridge' and pitches = 0;

-- Rack empty. Mountain Project lists a double rack to 4 in, with a single 4 in as a supplement. Paragraph, not lockable.
update routes set detailed_rack = $q$Double set of cams to 4 in; a single extra 4 in piece helps.$q$ where id = 'wa_jensen_s_ridge' and detailed_rack is null;

-- access is empty. Copied field for field from the live researched sibling wa_jill_s_thrill (same object on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: the park page still says the s
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_jensen_s_ridge' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill (same on wa_south_face_4_blownout_to_1st_anchor); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_jensen_s_ridge' and permit is null;

-- pitches 0 is invalid. Mountain Project gives 110 ft from the Grassy Ledges belay (reached by four pitches of SE Corner or from Jill's Thrill) and no pitch count; the line joins Young Warriors or ta
update routes set pitches = null where id = 'wa_cloud_nine' and pitches = 0;

-- Mountain Project states 110 ft (33 m). Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'wa_cloud_nine' and length_m is null;

-- Mountain Project protection lists 3 bolts (and 1 piton) with cams and nuts. Bolts stated, not clips. Single source, locked-1src after apply.
update routes set bolts = 3 where id = 'wa_cloud_nine' and bolts is null;

-- Rack empty. Mountain Project lists cams 0.2-2, nuts, 3 bolts and 1 piton, and 0.4 + 1.0 for the belay. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 0.2 to 2 Camalot and a set of nuts, plus 3 bolts and a piton on the route. The Grassy Ledges belay takes at least a 0.4 and a 1 Camalot.$q$ where id = 'wa_cloud_nine' and detailed_rack is null;

-- access is empty. Copied field for field from the live researched sibling wa_jill_s_thrill (same object on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: the park page still says the s
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_cloud_nine' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill (same on wa_south_face_4_blownout_to_1st_anchor); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_cloud_nine' and permit is null;

-- pitches 0 is invalid. Mountain Project's Blownout page calls Blownout Direct (5.9+) the first-pitch variation everyone now climbs; its own page for that pitch ('Blownout (to 1st anchor)') is 60 ft 
update routes set pitches = 1 where id = 'wa_blownout_direct' and pitches = 0;

-- access is empty. Copied field for field from the live researched sibling wa_jill_s_thrill (same object on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: the park page still says the s
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_blownout_direct' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill (same on wa_south_face_4_blownout_to_1st_anchor); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_blownout_direct' and permit is null;

-- pitches 0 is invalid. This row is Mountain Project's 'Dod's Dastardly Jam' (same grade 5.10c, same FA text 'Buncha different folks in different years'): the linkup of Dod's Jam (5.10b) and Dastardl
update routes set pitches = 3 where id = 'wa_dod_s_jam_dastardly_crack_linkup' and pitches = 0;

-- Mountain Project states 280 ft (85 m) for the linkup; matches the sibling wa_south_face_4_dod_s_dastardly_jam (length_m 85). The brief asked to settle length from the two parts; no source gives the
update routes set length_m = 85 where id = 'wa_dod_s_jam_dastardly_crack_linkup' and length_m is null;

-- access is empty. Copied field for field from the live researched sibling wa_jill_s_thrill (same object on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: the park page still says the s
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_dod_s_jam_dastardly_crack_linkup' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill (same on wa_south_face_4_blownout_to_1st_anchor); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_dod_s_jam_dastardly_crack_linkup' and permit is null;

-- gear is empty. Mountain Project protection: single rack 00 Metolius to #4 Camalot, optionally doubled in the small sizes, offset nuts useful. Single source.
update routes set gear = array['single rack 00 Metolius to #4 Camalot','extra small cams','offset nuts']::text[] where id = 'wa_west_face_7_beth_priestley_memorial_route' and gear is null;

-- gear is empty. Mountain Project protection: bolts and gear to 3 inches. Single source.
update routes set gear = array['quickdraws','cams to 3 in']::text[] where id = 'wa_west_face_7_heretic_s_highway' and gear is null;

-- access is empty. Copied field for field from the live sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park). Re-read 2026-11-23: the parks.wa.gov Beacon Rock page still says the
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_jackie_treehorn_s_jungle_gym_of_joyous_delights' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_jackie_treehorn_s_jungle_gym_of_joyous_delights' and permit is null;

-- gear is empty. Mountain Project protection: Metolius 0 to #4 Camalot (optional doubles), 1-2 sets of offset nuts, brassies, a hook for the leader and one for the follower, many draws and slings. Si
update routes set gear = array['cams 0 Metolius to #4 Camalot','offset nuts','brassies','2 hooks','many slings']::text[] where id = 'wa_northwest_face_jackie_treehorn_s_jungle_gym_of_joyous_delights' and gear is null;

-- pitches 0 is invalid. Mountain Project states 8 pitches (Trad, 700 ft, Grade II). Single source; locked-1src after apply.
update routes set pitches = 8 where id = 'wa_the_steamboat_captain_s_dream' and pitches = 0;

-- Mountain Project states 700 ft (212 m); 700 ft = 213 m. Single source.
update routes set length_m = 213 where id = 'wa_the_steamboat_captain_s_dream' and length_m is null;

-- Mountain Project: bolted belay anchors at the end of every pitch. 'Bolted anchor' is a house spelling (5 rows). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_the_steamboat_captain_s_dream' and anchor is null;

-- gear is empty. Mountain Project: micro cams 0.1-0.2, Camalots 0.3-#3 with doubles 0.3-0.5, small and medium nuts, offset nuts, 6 draws, 12 short and 1 long runner. Single source.
update routes set gear = array['cams 0.1 to #3','doubles 0.3 to 0.5','nuts','offset nuts','6 quickdraws','13 slings']::text[] where id = 'wa_the_steamboat_captain_s_dream' and gear is null;

-- access is empty. Copied field for field from the live sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park). Re-read 2026-11-23: the parks.wa.gov Beacon Rock page still says the
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_steamboat_captain_s_dream' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_the_steamboat_captain_s_dream' and permit is null;

-- pitches 0 is invalid. Mountain Project states 7 pitches (5.9 C2, Trad, Aid, Grade IV). Single source; locked-1src after apply.
update routes set pitches = 7 where id = 'wa_stone_soup' and pitches = 0;

-- Mountain Project: bolted belays on every pitch, all good bolts. House spelling 'Bolted anchor'. Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_stone_soup' and anchor is null;

-- gear is empty. Mountain Project: doubles tiny to 0.5, one or two 0.75, singles 1-3, at least one hook, offset nuts. Single source.
update routes set gear = array['doubles tiny cams to 0.5','0.75 to #3 cams','offset nuts','1 hook']::text[] where id = 'wa_stone_soup' and gear is null;

-- access is empty. Copied field for field from the live sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park). Re-read 2026-11-23: the parks.wa.gov Beacon Rock page still says the
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_stone_soup' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_stone_soup' and permit is null;

-- pitches 0 is invalid. Mountain Project: 90 ft, 12 bolts to anchor bolts just past the top, and a 60 m rope reaches the ground (one length to one anchor). Count implied, not stated: unconfirmed afte
update routes set pitches = 1 where id = 'wa_the_arete_acal' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source, locked-1src after apply.
update routes set length_m = 27 where id = 'wa_the_arete_acal' and length_m is null;

-- Mountain Project protection states 12 bolts (bolts, not clips), then a step across to separate anchor bolts. Single source, locked-1src after apply.
update routes set bolts = 12 where id = 'wa_the_arete_acal' and bolts is null;

-- Mountain Project: ends at anchor bolts about ten feet above and behind the top (bolt count not given). House spelling 'Bolted anchor' (stored on 5+ routes). Single source, locked-1src after apply.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_the_arete_acal' and anchor is null;

-- Mountain Project protection: gear to 2.5 inches. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 2.5 in']::text[] where id = 'wa_main_face_watch_your_crotch' and gear is null;

-- Mountain Project protection: #3, #4 and #5 in a row in the crack, plus a .4/.5 size (offset best) in a pod in the face above. Rack from MP alone, locked-1src after apply.
update routes set gear = array['cams #3 to #5','small offset cam (.4/.5) for the pod']::text[] where id = 'wa_main_face_wash_your_crotch' and gear is null;

-- pitches 0 is invalid. Mountain Project: one bolted line up a pillar to lower-offs on top of the column (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_the_overlord' and pitches = 0;

-- pitches 0 is invalid. Mountain Project: one 80 ft thin finger crack on a column, no second pitch described. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_paul_maul' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source, locked-1src after apply.
update routes set length_m = 24 where id = 'wa_paul_maul' and length_m is null;

-- Mountain Project protection: pro to 1.5 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 1.5 in']::text[] where id = 'wa_paul_maul' and gear is null;

-- pitches 0 is invalid. Mountain Project: one 150 ft sport length from atop a small tree to its own chains, then a rappel to the C.C.N.O.S. anchor (one length to one anchor). Count implied, not state
update routes set pitches = 1 where id = 'wa_20th_century_clock' and pitches = 0;

-- Mountain Project states 150 ft (45 m). Single source (theCrag refused the browser; no other publisher lists the route). locked-1src after apply.
update routes set length_m = 45 where id = 'wa_20th_century_clock' and length_m is null;

-- Mountain Project names the route's top anchor as chains ('the chains of 20th century clock'). House spelling 'Chain anchor' (stored on 58 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_20th_century_clock' and anchor is null;

-- Mountain Project: every belay is two 3/8 in bolts with chains. House spelling 'Chain anchor' (stored on 58 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_three_o_clock_rock_gastroblast' and anchor is null;

-- 
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_three_o_clock_rock_gastroblast' and access is null;

-- 
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_20th_century_clock' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_ginsu' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_luke_9_25' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_the_arete_acal' and access is null;

-- 
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_the_arete_acal' and permit is null;

-- 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_main_face_watch_your_crotch' and access is null;

-- 
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_main_face_watch_your_crotch' and permit is null;

-- 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_main_face_wash_your_crotch' and access is null;

-- 
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_main_face_wash_your_crotch' and permit is null;

-- 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_the_overlord' and access is null;

-- 
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_the_overlord' and permit is null;

-- 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_paul_maul' and access is null;

-- 
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_paul_maul' and permit is null;

commit;
