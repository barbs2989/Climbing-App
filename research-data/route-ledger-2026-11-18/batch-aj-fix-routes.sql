-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project: one 60 ft bolted slab line (5 bolts). The count is implied, not stated: single source, unconfirmed. Proposed under the scope rule (pitches 0 is wrong whateve
update routes set pitches = 1 where id = 'wa_air_over_aries' and pitches = 0;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_air_over_aries' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 45 ft arete line, 4 bolts. Count implied, not stated: single source, unconfirmed. Proposed under the scope rule.
update routes set pitches = 1 where id = 'wa_on_the_verge' and pitches = 0;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_on_the_verge' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 55 ft arete line right of the Aries dihedral, 2 bolts plus cams (On the Verge continues directly above as its own route). Count implied: single source, u
update routes set pitches = 1 where id = 'wa_voyage_to_the_bottom_of_the_verge' and pitches = 0;

-- length is empty. Mountain Project: 55 ft (17 m). Single source; locked-1src after apply.
update routes set length_m = 17 where id = 'wa_voyage_to_the_bottom_of_the_verge' and length_m is null;

-- bolts is empty. Mountain Project protection: 'Has 2 bolts' (a 2013 comment says the route was re-bolted). Stated as bolts. Single source.
update routes set bolts = 2 where id = 'wa_voyage_to_the_bottom_of_the_verge' and bolts is null;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_voyage_to_the_bottom_of_the_verge' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project describes a 15 ft corner used as an alternate START to Great Northern Slab or to Pisces/Libra Crack, with no anchor of its own: it is part of a pitch, so no c
update routes set pitches = null where id = 'wa_sandy_corner' and pitches = 0;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_sandy_corner' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_a_great_northern_slab_gorilla_my_dreams' and access is null;

-- pitches 0 is invalid. Mountain Project: one 60 ft face line right of the Pisces crack that finishes up the last part of the Aries fourth-pitch crack. Count implied, not stated: single source, uncon
update routes set pitches = 1 where id = 'wa_let_s_go_bowling' and pitches = 0;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_let_s_go_bowling' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AJ/AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary laye
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_a_great_northern_slab_snow_white' and access is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_tatoosh' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches is null. Mountain Project describes one 110 ft pitch ending at the normal Tatoosh anchor (its Free at Last page: P1 starts up modern Tatoosh and passes that anchor); theCrag lists one 110 f
update routes set pitches = 1 where id = 'wa_tatoosh' and pitches is null;

-- anchor is empty. Abegg: the bolted anchor at the top of Tatoosh; Mountain Project (Free at Last page) confirms a fixed anchor there, under a large perched block, without naming its type. House spel
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_tatoosh' and anchor is null;

-- gear is empty. Mountain Project: standard rack to 2 in, doubles in finger sizes, a full set of stoppers. Single source.
update routes set gear = array['gear to 2 in','doubles in finger sizes','full set of nuts']::text[] where id = 'wa_tatoosh' and gear is null;

-- guide_stars is 0. The Index guide's own rating is 3 stars (climb page 'Tatoosh, 5.10b' and the Lower Town Wall list entry 'Tatoosh / Free at Last 5.10b'). Fill from 0 on the guide alone (brief AJ).
update routes set guide_stars = 3 where id = 'wa_tatoosh' and guide_stars = 0;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_kunselman_s_physics' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Majority rule (brief F): Mountain Project 5.12b and theCrag 5.12b agree; stored 5.12a. The Index guide's plain 5.12 does not contradict either. grade_num changes with it.
update routes set grade = $q$5.12b$q$ where id = 'wa_kunselman_s_physics' and grade = $q$5.12a$q$;

-- Goes with the grade fix: gradeNumFrom('5.12b','yds') = 12.5 (stored 12.25 for 5.12a).
update routes set grade_num = 12.5 where id = 'wa_kunselman_s_physics' and grade_num = 12.25;

-- pitches 0 is invalid. The guide's own teaser calls it 'this pitch'; MP describes one lead from the top of Higher Learning to the top of the wall.
update routes set pitches = 1 where id = 'wa_kunselman_s_physics' and pitches = 0;

-- bolts is empty. Mountain Project protection line: gear to 2 in, 6 bolts (stated as bolts). Single source.
update routes set bolts = 6 where id = 'wa_kunselman_s_physics' and bolts is null;

-- gear is empty. Mountain Project: gear to 2 in (plus the 6 bolts). Single source.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_kunselman_s_physics' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mini_air_dangler' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project describes one length: a hand crack in a dihedral to a flake, hands all the way to the chains. One length to one anchor.
update routes set pitches = 1 where id = 'wa_mini_air_dangler' and pitches = 0;

-- anchor is empty. Mountain Project: the crack runs to the chains. House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_mini_air_dangler' and anchor is null;

-- gear is empty. Mountain Project protection: hand-sized cams. Single source.
update routes set gear = array['hand-size cams']::text[] where id = 'wa_mini_air_dangler' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_with_apologies_to_walter_b' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project: gear to #2 Camalot and a handful of draws. Single source.
update routes set gear = array['gear to #2 Camalot','quickdraws']::text[] where id = 'wa_with_apologies_to_walter_b' and gear is null;

-- guide_stars is null. The Index guide's own rating is 3 stars (climb page and Lower Town Wall list agree). Fill from null on the guide alone (brief AJ).
update routes set guide_stars = 3 where id = 'wa_with_apologies_to_walter_b' and guide_stars is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_path_of_righteousness' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. No source states a count: MP describes a mantle, a hand-crack traverse to a ledge and an easier finish around to the right, and also uses its bolted start as an alternative st
update routes set pitches = null where id = 'wa_path_of_righteousness' and pitches = 0;

-- bolts is empty. Mountain Project protection line: gear to 1 in, 3 bolts (stated as bolts). Single source.
update routes set bolts = 3 where id = 'wa_path_of_righteousness' and bolts is null;

-- gear is empty. Mountain Project: gear to 1 in (plus the 3 bolts). Single source.
update routes set gear = array['gear to 1 in']::text[] where id = 'wa_path_of_righteousness' and gear is null;

-- guide_stars is null. The Index guide's own rating is 2 stars (climb page and Lower Town Wall list agree). Fill from null on the guide alone (brief AJ).
update routes set guide_stars = 2 where id = 'wa_path_of_righteousness' and guide_stars is null;

-- Brief AJ: access is null; fill it with the owner-approved Forks of the Sky object, copied field for field from the live wa_godzilla row. Re-read 2026-11-24: the State Parks boundary layer returns F
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_d_narrow_arrow_and_further_right_death_to_zeke' and access is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_voyage_of_the_majestic_glass_eyed_tuna' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP's Narrow Arrow Indirect gives it as one pitch (P6, 80 ft) to the top of the Lower Town Wall; Abegg climbs it as one pitch (Free at Last P4).
update routes set pitches = 1 where id = 'wa_voyage_of_the_majestic_glass_eyed_tuna' and pitches = 0;

-- bolts is empty. Mountain Project protection line: gear to 3.5 in, one bolt (stated as a bolt). Single source.
update routes set bolts = 1 where id = 'wa_voyage_of_the_majestic_glass_eyed_tuna' and bolts is null;

-- gear is empty. Mountain Project: gear to 3.5 in (plus one bolt). Single source.
update routes set gear = array['gear to 3.5 in']::text[] where id = 'wa_voyage_of_the_majestic_glass_eyed_tuna' and gear is null;

-- guide_stars is null. The Index guide's own rating is 3 stars (climb page and Lower Town Wall list agree). Fill from null on the guide alone (brief AJ).
update routes set guide_stars = 3 where id = 'wa_voyage_of_the_majestic_glass_eyed_tuna' and guide_stars is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_shirley' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project: standard rack; the crux stemming section protects with small cams (route page and its comments). Single source.
update routes set gear = array['standard rack','extra small cams for the stemming crux']::text[] where id = 'wa_shirley' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_salad_fingers' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry rates it 3 stars (climb page and Lower Town Wall list agree); stored null.
update routes set guide_stars = 3 where id = 'wa_salad_fingers' and guide_stars is null;

-- gear is empty. Mountain Project protection: gear to 3 inches with extra small nuts and cams. Single source.
update routes set gear = array['gear to 3 in','extra small nuts and cams']::text[] where id = 'wa_salad_fingers' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_let_s_barbecue' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- anchor is empty. Mountain Project: the top anchor was replaced with two stainless bolts and hangers with chains. House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_let_s_barbecue' and anchor is null;

-- gear is empty. Mountain Project: stoppers work in places, and a single rack of BD 000 to #1 is more than enough. Single source.
update routes set gear = array['nuts','cams BD 000 to #1, single set']::text[] where id = 'wa_let_s_barbecue' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_bob_and_doris' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- anchor is empty. Mountain Project: two stainless bolts and hangers with chain added on top (and at the start). House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_bob_and_doris' and anchor is null;

-- gear is empty. Mountain Project: a single rack with thin wires and cams from 000 to .75. The page's author only toproped it. Single source.
update routes set gear = array['thin wires','cams 000 to 0.75, single set']::text[] where id = 'wa_bob_and_doris' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_deal_with_it_ranger' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP describes one length from the shared start with Natural Log Cabin up the corner-chimney to the anchor it shares with Natural Log Cabin (stored 1 pitch). The 50 m continuati
update routes set pitches = 1 where id = 'wa_deal_with_it_ranger' and pitches = 0;

-- The Index guidebook's own entry rates it 2 stars (climb page and Lower Town Wall list agree); stored null.
update routes set guide_stars = 2 where id = 'wa_deal_with_it_ranger' and guide_stars is null;

-- gear is empty. Mountain Project: small wires to 3.5 inch cams. Single source.
update routes set gear = array['small wires','cams to 3.5 in']::text[] where id = 'wa_deal_with_it_ranger' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_like_honey' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Stored '5.12-'. Two independent publishers give the letter grade 5.12a: Mountain Project (5.12a) and the Index guide (5.12a, 3 stars). grade_num stays 12.25 (gradeNumFrom gives 12.25 for both); roc
update routes set grade = $q$5.12a$q$ where id = 'wa_like_honey' and grade = $q$5.12-$q$;

-- The Index guidebook's own entry rates it 3 stars (climb page and Lower Town Wall list agree); stored null.
update routes set guide_stars = 3 where id = 'wa_like_honey' and guide_stars is null;

-- gear is empty. Mountain Project: thin gear for the initial corner, then finger to hand pieces for the upper crack, doubles useful from .5 to 1 Camalot. Single source.
update routes set gear = array['thin gear','finger to hand cams','doubles 0.5 to 1 Camalot']::text[] where id = 'wa_like_honey' and gear is null;

-- Brief AH/AI/AJ: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of t
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_24_hour_buccaneer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry ('24hr Buccaneer') rates it 3 stars (climb page and Lower Town Wall list agree); stored null.
update routes set guide_stars = 3 where id = 'wa_24_hour_buccaneer' and guide_stars is null;

-- anchor is empty. Mountain Project: the climb ends on a giant ledge with two bolts for an anchor. House spelling. Single source.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_24_hour_buccaneer' and anchor is null;

-- gear is empty. Mountain Project: mostly small nuts and TCUs, plus one fixed piton. Single source.
update routes set gear = array['small nuts','small cams (TCUs)']::text[] where id = 'wa_24_hour_buccaneer' and gear is null;

commit;
