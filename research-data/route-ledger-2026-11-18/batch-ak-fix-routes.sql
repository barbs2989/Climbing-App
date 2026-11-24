-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_frog_prince' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project describes it as leaving Princely Ambitions' first pitch up and right to the base of Tadpole; it states no pitch count and no anchor of its own. No other sourc
update routes set pitches = null where id = 'wa_frog_prince' and pitches = 0;

-- gear is empty. Mountain Project protection: gear to 3 in and four quickdraws (bolts on the line; the count is not stated). Single source.
update routes set gear = array['gear to 3 in','4 quickdraws']::text[] where id = 'wa_frog_prince' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_frog_pond' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- guide_stars is null. The Index guide's own rating is 2 stars (climb page and Lower Town Wall list agree). Fill from null on the guide alone (brief AJ).
update routes set guide_stars = 2 where id = 'wa_frog_pond' and guide_stars is null;

-- gear is empty. Mountain Project protection: stick-clip the first bolt, then thin gear up to fist-sized cams. Single source.
update routes set gear = array['stick clip for the first bolt','thin gear to fist-size cams']::text[] where id = 'wa_frog_pond' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_tadpole' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- guide_stars is null. The Index guide's own rating is 3 stars (climb page and Lower Town Wall list agree). Fill from null on the guide alone (brief AJ).
update routes set guide_stars = 3 where id = 'wa_tadpole' and guide_stars is null;

-- gear is empty. Mountain Project protection: gear to 3/4 in, doubles in small sizes, maybe triples in the smallest. Single source.
update routes set gear = array['gear to 3/4 in','doubles in small cams','triples in the smallest sizes optional']::text[] where id = 'wa_tadpole' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_stern_farmer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. The row is the free first pitch: Mountain Project gives 75 ft ending at chains (5.12b), the Index guide's 5.12b entry is the same first pitch (starts up the first ~40 ft of Ja
update routes set pitches = 1 where id = 'wa_stern_farmer' and pitches = 0;

-- length is empty. Mountain Project: 75 ft (23 m). Single source.
update routes set length_m = 23 where id = 'wa_stern_farmer' and length_m is null;

-- anchor is empty. Mountain Project: the finger-crack finish ends at the chains; Stern Farmer Full's page also names the P1 chains (same publisher). House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_stern_farmer' and anchor is null;

-- Brief AK: access is null; fills it with the owner-approved Forks of the Sky object, copied field for field from the live wa_godzilla row. Re-read 2026-11-24: the State Parks boundary layer returns 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_dwarf_tossing_to_narrow_arrow_stern_farmer_full' and access is null;

-- gear is empty. Mountain Project: doubles in small cams up to .5, offsets, a single #3, several slings and 2 quickdraws. Single source.
update routes set gear = array['doubles in small cams to 0.5','offset cams','single #3 cam','slings','2 quickdraws']::text[] where id = 'wa_dwarf_tossing_to_narrow_arrow_stern_farmer_full' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_sushi_farmer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AK: access is null; fills it with the owner-approved Forks of the Sky object, copied field for field from the live wa_godzilla row. Re-read 2026-11-24: the State Parks boundary layer returns 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_dwarf_tossing_to_narrow_arrow_chorus_of_frogs' and access is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_numbah_ten' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_numbah_ten_p3' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty (a null-only field the scope question does not touch). MP: doubles in fingers, singles in hands; the pitch also passes one fixed pin. Single source.
update routes set gear = array['doubles in finger sizes','singles in hand sizes']::text[] where id = 'wa_numbah_ten_p3' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_comfortably_numbah_10' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_tommy_s_sandbox' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Both sources describe one pitch: MP calls it 'this pitch', from the anchor atop Slow Children to the anchors at the top of the Lower Town Wall; the guide says it is best treat
update routes set pitches = 1 where id = 'wa_tommy_s_sandbox' and pitches = 0;

