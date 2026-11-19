-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- 0 is invalid. MP states 6 pitches (600 ft, Grade II; a 7th short pitch is often soloed). Ledger level unconfirmed: a 2003 trip report counted 7-8 roped pitches by its own belays and forum posts cal
update routes set pitches = 6 where id = 'wa_south_east_corner' and pitches = 0;

-- MP states 600 ft (182 m). Single source (theCrag 403, SummitPost not tried per brief); locked-1src after apply.
update routes set length_m = 182 where id = 'wa_south_east_corner' and length_m is null;

-- MP states Grade II. Single source.
update routes set commitment = $q$II$q$ where id = 'wa_south_east_corner' and commitment is null;

-- Rack empty; MP lists a standard rack of nuts with double cams to 3 in, triples in small sizes for novice leaders. Paragraph, not lockable.
update routes set detailed_rack = $q$Nuts and doubles in cams to 3 in; newer leaders may want a third set of the small cams.$q$ where id = 'wa_south_east_corner' and detailed_rack is null;

-- access is empty. Land manager = Washington State Parks: the Beacon Rock State Park page (WA State Parks and Recreation Commission) states the south and southeast faces close annually Feb 1 and tent
update routes set access = $q${"land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk."}$q$::jsonb where id = 'wa_south_east_corner' and access is null;

-- permit is empty. Same official pages as the access fix (park page re-opened 2026-11-18: July 2026 alert says the south face reopened 7/9/2026). Wording is our own. official-1, expires 2027-11-18.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_east_corner' and permit is null;

-- access is empty. Land manager = Washington State Parks: the Beacon Rock State Park page (WA State Parks and Recreation Commission) states the south and southeast faces close annually Feb 1 and tent
update routes set access = $q${"land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk."}$q$::jsonb where id = 'wa_south_face_4_blownout_to_1st_anchor' and access is null;

-- permit is empty. Same official pages as the access fix (park page re-opened 2026-11-18: July 2026 alert says the south face reopened 7/9/2026). Wording is our own. official-1, expires 2027-11-18.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_blownout_to_1st_anchor' and permit is null;

-- 0 is invalid. MP: 3 pitches (20 m, 18 m, 20 m); chossclimbers 2015 report: '3 mini pitches'. Two independent sources agree (agree-2).
update routes set pitches = 3 where id = 'wa_jill_s_thrill' and pitches = 0;

-- MP states 220 ft (67 m). Single source; locked-1src after apply.
update routes set length_m = 67 where id = 'wa_jill_s_thrill' and length_m is null;

-- MP states Grade II. Single source.
update routes set commitment = $q$II$q$ where id = 'wa_jill_s_thrill' and commitment is null;

-- Rack empty. MP lists a single rack 0.2-#2 with doubles 0.2-0.4 and offset nuts; pitons on P1; bolted anchors at P2 and P3 belays. Paragraph, not lockable.
update routes set detailed_rack = $q$Cams from 0.2 to #2 Camalot with the 0.2-0.4 sizes doubled, plus offset nuts. Some fixed pitons on the first pitch; bolted belays at the top of pitches 2 and 3.$q$ where id = 'wa_jill_s_thrill' and detailed_rack is null;

-- access is empty. Land manager = Washington State Parks: the Beacon Rock State Park page (WA State Parks and Recreation Commission) states the south and southeast faces close annually Feb 1 and tent
update routes set access = $q${"land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk."}$q$::jsonb where id = 'wa_jill_s_thrill' and access is null;

-- permit is empty. Same official pages as the access fix (park page re-opened 2026-11-18: July 2026 alert says the south face reopened 7/9/2026). Wording is our own. official-1, expires 2027-11-18.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_jill_s_thrill' and permit is null;

-- 0 is invalid. MP does not state a count; it gives 125 ft to a bolted anchor and a rappel from it, so one pitch is implied. Ledger level unconfirmed (single-source, implied).
update routes set pitches = 1 where id = 'wa_free_for_all_direct' and pitches = 0;

-- MP states 125 ft (38 m). Single source; locked-1src after apply.
update routes set length_m = 38 where id = 'wa_free_for_all_direct' and length_m is null;

-- Rack empty. MP: gear to 3 in, bolted anchor. Paragraph, not lockable.
update routes set detailed_rack = $q$Gear to 3 in; the belay has a bolted anchor.$q$ where id = 'wa_free_for_all_direct' and detailed_rack is null;

-- access is empty. Land manager = Washington State Parks: the Beacon Rock State Park page (WA State Parks and Recreation Commission) states the south and southeast faces close annually Feb 1 and tent
update routes set access = $q${"land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk."}$q$::jsonb where id = 'wa_free_for_all_direct' and access is null;

-- permit is empty. Same official pages as the access fix (park page re-opened 2026-11-18: July 2026 alert says the south face reopened 7/9/2026). Wording is our own. official-1, expires 2027-11-18.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_free_for_all_direct' and permit is null;

