-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project states 13 bolts. Single source (guidebook full text paywalled); locked-1src after apply.
update routes set bolts = 13 where id = 'wa_a_blackstone_blm_1' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_a_blackstone_blm_1' and anchor is null;

-- access is empty. DNR's Mount Si NRCA page (re-read 2026-11-18): DNR South Puget Sound Region manages it; Discover Pass required to park at the Little Si Trailhead; dogs on leash. DNR managed-lands 
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_a_blackstone_blm_1' and access is null;

-- access is empty. DNR's Mount Si NRCA page (re-read 2026-11-18): DNR South Puget Sound Region manages it; Discover Pass required to park at the Little Si Trailhead; dogs on leash. DNR managed-lands 
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_a_blackstone_stepping_stones' and access is null;

-- 0 is invalid. A single bolted line with chains at the top, 90 ft, 60 m rope needed; Mountain Project does not state a pitch count, so 1 is implied: approve 1, record as unconfirmed single-source.
update routes set pitches = 1 where id = 'wa_the_big_easy' and pitches = 0;

-- Mountain Project: Sport, 90 ft (27 m). Single source (guidebook full text paywalled); locked-1src after apply.
update routes set length_m = 27 where id = 'wa_the_big_easy' and length_m is null;

-- Mountain Project: 7 bolts plus chains at the top. Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_the_big_easy' and bolts is null;

-- Mountain Project: chains at the top. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_big_easy' and anchor is null;

-- access is empty. DNR's Mount Si NRCA page (re-read 2026-11-18): DNR South Puget Sound Region manages it; Discover Pass required to park at the Little Si Trailhead; dogs on leash. DNR managed-lands 
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_the_big_easy' and access is null;

-- Mountain Project states 6 bolts. Single source (not on the open guidebook pages); locked-1src after apply.
update routes set bolts = 6 where id = 'wa_a_hanging_gardens_twisted_youth' and bolts is null;

-- Mountain Project: chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_a_hanging_gardens_twisted_youth' and anchor is null;

-- access is empty. DNR's Mount Si NRCA page (re-read 2026-11-18): DNR South Puget Sound Region manages it; Discover Pass required to park at the Little Si Trailhead; dogs on leash. DNR managed-lands 
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_a_hanging_gardens_twisted_youth' and access is null;

-- 0 is invalid. MP: 70 ft, shares its upper cracks and anchor with Mr. Clean (one pitch, batch M). One pitch is implied, not stated: ledger unconfirmed, single-source.
update routes set pitches = 1 where id = 'wa_smut' and pitches = 0;

-- MP states 70 ft (21 m). theCrag 403; WO gives no length. MP-alone length: locked-1src.
update routes set length_m = 21 where id = 'wa_smut' and length_m is null;

-- MP states 1 bolt; WO consistent (start aims for a bolt 20-25 ft up, count not stated). locked-1src (MP states it).
update routes set bolts = 1 where id = 'wa_smut' and bolts is null;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18, page updated 2026-06-09) says no recreation pass to park, no fees. Copies the live wording on wa_saber / wa_mr_clean
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_smut' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_mr_clean_2 (verified batch M: USFS ownership layer = Okanogan-Wenatchee NF, no wilderness). Re-read 2026-11-18: USFS trailhead page names Okano
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_smut' and access is null;

-- 0 is invalid. MP: one 130 ft line from the slab above the right end of Lower Castle to Logger's Ledge, anchored on cracks or a maple. One pitch implied, not stated: ledger unconfirmed, single-sourc
update routes set pitches = 1 where id = 'wa_idiot_s_delight' and pitches = 0;

-- MP states 130 ft (= 39.6 m; MP prints 39 m). theCrag 403; no other source gives a length. MP-alone length: locked-1src.
update routes set length_m = 40 where id = 'wa_idiot_s_delight' and length_m is null;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18, page updated 2026-06-09) says no recreation pass to park, no fees. Copies the live wording on wa_saber / wa_mr_clean
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_idiot_s_delight' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_mr_clean_2 (verified batch M: USFS ownership layer = Okanogan-Wenatchee NF, no wilderness). Re-read 2026-11-18: USFS trailhead page names Okano
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_idiot_s_delight' and access is null;

-- 0 is invalid. MP states 2 pitches; WO describes a first pitch (roofs, twin cracks) and a second mid-fifth pitch. agree-2; lock after apply.
update routes set pitches = 2 where id = 'wa_brass_balls_2' and pitches = 0;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18, page updated 2026-06-09) says no recreation pass to park, no fees. Copies the live wording on wa_saber / wa_mr_clean
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_brass_balls_2' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_mr_clean_2 (verified batch M: USFS ownership layer = Okanogan-Wenatchee NF, no wilderness). Re-read 2026-11-18: USFS trailhead page names Okano
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_brass_balls_2' and access is null;

