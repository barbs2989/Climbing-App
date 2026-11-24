-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project describes one 80 ft crack climbed from the Terminal Preppie anchors to the top of the crack (one length). The count is implied, not stated: single source, unc
update routes set pitches = 1 where id = 'wa_nick_o_time' and pitches = 0;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_nick_o_time' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 80 ft line through the roof and up the slab to the anchors (one length to one anchor). Count implied, not stated: single source, unconfirmed.
update routes set pitches = 1 where id = 'wa_strength_through_bowling' and pitches = 0;

-- length is empty. Mountain Project: 80 ft (24 m). Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'wa_strength_through_bowling' and length_m is null;

-- guide_stars is empty. The Index guidebook's own entry (publisher's teaser page) rates Strength Through Bowling 3 stars.
update routes set guide_stars = 3 where id = 'wa_strength_through_bowling' and guide_stars is null;

-- gear is empty. Mountain Project: a few quickdraws, thin gear to a green Alien, a #3 Camalot helpful. Single source (rack).
update routes set gear = array['thin cams to green Alien','#3 Camalot','quickdraws']::text[] where id = 'wa_strength_through_bowling' and gear is null;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_strength_through_bowling' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 90 ft line, five bolts and gear, to an anchor (one length to one anchor; Nick O' Time continues above these anchors as its own route). Count implied: sin
update routes set pitches = 1 where id = 'wa_terminal_preppie' and pitches = 0;

-- length is empty. Mountain Project: 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_terminal_preppie' and length_m is null;

-- bolts is empty. Mountain Project protection: 5 bolts (old bolts replaced in 2007) plus a few pieces. Stated as bolts. Single source.
update routes set bolts = 5 where id = 'wa_terminal_preppie' and bolts is null;

-- gear is empty. Mountain Project: small wires for the upper roof and the flake, a #1 Camalot in the flake before the first bolt, a #3 Wild Country Rock for the upper roof (a 2021 comment suggests a 
update routes set gear = array['small nuts','#1 and #2 Camalot','#3 Wild Country Rock or black Totem']::text[] where id = 'wa_terminal_preppie' and gear is null;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_terminal_preppie' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 90 ft bolted line lowered off rap rings (one length to one anchor). Count implied: single source, unconfirmed.
update routes set pitches = 1 where id = 'wa_pretty_vacant' and pitches = 0;

-- length is empty. Mountain Project: 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_pretty_vacant' and length_m is null;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_pretty_vacant' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one 90 ft line, 7 bolts to a bolted anchor, one 60 m rope to get down (one length to one anchor). Count implied: single source, unconfirmed.
update routes set pitches = 1 where id = 'wa_sonic_reducer' and pitches = 0;

-- length is empty. Mountain Project: 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_sonic_reducer' and length_m is null;

-- bolts is empty. Mountain Project protection: 7 bolts and a bolted anchor (a 2013 comment says the bolts and anchor were modernized). Stated as bolts. Single source.
update routes set bolts = 7 where id = 'wa_sonic_reducer' and bolts is null;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_sonic_reducer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project describes one right-facing corner climb from a flaring thin-hands start; MP's Lamar's Trust page names a Beak! Beak! Beak! anchor at its top (one length to on
update routes set pitches = 1 where id = 'wa_beak_beak_beak' and pitches = 0;

-- guide_stars is empty. The Index guidebook's own entry (publisher's teaser page) rates Beak! Beak! Beak! 2 stars.
update routes set guide_stars = 2 where id = 'wa_beak_beak_beak' and guide_stars is null;

-- gear is empty. Mountain Project: gear to 2 in, with emphasis on thin-hands sizes. Single source (rack).
update routes set gear = array['gear to 2 in','extra thin hands']::text[] where id = 'wa_beak_beak_beak' and gear is null;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_beak_beak_beak' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: crack/corner to a slab, three bolts to a bolted anchor (one length to one anchor); an optional following pitch to the top of the wall is described as a separ
update routes set pitches = 1 where id = 'wa_lamar_s_trust' and pitches = 0;

