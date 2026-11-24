-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project states 5 pitches (P1-P5 described, each to its own belay). Single source (theCrag Forbidden; the guide teaser shows no count); locked-1src after apply.
update routes set pitches = 5 where id = 'wa_aries_aka_the_lizard' and pitches = 0;

-- length is empty. Mountain Project: 250 ft (76 m). Single source; locked-1src after apply.
update routes set length_m = 76 where id = 'wa_aries_aka_the_lizard' and length_m is null;

-- gear is empty. Mountain Project rack: one set of cams from the smallest Alien to a #3 Camalot, extras in thin hands to hands, a set of small nuts. Single source (rack); locked-1src after apply.
update routes set gear = array['cams from smallest Alien to #3 Camalot','extra thin hands to hands','small nuts']::text[] where id = 'wa_aries_aka_the_lizard' and gear is null;

-- guide_stars is empty. The Index guidebook's own entry (publisher's teaser page) rates The Lizard Route (aka Aries) 4 stars.
update routes set guide_stars = 4 where id = 'wa_aries_aka_the_lizard' and guide_stars is null;

-- Brief AH: copy the owner-approved State Parks object field for field from wa_godzilla (read from the saved live row 2026-11-24): land_manager only, permit stays null. Re-read 2026-11-24: the State 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_aries_aka_the_lizard' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project states 2 pitches (P1 corner and traverse, P2 hand crack to the last pitch of Great Northern Slab). Single source; locked-1src after apply. P2 is unaffected by
update routes set pitches = 2 where id = 'wa_taurus' and pitches = 0;

-- gear is empty. Mountain Project: gear to 2". Single source (rack); locked-1src after apply.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_taurus' and gear is null;

-- guide_stars is empty. The Index guidebook's own entry (publisher's teaser page) rates Taurus 2 stars.
update routes set guide_stars = 2 where id = 'wa_taurus' and guide_stars is null;

-- Brief AH: copy the owner-approved State Parks object field for field from wa_godzilla (read from the saved live row 2026-11-24): land_manager only, permit stays null. Re-read 2026-11-24: the State 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_taurus' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. No source states a count, and the route scope is unsettled: Mountain Project treats Pisces as the 65 ft hand crack reached by a gully or via Libra Crack, while the Index guide
update routes set pitches = null where id = 'wa_pisces' and pitches = 0;

-- Brief AH: copy the owner-approved State Parks object field for field from wa_godzilla (read from the saved live row 2026-11-24): land_manager only, permit stays null. Re-read 2026-11-24: the State 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_pisces' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 50 ft crack from the ledge to a chained anchor at the top (one length to one anchor). Single source; 0 -> 1.
update routes set pitches = 1 where id = 'wa_sickle_crack' and pitches = 0;

-- length is empty. Mountain Project: 50 ft (15 m). Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'wa_sickle_crack' and length_m is null;

