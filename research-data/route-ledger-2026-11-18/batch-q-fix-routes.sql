-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project: a 40 ft finger crack to a chain anchor shared with Zig Zag P1; one length to one anchor.
update routes set pitches = 1 where id = 'wa_lgk' and pitches = 0;

-- Mountain Project: Trad, 40 ft (12 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 12 where id = 'wa_lgk' and length_m is null;

-- Mountain Project: chain anchor, shared with Zig Zag P1, Another Option and Crack'n the Code. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_lgk' and anchor is null;

-- Mountain Project protection: pro to 1 in. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set gear = array['gear to 1 in']::text[] where id = 'wa_lgk' and gear is null;

-- Access is empty. Copied field for field from the live, verified object on wa_zig_zag (also on wa_b_main_wall_west_new_creation and wa_redemption, batch N). Re-read today: the city's 2025 ACFL plan 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_lgk' and access is null;

-- Mountain Project: one 50 ft bolted pitch to a chain anchor, starting from the Cowboys Don't Cry anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_ride_m_cowgirl' and pitches = 0;

-- Mountain Project: Sport, 50 ft (15 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_ride_m_cowgirl' and length_m is null;

-- Mountain Project protection: 5 bolts, optional pro to 1 in, chain anchor. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set bolts = 5 where id = 'wa_ride_m_cowgirl' and bolts is null;

-- Mountain Project: chain anchor. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_ride_m_cowgirl' and anchor is null;

-- Access is empty. Copied field for field from the live, verified object on wa_zig_zag (also on wa_b_main_wall_west_new_creation and wa_redemption, batch N). Re-read today: the city's 2025 ACFL plan 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_ride_m_cowgirl' and access is null;

-- Mountain Project: a 60 ft, 6-bolt line from the Springboard branch at the top of Zig Zag to chains; one length to one anchor.
update routes set pitches = 1 where id = 'wa_clipped_my_wings' and pitches = 0;

-- Mountain Project: Sport, 60 ft (18 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 18 where id = 'wa_clipped_my_wings' and length_m is null;

-- Mountain Project protection: 6 bolts. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set bolts = 6 where id = 'wa_clipped_my_wings' and bolts is null;

-- Mountain Project: tops out at chains shared with Springboard and On Eagles' Wings. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_clipped_my_wings' and anchor is null;

-- Access is empty. Copied field for field from the live, verified object on wa_zig_zag (also on wa_b_main_wall_west_new_creation and wa_redemption, batch N). Re-read today: the city's 2025 ACFL plan 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_clipped_my_wings' and access is null;

-- Mountain Project: 100 ft from Snag Buttress past a cave and up a gully slab to an anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_american_warrior' and pitches = 0;

-- Mountain Project: Trad, 100 ft (30 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 30 where id = 'wa_american_warrior' and length_m is null;

-- Mountain Project protection: pro to 2 in, 1 fixed piton, chain anchor. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_american_warrior' and anchor is null;

-- Mountain Project protection: pro to 2 in. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_american_warrior' and gear is null;

-- Access is empty. Copied field for field from the live, verified object on wa_zig_zag (also on wa_b_main_wall_west_new_creation and wa_redemption, batch N). Re-read today: the city's 2025 ACFL plan 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_american_warrior' and access is null;

-- Mountain Project: a 70 ft, 7-bolt line to a chain anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_cowboys_don_t_cry' and pitches = 0;

-- Mountain Project: Sport, 70 ft (21 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 21 where id = 'wa_cowboys_don_t_cry' and length_m is null;

-- Mountain Project protection: 7 bolts, optional pro to 1 in, chain anchor. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set bolts = 7 where id = 'wa_cowboys_don_t_cry' and bolts is null;

-- Mountain Project: chain anchor at the top (the two-bolt anchor without chains is at its start). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_cowboys_don_t_cry' and anchor is null;

-- Access is empty. Copied field for field from the live, verified object on wa_zig_zag (also on wa_b_main_wall_west_new_creation and wa_redemption, batch N). Re-read today: the city's 2025 ACFL plan 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_cowboys_don_t_cry' and access is null;

-- Two sources agree on two pitches: Mountain Project (P1 5.9+ 100 ft, P2 5.10a/b 40 ft) and the Mt. Erie guidebook page ('a two-pitch climb'). Lockable agree-2 after apply.
update routes set pitches = 2 where id = 'wa_on_eagles_wings' and pitches = 0;

-- Mountain Project: 150 ft (45 m), 2 pitches. Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 45 where id = 'wa_on_eagles_wings' and length_m is null;

-- Access is empty. Copied field for field from the live, verified object on wa_zig_zag (also on wa_b_main_wall_west_new_creation and wa_redemption, batch N). Re-read today: the city's 2025 ACFL plan 
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_on_eagles_wings' and access is null;

-- Templated access names Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass, Mount Rainier NP and unrelated peaks (Persis, Gunn, Baring); none of that fits an Index Town Walls crag. Land
update routes set access = null where id = 'wa_tour_of_duty' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 5 pitches (Trad, 5 pitches (P1 11b, P2 11b, P3 5.9, P4 10b, P5 10c)). Rakkup's open page gives no count (paywalled). locked-1src after apply.
update routes set pitches = 5 where id = 'wa_tour_of_duty' and pitches = 0;

-- Mountain Project: Protection: gear to 3.5 in; bolts on P2 and P3. Short items only, no rope. Single source; locked-1src after apply.
update routes set gear = array['gear to 3.5 in']::text[] where id = 'wa_tour_of_duty' and gear is null;

-- Templated access names Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass, Mount Rainier NP and unrelated peaks (Persis, Gunn, Baring); none of that fits an Index Town Walls crag. Land
update routes set access = null where id = 'wa_jonah_benkert_s_world_famous_homemade_humble_pie' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 5 pitches (Sport, 5 pitches (P1 11b, P2 11b, P3 10b, P4 11c, P5 10b)). Rakkup's open page gives no count (paywalled). locked-1src after apply.
update routes set pitches = 5 where id = 'wa_jonah_benkert_s_world_famous_homemade_humble_pie' and pitches = 0;

-- Mountain Project: Protection: quickdraws, one optional blue TCU. Short items only, no rope. Single source; locked-1src after apply.
update routes set gear = array['quickdraws','optional blue TCU']::text[] where id = 'wa_jonah_benkert_s_world_famous_homemade_humble_pie' and gear is null;

-- Templated access names Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass, Mount Rainier NP and unrelated peaks (Persis, Gunn, Baring); none of that fits an Index Town Walls crag. Land
update routes set access = null where id = 'wa_tales_from_zahajko' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 5 pitches (Trad, Sport, 5 pitches (P1 11b, P2 10c, P3 11c, P4 11b, P5 11c)). Rakkup's open page gives no count (paywalled). locked-1src after apply.
update routes set pitches = 5 where id = 'wa_tales_from_zahajko' and pitches = 0;

-- Mountain Project: Protection: quickdraws plus one red and one green Camalot for the last pitch. Short items only, no rope. Single source; locked-1src after apply.
update routes set gear = array['quickdraws','red Camalot','green Camalot']::text[] where id = 'wa_tales_from_zahajko' and gear is null;

-- anchor is empty. MP protection: 'Bolts. Bolted anchor' (description: cordelette quad with two rap rings). House spelling 'Bolted anchor'. MP-alone anchor: locked-1src after apply.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_purina_crags_crude_buddha' and anchor is null;

-- access is empty. Copies field for field the live object on wa_givler_s_crack (read from the DB, read-only). Checked 2026-11-23 at the Purina Crags point (47.54647,-120.70713): USFS basic-ownership 
update routes set access = $q${"rules":"The crag is outside designated wilderness.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)"}$q$::jsonb where id = 'wa_purina_crags_crude_buddha' and access is null;

-- bolts is empty. MP protection states '8 bolts'. MP-alone bolts: locked-1src after apply.
update routes set bolts = 8 where id = 'wa_icicle_buttress_good_gravy' and bolts is null;

-- anchor is empty. MP: 'chain anchors'. House spelling 'Chain anchor'. MP-alone anchor: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_icicle_buttress_good_gravy' and anchor is null;

-- gear is empty. MP: optional cams #0.75 to #2 for a runout low-5th upper section. Short item list; MP-alone rack: locked-1src after apply.
update routes set gear = array['optional cams #0.75 to #2']::text[] where id = 'wa_icicle_buttress_good_gravy' and gear is null;

-- access is empty. Copies field for field the live object on wa_givler_s_crack (read from the DB, read-only). Checked 2026-11-23 at the Icicle Buttress point (47.54818,-120.75176): USFS basic-ownersh
update routes set access = $q${"rules":"The crag is outside designated wilderness.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)"}$q$::jsonb where id = 'wa_icicle_buttress_good_gravy' and access is null;

-- bolts is empty. MP protection states '4 bolts and chains up top'. MP-alone bolts: locked-1src after apply.
update routes set bolts = 4 where id = 'wa_30_rock_funcooker' and bolts is null;

-- anchor is empty. MP: 'chains up top'. House spelling 'Chain anchor'. MP-alone anchor: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_30_rock_funcooker' and anchor is null;

-- access is empty. Copies field for field the live object on wa_givler_s_crack (read from the DB, read-only). Checked 2026-11-23 at the 30 Rock point (47.57184,-120.78764): USFS basic-ownership layer
update routes set access = $q${"rules":"The crag is outside designated wilderness.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)"}$q$::jsonb where id = 'wa_30_rock_funcooker' and access is null;

-- access is empty. Copies field for field the live object on wa_givler_s_crack (read from the DB, read-only). Checked 2026-11-23 at the 30 Rock point (47.57184,-120.78764): USFS basic-ownership layer
update routes set access = $q${"rules":"The crag is outside designated wilderness.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)"}$q$::jsonb where id = 'wa_30_rock_coming_in_quartz' and access is null;

-- pitches 0 is invalid. Mountain Project gives one 30 ft sport line with 3 bolts and old chain: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_squish_baby' and pitches = 0;

-- Mountain Project states 30 ft (9 m). Single source (no other publisher lists the route); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_squish_baby' and length_m is null;

-- Mountain Project protection: '3 bolts and old chain' (bolts, not clips). Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_squish_baby' and bolts is null;

-- Mountain Project: old chain, shared with Baby Squish. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_squish_baby' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 25 ft sport line with 3 bolts and chain anchor with quicklinks: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirm
update routes set pitches = 1 where id = 'wa_baby_love' and pitches = 0;

-- Mountain Project states 25 ft (8 m). Single source (no other publisher lists the route); locked-1src after apply.
update routes set length_m = 8 where id = 'wa_baby_love' and length_m is null;

-- Mountain Project protection: '3 bolts and chain anchor with quicklinks' (bolts, not clips). Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_baby_love' and bolts is null;

-- Mountain Project: chain anchor with quicklinks. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_baby_love' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 30 ft sport line with 3 bolts and old chain: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_baby_squish' and pitches = 0;

-- Mountain Project states 30 ft (9 m). Single source (no other publisher lists the route); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_baby_squish' and length_m is null;

-- Mountain Project protection: '3 bolts and old chain' (bolts, not clips). Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_baby_squish' and bolts is null;

-- Mountain Project: old chain. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_baby_squish' and anchor is null;

-- access is empty. Substation (OSM crag node 4352830097 at 47.43701,-121.66373, and the catalog area point) falls 43-65 m inside the 'Palouse to Cascades' unit on the official WA State Parks boundary
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_substation_glob_job_extension' and access is null;

commit;