-- bolts is empty. Mountain Project: pad past three bolts to a bolted anchor. Stated as bolts. Single source.
update routes set bolts = 3 where id = 'wa_lamar_s_trust' and bolts is null;

-- Brief AI/AH: copy the owner-approved State Parks object field for field from wa_godzilla (saved live row): land_manager only, permit stays null. Re-read 2026-11-24: the State Parks boundary layer r
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_lamar_s_trust' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: one leaning dihedral (the rightmost corner of the Dihedral Wall) ending at an anchor on a ledge at the top of the corner; one length to one stance. Count not
update routes set pitches = 1 where id = 'wa_gogum' and pitches = 0;

-- gear is empty. Mountain Project protection: small rack. Single source.
update routes set gear = array['small rack']::text[] where id = 'wa_gogum' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, Mount Rainier NP fee line, Persis/Gunn/Baring note), which names the wrong manager, with the F
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_gogum' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project protection: standard rack to #3. Single source.
update routes set gear = array['standard rack to #3']::text[] where id = 'wa_dihedral_wall_i_ll_be_back' and gear is null;

-- Brief AI: access is null; fill it with the Forks of the Sky State Park object copied field for field from wa_godzilla (owner-approved; read from the saved live row 2026-11-24). Re-read 2026-11-24: 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_dihedral_wall_i_ll_be_back' and access is null;

-- Brief AI: access is null; fill it with the Forks of the Sky State Park object copied field for field from wa_godzilla (owner-approved; read from the saved live row 2026-11-24). Re-read 2026-11-24: 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_dihedral_wall_weevils_walk' and access is null;

-- pitches 0 is invalid. Mountain Project: past two bolts and a short reachy crux, then easier ground to the anchor; one length to one anchor. I'll Be Back's page starts its own pitch from this anchor
update routes set pitches = 1 where id = 'wa_the_terminator' and pitches = 0;

-- Mountain Project: the route climbs past two bolts through a knobby section. Stated as bolts. Single source.
update routes set bolts = 2 where id = 'wa_the_terminator' and bolts is null;

-- Mountain Project: the I'll Be Back page names a bolted anchor atop The Terminator / The Defoliator; the Terminator page photos show the anchor rebuilt with 3/8 in stainless bolts. House spelling "B
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_the_terminator' and anchor is null;

-- gear is empty. Mountain Project protection: small rack. Single source.
update routes set gear = array['small rack']::text[] where id = 'wa_the_terminator' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, Mount Rainier NP fee line, Persis/Gunn/Baring note), which names the wrong manager, with the F
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_the_terminator' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: crack to the roof, traverse left beneath it, easier crack to a ledge with anchor bolts; one length to one stance. Count not stated, so 1 by the one-length ru
update routes set pitches = 1 where id = 'wa_julies_roof' and pitches = 0;

-- Mountain Project: photo caption shows anchor bolts at the top of the route and a commenter reports using them. Stated as bolts. House spelling "Bolted anchor". Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_julies_roof' and anchor is null;

-- gear is empty. Mountain Project protection: gear up to a #3 Camalot. Single source.
update routes set gear = array['gear to #3 Camalot']::text[] where id = 'wa_julies_roof' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, Mount Rainier NP fee line, Persis/Gunn/Baring note), which names the wrong manager, with the F
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_julies_roof' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: a short steep start into a wide dihedral, one short stemming corner that joins Julie's Roof at the top of the corner; one length. Count not stated, so 1 by t
update routes set pitches = 1 where id = 'wa_cup_and_saucer' and pitches = 0;

-- gear is empty. Mountain Project protection: small rack up to 3 in. Single source.
update routes set gear = array['small rack to 3 in']::text[] where id = 'wa_cup_and_saucer' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, Mount Rainier NP fee line, Persis/Gunn/Baring note), which names the wrong manager, with the F
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_cup_and_saucer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid on any row. Mountain Project: easy ground into a corner (5.7) up to the Terminator anchor; the Instigator start (5.8) is just right; I'll Be Back calls this the start pitch. On
update routes set pitches = 1 where id = 'wa_the_defoliator_instigator' and pitches = 0;

