-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project's protection section states 5 bolts plus small gear for the finish. Single source: locked-1src after apply.
update routes set bolts = 5 where id = 'wa_mid_wall_wild_boar' and bolts is null;

-- Mountain Project: small gear supplements the bolts at the top. Single source: locked-1src after apply.
update routes set gear = array['small gear for the finish']::text[] where id = 'wa_mid_wall_wild_boar' and gear is null;

-- The Index guide's own page rates it two stars.
update routes set guide_stars = 2 where id = 'wa_mid_wall_wild_boar' and guide_stars is null;

-- Brief AB: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_wild_boar' and access is null;

-- Mountain Project: protection is thin-finger gear. Single source: locked-1src after apply.
update routes set gear = array['gear for thin fingers']::text[] where id = 'wa_mid_wall_keith_s_crack' and gear is null;

-- The Index guide's own page rates it two stars.
update routes set guide_stars = 2 where id = 'wa_mid_wall_keith_s_crack' and guide_stars is null;

-- Brief AB: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_keith_s_crack' and access is null;

-- Brief AB: replaces the LEGACY object (it names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and Mount Rainier NP, all wrong for this wall) with the owner-approved State Parks object copied fiel
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mw_crack' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 3 bolts. Single source: locked-1src after apply.
update routes set bolts = 3 where id = 'wa_swamp_thang' and bolts is null;