-- 0 is invalid. MP: 85 ft, second line right of The Fault chimney. One pitch implied, not stated: ledger unconfirmed, single-source.
update routes set pitches = 1 where id = 'wa_clean_love' and pitches = 0;

-- MP states 85 ft (26 m). theCrag 403. MP-alone length: locked-1src.
update routes set length_m = 26 where id = 'wa_clean_love' and length_m is null;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18, page updated 2026-06-09) says no recreation pass to park, no fees. Copies the live wording on wa_saber / wa_mr_clean
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_clean_love' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_mr_clean_2 (verified batch M: USFS ownership layer = Okanogan-Wenatchee NF, no wilderness). Re-read 2026-11-18: USFS trailhead page names Okano
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_clean_love' and access is null;

-- 0 is invalid. MP: overhanging start and roof crack, then scruffy rock to a belay ledge (escape left via Clem's Layback). One pitch implied, not stated: ledger unconfirmed, single-source.
update routes set pitches = 1 where id = 'wa_monkey_lip' and pitches = 0;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18, page updated 2026-06-09) says no recreation pass to park, no fees. Copies the live wording on wa_saber / wa_mr_clean
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_monkey_lip' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_mr_clean_2 (verified batch M: USFS ownership layer = Okanogan-Wenatchee NF, no wilderness). Re-read 2026-11-18: USFS trailhead page names Okano
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_monkey_lip' and access is null;

-- 0 is invalid. Neither source states a pitch count, and Wenatchee Outdoors says most Austrian Slab parties leave the ledge one pitch up because the second pitch is loose, so 1 vs 2 is unclear. Null 
update routes set pitches = null where id = 'wa_slakin' and pitches = 0;

-- MP states the route was retro-bolted and now has 9 bolts. Single source (locked-1src after apply).
update routes set bolts = 9 where id = 'wa_slakin' and bolts is null;

-- permit is empty. Same live wording as the batch M Peshastin rows (wa_tippy_toes, wa_national_velvet). Re-read the WA State Parks park page 2026-11-18: summer 6:30 a.m. - dusk, closed Nov 1 - Mar 15
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_slakin' and permit is null;

-- access is empty. Same value batch M proposed for the Peshastin rows. Park page re-read 2026-11-18: land manager WA State Parks, Discover Pass $45 annual / $10 one-day, hours, winter closure, no bol
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_slakin' and access is null;

-- 0 is invalid. MP describes one bolted groove to a two-bolt top anchor but states no count; Wenatchee Outdoors, right after Slender Thread, says most parties leave the ledge one pitch up because the
update routes set pitches = null where id = 'wa_slender_thread' and pitches = 0;

-- MP protection: ten bolts. Single source (locked-1src after apply).
update routes set bolts = 10 where id = 'wa_slender_thread' and bolts is null;

-- MP: two bolt anchor at top; protection: chained anchor. Single source.
update routes set anchor = $q$Two-bolt chained anchor$q$ where id = 'wa_slender_thread' and anchor is null;

-- permit is empty. Same live wording as the batch M Peshastin rows (wa_tippy_toes, wa_national_velvet). Re-read the WA State Parks park page 2026-11-18: summer 6:30 a.m. - dusk, closed Nov 1 - Mar 15
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_slender_thread' and permit is null;

-- access is empty. Same value batch M proposed for the Peshastin rows. Park page re-read 2026-11-18: land manager WA State Parks, Discover Pass $45 annual / $10 one-day, hours, winter closure, no bol
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_slender_thread' and access is null;

-- 0 is invalid. No source states a pitch count (the slab has a loose second pitch most parties skip, per Wenatchee Outdoors). Null claims nothing.
update routes set pitches = null where id = 'wa_fakin_it' and pitches = 0;

-- MP: climb past 5 bolts (shares the first with Cajun Queen). Single source (locked-1src after apply).
update routes set bolts = 5 where id = 'wa_fakin_it' and bolts is null;

-- permit is empty. Same live wording as the batch M Peshastin rows (wa_tippy_toes, wa_national_velvet). Re-read the WA State Parks park page 2026-11-18: summer 6:30 a.m. - dusk, closed Nov 1 - Mar 15
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_fakin_it' and permit is null;

-- access is empty. Same value batch M proposed for the Peshastin rows. Park page re-read 2026-11-18: land manager WA State Parks, Discover Pass $45 annual / $10 one-day, hours, winter closure, no bol
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_fakin_it' and access is null;