-- gear is empty (null-only). Mountain Project protection: small rack. Single source.
update routes set gear = array['small rack']::text[] where id = 'wa_the_defoliator_instigator' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, Mount Rainier NP fee line, Persis/Gunn/Baring note), which names the wrong manager, with the F
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_the_defoliator_instigator' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_slow_children' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- gear is empty. Mountain Project: lots of small cams (nuts fit poorly), a 0.4 Camalot at the start. Single source.
update routes set gear = array['many small cams','0.4 Camalot']::text[] where id = 'wa_slow_children' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_sagittarius' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_model_worker' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_klaus_von_bulow_and_the_algorithm_of_love' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry rates it 2 stars (climb page and Lower Town Wall list); stored null.
update routes set guide_stars = 2 where id = 'wa_klaus_von_bulow_and_the_algorithm_of_love' and guide_stars is null;

-- gear is empty. Mountain Project protection: micro cams to a #1 Camalot, bolts at the top. Single source.
update routes set gear = array['micro cams to #1 Camalot']::text[] where id = 'wa_klaus_von_bulow_and_the_algorithm_of_love' and gear is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_trout_farm_massacre' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry rates it 4 stars (climb page and Lower Town Wall list); stored null.
update routes set guide_stars = 4 where id = 'wa_trout_farm_massacre' and guide_stars is null;

-- gear is empty. Mountain Project protection: cams from a green C3 to a 0.75, doubles 0.2-0.5, small nuts (more to #2 if continuing). Single source.
update routes set gear = array['BD C3 (green) to 0.75 cams','doubles 0.2-0.5','small nuts']::text[] where id = 'wa_trout_farm_massacre' and gear is null;

-- anchor is empty. Mountain Project: stop at the chains on the ledge. House spelling (stored on 100+ routes). Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_trout_farm_massacre' and anchor is null;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_le_grande_bleu' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AH/AI: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Skykomish RD, Northwest Forest Pass, a Mount Rainier NP fee line and an unrelated peaks note) with the owner-approved Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_leaping_lizards_godzilla_p2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. One length from the Godzilla/City Park anchor to the chains (Mountain Project page and the P2 paragraph of the Godzilla page).
update routes set pitches = 1 where id = 'wa_leaping_lizards_godzilla_p2' and pitches = 0;

-- bolts is empty. Mountain Project names three bolts (first after the move right, one in the V-slot with a pin, a third at the final step right) and says to bring 3 draws. Single source; the bolts be
update routes set bolts = 3 where id = 'wa_leaping_lizards_godzilla_p2' and bolts is null;

-- anchor is empty. Mountain Project: stem/mantle to the chains. House spelling. Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_leaping_lizards_godzilla_p2' and anchor is null;

-- SAFETY (brief AI section 3). The stored P1 notes send a leader to clip a bolt at a constriction and traverse to a bolted belay. Mountain Project, the only source for this route, still prints that p
update routes set pitch_detail = array['[object Object]','[object Object]','[object Object]','[object Object]']::text[] where id = 'wa_stamper_holland' and pitch_detail = array['[object Object]','[object Object]','[object Object]','[object Object]']::text[];

-- SAFETY: removes the item describing P1's bolted belay; part of P1 and at least one bolt collapsed in 2013 (same fact as the pitch_detail fix); the collapse warning item stays
update routes set gear = array['Standard double rack of cams covers most of the pro','Triples in the 0.75-inch cam size are worth carrying for the cruxy second pitch','A section of pitch 1 (and at least one of its bolts) collapsed in a 2013 rockfall, so don''t count on the original bolt count matching older topos']::text[] where id = 'wa_stamper_holland' and gear = array['Standard double rack of cams covers most of the pro','Triples in the 0.75-inch cam size are worth carrying for the cruxy second pitch','Pitch 1 climbs a 6-foot-wide chimney for 40 feet before narrowing, with a bolted belay reached via a broken-ledge traverse','A section of pitch 1 (and at least one of its bolts) collapsed in a 2013 rockfall, so don''t count on the original bolt count matching older topos']::text[];

commit;
