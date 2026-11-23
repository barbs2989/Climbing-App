-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project: Trad, 50 ft, one short line from the big ledge atop pitch 1 of Saber or Canary (one length). Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_orange_peel_2' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Single source (theCrag and Wenatchee Outdoors do not list this route); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_orange_peel_2' and length_m is null;

-- Mountain Project protection: a standard rack with plenty of long slings. Single source.
update routes set gear = array['standard rack','long slings']::text[] where id = 'wa_orange_peel_2' and gear is null;

-- access is empty. Copied field for field from the live sibling wa_catapult (identical on wa_smut, wa_damnation_crack and wa_saints). Re-read 2026-11-23: the USFS Castle Rock Trailhead page (updated 
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_orange_peel_2' and access is null;

-- permit is empty. Copied from wa_catapult (same on wa_smut, wa_damnation_crack, wa_saints). USFS Castle Rock Trailhead page, re-read 2026-11-23: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_orange_peel_2' and permit is null;

-- pitches 0 is invalid. Mountain Project states 'Trad, 2 pitches' (bolted anchor atop pitch 1). Wenatchee Outdoors says most Upper Wall West routes run two pitches to the top. MP states the count: lo
update routes set pitches = 2 where id = 'wa_winter_solstice' and pitches = 0;

-- access is empty. Copied field for field from the live sibling wa_catapult (identical on wa_smut, wa_damnation_crack and wa_saints). Re-read 2026-11-23: the USFS Castle Rock Trailhead page (updated 
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_winter_solstice' and access is null;

-- permit is empty. Copied from wa_catapult (same on wa_smut, wa_damnation_crack, wa_saints). USFS Castle Rock Trailhead page, re-read 2026-11-23: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_winter_solstice' and permit is null;

-- pitches 0 is invalid. Mountain Project: Sport, 100 ft, no pitch count; the line began as a 2-pitch aid climb and MP mentions a LOWER 2-bolt anchor added in 2014, so whether the sport line is one pi
update routes set pitches = null where id = 'wa_rainshadow_direct' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_rainshadow_direct' and length_m is null;

-- access is empty. Copied field for field from the live sibling wa_catapult (identical on wa_smut, wa_damnation_crack and wa_saints). Re-read 2026-11-23: the USFS Castle Rock Trailhead page (updated 
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_rainshadow_direct' and access is null;

-- permit is empty. Copied from wa_catapult (same on wa_smut, wa_damnation_crack, wa_saints). USFS Castle Rock Trailhead page, re-read 2026-11-23: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_rainshadow_direct' and permit is null;

-- pitches 0 is invalid. Mountain Project: Trad, 70 ft up the north arete of Jello Tower (one length; Jello Tower routes end on its top). Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_mf_direct' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_mf_direct' and length_m is null;

-- Mountain Project protection: gear to 2 in and some runners. Single source.
update routes set gear = array['gear to 2 in','slings']::text[] where id = 'wa_mf_direct' and gear is null;

-- access is empty. Copied field for field from the live sibling wa_catapult (identical on wa_smut, wa_damnation_crack and wa_saints). Re-read 2026-11-23: the USFS Castle Rock Trailhead page (updated 
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_mf_direct' and access is null;

-- permit is empty. Copied from wa_catapult (same on wa_smut, wa_damnation_crack, wa_saints). USFS Castle Rock Trailhead page, re-read 2026-11-23: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_mf_direct' and permit is null;

-- pitches 0 is invalid. Mountain Project: Trad, 50 ft, a dihedral and finger crack ending at the ledge below Crack of Doom (one length). Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_lucky_charms' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Single source (theCrag and Wenatchee Outdoors do not list it); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_lucky_charms' and length_m is null;

-- Mountain Project protection: gear to 2 in, including some small pieces. Single source.
update routes set gear = array['gear to 2 in','small cams']::text[] where id = 'wa_lucky_charms' and gear is null;

-- access is empty. Copied field for field from the live sibling wa_catapult (identical on wa_smut, wa_damnation_crack and wa_saints). Re-read 2026-11-23: the USFS Castle Rock Trailhead page (updated 
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_lucky_charms' and access is null;

-- permit is empty. Copied from wa_catapult (same on wa_smut, wa_damnation_crack, wa_saints). USFS Castle Rock Trailhead page, re-read 2026-11-23: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_lucky_charms' and permit is null;

-- Stored 0. One 100 ft length that ends at the anchor it shares with the hand crack on its right: a single pitch.
update routes set pitches = 1 where id = 'wa_flying_frog_2' and pitches = 0;

-- MP states 100 ft (30 m).
update routes set length_m = 30 where id = 'wa_flying_frog_2' and length_m is null;

-- MP states gear to 2 in, small cams or nuts for the thin seams.
update routes set gear = array['gear to 2 in','small cams and nuts for thin seams']::text[] where id = 'wa_flying_frog_2' and gear is null;

-- Null access on a Lower Castle route. Copied field for field from wa_catapult (identical on wa_smut, wa_damnation_crack, wa_saints). Re-read the USFS Castle Rock Trailhead page (updated 2026-06-09):
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_flying_frog_2' and access is null;

-- Null permit; copied from wa_catapult. USFS Castle Rock Trailhead page: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_flying_frog_2' and permit is null;

-- Stored 0. One 100 ft length to a bolted anchor: a single pitch.
update routes set pitches = 1 where id = 'wa_amy_carter' and pitches = 0;

-- MP states 100 ft (30 m).
update routes set length_m = 30 where id = 'wa_amy_carter' and length_m is null;

-- MP: bolted anchor left of the crack. House spelling 'Bolted anchor' (stored on 4 WA routes).
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_amy_carter' and anchor is null;

-- MP states a standard rack to 3 in.
update routes set gear = array['standard rack to 3 in']::text[] where id = 'wa_amy_carter' and gear is null;

-- Null access on a Lower Castle route. Copied field for field from wa_catapult (identical on wa_smut, wa_damnation_crack, wa_saints). Re-read the USFS Castle Rock Trailhead page (updated 2026-06-09):
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_amy_carter' and access is null;

-- Null permit; copied from wa_catapult. USFS Castle Rock Trailhead page: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_amy_carter' and permit is null;

-- Stored 0. MP gives one 70 ft length; no source gives more than one pitch.
update routes set pitches = 1 where id = 'wa_idiot_s_journey' and pitches = 0;

-- MP states 70 ft (21 m).
update routes set length_m = 21 where id = 'wa_idiot_s_journey' and length_m is null;

-- MP: standard rack, keep the #2 and #3 for the top-out.
update routes set gear = array['standard rack']::text[] where id = 'wa_idiot_s_journey' and gear is null;

-- Null access on a Lower Castle route. Copied field for field from wa_catapult (identical on wa_smut, wa_damnation_crack, wa_saints). Re-read the USFS Castle Rock Trailhead page (updated 2026-06-09):
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_idiot_s_journey' and access is null;

-- Null permit; copied from wa_catapult. USFS Castle Rock Trailhead page: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_idiot_s_journey' and permit is null;

-- Stored 0. One 100 ft length from below the roof to tree belays at the top: a single pitch.
update routes set pitches = 1 where id = 'wa_bird_s_nest_overhang' and pitches = 0;

-- MP states 100 ft (30 m).
update routes set length_m = 30 where id = 'wa_bird_s_nest_overhang' and length_m is null;

-- MP: no fixed anchors; belay from maple trees or a pine. House spelling 'tree' (stored on 6 WA routes).
update routes set anchor = $q$tree$q$ where id = 'wa_bird_s_nest_overhang' and anchor is null;

-- MP states a standard rack to 3 in.
update routes set gear = array['standard rack to 3 in']::text[] where id = 'wa_bird_s_nest_overhang' and gear is null;

-- Null access on a Lower Castle route. Copied field for field from wa_catapult (identical on wa_smut, wa_damnation_crack, wa_saints). Re-read the USFS Castle Rock Trailhead page (updated 2026-06-09):
update routes set access = $q${"fees":"None.","rules":"Castle Rock is outside designated wilderness. The seasonal raptor closure (April 1 to July 31) covers nearby Midnight and Noontime Rocks, not Castle Rock.","permit":"None needed to climb.","land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","parking_pass":"None. No recreation pass is needed to park at the Castle Rock Trailhead."}$q$::jsonb where id = 'wa_bird_s_nest_overhang' and access is null;

-- Null permit; copied from wa_catapult. USFS Castle Rock Trailhead page: no recreation pass needed to park.
update routes set permit = $q$No recreation pass is needed to park at the Castle Rock Trailhead.$q$ where id = 'wa_bird_s_nest_overhang' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 110 ft length, 10 bolts to a two-chain anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_velvet_elvis' and pitches = 0;

-- Mountain Project protection states 10 bolts to the anchor (bolts, not clips). Single source; theCrag refused the browser (rate limit) and the other open guide does not list the route. locked-1src a
update routes set bolts = 10 where id = 'wa_velvet_elvis' and bolts is null;

-- Mountain Project states 110 ft (33 m). Single source, locked-1src after apply.
update routes set length_m = 33 where id = 'wa_velvet_elvis' and length_m is null;

-- Mountain Project: ends at a two-chain anchor. House spelling 'Chain anchor' (stored on 5 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_velvet_elvis' and anchor is null;

-- access is empty. Copied field for field from the live sibling wa_austrian_slab (same object on wa_sunset_slab_green_velvet). Re-read 2026-11-23: the park page still gives 6:30 a.m. to dusk, closed 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling.","permit":"None needed to climb.","land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_velvet_elvis' and access is null;

-- permit is empty. Copied verbatim from wa_austrian_slab (same on wa_sunset_slab_green_velvet); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_velvet_elvis' and permit is null;

-- pitches 0 is invalid. Mountain Project: past 4 bolts to the rappel anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_booby_vinton' and pitches = 0;

-- Mountain Project states 4 bolts to the rappel anchor (bolts, not clips). The other open guide says only 'bolts'. Single source, locked-1src after apply.
update routes set bolts = 4 where id = 'wa_booby_vinton' and bolts is null;

-- access is empty. Copied field for field from the live sibling wa_austrian_slab (same object on wa_sunset_slab_green_velvet). Re-read 2026-11-23: the park page still gives 6:30 a.m. to dusk, closed 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling.","permit":"None needed to climb.","land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_booby_vinton' and access is null;

-- permit is empty. Copied verbatim from wa_austrian_slab (same on wa_sunset_slab_green_velvet); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_booby_vinton' and permit is null;

-- pitches 0 is invalid. Mountain Project gives 80 ft and 5 bolts but names no anchor or pitch count; the other guide says many Sunset Slab routes have a looser second pitch and adds gear to 3 in for 
update routes set pitches = null where id = 'wa_sunset' and pitches = 0;

-- Mountain Project protection states 5 bolts (bolts, not clips). Single source; the other guide says 'bolts and gear', no count. locked-1src after apply.
update routes set bolts = 5 where id = 'wa_sunset' and bolts is null;

-- Mountain Project states 80 ft (24 m). Single source, locked-1src after apply.
update routes set length_m = 24 where id = 'wa_sunset' and length_m is null;

-- access is empty. Copied field for field from the live sibling wa_austrian_slab (same object on wa_sunset_slab_green_velvet). Re-read 2026-11-23: the park page still gives 6:30 a.m. to dusk, closed 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling.","permit":"None needed to climb.","land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_sunset' and access is null;

-- permit is empty. Copied verbatim from wa_austrian_slab (same on wa_sunset_slab_green_velvet); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_sunset' and permit is null;

-- access is empty. Copied field for field from the live sibling wa_austrian_slab (same object on wa_sunset_slab_green_velvet). Re-read 2026-11-23: the park page still gives 6:30 a.m. to dusk, closed 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling.","permit":"None needed to climb.","land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_austrian_slab_nirvana_ridge' and access is null;

-- permit is empty. Copied verbatim from wa_austrian_slab (same on wa_sunset_slab_green_velvet); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_austrian_slab_nirvana_ridge' and permit is null;

-- access is empty. Copied field for field from the live sibling wa_austrian_slab (same object on wa_sunset_slab_green_velvet). Re-read 2026-11-23: the park page still gives 6:30 a.m. to dusk, closed 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"Closed Nov 1 to Mar 15. Open 6:30 a.m. to dusk; be off the rocks half an hour before closing. No bolting or drilling.","permit":"None needed to climb.","land_manager":"Washington State Parks (Peshastin Pinnacles State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_austrian_slab_wind_cave' and access is null;

-- permit is empty. Copied verbatim from wa_austrian_slab (same on wa_sunset_slab_green_velvet); facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The park is open 6:30 a.m. to dusk and closed Nov 1 to Mar 15; climbers must be off the rocks half an hour before closing, and bolting or drilling is not allowed.$q$ where id = 'wa_austrian_slab_wind_cave' and permit is null;

-- access is empty. Copied field for field from the live object on wa_concord_tower_north_face. Same trailhead: the route starts about 150 ft right of the Hitchhiker on the slabs reached from the base
update routes set access = $q${"fees":"$5/vehicle day-use e-Pass or $30 annual Northwest Forest Pass, purchasable via Recreation.gov","rules":"Leave No Trace; no camping within 0.25 mile of Blue Lake; no stock or mechanized travel on the climbers' path","permit":"No climbing or wilderness permit required","closures":"SR-20 (North Cascades Highway) is gated and closed for winter, typically early-to-mid December through mid-April/May depending on snowpack","seasonal":"WA-20 (North Cascades Highway) closes gate-to-gate roughly early December–mid/late April; the entire Washington Pass corridor is car-inaccessible in winter.","landManager":"Okanogan-Wenatchee National Forest, Methow Valley Ranger District","land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)","parking_pass":"Northwest Forest Pass required at Washington Pass Overlook, Blue Lake, and Cutthroat trailheads — $5/day or $30/annual (America the Beautiful pass also honored).","passRequired":"Northwest Forest Pass or Interagency (America the Beautiful) Pass","overnight_permit":{"url":null,"what":"No overnight permit required","where":"This is general Okanogan-Wenatchee National Forest land outside any wilderness boundary; parties bivy informally at the trailhead or a highway pullout. A Northwest Forest Pass or day-use fee is needed to park, and no camping is allowed within a quarter mile of Blue Lake itself."}}$q$::jsonb where id = 'wa_south_early_winters_spire_nothing' and access is null;

-- permit is empty. Copied from wa_concord_tower_north_face (same trailhead and manager). The USFS Blue Lake Trailhead page states fees only and no permit; the spire is outside any wilderness (USFS la
update routes set permit = $q$No climbing or wilderness permit required; Northwest Forest Pass (or day fee) to park at developed trailheads.$q$ where id = 'wa_south_early_winters_spire_nothing' and permit is null;

commit;
