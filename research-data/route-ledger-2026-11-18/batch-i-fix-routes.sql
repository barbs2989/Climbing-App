-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- MP 280 ft (85 m); theCrag lists Saber as 300 ft (91 m), within 10% - agree-2, lock 85 after apply.
update routes set length_m = 85 where id = 'wa_saber' and length_m is null;

-- Official-1 (USFS Castle Rock Trailhead page, re-opened 2026-11-18): no recreation pass needed to park, no fees. Same live wording as wa_midway / wa_angel / wa_saber_direct. Lock official-1, expires
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_saber' and permit is null;

-- access is empty. Land manager verified on official data: USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the crag and the lot; USFS trailhead page names the Wenatchee Riv
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","permit":"None needed to climb.","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead.","fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock."}$q$::jsonb where id = 'wa_saber' and access is null;

-- Official-1 (USFS Castle Rock Trailhead page, re-opened 2026-11-18): no recreation pass needed to park, no fees. Same live wording as wa_midway / wa_angel / wa_saber_direct. Lock official-1, expires
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_midway_direct' and permit is null;

-- access is empty. Land manager verified on official data: USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the crag and the lot; USFS trailhead page names the Wenatchee Riv
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","permit":"None needed to climb.","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead.","fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock."}$q$::jsonb where id = 'wa_midway_direct' and access is null;

-- MP: 300 ft (91 m), 3 pitches, Grade II. Single source (theCrag and Wenatchee Outdoors state no length) - approve only if an MP-only length is acceptable.
update routes set length_m = 91 where id = 'wa_canary' and length_m is null;

-- Official-1 (USFS Castle Rock Trailhead page, re-opened 2026-11-18): no recreation pass needed to park, no fees. Same live wording as wa_midway / wa_angel / wa_saber_direct. Lock official-1, expires
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_canary' and permit is null;

-- access is empty. Land manager verified on official data: USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the crag and the lot; USFS trailhead page names the Wenatchee Riv
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","permit":"None needed to climb.","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead.","fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock."}$q$::jsonb where id = 'wa_canary' and access is null;

