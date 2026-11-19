-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- MP states 300 ft (91 m). theCrag blocked (403); WO gives no length. MP-alone length: locked-1src after apply.
update routes set length_m = 91 where id = 'wa_saints' and length_m is null;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18) says no parking pass required, no fees. Copies the live wording on wa_saber / wa_canary / wa_catapult. Lock official
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_saints' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_catapult (batch I). Re-verified 2026-11-18: USFS trailhead page names Okanogan-Wenatchee NF, Wenatchee River RD, no pass, no fees, raptor closu
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_saints' and access is null;

-- 0 is invalid. MP lists 80 ft and a photo caption calls it one pitch of nearly 30 m (only a caption, so ledger unconfirmed). A 2008 trip report climbs it as a 3-pitch link-up via Old Gray Mare; the 
update routes set pitches = 1 where id = 'wa_crack_of_doom' and pitches = 0;

-- MP states 80 ft (24 m). theCrag blocked. MP-alone length: locked-1src after apply.
update routes set length_m = 24 where id = 'wa_crack_of_doom' and length_m is null;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18) says no parking pass required, no fees. Copies the live wording on wa_saber / wa_canary / wa_catapult. Lock official
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_crack_of_doom' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_catapult (batch I). Re-verified 2026-11-18: USFS trailhead page names Okanogan-Wenatchee NF, Wenatchee River RD, no pass, no fees, raptor closu
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_crack_of_doom' and access is null;

-- 0 is invalid. MP states 'Trad, 300 ft (91 m), 2 pitches'. Only MP (=OpenBeta) describes this route; theCrag blocked (403), WO does not list it. locked-1src after apply.
update routes set pitches = 2 where id = 'wa_directissima' and pitches = 0;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18) says no parking pass required, no fees. Copies the live wording on wa_saber / wa_canary / wa_catapult. Lock official
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_directissima' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_catapult (batch I). Re-verified 2026-11-18: USFS trailhead page names Okanogan-Wenatchee NF, Wenatchee River RD, no pass, no fees, raptor closu
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_directissima' and access is null;

-- 0 is invalid. MP: 80 ft ending at the bolts on top of Jello Tower (one pitch implied, not stated - ledger unconfirmed). If an implied count is not acceptable, use null instead.
update routes set pitches = 1 where id = 'wa_south_face_jello_tower' and pitches = 0;

-- MP states 80 ft (24 m). theCrag blocked; WO gives no length. locked-1src after apply.
update routes set length_m = 24 where id = 'wa_south_face_jello_tower' and length_m is null;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18) says no parking pass required, no fees. Copies the live wording on wa_saber / wa_canary / wa_catapult. Lock official
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_south_face_jello_tower' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_catapult (batch I). Re-verified 2026-11-18: USFS trailhead page names Okanogan-Wenatchee NF, Wenatchee River RD, no pass, no fees, raptor closu
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_south_face_jello_tower' and access is null;

-- 0 is invalid. WO states one pitch; MP gives no count (ledger unconfirmed, single-source).
update routes set pitches = 1 where id = 'wa_mr_clean_2' and pitches = 0;

-- permit empty. Official-1: USFS Castle Rock Trailhead page (re-opened 2026-11-18) says no parking pass required, no fees. Copies the live wording on wa_saber / wa_canary / wa_catapult. Lock official
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_mr_clean_2' and permit is null;

-- access empty. Copies the live object on wa_saber / wa_catapult (batch I). Re-verified 2026-11-18: USFS trailhead page names Okanogan-Wenatchee NF, Wenatchee River RD, no pass, no fees, raptor closu
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_mr_clean_2' and access is null;

-- A bolted sport line stored with a trad rack. MP: protection draws only, 8 bolts to a two-bolt rappel anchor; Wenatchee Outdoors: West Face 5.8, bolts. Two sources agree it takes draws, neither ment
update routes set detailed_rack = $q$Quickdraws only; the route is bolted.$q$ where id = 'wa_west_face_8' and detailed_rack = $q$Gear to 3 inches.$q$;

-- MP states 8 bolts to the anchor. Single source (locked-1src after apply).
update routes set bolts = 8 where id = 'wa_west_face_8' and bolts is null;

-- MP states a two-bolt rappel anchor. Single source.
update routes set anchor = $q$Two-bolt rappel anchor$q$ where id = 'wa_west_face_8' and anchor is null;

-- fa holds the FFA too; split it into ffa (proposed together, as batch K did). MP only.
update routes set fa = $q$Dave Collins, Tom Miller, 1959.$q$ where id = 'wa_west_face_8' and fa = $q$Dave Collins, Tom Miller, 1959. FFA: Fred Beckey.$q$;

