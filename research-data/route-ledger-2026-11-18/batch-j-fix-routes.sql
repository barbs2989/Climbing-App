-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- 0 is invalid. Single pitch is implied, not stated: MP descent is a 30 ft rappel off the back; Wenatchee Outdoors: downclimb the back or one 100 ft rappel down the front. Ledger level unconfirmed (s
update routes set pitches = 1 where id = 'wa_windward_direct' and pitches = 0;

-- MP protection: gear to 2 in plus six bolts. Wenatchee Outdoors says only "bolts". Single source (locked-1src after apply).
update routes set bolts = 6 where id = 'wa_windward_direct' and bolts is null;

-- Stored rack omits the gear MP lists (pro to 2 in, six bolts). Not lockable (paragraph).
update routes set detailed_rack = $q$Quickdraws for six bolts, plus gear to 2 in.$q$ where id = 'wa_windward_direct' and detailed_rack = $q$Quickdraws; some old bolts remain.$q$;

-- Same live wording as wa_potholes / wa_cro_magnon_caveman / wa_dr_leakey (batch C/E). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, 6:30 a.m. - dusk, off the rocks 30 min
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_windward_direct' and permit is null;

-- access is empty. Land manager = Washington State Parks (park page published by the WA State Parks and Recreation Commission). Discover Pass required for parking at State Parks (parks.wa.gov Discove
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_windward_direct' and access is null;

-- MP protection: gear to 2 in, 3 bolts. Single source (locked-1src after apply).
update routes set bolts = 3 where id = 'wa_lightning_crack_3' and bolts is null;

-- Same live wording as wa_potholes / wa_cro_magnon_caveman / wa_dr_leakey (batch C/E). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, 6:30 a.m. - dusk, off the rocks 30 min
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_lightning_crack_3' and permit is null;

-- access is empty. Land manager = Washington State Parks (park page published by the WA State Parks and Recreation Commission). Discover Pass required for parking at State Parks (parks.wa.gov Discove
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_lightning_crack_3' and access is null;

-- 0 is invalid. Single pitch implied, not stated: MP has the line passing 3 bolts to the rappel anchor. Ledger level unconfirmed (single-source, implied).
update routes set pitches = 1 where id = 'wa_austrian_slab' and pitches = 0;

-- MP: past 3 bolts to the rappel anchor. Single source (locked-1src after apply).
update routes set bolts = 3 where id = 'wa_austrian_slab' and bolts is null;

-- MP protection: pro to 1 in, draws (3 bolts). Stored "to roughly 1.5 in" has no source. Not lockable.
update routes set detailed_rack = $q$Quickdraws for three bolts, plus gear to 1 in.$q$ where id = 'wa_austrian_slab' and detailed_rack = $q$Draws, wires and small to mid-size cams (to roughly 1.5 in).$q$;

-- Same live wording as wa_potholes / wa_cro_magnon_caveman / wa_dr_leakey (batch C/E). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, 6:30 a.m. - dusk, off the rocks 30 min
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_austrian_slab' and permit is null;

-- access is empty. Land manager = Washington State Parks (park page published by the WA State Parks and Recreation Commission). Discover Pass required for parking at State Parks (parks.wa.gov Discove
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_austrian_slab' and access is null;

-- 0 is invalid. MP states Trad, 2 pitches (P1 east-face pockets to a belay, P2 wavy crack to a rappel anchor). Single source (locked-1src after apply).
update routes set pitches = 2 where id = 'wa_diagonal_direct' and pitches = 0;

-- MP protection: gear to 2 in, 6 bolts. Single source (locked-1src after apply).
update routes set bolts = 6 where id = 'wa_diagonal_direct' and bolts is null;

-- Empty. MP protection: pro to 2 in, 6 bolts. Not lockable.
update routes set detailed_rack = $q$Quickdraws for six bolts, plus gear to 2 in.$q$ where id = 'wa_diagonal_direct' and detailed_rack is null;

-- Same live wording as wa_potholes / wa_cro_magnon_caveman / wa_dr_leakey (batch C/E). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, 6:30 a.m. - dusk, off the rocks 30 min
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_diagonal_direct' and permit is null;

-- access is empty. Land manager = Washington State Parks (park page published by the WA State Parks and Recreation Commission). Discover Pass required for parking at State Parks (parks.wa.gov Discove
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_diagonal_direct' and access is null;

-- 0 is invalid. MP states 3 pitches (P1 slab to bolts and a belay, P2 up the ramp past bolts, P3 to the ridge crest). Single source (locked-1src after apply); a SummitPost page reportedly says 2 but 
update routes set pitches = 3 where id = 'wa_martian_diagonal' and pitches = 0;

-- MP protection: gear to 1 in, 3 bolts, three fixed pins. Single source (locked-1src after apply).
update routes set bolts = 3 where id = 'wa_martian_diagonal' and bolts is null;

-- Same live wording as wa_potholes / wa_cro_magnon_caveman / wa_dr_leakey (batch C/E). Re-opened the WA State Parks park page 2026-11-18: closed Nov 1 - Mar 15, 6:30 a.m. - dusk, off the rocks 30 min
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_martian_diagonal' and permit is null;

-- access is empty. Land manager = Washington State Parks (park page published by the WA State Parks and Recreation Commission). Discover Pass required for parking at State Parks (parks.wa.gov Discove
update routes set access = $q${"land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","permit":"None needed to climb.","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling."}$q$::jsonb where id = 'wa_martian_diagonal' and access is null;

-- 0 is invalid. MP states 6 pitches (RPM's own P1-P2, then the line to the top; most parties finish on Outer Space). No second source states a count (theCrag gives 100m only). Lock locked-1src single
update routes set pitches = 6 where id = 'wa_rpm' and pitches = 0;

-- Official-1: USFS Snow Lakes Trailhead page (updated 2026-08-04, re-opened 2026-11-18) gives $5/day or $30/yr, NW Forest Pass and Interagency passes accepted, and free self-issued day-use wilderness
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_rpm' and permit is null;

-- access is empty. USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the USGS Snow Creek Wall point (47.52957,-120.71870); USFS wilderness layer = Alpine Lakes Wilderness the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead.","fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail."}$q$::jsonb where id = 'wa_rpm' and access is null;

-- disciplines is null; must name the row's primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_rpm' and disciplines is null;

-- Official-1: USFS Snow Lakes Trailhead page (updated 2026-08-04, re-opened 2026-11-18) gives $5/day or $30/yr, NW Forest Pass and Interagency passes accepted, and free self-issued day-use wilderness
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_edge_of_space' and permit is null;

-- access is empty. USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the USGS Snow Creek Wall point (47.52957,-120.71870); USFS wilderness layer = Alpine Lakes Wilderness the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead.","fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail."}$q$::jsonb where id = 'wa_edge_of_space' and access is null;

-- disciplines is null; must name the row's primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_edge_of_space' and disciplines is null;

-- Official-1: USFS Snow Lakes Trailhead page (updated 2026-08-04, re-opened 2026-11-18) gives $5/day or $30/yr, NW Forest Pass and Interagency passes accepted, and free self-issued day-use wilderness
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_snow_creek_wall_tarkus' and permit is null;

-- access is empty. USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the USGS Snow Creek Wall point (47.52957,-120.71870); USFS wilderness layer = Alpine Lakes Wilderness the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead.","fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail."}$q$::jsonb where id = 'wa_snow_creek_wall_tarkus' and access is null;

-- disciplines is null; must name the row's primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_snow_creek_wall_tarkus' and disciplines is null;

-- Official-1: USFS Snow Lakes Trailhead page (updated 2026-08-04, re-opened 2026-11-18) gives $5/day or $30/yr, NW Forest Pass and Interagency passes accepted, and free self-issued day-use wilderness
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_snow_creek_wall_grand_arch' and permit is null;

-- access is empty. USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the USGS Snow Creek Wall point (47.52957,-120.71870); USFS wilderness layer = Alpine Lakes Wilderness the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead.","fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail."}$q$::jsonb where id = 'wa_snow_creek_wall_grand_arch' and access is null;

-- disciplines is null; must name the row's primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_snow_creek_wall_grand_arch' and disciplines is null;

-- Official-1: USFS Snow Lakes Trailhead page (updated 2026-08-04, re-opened 2026-11-18) gives $5/day or $30/yr, NW Forest Pass and Interagency passes accepted, and free self-issued day-use wilderness
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_snow_creek_wall_april_fool_s_tower' and permit is null;

-- access is empty. USFS basic-ownership layer = USDA Forest Service, Okanogan-Wenatchee NF at the USGS Snow Creek Wall point (47.52957,-120.71870); USFS wilderness layer = Alpine Lakes Wilderness the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead.","fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail."}$q$::jsonb where id = 'wa_snow_creek_wall_april_fool_s_tower' and access is null;

-- disciplines is null; must name the row's primary discipline (trad).
update routes set disciplines = array['trad']::text[] where id = 'wa_snow_creek_wall_april_fool_s_tower' and disciplines is null;

-- 0 is invalid. Mountain Project describes one 50 ft bolted line to a chain anchor; the pitch count is implied, not stated, so lock unconfirmed (single-source).
update routes set pitches = 1 where id = 'wa_jiffy_pop' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Rakkup gives no length (paywalled). Lock locked-1src after apply.
update routes set length_m = 15 where id = 'wa_jiffy_pop' and length_m is null;

-- Mountain Project: 4 bolts. Lock locked-1src after apply.
update routes set bolts = 4 where id = 'wa_jiffy_pop' and bolts is null;

-- Mountain Project: chain anchor. Lock locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_jiffy_pop' and anchor is null;

-- access is empty. Official-1: the Olallie State Park page says the Homestead Valley Trailhead reaches Deception Crags, lists the Discover Pass fees ($45 annual, $10 one day) and day-use hours 6:30 a
update routes set access = $q${"land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year).","rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going."}$q$::jsonb where id = 'wa_jiffy_pop' and access is null;

-- permit is empty. Official-1 from the same State Parks pages; lock after apply, expires 2027-11-18.
update routes set permit = $q$No climbing permit. A Discover Pass is needed to park at Olallie State Park.$q$ where id = 'wa_jiffy_pop' and permit is null;

-- 0 is invalid. Mountain Project describes one 50 ft bolted line to a chain anchor; the pitch count is implied, not stated, so lock unconfirmed (single-source).
update routes set pitches = 1 where id = 'wa_underground_economy' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Lock locked-1src after apply.
update routes set length_m = 15 where id = 'wa_underground_economy' and length_m is null;

-- Mountain Project: 5 bolts. Lock locked-1src after apply.
update routes set bolts = 5 where id = 'wa_underground_economy' and bolts is null;

-- Mountain Project: chain anchor. Lock locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_underground_economy' and anchor is null;

-- access is empty. Official-1: the Olallie State Park page says the Homestead Valley Trailhead reaches Deception Crags, lists the Discover Pass fees ($45 annual, $10 one day) and day-use hours 6:30 a
update routes set access = $q${"land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year).","rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going."}$q$::jsonb where id = 'wa_underground_economy' and access is null;

-- permit is empty. Official-1 from the same State Parks pages; lock after apply, expires 2027-11-18.
update routes set permit = $q$No climbing permit. A Discover Pass is needed to park at Olallie State Park.$q$ where id = 'wa_underground_economy' and permit is null;

-- 0 is invalid. Mountain Project describes one 70 ft bolted line to a chain anchor; the pitch count is implied, not stated, so lock unconfirmed (single-source).
update routes set pitches = 1 where id = 'wa_won_t_get_fooled_again' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Lock locked-1src after apply.
update routes set length_m = 21 where id = 'wa_won_t_get_fooled_again' and length_m is null;

-- Mountain Project: 9 bolts. Lock locked-1src after apply.
update routes set bolts = 9 where id = 'wa_won_t_get_fooled_again' and bolts is null;

-- Mountain Project: chain anchors with lower-offs. Lock locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_won_t_get_fooled_again' and anchor is null;

-- access is empty. Official-1: the Olallie State Park page says the Homestead Valley Trailhead reaches Deception Crags, lists the Discover Pass fees ($45 annual, $10 one day) and day-use hours 6:30 a
update routes set access = $q${"land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year).","rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going."}$q$::jsonb where id = 'wa_won_t_get_fooled_again' and access is null;

-- permit is empty. Official-1 from the same State Parks pages; lock after apply, expires 2027-11-18.
update routes set permit = $q$No climbing permit. A Discover Pass is needed to park at Olallie State Park.$q$ where id = 'wa_won_t_get_fooled_again' and permit is null;

-- 0 is invalid. Mountain Project describes one 60 ft bolted line to a chain anchor; the pitch count is implied, not stated, so lock unconfirmed (single-source).
update routes set pitches = 1 where id = 'wa_repo_man' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Rakkup paywalled. Lock locked-1src after apply.
update routes set length_m = 18 where id = 'wa_repo_man' and length_m is null;

-- Mountain Project: gear to 1.5 in plus 2 bolts (upper slab). Lock locked-1src after apply.
update routes set bolts = 2 where id = 'wa_repo_man' and bolts is null;

-- Mountain Project: chain anchor. Lock locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_repo_man' and anchor is null;

-- access is empty. Official-1: DNR's Mount Si NRCA page puts the Little Si Trailhead in the NRCA and says a Discover Pass is required to park there; prices from the State Parks Discover Pass page. Lo
update routes set access = $q${"land_manager":"Washington DNR (Mount Si Natural Resources Conservation Area)","parking_pass":"Discover Pass required to park at the Little Si Trailhead ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_repo_man' and access is null;

-- permit is empty. Official-1 (DNR Mount Si NRCA page). Lock after apply, expires 2027-11-18.
update routes set permit = $q$No climbing permit. A Discover Pass is needed to park at the Little Si Trailhead.$q$ where id = 'wa_repo_man' and permit is null;

-- 0 is invalid. A single bolted line lowered off one anchor (Sport, 85 ft (26 m)), but Mountain Project does not state a pitch count, so 1 is implied only: approve 1, record as unconfirmed single-sou
update routes set pitches = 1 where id = 'wa_chronic' and pitches = 0;

-- Mountain Project: Sport, 85 ft (26 m). Single source (the Exit 32 guidebook on rakkup is paywalled, theCrag blocked); locked-1src after apply.
update routes set length_m = 26 where id = 'wa_chronic' and length_m is null;

-- access is empty. DNR's Mount Si NRCA page: Discover Pass required to park at the Little Si Trailhead; dogs on leash; DNR South Puget Sound Region manages it. DNR managed-lands layer at World Wall r
update routes set access = $q${"land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","permit":"None needed to climb.","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead.","fees":null,"rules":"Dogs must be on a leash."}$q$::jsonb where id = 'wa_chronic' and access is null;

-- 0 is invalid. A single bolted line lowered off one anchor (Sport, 90 ft (27 m)), but Mountain Project does not state a pitch count, so 1 is implied only: approve 1, record as unconfirmed single-sou
update routes set pitches = 1 where id = 'wa_technorigine' and pitches = 0;

-- Mountain Project: Sport, 90 ft (27 m). Single source (the Exit 32 guidebook on rakkup is paywalled, theCrag blocked); locked-1src after apply.
update routes set length_m = 27 where id = 'wa_technorigine' and length_m is null;

-- Mountain Project: Fixed draws (12 bolts). Single source; locked-1src after apply.
update routes set bolts = 12 where id = 'wa_technorigine' and bolts is null;

-- access is empty. DNR's Mount Si NRCA page: Discover Pass required to park at the Little Si Trailhead; dogs on leash; DNR South Puget Sound Region manages it. DNR managed-lands layer at World Wall r
update routes set access = $q${"land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","permit":"None needed to climb.","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead.","fees":null,"rules":"Dogs must be on a leash."}$q$::jsonb where id = 'wa_technorigine' and access is null;

-- Exit 32 guidebook (Kutzke & Price, rakkup) 5.12d; Mountain Project 5.12c/d, which agrees with either half. Two independent sources agree on 5.12d; the stored '5.12+' is vaguer. Lock agree-2 after a
update routes set grade = $q$5.12d$q$ where id = 'wa_propaganda' and grade = $q$5.12+$q$;

-- gradeNumFrom('5.12d','yds') = 12.9, follows the grade change. rock_grade is null, so it is not touched.
update routes set grade_num = 12.9 where id = 'wa_propaganda' and grade_num = 12.75;

-- 0 is invalid. A single bolted line lowered off one anchor (Sport, 90 ft (27 m)), but Mountain Project does not state a pitch count, so 1 is implied only: approve 1, record as unconfirmed single-sou
update routes set pitches = 1 where id = 'wa_propaganda' and pitches = 0;

-- Mountain Project: Sport, 90 ft (27 m). Single source (the Exit 32 guidebook on rakkup is paywalled, theCrag blocked); locked-1src after apply.
update routes set length_m = 27 where id = 'wa_propaganda' and length_m is null;

-- Mountain Project: 9 bolts and anchor. Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_propaganda' and bolts is null;

-- access is empty. DNR's Mount Si NRCA page: Discover Pass required to park at the Little Si Trailhead; dogs on leash; DNR South Puget Sound Region manages it. DNR managed-lands layer at World Wall r
update routes set access = $q${"land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","permit":"None needed to climb.","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead.","fees":null,"rules":"Dogs must be on a leash."}$q$::jsonb where id = 'wa_propaganda' and access is null;

-- 0 is invalid. A single bolted line lowered off one anchor (Sport, 100 ft (30 m)), but Mountain Project does not state a pitch count, so 1 is implied only: approve 1, record as unconfirmed single-so
update routes set pitches = 1 where id = 'wa_psychosomatic' and pitches = 0;

-- Mountain Project: Sport, 100 ft (30 m). Single source (the Exit 32 guidebook on rakkup is paywalled, theCrag blocked); locked-1src after apply.
update routes set length_m = 30 where id = 'wa_psychosomatic' and length_m is null;

-- Mountain Project: 10 bolts and a chain anchor. Single source; locked-1src after apply.
update routes set bolts = 10 where id = 'wa_psychosomatic' and bolts is null;

-- Mountain Project: 10 bolts and a chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_psychosomatic' and anchor is null;

-- access is empty. DNR's Mount Si NRCA page: Discover Pass required to park at the Little Si Trailhead; dogs on leash; DNR South Puget Sound Region manages it. DNR managed-lands layer at World Wall r
update routes set access = $q${"land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","permit":"None needed to climb.","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead.","fees":null,"rules":"Dogs must be on a leash."}$q$::jsonb where id = 'wa_psychosomatic' and access is null;

-- Mountain Project: 7 bolts and anchor, fixed draws. Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_world_wall_psycho_wussy' and bolts is null;

-- Mountain Project: ends at the first two bolt anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_world_wall_psycho_wussy' and anchor is null;

-- access is empty. DNR's Mount Si NRCA page: Discover Pass required to park at the Little Si Trailhead; dogs on leash; DNR South Puget Sound Region manages it. DNR managed-lands layer at World Wall r
update routes set access = $q${"land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","permit":"None needed to climb.","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead.","fees":null,"rules":"Dogs must be on a leash."}$q$::jsonb where id = 'wa_world_wall_psycho_wussy' and access is null;

commit;
