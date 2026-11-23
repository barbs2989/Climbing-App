-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Two independent publishers give Grade IV: Mountain Project (Grade IV) and the Voodoo Wall first ascensionist's own page (IV 5.10b A2+). agree-2 after apply.
update routes set commitment = $q$IV$q$ where id = 'wa_witch_doctor_wall_solaris' and commitment is null;

-- Mountain Project: 8 pitches; a 2010 CascadeClimbers trip report on Witch Doctor Wall: 'Sunday Cruise 5.9 8P'. Two independent publishers agree; agree-2 after apply.
update routes set pitches = 8 where id = 'wa_witch_doctor_wall_sunday_cruise' and pitches is null;

-- Mountain Project states 1000 ft (303 m); stored as 305 m to match the house convention for 1000 ft on this wall (Thunder Road, Checkered Demon, Witch Doctor Route). Single source, locked-1src after
update routes set length_m = 305 where id = 'wa_witch_doctor_wall_sunday_cruise' and length_m is null;

-- pitches 0 is invalid. Mountain Project: a single crack line to a fixed top anchor (Mussy hooks), no pitch count or length stated; the guide lists one climb. One length to one anchor, implied not st
update routes set pitches = 1 where id = 'wa_folsom_blues' and pitches = 0;

-- The Index guidebook's own entry (publisher's teaser page) rates it three stars.
update routes set guide_stars = 3 where id = 'wa_folsom_blues' and guide_stars is null;

-- pitches 0 is invalid. Mountain Project: rappel in from a 2-bolt anchor to a treed ledge, then one 110 ft trad length back up (one length to one anchor). Count implied, not stated: unconfirmed after
update routes set pitches = 1 where id = 'wa_number_9' and pitches = 0;

-- Mountain Project states 110 ft (33 m). Single source (theCrag Forbidden; the guide has no stand-alone entry). locked-1src after apply.
update routes set length_m = 33 where id = 'wa_number_9' and length_m is null;

-- Stored trad; both independent publishers list it as sport: Mountain Project (Sport, 100 ft; a discontinuous bolted finger crack, fixed anchors, lowers on a 60 m rope) and the Index guide's own entr
update routes set discipline = $q$sport$q$ where id = 'wa_twelve_gauge_iq' and discipline = $q$trad$q$;

-- pitches 0 is invalid. Mountain Project: one 100 ft length to fixed anchors, lowered on a 60 m rope. MP lists a separate 'Open Project: 12 Gauge IQ P2' above, which is an unclimbed project, not part
update routes set pitches = 1 where id = 'wa_twelve_gauge_iq' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source. locked-1src after apply.
update routes set length_m = 30 where id = 'wa_twelve_gauge_iq' and length_m is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it four stars.
update routes set guide_stars = 4 where id = 'wa_twelve_gauge_iq' and guide_stars is null;

-- pitches 0 is invalid. Mountain Project: one bolted length that heads toward Written in Stone's bolts, then breaks right to the anchor it shares with Blues Riff (one length to one anchor). Count imp
update routes set pitches = 1 where id = 'wa_etch_a_sketch' and pitches = 0;

-- Stored 1; the Index guidebook's own entry (publisher's teaser page, both the route page and the Blues Cliff list) rates it two stars.
update routes set guide_stars = 2 where id = 'wa_etch_a_sketch' and guide_stars = 1;

-- pitches 0 is invalid. Mountain Project: one 80 ft bolted slab length to a fixed anchor, descended on a 60 m rope. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_written_in_stone' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source. locked-1src after apply.
update routes set length_m = 24 where id = 'wa_written_in_stone' and length_m is null;