-- bolts is empty. MP's protection line states 9 bolts plus several sections of natural protection. Single source.
update routes set bolts = 9 where id = 'wa_tommy_s_sandbox' and bolts is null;

-- gear is empty. MP: doubles .1 to .5, singles .75 to 2, nuts including some micro, and several alpine draws on top of the 9 draws because the pitch wanders; comments (2024) agree that long slings ar
update routes set gear = array['doubles of 0.1-0.5 cams','singles of 0.75-2 cams','nuts including micro nuts','alpine draws to cut rope drag']::text[] where id = 'wa_tommy_s_sandbox' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_city_park_bolt_ladder' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_cheeseburgers_on_trial' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- guide_stars is empty. The Index guide gives 1 star on both its route page and its Lower Town Wall list. Filling from null on the guide alone (brief AI rule).
update routes set guide_stars = 1 where id = 'wa_cheeseburgers_on_trial' and guide_stars is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_bwana_dik' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- bolts is empty. MP: one bolt and gear; the description has one bolt low on the route. Single source.
update routes set bolts = 1 where id = 'wa_bwana_dik' and bolts is null;

-- anchor is empty. MP: the route ends at an anchor with chains (clipping the chains is called a crux). House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_bwana_dik' and anchor is null;

-- gear is empty. MP: one bolt and gear to one or two inches; a small cam (Alien/TCU/C3 size) protects the top crux. Single source.
update routes set gear = array['gear to 2 in','small cams for the top crux']::text[] where id = 'wa_bwana_dik' and gear is null;

-- guide_stars is empty. The Index guide gives 3 stars on both its route page and its Lower Town Wall list. Filling from null on the guide alone (brief AI rule).
update routes set guide_stars = 3 where id = 'wa_bwana_dik' and guide_stars is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_just_say_no' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guide's own entry rates it 2 stars (climb page and Lower Town Wall list agree); stored null.
update routes set guide_stars = 2 where id = 'wa_just_say_no' and guide_stars is null;

-- gear is empty. Mountain Project protection: a few cams from a red C3 to a 0.4 BD, or nuts in that range, plus one #2 BD cam with a sling. Single source.
update routes set gear = array['nuts or small cams, red C3 to BD 0.4','one BD #2 cam']::text[] where id = 'wa_just_say_no' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_narrow_arrow_overhang' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_narrow_arrow_direct' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project protection: gear from very thin up to a green Camalot, plus nuts. Single source.
update routes set gear = array['cams from very thin to green Camalot (0.5)','nuts']::text[] where id = 'wa_narrow_arrow_direct' and gear is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_natural_log_cabin' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- anchor is empty. Mountain Project: the route ends at chains. House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_natural_log_cabin' and anchor is null;

-- Brief AH-AK: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_full_horse_power' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- 0 is invalid. Full Horse Power is an extension of Powerhorse (Iron Horse to its first chains, the upper arete of Amandla, then over the roof); no source states a pitch count for it. Null rather tha
update routes set pitches = null where id = 'wa_full_horse_power' and pitches = 0;

-- Brief AH-AK: fills the null access with the owner-approved Forks of the Sky object, copied field for field from the live wa_godzilla row. Re-read 2026-11-24: the State Parks boundary layer returns 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_dwarf_tossing_to_narrow_arrow_dr_sniff_and_the_tuna_boaters' and access is null;

-- The Index guide's own entry rates it 3 stars (climb page and Lower Town Wall list agree); stored null.
update routes set guide_stars = 3 where id = 'wa_dwarf_tossing_to_narrow_arrow_dr_sniff_and_the_tuna_boaters' and guide_stars is null;

-- gear is empty. Mountain Project protection: gear to 2 inches; a 2023 comment says small cams are still needed. Single source.
update routes set gear = array['gear to 2 in','small cams']::text[] where id = 'wa_dwarf_tossing_to_narrow_arrow_dr_sniff_and_the_tuna_boaters' and gear is null;

commit;