-- 0 is invalid. MP: Trad, 2 pitches (P2 low fifth to Logger's Ledge); chossclimbers: two pitches to Logger's Ledge. agree-2, lock 2 after apply.
update routes set pitches = 2 where id = 'wa_catapult' and pitches = 0;

-- Official-1 (USFS Castle Rock Trailhead page, re-opened 2026-11-18): no recreation pass needed to park, no fees. Same live wording as wa_midway / wa_angel / wa_saber_direct. Lock official-1, expires
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_catapult' and permit is null;

-- access is empty. Land manager verified on official data: USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the crag and the lot; USFS trailhead page names the Wenatchee Riv
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","permit":"None needed to climb.","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead.","fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock."}$q$::jsonb where id = 'wa_catapult' and access is null;

-- Majority wins: Wenatchee Outdoors 5.9, theCrag 5.9, chossclimbers 5.9; only MP says 5.9+. Lock 5.9 agree-2 after apply. grade_num stays 9 (gradeNumFrom('5.9','yds') = 9); rock_grade is null, nothin
update routes set grade = $q$5.9$q$ where id = 'wa_damnation_crack' and grade = $q$5.9+$q$;

-- 0 is invalid. Wenatchee Outdoors: one pitch, ends on top of Jello Tower; MP and chossclimbers: about 80 ft to the tower top. Lock 1 after apply.
update routes set pitches = 1 where id = 'wa_damnation_crack' and pitches = 0;

-- MP 80 ft; chossclimbers about 80 ft. 24 m, agree-2, lock after apply.
update routes set length_m = 24 where id = 'wa_damnation_crack' and length_m is null;

-- Shape: fa holds the FA party only; the free ascent belongs in ffa. Facts as MP gives them ('John Rupley (1957) | FFA T.M. Herbert & Ed Cooper (1960)'), which the stored text already carries. Apply 
update routes set fa = $q$John Rupley (1957)$q$ where id = 'wa_damnation_crack' and fa = $q$FA John Rupley 1957   FFA TM Herbert, Ed Cooper 1960$q$;

-- Moved out of fa (see above). MP only.
update routes set ffa = $q$T.M. Herbert, Ed Cooper (1960)$q$ where id = 'wa_damnation_crack' and ffa is null;

-- Official-1 (USFS Castle Rock Trailhead page, re-opened 2026-11-18): no recreation pass needed to park, no fees. Same live wording as wa_midway / wa_angel / wa_saber_direct. Lock official-1, expires
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_damnation_crack' and permit is null;

-- access is empty. Land manager verified on official data: USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the crag and the lot; USFS trailhead page names the Wenatchee Riv
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","permit":"None needed to climb.","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead.","fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock."}$q$::jsonb where id = 'wa_damnation_crack' and access is null;

-- 0 is invalid. MP: 3 pitches (Wenatchee Outdoors says only that most routes on this wall are two pitches to the top - not route-specific). MP-only; lock locked-1src at most.
update routes set pitches = 3 where id = 'wa_century' and pitches = 0;

-- MP 300 ft (91 m). Single source.
update routes set length_m = 91 where id = 'wa_century' and length_m is null;

-- Shape: fa holds the FA party; the free ascent goes in ffa. Same facts as stored (= MP). Apply with the ffa fix. Not lockable (one source).
update routes set fa = $q$Ed Cooper, Ron Priebe, Bruce Gibbs (1959)$q$ where id = 'wa_century' and fa = $q$Ed Cooper, Ron Priebe, Bruce Gibbs,1959, 1st Free ascent:  Eric Bjornstad, Ed Cooper, 1960$q$;

-- Moved out of fa. MP only.
update routes set ffa = $q$Eric Bjornstad, Ed Cooper (1960)$q$ where id = 'wa_century' and ffa is null;

-- Official-1 (USFS Castle Rock Trailhead page, re-opened 2026-11-18): no recreation pass needed to park, no fees. Same live wording as wa_midway / wa_angel / wa_saber_direct. Lock official-1, expires
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_century' and permit is null;

-- access is empty. Land manager verified on official data: USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the crag and the lot; USFS trailhead page names the Wenatchee Riv
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","permit":"None needed to climb.","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead.","fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock."}$q$::jsonb where id = 'wa_century' and access is null;

-- Mountain Project: 9 bolts. Single source (the guidebook on rakkup is paywalled, theCrag 403); locked-1src after apply.
update routes set bolts = 9 where id = 'wa_c_orange_wall_orange_crush' and bolts is null;

-- Mountain Project: chain anchor. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_c_orange_wall_orange_crush' and anchor is null;

-- Access is empty. City of Anacortes owns the Community Forest Lands (Parks & Recreation manages them); its Oct 2025 ACFL plan names the Mt. Erie summit and S/W faces as the only climbing area, ACFL 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_c_orange_wall_orange_crush' and access is null;

-- Access is empty. City of Anacortes owns the Community Forest Lands (Parks & Recreation manages them); its Oct 2025 ACFL plan names the Mt. Erie summit and S/W faces as the only climbing area, ACFL 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_d_the_cirque_turtleback_arete' and access is null;

-- Access is empty. City of Anacortes owns the Community Forest Lands (Parks & Recreation manages them); its Oct 2025 ACFL plan names the Mt. Erie summit and S/W faces as the only climbing area, ACFL 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_f_black_wall_the_abyss' and access is null;

-- 0 is invalid. Mountain Project describes one short crack climb ending at a fir tree about 50 ft up (no multi-pitch count). Single source; locked-1src after apply.
update routes set pitches = 1 where id = 'wa_treeshadow' and pitches = 0;

-- Mountain Project: 50 ft (15 m). Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'wa_treeshadow' and length_m is null;

-- Mountain Project: chain anchor. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_treeshadow' and anchor is null;

-- Access is empty. City of Anacortes owns the Community Forest Lands (Parks & Recreation manages them); its Oct 2025 ACFL plan names the Mt. Erie summit and S/W faces as the only climbing area, ACFL 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_treeshadow' and access is null;

-- 0 is invalid. Mountain Project: one 60 ft crack to a shared anchor (single pitch). Single source.
update routes set pitches = 1 where id = 'wa_main_crack' and pitches = 0;

-- Mountain Project: 60 ft (18 m). Single source.
update routes set length_m = 18 where id = 'wa_main_crack' and length_m is null;

-- Spokane County project page: John H. Shields Park, known as Minnehaha Rocks, is the county-owned portion of Beacon Hill, known for its climbing. Official-1; lock after applying (expires 2027-11-18)
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_main_crack' and access is null;

-- 0 is invalid. Mountain Project: a 30 ft crack, top-rope anchor at the top (single pitch). Single source.
update routes set pitches = 1 where id = 'wa_z_crack' and pitches = 0;

-- Mountain Project: 30 ft (9 m). Single source.
update routes set length_m = 9 where id = 'wa_z_crack' and length_m is null;

-- Spokane County project page: John H. Shields Park, known as Minnehaha Rocks, is the county-owned portion of Beacon Hill, known for its climbing. Official-1; lock after applying (expires 2027-11-18)
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_z_crack' and access is null;

-- 0 is invalid. Mountain Project: an 80 ft corner to a two-bolt anchor with a walk-off (single pitch). Single source.
update routes set pitches = 1 where id = 'wa_the_dihedral_3' and pitches = 0;

-- Mountain Project: 80 ft (24 m). Single source.
update routes set length_m = 24 where id = 'wa_the_dihedral_3' and length_m is null;

-- Mountain Project: two-bolt anchor on top; bring webbing to rig a top rope. Single source.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_the_dihedral_3' and anchor is null;

-- Spokane County project page: John H. Shields Park, known as Minnehaha Rocks, is the county-owned portion of Beacon Hill, known for its climbing. Official-1; lock after applying (expires 2027-11-18)
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_the_dihedral_3' and access is null;

-- 0 is invalid. Mountain Project: 2 pitches (P1 5.8, P2 5.10-), each to an anchor; it notes the route is easily linked as one. Single source.
update routes set pitches = 2 where id = 'wa_they_call_the_wind_mariah' and pitches = 0;

-- 0 is invalid. Mountain Project 11; Wenatchee Outdoors 11-pitch route (9-11 by linking); a 2022 trip blog 11; NC Mountain Guides header 11 (its text says 12, theoutbound says 12). Majority 11. Locka
update routes set pitches = 11 where id = 'wa_prime_rib_2' and pitches = 0;

-- Mountain Project 1300 ft (396 m). Single source; no other page states a total. Approve only if an MP-only length is acceptable (locked-1src after apply).
update routes set length_m = 396 where id = 'wa_prime_rib_2' and length_m is null;

-- access is empty. Forest Service ownership and ranger-district layers put the USGS Goat Wall point (48.6201,-120.4473) on Okanogan-Wenatchee NF land, Methow Valley RD, outside any wilderness; the Wa
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_prime_rib_2' and access is null;

-- 0 is invalid. Mountain Project 10 (P8 is a 3rd-class ledge); NC Mountain Guides header 10 (text 9); a 2010 CascadeClimbers trip report 10. Lockable agree-2 after apply.
update routes set pitches = 10 where id = 'wa_sisyphus' and pitches = 0;

-- Mountain Project 1000 ft (305 m). Single source. Approve only if an MP-only length is acceptable.
update routes set length_m = 305 where id = 'wa_sisyphus' and length_m is null;

-- access is empty. Forest Service ownership and ranger-district layers put the USGS Goat Wall point (48.6201,-120.4473) on Okanogan-Wenatchee NF land, Methow Valley RD, outside any wilderness; the Wa
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_sisyphus' and access is null;

-- 0 is invalid. Mountain Project 11 pitches (P1-P11 graded). Single source; no other page found. locked-1src after apply.
update routes set pitches = 11 where id = 'wa_restless_natives' and pitches = 0;

-- Mountain Project 1100 ft (335 m). Single source.
update routes set length_m = 335 where id = 'wa_restless_natives' and length_m is null;

-- access is empty. Forest Service ownership and ranger-district layers put the USGS Goat Wall point (48.6201,-120.4473) on Okanogan-Wenatchee NF land, Methow Valley RD, outside any wilderness; the Wa
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_restless_natives' and access is null;

-- 0 is invalid. Mountain Project 12; Wenatchee Outdoors: 3 bolted pitches plus 9 trad pitches (12), but it credits MP, so one source. locked-1src after apply.
update routes set pitches = 12 where id = 'wa_promised_land' and pitches = 0;

-- Mountain Project 1500 ft (MP prints 455 m; 1500 ft = 457 m). Single source.
update routes set length_m = 457 where id = 'wa_promised_land' and length_m is null;

-- access is empty. Forest Service ownership and ranger-district layers put the USGS Goat Wall point (48.6201,-120.4473) on Okanogan-Wenatchee NF land, Methow Valley RD, outside any wilderness; the Wa
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_promised_land' and access is null;

-- access is empty. Forest Service ownership and ranger-district layers put the USGS Goat Wall point (48.6201,-120.4473) on Okanogan-Wenatchee NF land, Methow Valley RD, outside any wilderness; the Wa
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_goat_wall_goat_s_beard_ice' and access is null;

commit;
