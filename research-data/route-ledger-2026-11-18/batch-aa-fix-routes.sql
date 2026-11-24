-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project's protection list names one bolt, where the flake turns hollow near the top. Single source: locked-1src after apply.
update routes set bolts = 1 where id = 'wa_mid_wall_douglas_the_furry_grizzly_wolf_kitten_goes_chomp' and bolts is null;

-- Mountain Project: one set of cams from 0.2 to 1 plus the bolt. Single source: locked-1src after apply.
update routes set gear = array['single set of cams 0.2 to 1']::text[] where id = 'wa_mid_wall_douglas_the_furry_grizzly_wolf_kitten_goes_chomp' and gear is null;

-- Brief AA: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_douglas_the_furry_grizzly_wolf_kitten_goes_chomp' and access is null;

-- Mountain Project's protection list names one bolt, at the top. Single source: locked-1src after apply.
update routes set bolts = 1 where id = 'wa_mid_wall_friendly_fredly' and bolts is null;

-- Mountain Project: cams about 0.2 to 1, doubled in finger sizes, and some draws to extend placements. Single source: locked-1src after apply.
update routes set gear = array['cams 0.2 to 1','doubles in finger sizes','quickdraws for extension']::text[] where id = 'wa_mid_wall_friendly_fredly' and gear is null;

-- Brief AA: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_friendly_fredly' and access is null;

-- Mountain Project: singles from 0.3 to 1 plus bolts. Single source: locked-1src after apply.
update routes set gear = array['single cams 0.3 to 1']::text[] where id = 'wa_mid_wall_the_disco_gecko' and gear is null;

-- Brief AA: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_the_disco_gecko' and access is null;

-- Mountain Project states 2 bolts. Single source: locked-1src after apply.
update routes set bolts = 2 where id = 'wa_stig_s_rig' and bolts is null;

-- Mountain Project: one green Alien-sized piece besides the bolts, and the first clip is stick-clipped. Single source: locked-1src after apply.
update routes set gear = array['green Alien-size cam','stick clip']::text[] where id = 'wa_stig_s_rig' and gear is null;

-- Brief AA: replaces the LEGACY object (Mt. Baker-Snoqualmie NF, Northwest Forest Pass, Mount Rainier NP fee line, Persis/Gunn/Baring note), which names the wrong manager, with the owner-approved Sta
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_stig_s_rig' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project's description passes two bolts on the way to the ledge anchor. Single source: locked-1src after apply.
update routes set bolts = 2 where id = 'wa_mid_wall_i_d_rather_be_slowly_consumed_by_moss' and bolts is null;

-- Brief AA: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_i_d_rather_be_slowly_consumed_by_moss' and access is null;

-- Mountain Project states two bolts. Single source: locked-1src after apply.
update routes set bolts = 2 where id = 'wa_mid_wall_smearnov_s_revenge' and bolts is null;

-- Mountain Project: a couple of finger-size cams and a few small nuts besides the bolts. Single source: locked-1src after apply.
update routes set gear = array['two finger-size cams','a few small nuts']::text[] where id = 'wa_mid_wall_smearnov_s_revenge' and gear is null;

-- Brief AA: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_smearnov_s_revenge' and access is null;

-- Brief AA: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_we_shall_continue_with_style' and access is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_mid_wall_behind_the_green_door' and guide_stars is null;

-- Mountain Project: a bolted anchor up and right at the top. House spelling "Bolted anchor" (stored on 11 routes); the bolt count of the anchor is not stated, so not "2-bolt anchor". Single source: l
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_mid_wall_behind_the_green_door' and anchor is null;

-- Mountain Project: a standard rack with TCUs for the upper part. Single source: locked-1src after apply.
update routes set gear = array['standard rack','TCUs']::text[] where id = 'wa_mid_wall_behind_the_green_door' and gear is null;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_behind_the_green_door' and access is null;

-- Mountain Project states two bolts alongside a couple of small cams. Single source (not in the guide's Mid Wall teaser list; theCrag Forbidden): locked-1src after apply.
update routes set bolts = 2 where id = 'wa_mid_wall_keep_that_tuna_away_from_my_batteries' and bolts is null;

-- Mountain Project: a couple of cams, finger size down to 0.1, plus the bolts. Single source: locked-1src after apply.
update routes set gear = array['a few small cams to 0.1']::text[] where id = 'wa_mid_wall_keep_that_tuna_away_from_my_batteries' and gear is null;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_keep_that_tuna_away_from_my_batteries' and access is null;

-- Two independent sources agree on 5.11a: Mountain Project (5.11a) and the Index guidebook's own entry (5.11a). The stored 5.11- is a looser form of the same grade. grade_num stays 11.25 (gradeNumFro
update routes set grade = $q$5.11a$q$ where id = 'wa_stems_valleys' and grade = $q$5.11-$q$;

-- The Index guidebook's own entry (publisher's teaser page) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_stems_valleys' and guide_stars is null;