-- 0 is invalid. No source states a pitch count; MP says continue up and left to the belay. Null claims nothing.
update routes set pitches = null where id = 'wa_cajun_queen' and pitches = 0;

-- permit is empty. Same live wording as the batch M Peshastin rows (wa_tippy_toes, wa_national_velvet). Re-read the WA State Parks park page 2026-11-18: summer 6:30 a.m. - dusk, closed Nov 1 - Mar 15
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_cajun_queen' and permit is null;

-- access is empty. Same value batch M proposed for the Peshastin rows. Park page re-read 2026-11-18: land manager WA State Parks, Discover Pass $45 annual / $10 one-day, hours, winter closure, no bol
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_cajun_queen' and access is null;

-- permit is empty. Same live wording as the batch M Peshastin rows (wa_tippy_toes, wa_national_velvet). Re-read the WA State Parks park page 2026-11-18: summer 6:30 a.m. - dusk, closed Nov 1 - Mar 15
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_austrian_slab_empire_state' and permit is null;

-- access is empty. Same value batch M proposed for the Peshastin rows. Park page re-read 2026-11-18: land manager WA State Parks, Discover Pass $45 annual / $10 one-day, hours, winter closure, no bol
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_austrian_slab_empire_state' and access is null;

-- Mountain Project protection: 15 bolts, chain anchor. Single source (guidebook page gives only the 1/2 in bolt size); locked-1src after apply.
update routes set bolts = 15 where id = 'wa_b_main_wall_west_power_struggle' and bolts is null;

-- Mountain Project: chain anchor, shared with Freedom Fighter. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_b_main_wall_west_power_struggle' and anchor is null;

-- Access is empty. Same object already live on the other Mt. Erie routes (batches I and M; land manager verified in batch M). Re-read today: the City of Anacortes owns the forest lands and Parks & Re
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_b_main_wall_west_power_struggle' and access is null;

-- Mountain Project: chain anchor with lower-offs at the end of the first half (below Springboard). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_b_main_wall_west_constant_velocity' and anchor is null;

-- Access is empty. Same object already live on the other Mt. Erie routes (batches I and M; land manager verified in batch M). Re-read today: the City of Anacortes owns the forest lands and Parks & Re
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_b_main_wall_west_constant_velocity' and access is null;

-- Mountain Project protection: 8 bolts, optional gear to 0.5 in, chain anchor. Single source; locked-1src after apply.
update routes set bolts = 8 where id = 'wa_b_main_wall_west_new_creation' and bolts is null;

-- Mountain Project: chain anchor, shared with Potholes. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_b_main_wall_west_new_creation' and anchor is null;

-- Access is empty. Same object already live on the other Mt. Erie routes (batches I and M; land manager verified in batch M). Re-read today: the City of Anacortes owns the forest lands and Parks & Re
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_b_main_wall_west_new_creation' and access is null;

-- Mountain Project: 6 bolts and a chain anchor, last two bolts shared with Clipped My Wings (the guidebook page also notes the shared last two bolts). Count from MP only; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_b_main_wall_west_wingrider' and bolts is null;

-- Mountain Project: chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_b_main_wall_west_wingrider' and anchor is null;

-- Access is empty. Same object already live on the other Mt. Erie routes (batches I and M; land manager verified in batch M). Re-read today: the City of Anacortes owns the forest lands and Parks & Re
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_b_main_wall_west_wingrider' and access is null;

-- Mountain Project and the Mt. Erie guidebook page both give 5.9+ (two independent publishers; majority rule). grade_num stays 9 (gradeNumFrom('5.9+','yds') = 9); rock_grade is null. Locked agree-2 a
update routes set grade = $q$5.9+$q$ where id = 'wa_redemption' and grade = $q$5.9$q$;

-- 0 is invalid. Mountain Project: Sport, 100 ft, one line from the Snag Buttress ledge to a chain anchor. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_redemption' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_redemption' and length_m is null;

-- Mountain Project: 9 bolts, chain anchor. Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_redemption' and bolts is null;

-- Mountain Project: chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_redemption' and anchor is null;

-- disciplines is null; every other Main Wall West sport row holds ["sport"], and the list should name its own primary discipline (sport, unchanged).
update routes set disciplines = array['sport']::text[] where id = 'wa_redemption' and disciplines is null;

-- Access is empty. Same object already live on the other Mt. Erie routes (batches I and M; land manager verified in batch M). Re-read today: the City of Anacortes owns the forest lands and Parks & Re
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_redemption' and access is null;

commit;