-- Moved out of fa (see above). MP only.
update routes set ffa = $q$Fred Beckey.$q$ where id = 'wa_west_face_8' and ffa is null;

-- permit is empty. Same live wording as wa_lightning_crack_3 / wa_windward_direct (batch J). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, summer hours 6:30 a.m. - dusk, o
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_west_face_8' and permit is null;

-- access is empty. Copied from the live wa_lightning_crack_3 value. Land manager Washington State Parks (park page); Discover Pass $10 day / $45 year (park page + Discover Pass page); closure, hours 
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_west_face_8' and access is null;

-- MP states a (rusty) two-bolt anchor. Single source.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_national_velvet' and anchor is null;

-- permit is empty. Same live wording as wa_lightning_crack_3 / wa_windward_direct (batch J). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, summer hours 6:30 a.m. - dusk, o
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_national_velvet' and permit is null;

-- access is empty. Copied from the live wa_lightning_crack_3 value. Land manager Washington State Parks (park page); Discover Pass $10 day / $45 year (park page + Discover Pass page); closure, hours 
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_national_velvet' and access is null;

-- 0 is invalid. MP: a 50 ft sport line with 4 bolts; one pitch implied, not stated (ledger unconfirmed).
update routes set pitches = 1 where id = 'wa_tippy_toes' and pitches = 0;

-- MP states 50 ft (15 m). Single source (locked-1src after apply).
update routes set length_m = 15 where id = 'wa_tippy_toes' and length_m is null;

-- MP states 4 bolts. Single source (locked-1src after apply).
update routes set bolts = 4 where id = 'wa_tippy_toes' and bolts is null;

-- permit is empty. Same live wording as wa_lightning_crack_3 / wa_windward_direct (batch J). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, summer hours 6:30 a.m. - dusk, o
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_tippy_toes' and permit is null;

-- access is empty. Copied from the live wa_lightning_crack_3 value. Land manager Washington State Parks (park page); Discover Pass $10 day / $45 year (park page + Discover Pass page); closure, hours 
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_tippy_toes' and access is null;

-- The protection rating is welded into grade; it belongs in prot_rating (proposed together), as in batch L. grade_num stays 8 (gradeNumFrom('5.8-','yds') = 8). MP: 5.8- R. Wenatchee Outdoors gives 5.
update routes set grade = $q$5.8-$q$ where id = 'wa_sunset_slab_green_velvet' and grade = $q$5.8- R$q$;

-- Split from grade (proposed together). MP rates it R and calls the protection scant and marginal; Wenatchee Outdoors also says the first pitch has marginal pro.
update routes set prot_rating = $q$R$q$ where id = 'wa_sunset_slab_green_velvet' and prot_rating is null;

-- permit is empty. Same live wording as wa_lightning_crack_3 / wa_windward_direct (batch J). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, summer hours 6:30 a.m. - dusk, o
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_sunset_slab_green_velvet' and permit is null;

-- access is empty. Copied from the live wa_lightning_crack_3 value. Land manager Washington State Parks (park page); Discover Pass $10 day / $45 year (park page + Discover Pass page); closure, hours 
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_sunset_slab_green_velvet' and access is null;

-- 0 is invalid. MP: up past 3 bolts to a rappel anchor; one pitch implied, not stated (ledger unconfirmed).
update routes set pitches = 1 where id = 'wa_lichen_delight' and pitches = 0;

-- MP states 3 bolts. Single source (locked-1src after apply).
update routes set bolts = 3 where id = 'wa_lichen_delight' and bolts is null;

-- permit is empty. Same live wording as wa_lightning_crack_3 / wa_windward_direct (batch J). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, summer hours 6:30 a.m. - dusk, o
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_lichen_delight' and permit is null;

-- access is empty. Copied from the live wa_lightning_crack_3 value. Land manager Washington State Parks (park page); Discover Pass $10 day / $45 year (park page + Discover Pass page); closure, hours 
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_lichen_delight' and access is null;

-- 0 is invalid. Mountain Project states 2 pitches and the Mt. Erie guidebook page calls it a two-pitch route: agree-2, locked after apply.
update routes set pitches = 2 where id = 'wa_zig_zag' and pitches = 0;

-- Mountain Project states 200 ft (61 m). Single source (guidebook paywalled); locked-1src after apply.
update routes set length_m = 61 where id = 'wa_zig_zag' and length_m is null;