-- Rack empty. MP lists a couple of large nuts, long slings for trees, and #2 and #3 Camalots for the crux. Paragraph, not lockable.
update routes set detailed_rack = $q$Long slings for trees, a few large nuts, and #2 and #3 Camalots for the crux pitch.$q$ where id = 'wa_northwest_face_pioneer_iron_spike_route' and detailed_rack is null;

-- access is empty. Land manager = Washington State Parks: the Beacon Rock State Park page (WA State Parks and Recreation Commission) states the south and southeast faces close annually Feb 1 and tent
update routes set access = $q${"land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass.","fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk."}$q$::jsonb where id = 'wa_northwest_face_pioneer_iron_spike_route' and access is null;

-- permit is empty. Same official pages as the access fix (park page re-opened 2026-11-18: July 2026 alert says the south face reopened 7/9/2026). Wording is our own. official-1, expires 2027-11-18.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_pioneer_iron_spike_route' and permit is null;

-- 0 is invalid. MP: Trad, 2 pitches; Wenatchee Outdoors: most parties climb it in 2 pitches (short first pitch, then the hand crack). agree-2. Ledger after apply: agree-2/locked; evidence: Trad, 2 pi
update routes set pitches = 2 where id = 'wa_givler_s_crack' and pitches = 0;

-- access is empty. USFS basic-ownership layer at the crag (47.54829,-120.74088) = USDA Forest Service, Okanogan-Wenatchee NF; USFS wilderness layer = no wilderness there; the USFS Eightmile Campgroun
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_givler_s_crack' and access is null;

-- 0 is invalid. MP: one 65 ft trad line (no pitch count stated); one pitch is implied, not stated - ledger unconfirmed (single-source).
update routes set pitches = 1 where id = 'wa_bo_derek' and pitches = 0;

-- MP states 65 ft (20 m). Single source (theCrag 403, SummitPost blocked); locked-1src after apply. Ledger after apply: single-source/locked-1src; evidence: Trad, 65 ft (20 m).
update routes set length_m = 20 where id = 'wa_bo_derek' and length_m is null;

-- access is empty. USFS basic-ownership layer at the crag (47.54829,-120.74088) = USDA Forest Service, Okanogan-Wenatchee NF; USFS wilderness layer = no wilderness there; the USFS Eightmile Campgroun
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_bo_derek' and access is null;