-- anchor is empty. Mountain Project: chained anchor at the top. House spelling "Chain anchor" (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_sickle_crack' and anchor is null;

-- gear is empty. Mountain Project: gear to 3", smaller pieces for the crack. Single source (rack); locked-1src after apply.
update routes set gear = array['gear to 3 in','extra small gear for the crack']::text[] where id = 'wa_sickle_crack' and gear is null;

-- Brief AH: copy the owner-approved State Parks object field for field from wa_godzilla (read from the saved live row 2026-11-24): land_manager only, permit stays null. Re-read 2026-11-24: the State 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_sickle_crack' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH: copy the Forks of the Sky State Park object field for field from wa_godzilla (owner-approved, read from the saved live row 2026-11-24); replaces the LEGACY object (Mt. Baker-Snoqualmie NF
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_narrow_arrow_and_further_right_narrow_arrow_indirect' and access is null;

-- length_m is empty. Mountain Project: Trad, 440 ft, 4 pitches (440 ft = 134 m; its four pitch lengths, 35+35+35+30 m, sum to 135 m). Single source (the guide's teaser gives no length; theCrag's sect
update routes set length_m = 134 where id = 'wa_free_at_last' and length_m is null;

-- SHAPE fix: the stored gear holds sentences, a rope and a descent note (gear is a text[] of short items, never a rope or a sentence). Items from Mountain Project's protection line: doubles from a bl
update routes set gear = array['cams from Metolius blue to Camalot #3, two each','a few small nuts','3 alpine draws','quickdraws for the bolts']::text[] where id = 'wa_free_at_last' and gear = array['Doubles in finger-to-hand cams from about 0.4 up through a #3 Camalot, plus a few small nuts','A small offset cam is worth carrying to protect the pendulum-prone section between the two bolts on the pitch 4 face crux','Two bolts protect the pitch 4 face crux, described as run-out and taping up for the V-slot is recommended','70 m rope, both for leading the longer pitches and for the rappel descent','Descent is by rappelling the route itself, not a walk-off']::text[];

-- Brief AH: copy the Forks of the Sky State Park object field for field from wa_godzilla (owner-approved, read from the saved live row 2026-11-24); replaces the LEGACY object (Mt. Baker-Snoqualmie NF
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_free_at_last' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH: copy the Forks of the Sky State Park object field for field from wa_godzilla (owner-approved, read from the saved live row 2026-11-24); replaces the LEGACY object (Mt. Baker-Snoqualmie NF
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_stamper_holland' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project protection: gear to 3 in (the line also clips bolts on a detached flake; no count). Single source.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_old_man_hubbard' and gear is null;

-- Brief AH: copy the Forks of the Sky State Park object field for field from wa_godzilla (owner-approved, read from the saved live row 2026-11-24); replaces the LEGACY object (Mt. Baker-Snoqualmie NF
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_old_man_hubbard' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page and Lower Town Wall list) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_higher_learning' and guide_stars is null;

-- Mountain Project protection: '1 bolt, gear to 2 in' (the bolt is clipped stepping across from the Narrow Arrow summit). Stated as a bolt. Single source.
update routes set bolts = 1 where id = 'wa_higher_learning' and bolts is null;

-- gear is empty. Mountain Project: 1 bolt, gear to 2 in. Single source.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_higher_learning' and gear is null;

-- Brief AH: copy the Forks of the Sky State Park object field for field from wa_godzilla (owner-approved, read from the saved live row 2026-11-24); replaces the LEGACY object (Mt. Baker-Snoqualmie NF
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_higher_learning' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH: copy the Forks of the Sky State Park object field for field from wa_godzilla (owner-approved, read from the saved live row 2026-11-24); replaces the LEGACY object (Mt. Baker-Snoqualmie NF
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_freedom_fighter_2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_roger_s_corner' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's climb page and sector list) rates it 3 stars; stored 0 reads as unrated.
update routes set guide_stars = 3 where id = 'wa_roger_s_corner' and guide_stars = 0;

-- gear is empty. Mountain Project protection: double TCUs, a #3 Camalot and nuts; long slings help when it is run as one pitch. Single source.
update routes set gear = array['double small cams (TCUs)','#3 Camalot','nuts','long slings']::text[] where id = 'wa_roger_s_corner' and gear is null;

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_breakfast_of_champions' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project: a few hand-size pieces (the Roger's Corner rack covers it). Single source.
update routes set gear = array['hand-size cams']::text[] where id = 'wa_breakfast_of_champions' and gear is null;

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_marginal_karma' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project protection: small nuts and cams. Single source.
update routes set gear = array['small nuts','small cams']::text[] where id = 'wa_marginal_karma' and gear is null;

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_sugar_bear' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP states no pitch count and no length, and the line leaves Roger's Corner partway up, so a single pitch is not clear: 0 -> null.
update routes set pitches = null where id = 'wa_sugar_bear' and pitches = 0;

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_park_ranger' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- anchor is empty. MP: pitch 4 ends at a chain anchor (pitch 3 belays at chains by a tree); house spelling. Abegg calls the top a bolted rappel anchor (compatible). Single source for the type: locked
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_park_ranger' and anchor is null;

-- Stored gear breaks the gear shape: it holds a rope (70 m), sentences about anchors, and a descent line (rappel Free at Last) that MP contradicts (MP: rap the route with a 70 m rope). Replaced with 
update routes set gear = array['double rack to #3','long slings','quickdraws']::text[] where id = 'wa_park_ranger' and gear = array['Double rack of cams up to a #3 (Camalot-size)','Long slings and extra alpine draws to manage rope drag on the wandering, traversing pitches','70 m rope','Several belays use fixed chain anchors (pitch 3 at a tree, pitch 4 at a chain station)','Descend by rappelling the neighboring Free at Last line rather than walking off']::text[];

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_city_park_p2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH: replaces the LEGACY object (National Forest, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the Sky object,
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_artifice' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

commit;