-- Mountain Project states 5 bolts. Single source (theCrag's sector page does not list this route; theCrag then answered Forbidden); locked-1src after apply.
update routes set bolts = 5 where id = 'wa_f_phun_rock_main_wall_sunbug_slab_exodus_to_lilliput' and bolts is null;

-- fa empty. Two publishers name Bryan Burdo as first ascensionist (no year on either): Mountain Project and theCrag. House spelling 'Bryan Burdo' already stored on sibling rows (e.g. wa_pygmalion). C
update routes set fa = $q$Bryan Burdo$q$ where id = 'wa_f_phun_rock_main_wall_sunbug_slab_pothole_panhandler' and fa is null;

-- fa empty. Mountain Project and theCrag both name Bryan Burdo (no year). House spelling as on sibling rows. Same independence caveat as Pothole Panhandler.
update routes set fa = $q$Bryan Burdo$q$ where id = 'wa_f_phun_rock_main_wall_sunbug_slab_invasive_species' and fa is null;

-- Mountain Project states 7 bolts. Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_f_phun_rock_main_wall_sunbug_slab_jam_sandwich' and bolts is null;

-- Mountain Project: chain anchors. House spelling 'Chain anchor' (stored on 51 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_f_phun_rock_main_wall_sunbug_slab_jam_sandwich' and anchor is null;

-- pitches 0 is invalid. Three independent publishers give 6 pitches: Mountain Project (Trad, 500 ft, 6 pitches), Steph Abegg's trip page (6 pitches, 5.11-) and a 2012 CascadeClimbers trip report (pit
update routes set pitches = 6 where id = 'wa_snake_charmer' and pitches = 0;

-- pitches 0 is invalid. Mountain Project: 800 ft, 7 pitches, with a grade for each of P1-P7. The first-ascent party's own page describes 6 pitches and says the last one was later split in two, which 
update routes set pitches = 7 where id = 'wa_voodoo_wall' and pitches = 0;

-- Mountain Project gives Grade IV; the first-ascent party's own page grades it IV 5.10 A2. agree-2. 'IV' is the house form (112 routes).
update routes set commitment = $q$IV$q$ where id = 'wa_voodoo_wall' and commitment is null;

-- Mountain Project states 800 ft (242 m). Single source (theCrag and SummitPost refused in the browser; the FA page gives no total). locked-1src after apply.
update routes set length_m = 242 where id = 'wa_voodoo_wall' and length_m is null;

-- Mountain Project: bolted chain belays. House spelling 'Chain anchor' (60 routes). The FA page confirms drilled belay anchors. Single source for the chains, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_voodoo_wall' and anchor is null;

-- pitches 0 is invalid, and the count is disputed: Mountain Project says 10 pitches (1100 ft), which counts three approach pitches added in 2014 up the West Slabs; Steph Abegg counts the 7 pitches of
update routes set pitches = null where id = 'wa_ancient_melodies' and pitches = 0;

-- Mountain Project: belays are chained. Abegg: bolted rappel anchors. House spelling 'Chain anchor' (60 routes). Chains stated by one source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_ancient_melodies' and anchor is null;

-- pitches 0 is invalid. Mountain Project: Trad, 900 ft, 8 pitches, with a grade for each of P1-P8 ending at Blueberry Terrace, plus three optional 'bonus' pitches to the summit. Single source (theCra
update routes set pitches = 8 where id = 'wa_dark_rhythm' and pitches = 0;

-- Mountain Project states 900 ft (273 m) for the 8 pitches. Single source, locked-1src after apply.
update routes set length_m = 273 where id = 'wa_dark_rhythm' and length_m is null;

-- Mountain Project: each pitch ends at chains (Fixe rap chains). House spelling 'Chain anchor' (60 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_dark_rhythm' and anchor is null;

-- pitches 0 is invalid. Mountain Project: Trad, 1000 ft, 8 pitches, Grade III. Single source (theCrag and SummitPost refused in the browser; no other publisher found). locked-1src after apply.
update routes set pitches = 8 where id = 'wa_jacobs_ladder_5_10b_a_1_or_5_11b' and pitches = 0;

-- Mountain Project states 1000 ft (303 m). Single source, locked-1src after apply.
update routes set length_m = 303 where id = 'wa_jacobs_ladder_5_10b_a_1_or_5_11b' and length_m is null;

-- 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_folsom_blues' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_number_9' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_twelve_gauge_iq' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_etch_a_sketch' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_written_in_stone' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_witch_doctor_wall_solaris' and access is null;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_witch_doctor_wall_checkered_demon' and access is null;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_witch_doctor_wall_the_witch_doctor_route' and access is null;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_witch_doctor_wall_orange_blossom_special' and access is null;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_witch_doctor_wall_sunday_cruise' and access is null;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_snake_charmer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_voodoo_wall' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_ancient_melodies' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_dark_rhythm' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- 
update routes set access = $q${"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_jacobs_ladder_5_10b_a_1_or_5_11b' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

commit;