-- Mountain Project: it finishes at the chains of Robin's Ramp (a shared anchor). House spelling "Chain anchor" (stored on 84 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_stems_valleys' and anchor is null;

-- Mountain Project: nuts, a couple of cams to a #2 and a couple of slings, plus quickdraws for the bolts. Single source: locked-1src after apply.
update routes set gear = array['nuts','a few cams to #2','slings']::text[] where id = 'wa_stems_valleys' and gear is null;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_stems_valleys' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_stems_and_leaves' and access is null;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_flee_fly_flue' and access is null;

-- Mountain Project states 3 bolts plus one small cam for the start. Single source: locked-1src after apply.
update routes set bolts = 3 where id = 'wa_waiting_for_the_sun_2' and bolts is null;

-- Mountain Project: a two-bolt anchor at the top. House spelling "2-bolt anchor" (stored on 258 routes). Single source: locked-1src after apply.
update routes set anchor = $q$2-bolt anchor$q$ where id = 'wa_waiting_for_the_sun_2' and anchor is null;

-- Mountain Project: one small cam (green Alien size) protects the start (small cams also build the belay at the base). Single source: locked-1src after apply.
update routes set gear = array['one small cam for the start']::text[] where id = 'wa_waiting_for_the_sun_2' and gear is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_waiting_for_the_sun_2' and guide_stars is null;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_waiting_for_the_sun_2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief AA: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_dinky_twinkies' and access is null;

-- Brief AA: copy access field for field from wa_sisyphus (read live 2026-11-23, land_manager only). USFS EDW BasicOwnership, queried 2026-11-23 at the crag's own coordinate (48.60994,-120.42992) and 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_aquaman' and access is null;

-- Brief AA: copy access field for field from wa_sisyphus (read live 2026-11-23, land_manager only). USFS EDW BasicOwnership, queried 2026-11-23 at the crag's own coordinate (48.60994,-120.42992) and 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_green_lantern' and access is null;

-- Brief AA: copy access field for field from wa_sisyphus (read live 2026-11-23, land_manager only). USFS EDW BasicOwnership, queried 2026-11-23 at the crag's own coordinate (48.60994,-120.42992) and 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_electra_woman' and access is null;

-- Brief AA: copy access field for field from wa_sisyphus (read live 2026-11-23, land_manager only). USFS EDW BasicOwnership, queried 2026-11-23 at the crag's own coordinate (48.60994,-120.42992) and 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_dyna_girl' and access is null;

-- Brief AA: copy access field for field from wa_sisyphus (read live 2026-11-23, land_manager only). USFS EDW BasicOwnership, queried 2026-11-23 at the crag's own coordinate (48.60994,-120.42992) and 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_robin' and access is null;

-- Brief AA: copy access field for field from wa_sisyphus (read live 2026-11-23, land_manager only). USFS EDW BasicOwnership, queried 2026-11-23 at the crag's own coordinate (48.60994,-120.42992) and 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_fulcrum' and access is null;

-- Mountain Project states chains for the anchor; 'Chain anchor' is the house spelling (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_fulcrum' and anchor is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches (P1 to a belay in a corner under the big upper dihedral). Single source (theCrag Forbidden); locked-1src after apply.
update routes set pitches = 2 where id = 'wa_blownout' and pitches = 0;

-- Mountain Project states 220 ft (67 m). Single source; locked-1src after apply.
update routes set length_m = 67 where id = 'wa_blownout' and length_m is null;

-- Brief AA: copy access and permit field for field from wa_jill_s_thrill (read live 2026-11-23; identical on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: parks.wa.gov Beacon Rock page
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_blownout' and access is null;

-- Brief AA: copy access and permit field for field from wa_jill_s_thrill (read live 2026-11-23; identical on wa_south_face_4_blownout_to_1st_anchor). Re-read 2026-11-23: parks.wa.gov Beacon Rock page
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_blownout' and permit is null;

commit;
