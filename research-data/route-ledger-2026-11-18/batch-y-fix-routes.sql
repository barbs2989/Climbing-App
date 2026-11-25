-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project: 75 ft, slab and crack then a short off-width onto a ledge with a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after app
update routes set pitches = 1 where id = 'wa_nimble_novice' and pitches = 0;

-- Mountain Project states 75 ft (23 m). Single source, locked-1src after apply.
update routes set length_m = 23 where id = 'wa_nimble_novice' and length_m is null;

-- Mountain Project: two bolts with rap rings, about 5 ft left along the top ledge. House spelling 'Two-bolt anchor' (stored on 5+ routes, incl. wa_slot_machine_3 on this wall). Single source, locked-
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_nimble_novice' and anchor is null;

-- Mountain Project protection: gear up to 5 in (to 2 in on the lower half; the off-width above is hard to protect). Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 5 in']::text[] where id = 'wa_nimble_novice' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_nimble_novice' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_nimble_novice' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 70 ft off-width crack to the cliff top, one length (the follower lowers off a neighbouring anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_extra_action' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_extra_action' and length_m is null;

-- Mountain Project protection: gear to 5 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 5 in']::text[] where id = 'wa_extra_action' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_extra_action' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_extra_action' and permit is null;

-- pitches 0 is invalid. Mountain Project: 90-100 ft of twin cracks to the top, traversing right to the fixed anchor above Ignorant Pursuit (one length to one anchor). Count implied, not stated: uncon
update routes set pitches = 1 where id = 'wa_double_trouble_2' and pitches = 0;

-- Mountain Project states 100 ft (30 m) in the route data (description: 90-100 ft). Single source, locked-1src after apply.
update routes set length_m = 30 where id = 'wa_double_trouble_2' and length_m is null;

-- Mountain Project protection: a standard rack to a #3 Camalot. Rack from MP alone, locked-1src after apply.
update routes set gear = array['cams to #3 Camalot']::text[] where id = 'wa_double_trouble_2' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_double_trouble_2' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_double_trouble_2' and permit is null;

-- pitches 0 is invalid. Mountain Project: a wide corner crack to Talking Heads Ledge (~75 ft), then ~15 ft more of crack to the cliff top and a shared bolt anchor (one length to one anchor). Count im
update routes set pitches = 1 where id = 'wa_too_far_out' and pitches = 0;

-- Mountain Project protection: a shared pair of bolts (added 2025) with steel lower-off carabiners at the top of the upper crack, between Not So Easy and Slot Machine. House spelling 'Two-bolt anchor
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_too_far_out' and anchor is null;

-- Mountain Project protection: gear to 4 in (it adds that bigger pieces help). Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_too_far_out' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_too_far_out' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_too_far_out' and permit is null;

-- pitches 0 is invalid. Mountain Project: 90 ft, a widening crack under a big roof, past it on the left, then wide crack to a pair of chain anchors (one length to one anchor). Count implied, not stat
update routes set pitches = 1 where id = 'wa_ignorant_pursuit' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source, locked-1src after apply.
update routes set length_m = 27 where id = 'wa_ignorant_pursuit' and length_m is null;

-- Mountain Project: a pair of chain anchors at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_ignorant_pursuit' and anchor is null;

-- Mountain Project protection: big gear to 6 in helps past the roof; smaller pieces also fit. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 6 in']::text[] where id = 'wa_ignorant_pursuit' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_ignorant_pursuit' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_ignorant_pursuit' and permit is null;

-- pitches 0 is invalid. Mountain Project describes only a bushy wide crack with good rests and states no length, pitch count or anchor, so one pitch is likely but not stated: null rather than a guess
update routes set pitches = null where id = 'wa_rolling_stone' and pitches = 0;

-- Mountain Project protection: gear to 5 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 5 in']::text[] where id = 'wa_rolling_stone' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_rolling_stone' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_rolling_stone' and permit is null;

-- Mountain Project protection: bolt anchors for top-roping or lowering (count not given), or walk off. House spelling 'Bolted anchor' (stored on 5+ routes, incl. wa_the_arete_acal on this wall). Sing
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_main_face_stopper_popper' and anchor is null;

-- Mountain Project protection: small gear low, bigger (to 2 in) near the top. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_main_face_stopper_popper' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved in batches U-W; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Disc
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_main_face_stopper_popper' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_main_face_stopper_popper' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 70 ft crack to a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_the_cutting_edge' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_the_cutting_edge' and length_m is null;

-- Mountain Project: two bolt anchor. House spelling 'Two-bolt anchor' (stored on many routes). Single source.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_the_cutting_edge' and anchor is null;

-- Mountain Project protection: pro to 3 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_the_cutting_edge' and gear is null;

-- access null. Copied field for field from wa_orange_sunshine (live, owner-approved in batches U-W). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass, or a Vehicle Access Pass 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_the_cutting_edge' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_the_cutting_edge' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 60 ft trad line of ledges (a single 60 ft length). No anchor stated; count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_western_front' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Single source, locked-1src after apply.
update routes set length_m = 18 where id = 'wa_western_front' and length_m is null;