-- Mountain Project describes a chained anchor; house spelling 'Chain anchor' (86 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_swamp_thang' and anchor is null;

-- Mountain Project: wires and small cams, a 0.5 and a #2 for the easy sections, offsets preferred. Single source: locked-1src after apply.
update routes set gear = array['wires','small cams','0.5 and #2 cams for the easier ground','offsets']::text[] where id = 'wa_swamp_thang' and gear is null;

-- Brief AB: replaces the LEGACY object (it names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and Mount Rainier NP, all wrong for this wall) with the owner-approved State Parks object copied fiel
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_swamp_thang' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 6 bolts. Single source: locked-1src after apply.
update routes set bolts = 6 where id = 'wa_mid_wall_seams_alright' and bolts is null;

-- Mountain Project: a bolted anchor with rap rings; house spelling 'Bolted anchor' (12 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_mid_wall_seams_alright' and anchor is null;

-- Mountain Project: one finger piece and small nuts, a small brass nut optional for the last corner. Single source: locked-1src after apply.
update routes set gear = array['a finger-size piece','small nuts','optional small brass nut above the roof']::text[] where id = 'wa_mid_wall_seams_alright' and gear is null;

-- Brief AB: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_seams_alright' and access is null;

-- Brief AB: replaces the LEGACY object (it names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and Mount Rainier NP, all wrong for this wall) with the owner-approved State Parks object copied fiel
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blue_ribbon_variation' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project: chains at the top, rappel from them; house spelling 'Chain anchor'. Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_mid_wall_robin_s_ramp' and anchor is null;

-- Mountain Project: gear to 1 inch. Single source: locked-1src after apply.
update routes set gear = array['gear to 1 in']::text[] where id = 'wa_mid_wall_robin_s_ramp' and gear is null;

-- The Index guide's own page rates it three stars.
update routes set guide_stars = 3 where id = 'wa_mid_wall_robin_s_ramp' and guide_stars is null;

-- Brief AB: fills a null access with the owner-approved State Parks object copied field for field from wa_folsom_blues (read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer retur
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_robin_s_ramp' and access is null;

-- Mountain Project's protection line states two bolts (with small cams). Single source: locked-1src after apply.
update routes set bolts = 2 where id = 'wa_mid_wall_seamstress_access_route' and bolts is null;

-- Brief AB: copy access field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23, land_manager only). Re-read 2026-11-23: the State Parks boundary layer returns Forks of 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_seamstress_access_route' and access is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_mid_wall_all_my_friends_are_aliens' and guide_stars is null;

-- Mountain Project: a bolted anchor fitted with rappel chains at the top. House spelling "Chain anchor" (stored on 86 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_mid_wall_all_my_friends_are_aliens' and anchor is null;

-- Mountain Project: a standard rack to 2 in, extra finger sizes, and brass nuts for the lower seam. Single source: locked-1src after apply.
update routes set gear = array['standard rack to 2 in','extra finger-size cams','small brass nuts']::text[] where id = 'wa_mid_wall_all_my_friends_are_aliens' and gear is null;

-- Brief AB: copy access field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23, land_manager only). Re-read 2026-11-23: the State Parks boundary layer returns Forks of 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_mid_wall_all_my_friends_are_aliens' and access is null;

-- Mountain Project's protection line states 8 bolts. Single source: locked-1src after apply.
update routes set bolts = 8 where id = 'wa_the_gentlemen_s_club_fools_gold' and bolts is null;

-- Mountain Project: chains for the anchor. House spelling "Chain anchor" (stored on 86 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_fools_gold' and anchor is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23, land_manager only; settled in batch AA from the USFS ownership layer). Re-read 2026-11-23 at the cr
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_fools_gold' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23, land_manager only; settled in batch AA from the USFS ownership layer). Re-read 2026-11-23 at the cr
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_wonder_dog' and access is null;

-- Mountain Project's protection line states 7 bolts. Single source: locked-1src after apply.
update routes set bolts = 7 where id = 'wa_the_gentlemen_s_club_que_sera_sera' and bolts is null;

-- Mountain Project: chains for the anchor. House spelling "Chain anchor" (stored on 86 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_que_sera_sera' and anchor is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23, land_manager only; settled in batch AA from the USFS ownership layer). Re-read 2026-11-23 at the cr
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_que_sera_sera' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23, land_manager only; settled in batch AA from the USFS ownership layer). Re-read 2026-11-23 at the cr
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_batman' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23, land_manager only; settled in batch AA from the USFS ownership layer). Re-read 2026-11-23 at the cr
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_flash' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_wonder_woman' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_captain_marvel' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_superman' and access is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_trust_fall' and access is null;

-- Mountain Project's protection field states 3 bolts, and the description gives no other count. Single source: locked-1src after apply.
update routes set bolts = 3 where id = 'wa_the_gentlemen_s_club_trust_fall' and bolts is null;

-- Mountain Project states chains for the anchor; 'Chain anchor' is the house spelling (stored on 64 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_trust_fall' and anchor is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_quo_vadis' and access is null;

-- Mountain Project's protection field states 9 bolts, and the description gives no other count. Single source: locked-1src after apply.
update routes set bolts = 9 where id = 'wa_the_gentlemen_s_club_quo_vadis' and bolts is null;

-- Mountain Project states chains for the anchor; 'Chain anchor' is the house spelling (stored on 64 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_quo_vadis' and anchor is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_ubi_amor_ibi_dolor' and access is null;

-- Mountain Project's protection field states 7 bolts, and the description gives no other count. Single source: locked-1src after apply.
update routes set bolts = 7 where id = 'wa_the_gentlemen_s_club_ubi_amor_ibi_dolor' and bolts is null;

-- Mountain Project states chains for the anchor; 'Chain anchor' is the house spelling (stored on 64 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_ubi_amor_ibi_dolor' and anchor is null;

-- Brief AB: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only; identical on the other five researched Gentlemen's Club row
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_walk_on_the_wild_side' and access is null;

-- Mountain Project's protection field states 4 bolts, and the description gives no other count. Single source: locked-1src after apply.
update routes set bolts = 4 where id = 'wa_the_gentlemen_s_club_walk_on_the_wild_side' and bolts is null;

-- Mountain Project states chains for the anchor; 'Chain anchor' is the house spelling (stored on 64 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_walk_on_the_wild_side' and anchor is null;

commit;