-- 0 is invalid. MP: one 50 ft crack to a bolted anchor; one pitch is implied, not stated - ledger unconfirmed. (OSM node 11919016988 tags climbing:pitches=1, but OSM route tags here mirror MP, so not
update routes set pitches = 1 where id = 'wa_classic_crack' and pitches = 0;

-- MP states 50 ft (15 m). Single source; locked-1src after apply. Ledger after apply: single-source/locked-1src; evidence: Trad, 50 ft (15 m).
update routes set length_m = 15 where id = 'wa_classic_crack' and length_m is null;

-- MP protection: standard rack to 2 in, bolted anchor at the top (bolt count not stated). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_classic_crack' and anchor is null;

-- access is empty. USFS basic-ownership layer at the crag (47.55538,-120.77103) = USDA Forest Service, Okanogan-Wenatchee NF; USFS wilderness layer = no wilderness there; the USFS Eightmile Campgroun
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_classic_crack' and access is null;

-- 0 is invalid. MP: 7 pitches; Wenatchee Outdoors (adapted from SummitPost): 7 pitch climb (3.5 if linked). agree-2. Ledger after apply: agree-2/locked; evidence: Sport, 675 ft, 7 pitches | 7 pitch 5
update routes set pitches = 7 where id = 'wa_condorphamine_addiction' and pitches = 0;

-- MP states 675 ft = 205.7 m, rounded 206 (MP prints 205 m). Wenatchee Outdoors/SummitPost give 600 ft for the FACE, not the route, so not a contradiction. locked-1src after apply. Ledger after apply
update routes set length_m = 206 where id = 'wa_condorphamine_addiction' and length_m is null;

-- access is empty. USFS basic-ownership layer at the crag (47.572757,-120.776903) = USDA Forest Service, Okanogan-Wenatchee NF; USFS wilderness layer = no wilderness there; the USFS Eightmile Campgro
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_condorphamine_addiction' and access is null;

-- pitches = 0 is invalid. MP states 3 pitches (P1 5.2, P2 5.7, P3 5.7+), all belays bolted. theCrag gives no count; the Rakkup guide's teaser says it can be done in one super-long pitch (rest paywall
update routes set pitches = 3 where id = 'wa_great_northern_slab' and pitches = 0;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring, NW Forest Pass) - false at Index. State Parks release 2026-03-13: the WCC donated the ~20-acre Lower Town Wall (bou
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_great_northern_slab' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- fa holds the FFA too; split it into ffa (proposed together). MP only.
update routes set fa = $q$Lowell Anderson, Dave Page, Jim Stoddard$q$ where id = 'wa_japanese_gardens_to_1st_anchor' and fa = $q$Lowell Anderson, Dave Page, Jim Stoddard. FFA: Terry Lien, Jon Nelson$q$;

-- Moved out of fa (see above). MP only.
update routes set ffa = $q$Terry Lien, Jon Nelson$q$ where id = 'wa_japanese_gardens_to_1st_anchor' and ffa is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring, NW Forest Pass) - false at Index. State Parks release 2026-03-13: the WCC donated the ~20-acre Lower Town Wall (bou
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_japanese_gardens_to_1st_anchor' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- theCrag: 210 ft (64 m), pitches 45 m + 20 m. MP gives no length. Single source - owner decides.
update routes set length_m = 64 where id = 'wa_princely_ambitions' and length_m is null;

-- MP: one bolt on P1 at the start of the traverse (formerly two). Single source.
update routes set bolts = 1 where id = 'wa_princely_ambitions' and bolts is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring, NW Forest Pass) - false at Index. State Parks release 2026-03-13: the WCC donated the ~20-acre Lower Town Wall (bou
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_princely_ambitions' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches = 0 is invalid. MP calls it 'this short pitch' (40 ft) - one pitch.
update routes set pitches = 1 where id = 'wa_libra_crack' and pitches = 0;

-- MP: Trad, 40 ft (12 m). Single source.
update routes set length_m = 12 where id = 'wa_libra_crack' and length_m is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring, NW Forest Pass) - false at Index. State Parks release 2026-03-13: the WCC donated the ~20-acre Lower Town Wall (bou
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_libra_crack' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- P1 goes free at 5.13 or at C1 (MP: '.13+ or C1'); theCrag also lists 'City Park (aid)' at C1. aid_grade_num 1 (gradeNumFrom('C1','aid')).
update routes set aid_grade = $q$C1$q$ where id = 'wa_city_park' and aid_grade is null;

-- goes with aid_grade C1
update routes set aid_grade_num = 1 where id = 'wa_city_park' and aid_grade_num is null;

-- Stored access is the pasted Mt. Baker-Snoqualmie NF template (Persis/Gunn/Baring, NW Forest Pass) - false at Index. State Parks release 2026-03-13: the WCC donated the ~20-acre Lower Town Wall (bou
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_city_park' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Same Blue Lake trailhead and same NEWS summit as wa_news_nw_corner, whose gain_ft 2372 is locked (agree-2: Mountaineers 2,372 ft, Mazamas 2,200 ft). Lock agree-2 after apply, citing that evidence (
update routes set gain_ft = 2372 where id = 'wa_chockstone_route' and gain_ft = 2350;

-- The stored line is 4 untimed points: the trailhead pin, two made-up points and the old summit pin (Mountain Project's GPS). A line built from pins is removed under the track rules; no recorded or m
update routes set gpx = null where id = 'wa_chockstone_route' and gpx is not null;

-- Majority: North Cascades Mountain Guides, theCrag, climbcanada and Steph Abegg give 5.11a; only Mountain Project gives 5.11-. The row's own grade is already 5.11a (locked here). Lock agree-2 after 
update routes set rock_grade = $q$5.11a$q$ where id = 'wa_the_west_face' and rock_grade = $q$5.11-$q$;

-- Same Blue Lake trailhead and same NEWS summit as wa_news_nw_corner, whose gain_ft 2372 is locked (agree-2: Mountaineers 2,372 ft, Mazamas 2,200 ft). Lock agree-2 after apply, citing that evidence (
update routes set gain_ft = 2372 where id = 'wa_the_west_face' and gain_ft = 2400;

-- The stored line is 3 untimed points that start 1.4 km from the trailhead and end on the old summit pin (Mountain Project's GPS). A line built from pins is removed under the track rules.
update routes set gpx = null where id = 'wa_the_west_face' and gpx is not null;

-- 2,350 ft is 57 ft below the net climb (7,807 ft locked summit - 5,400 ft USFS trailhead): impossible. The route finishes on the SEWS summit from the Blue Lake trailhead, the same as wa_sews_sw_rib 
update routes set gain_ft = 2407 where id = 'wa_boving_roofs' and gain_ft = 2350;

-- permit is empty. Official-1: the USFS Blue Lake Trailhead page lists NW Forest Pass / Interagency / Digital Day Pass ($5/day, $30/yr) and no climbing permit. Same text as the locked Liberty Bell si
update routes set permit = $q$No climbing or wilderness permit required; Northwest Forest Pass (or day fee) to park at developed trailheads.$q$ where id = 'wa_liberty_bell_sidewinder' and permit is null;

commit;