-- Placeholder FA '??' (batch M: a placeholder FA is a fix). Mountain Project also lists the FA as unknown ('??'), so no name is available: null.
update routes set fa = null where id = 'wa_western_front' and fa = $q$??$q$;

-- access null. Copied field for field from wa_orange_sunshine (live, owner-approved in batches U-W). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass, or a Vehicle Access Pass 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_western_front' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_western_front' and permit is null;

-- pitches 0 is invalid. Mountain Project: a corner crack to a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_x_factor' and pitches = 0;

-- Mountain Project: two-bolt anchor. House spelling 'Two-bolt anchor'. Single source.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_x_factor' and anchor is null;

-- Mountain Project protection: gear to 3 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_x_factor' and gear is null;

-- access null. Copied field for field from wa_orange_sunshine (live, owner-approved in batches U-W). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass, or a Vehicle Access Pass 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_x_factor' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_x_factor' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 70 ft crack, lowered off from the anchor to its right (one length). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_cross_eyed_and_painless' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_cross_eyed_and_painless' and length_m is null;

-- Mountain Project protection: gear to 2.5 in, with small pieces kept for the upper corner. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 2.5 in']::text[] where id = 'wa_cross_eyed_and_painless' and gear is null;

-- access null. Copied field for field from wa_orange_sunshine (live, owner-approved in batches U-W). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass, or a Vehicle Access Pass 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_cross_eyed_and_painless' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_cross_eyed_and_painless' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 70 ft bolted arete to a rappel anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_morning_after' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_morning_after' and length_m is null;

-- Mountain Project protection: 8 bolts (stated as bolts). Single source, locked-1src after apply.
update routes set bolts = 8 where id = 'wa_morning_after' and bolts is null;

-- access null. Copied field for field from wa_orange_sunshine (live, owner-approved in batches U-W). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass, or a Vehicle Access Pass 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_morning_after' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_morning_after' and permit is null;

-- access null. Copied field for field from wa_orange_sunshine (live, owner-approved in batches U-W). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass, or a Vehicle Access Pass 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_orange_sunshine_area_thearetical' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_orange_sunshine_area_thearetical' and permit is null;

-- Mountain Project: a standard rack with extra finger sizes. Single source (theCrag Forbidden; not in the guide's Mid Wall teaser list): locked-1src after apply.
update routes set gear = array['standard rack','extra finger-size pieces']::text[] where id = 'wa_avant_gardener' and gear is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_avant_gardener' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_hips_and_valleys' and guide_stars is null;

-- Mountain Project: finger- to fist-sized cams. Single source: locked-1src after apply.
update routes set gear = array['cams finger to fist size']::text[] where id = 'wa_hips_and_valleys' and gear is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_hips_and_valleys' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_plum_pudding' and guide_stars is null;

-- Mountain Project: a two-bolt anchor on top, one-rope rappel. House spelling "2-bolt anchor" (stored on 256 routes). Single source: locked-1src after apply.
update routes set anchor = $q$2-bolt anchor$q$ where id = 'wa_plum_pudding' and anchor is null;

-- Mountain Project: gear to a 0.5 Camalot with extra small (blue and yellow) TCUs. Single source: locked-1src after apply.
update routes set gear = array['gear to 0.5 Camalot','extra small TCUs']::text[] where id = 'wa_plum_pudding' and gear is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_plum_pudding' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_pbr' and guide_stars is null;

-- Mountain Project: gear to 3 in with extra small sizes. Single source: locked-1src after apply.
update routes set gear = array['gear to 3 in','extra small cams']::text[] where id = 'wa_pbr' and gear is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_pbr' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_flippo' and guide_stars is null;

-- Mountain Project's protection line states 4 bolts ("4 quickdraws for the 4 bolts"). Single source: locked-1src after apply.
update routes set bolts = 4 where id = 'wa_flippo' and bolts is null;

-- Mountain Project: finishes at the chained anchor of Robin's Ramp. House spelling "Chain anchor" (stored on 76 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_flippo' and anchor is null;

-- Mountain Project protection list (brass nuts noted as useful for the first clip). Single source: locked-1src after apply.
update routes set gear = array['large cam for the starting hand crack','small wires','4 quickdraws','finger to hand-size cams']::text[] where id = 'wa_flippo' and gear is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_flippo' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_jaded' and guide_stars is null;

-- Mountain Project: chains on top (hung on old carabiners). House spelling "Chain anchor" (76 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_jaded' and anchor is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_jaded' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project: two 1/2 in bolts on a ledge. House spelling "2-bolt anchor" (256 routes). Single source: locked-1src after apply.
update routes set anchor = $q$2-bolt anchor$q$ where id = 'wa_the_lawn_rake' and anchor is null;

-- Mountain Project: small nuts up to a fist-sized cam. Single source: locked-1src after apply.
update routes set gear = array['small nuts to fist-size cam']::text[] where id = 'wa_the_lawn_rake' and gear is null;

-- Brief Y: copy the State Parks object field for field from wa_folsom_blues (same wall, owner-approved; read live 2026-11-23). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the 
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_the_lawn_rake' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

commit;