-- Mountain Project: 2 or 3 chain anchors depending on how it is pitched. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_zig_zag' and anchor is null;

-- Access is empty. Same object now live on the batch-I Mt. Erie routes (Orange Crush, The Abyss, Treeshadow), re-checked today: City of Anacortes owns the forest lands, Parks & Recreation manages the
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_zig_zag' and access is null;

-- 0 is invalid. Mountain Project: a single 65 ft crack started from the horizontal tree on the ledge atop Zig Zag. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_springboard' and pitches = 0;

-- Mountain Project states 65 ft (20 m). Single source; locked-1src after apply.
update routes set length_m = 20 where id = 'wa_springboard' and length_m is null;

-- Mountain Project protection: gear to 2 in, a fixed pin that may be gone, chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_springboard' and anchor is null;

-- Access is empty. Same object now live on the batch-I Mt. Erie routes (Orange Crush, The Abyss, Treeshadow), re-checked today: City of Anacortes owns the forest lands, Parks & Recreation manages the
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_springboard' and access is null;

-- 0 is invalid. Mountain Project: one 70 ft bolted line that starts from the left anchors atop Zig Zag pitch 1. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_cat_from_outer_space' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_cat_from_outer_space' and length_m is null;

-- Mountain Project: 9 bolts. Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_cat_from_outer_space' and bolts is null;

-- Mountain Project: chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_cat_from_outer_space' and anchor is null;

-- Access is empty. Same object now live on the batch-I Mt. Erie routes (Orange Crush, The Abyss, Treeshadow), re-checked today: City of Anacortes owns the forest lands, Parks & Recreation manages the
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_cat_from_outer_space' and access is null;

-- Mountain Project protection: pro to 2 in (short version) or 3 in (full length), chain anchors. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_c_snag_buttress_snag_buttress_direct' and anchor is null;

-- Access is empty. Same object now live on the batch-I Mt. Erie routes (Orange Crush, The Abyss, Treeshadow), re-checked today: City of Anacortes owns the forest lands, Parks & Recreation manages the
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_c_snag_buttress_snag_buttress_direct' and access is null;

-- Mountain Project protection: 5 bolts. Single source; locked-1src after apply.
update routes set bolts = 5 where id = 'wa_b_pigeon_stool_wall_east_great_balls_of_fire' and bolts is null;

-- Mountain Project: chain anchor shared with Desperation. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_b_pigeon_stool_wall_east_great_balls_of_fire' and anchor is null;

-- Access is empty. Same object now live on the batch-I Mt. Erie routes (Orange Crush, The Abyss, Treeshadow), re-checked today: City of Anacortes owns the forest lands, Parks & Recreation manages the
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_b_pigeon_stool_wall_east_great_balls_of_fire' and access is null;

-- Mountain Project states 8 bolts (the guidebook says the direct is a 2-bolt start joining Strip Clip). Lock locked-1src after apply.
update routes set bolts = 8 where id = 'wa_nevermind_wall_strip_clip_direct' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. Lock locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_nevermind_wall_strip_clip_direct' and anchor is null;

-- Mountain Project states 10 bolts. Lock locked-1src after apply.
update routes set bolts = 10 where id = 'wa_nevermind_wall_trundling_for_glory_hangerville' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. Lock locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_nevermind_wall_trundling_for_glory_hangerville' and anchor is null;

-- Mountain Project states four bolts straight up the prow. Lock locked-1src after apply.
update routes set bolts = 4 where id = 'wa_change_creek_fin_chump_change' and bolts is null;

-- Mountain Project: anchors with quick links at the top (or walk off left). Lock locked-1src after apply.
update routes set anchor = $q$Quick-link anchor$q$ where id = 'wa_change_creek_fin_chump_change' and anchor is null;

-- 0 is invalid. The Exit 38 guidebook calls it the next pitch above Rat Face, i.e. one pitch; implied, single source, so ledger unconfirmed (single-source).
update routes set pitches = 1 where id = 'wa_i_can_fly_2' and pitches = 0;

-- access is empty. Reuses the LIVE value already on wa_jiffy_pop / wa_underground_economy (same wall, batch J). Re-checked today: the Olallie State Park page says Homestead Valley Trailhead reaches D
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_i_can_fly_2' and access is null;

-- permit is empty. Same live value as the other Deception Wall rows; official-1 from the same State Parks pages, expires 2027-11-18.
update routes set permit = $q$No climbing permit. A Discover Pass is needed to park at Olallie State Park.$q$ where id = 'wa_i_can_fly_2' and permit is null;

commit;
