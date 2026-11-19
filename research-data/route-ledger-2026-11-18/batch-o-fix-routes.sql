-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project states 9 bolts (and 9 quickdraws). Single source (the Index guidebook on Rakkup does not cover the Lower Lump; theCrag bot-checked); locked-1src after apply.
update routes set bolts = 9 where id = 'wa_beetle_bailey_slab_flying_salamanders_short' and bolts is null;

-- Mountain Project: chain anchor at the top. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_beetle_bailey_slab_flying_salamanders_short' and anchor is null;

-- access is empty. Beetle Bailey Slab (OSM crag node 9763591102, 47.81674,-121.57763) and the hillside just west/uphill (47.8170,-121.5782). Official WA State Parks 'Park Boundaries' layer (updated 2
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_beetle_bailey_slab_flying_salamanders_short' and access is null;

-- access is empty. Tiki Heads is the westernmost Lower Lump sector, uphill and left (west) of Beetle Bailey Slab (MP area description; MP GPS not used). Every point tested on that hillside (47.8170,-
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_tiki_heads_yellow_fever' and access is null;

-- bolts empty. MP states 9 bolts (stored detailed_rack already says nine bolts). Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_chunkyard_the_the_deconstructionist' and bolts is null;

-- anchor empty. MP states a 2-bolt anchor set up for lowering. Single source; locked-1src after apply.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_chunkyard_the_the_deconstructionist' and anchor is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; every node of the OSM cliff "Moon Rocks" (way 453131149) and points 500 m east of it fall inside a WDFW-OWNED LAND parcel (Oak Creek, Ob
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_chunkyard_the_the_deconstructionist' and access is null;

-- permit is empty. Same official WDFW pages; same LIVE string as wa_bridger / wa_orange_sunshine. official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_chunkyard_the_the_deconstructionist' and permit is null;

-- access is empty. Every node of the OSM cliff "The Bend" (way 688667624, 46.7165-46.7182 N) falls inside a WDFW-OWNED LAND parcel (Oak Creek, ObjectID 5448, 160.54 ac) in WDFW's DFWOwnedParcels laye
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bend_center_riptide' and access is null;

-- permit is empty. Same official WDFW pages; same LIVE string as wa_bridger / wa_orange_sunshine. official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bend_center_riptide' and permit is null;

-- anchor empty. MP states a bolted anchor with chains. Single source; locked-1src after apply.
update routes set anchor = $q$Bolted anchor with chains$q$ where id = 'wa_bend_center_fat_bastard' and anchor is null;

-- access is empty. Every node of the OSM cliff "The Bend" (way 688667624, 46.7165-46.7182 N) falls inside a WDFW-OWNED LAND parcel (Oak Creek, ObjectID 5448, 160.54 ac) in WDFW's DFWOwnedParcels laye
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bend_center_fat_bastard' and access is null;

-- permit is empty. Same official WDFW pages; same LIVE string as wa_bridger / wa_orange_sunshine. official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bend_center_fat_bastard' and permit is null;

-- anchor empty. MP states a bolted anchor (webbing and two lockers as of Aug 2022). Single source; locked-1src after apply.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_bend_center_stone_archer_1st_pitch_only' and anchor is null;

-- access is empty. Every node of the OSM cliff "The Bend" (way 688667624, 46.7165-46.7182 N) falls inside a WDFW-OWNED LAND parcel (Oak Creek, ObjectID 5448, 160.54 ac) in WDFW's DFWOwnedParcels laye
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bend_center_stone_archer_1st_pitch_only' and access is null;

-- permit is empty. Same official WDFW pages; same LIVE string as wa_bridger / wa_orange_sunshine. official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bend_center_stone_archer_1st_pitch_only' and permit is null;

-- access is empty. Every node of the OSM cliff "The Bend" (way 688667624, 46.7165-46.7182 N) falls inside a WDFW-OWNED LAND parcel (Oak Creek, ObjectID 5448, 160.54 ac) in WDFW's DFWOwnedParcels laye
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bend_center_janet_s_route' and access is null;

-- permit is empty. Same official WDFW pages; same LIVE string as wa_bridger / wa_orange_sunshine. official-1, expires 2027-11-18.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bend_center_janet_s_route' and permit is null;

-- 0 is invalid. One bolted line, 90 ft, to a single anchor below and right of the Stepping Stones anchor; MP does not state a pitch count, so record unconfirmed single-source.
update routes set pitches = 1 where id = 'wa_blm_2' and pitches = 0;

-- Mountain Project: Sport, 90 ft (27 m). Single source (guidebook text paywalled); locked-1src after apply.
update routes set length_m = 27 where id = 'wa_blm_2' and length_m is null;

-- Mountain Project: 10 bolts (12 if finishing on BLM-1). Single source; locked-1src after apply.
update routes set bolts = 10 where id = 'wa_blm_2' and bolts is null;

-- access is empty. Value copied field for field from the live wa_the_big_easy access (same wall, applied in batch N). DNR's Mount Si NRCA page re-read 2026-11-18: managed by DNR South Puget Sound Reg
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_blm_2' and access is null;

-- 0 is invalid. One bolted line, 90 ft, 8 bolts to one anchor; MP does not state a pitch count, so record unconfirmed single-source.
update routes set pitches = 1 where id = 'wa_winter_s_coat_of_armor' and pitches = 0;

-- Mountain Project: Sport, 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_winter_s_coat_of_armor' and length_m is null;

-- Mountain Project: 8 bolts to mussy hooks. Single source; locked-1src after apply.
update routes set bolts = 8 where id = 'wa_winter_s_coat_of_armor' and bolts is null;

-- Mountain Project: bolts lead to mussies (mussy hooks). Single source; locked-1src after apply.
update routes set anchor = $q$Mussy hook anchor$q$ where id = 'wa_winter_s_coat_of_armor' and anchor is null;

-- access is empty. Value copied field for field from the live wa_the_big_easy access (same wall, applied in batch N). DNR's Mount Si NRCA page re-read 2026-11-18: managed by DNR South Puget Sound Reg
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_winter_s_coat_of_armor' and access is null;

-- 0 is invalid. One 90 ft bolted line on the right arete, lowered on a 60 m rope; it has an intermediate lower-off (6 bolts) and a top lower-off (2 more bolts), two stopping points on one pitch, not 
update routes set pitches = 1 where id = 'wa_human_foot' and pitches = 0;

-- Mountain Project: Sport, 90 ft (27 m), needs a 60 m rope. Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_human_foot' and length_m is null;

-- Mountain Project: stainless lower-off biners at each of its two stations. Single source; locked-1src after apply.
update routes set anchor = $q$Stainless lower-off carabiners$q$ where id = 'wa_human_foot' and anchor is null;

-- access is empty. Value copied field for field from the live wa_the_big_easy access (same wall, applied in batch N). DNR's Mount Si NRCA page re-read 2026-11-18: managed by DNR South Puget Sound Reg
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_human_foot' and access is null;

-- 0 is invalid. One 60 ft line, 4 bolts, to one chain anchor; MP does not state a pitch count, so record unconfirmed single-source.
update routes set pitches = 1 where id = 'wa_cranium_teaser' and pitches = 0;

-- Mountain Project: Sport, 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_cranium_teaser' and length_m is null;

-- Mountain Project: 4 bolts. Single source; locked-1src after apply.
update routes set bolts = 4 where id = 'wa_cranium_teaser' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_cranium_teaser' and anchor is null;

-- access is empty. Value copied field for field from the live wa_the_big_easy access (same wall, applied in batch N). DNR's Mount Si NRCA page re-read 2026-11-18: managed by DNR South Puget Sound Reg
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_cranium_teaser' and access is null;

-- 0 is invalid. One 60 ft line to one chain anchor (6 draws from the ground); MP does not state a pitch count, so record unconfirmed single-source.
update routes set pitches = 1 where id = 'wa_stumblesome_fridge' and pitches = 0;

-- Mountain Project: Sport, 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_stumblesome_fridge' and length_m is null;

-- Mountain Project: chains at the anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_stumblesome_fridge' and anchor is null;

-- access is empty. Value copied field for field from the live wa_the_big_easy access (same wall, applied in batch N). DNR's Mount Si NRCA page re-read 2026-11-18: managed by DNR South Puget Sound Reg
update routes set access = $q${"fees":null,"rules":"Dogs must be on a leash.","permit":"None needed to climb.","land_manager":"Washington State Department of Natural Resources (Mount Si Natural Resources Conservation Area, South Puget Sound Region)","parking_pass":"A Discover Pass is required to park at the Little Si Trailhead."}$q$::jsonb where id = 'wa_stumblesome_fridge' and access is null;

-- 0 is invalid. MP: Trad, 60 ft; one finger crack from the overhang start to an anchor. One pitch is implied, not stated: ledger after apply unconfirmed, single-source.
update routes set pitches = 1 where id = 'wa_z_crack_2' and pitches = 0;

-- length_m is empty. MP states 60 ft (18 m). theCrag answers Forbidden in Chrome; Wenatchee Outdoors has no Alphabet Rock page. MP-alone length: locked-1src (single-source) after apply.
update routes set length_m = 18 where id = 'wa_z_crack_2' and length_m is null;

-- access is empty. Copies field for field the live object on the Icicle siblings wa_givler_s_crack / wa_bo_derek / wa_classic_crack (batch K). Re-checked 2026-11-18: USFS basic-ownership layer at the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_z_crack_2' and access is null;

-- 0 is invalid. MP: Trad, 60 ft; one right-leaning hand crack jammed to the top. One pitch is implied, not stated: ledger after apply unconfirmed, single-source.
update routes set pitches = 1 where id = 'wa_dogleg_crack' and pitches = 0;

-- length_m is empty. MP states 60 ft (18 m). theCrag answers Forbidden in Chrome; Wenatchee Outdoors has no Alphabet Rock page. MP-alone length: locked-1src (single-source) after apply.
update routes set length_m = 18 where id = 'wa_dogleg_crack' and length_m is null;

-- access is empty. Copies field for field the live object on the Icicle siblings wa_givler_s_crack / wa_bo_derek / wa_classic_crack (batch K). Re-checked 2026-11-18: USFS basic-ownership layer at the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_dogleg_crack' and access is null;

-- 0 is invalid. MP: a crack right of Meat Grinder, over a bulge to a ledge, then a finger traverse left that joins the top of Meat Grinder; one short line, no length given. One pitch is implied, not 
update routes set pitches = 1 where id = 'wa_alphabet_soup' and pitches = 0;

-- access is empty. Copies field for field the live object on the Icicle siblings wa_givler_s_crack / wa_bo_derek / wa_classic_crack (batch K). Re-checked 2026-11-18: USFS basic-ownership layer at the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_alphabet_soup' and access is null;

-- 0 is invalid. MP: Trad/TR, 70 ft; crack to a hanging arete to the top, anchors on top. One pitch is implied, not stated: ledger after apply unconfirmed, single-source.
update routes set pitches = 1 where id = 'wa_jaws_of_life' and pitches = 0;

-- length_m is empty. MP states 70 ft (21 m). theCrag answers Forbidden in Chrome; Wenatchee Outdoors has no Alphabet Rock page. MP-alone length: locked-1src (single-source) after apply.
update routes set length_m = 21 where id = 'wa_jaws_of_life' and length_m is null;

-- access is empty. Copies field for field the live object on the Icicle siblings wa_givler_s_crack / wa_bo_derek / wa_classic_crack (batch K). Re-checked 2026-11-18: USFS basic-ownership layer at the
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District)","rules":"The crag is outside designated wilderness."}$q$::jsonb where id = 'wa_jaws_of_life' and access is null;

commit;
