-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project states 7 pitches and lists all seven (70, 55, 30, 20, 50, 30, 30 m); the first ascensionist's own post on the same site says six new pitches plus one shared w
update routes set pitches = 7 where id = 'wa_afterburner' and pitches = 0;

-- length_m is empty. Mountain Project states Trad, 800 ft (242 m). MP alone may set length (locked-1src); no second publisher lists the route (theCrag's Snow Creek Wall list has no Afterburner).
update routes set length_m = 242 where id = 'wa_afterburner' and length_m is null;

-- gear is empty. Mountain Project's protection: doubles in the tips, doubles from about 0.3 to 2 in, wires, roughly 12-14 draws (the 70 m rope is left out: gear never holds a rope). Rack from MP alon
update routes set gear = array['double small cams (tips)','double cams 0.3 to 2 in','nuts','12-14 quickdraws']::text[] where id = 'wa_afterburner' and gear is null;

-- access is empty. Copied field for field from the live object on wa_rpm (identical on wa_snow_creek_wall_grand_arch). Re-read 2026-11-23: the USFS Snow Lakes Trailhead page (updated 2026-08-04) stil
update routes set access = $q${"fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail.","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","land_manager":"Okanogan-Wenatchee National Forest","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead."}$q$::jsonb where id = 'wa_afterburner' and access is null;

-- permit is empty. Copied word for word from the live permit on wa_rpm (same on wa_snow_creek_wall_grand_arch); the USFS Snow Lakes Trailhead page re-read 2026-11-23 states the same fee, passes and f
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_afterburner' and permit is null;

-- access is empty. Copied field for field from the live object on wa_rpm (identical on wa_snow_creek_wall_grand_arch). Re-read 2026-11-23: the USFS Snow Lakes Trailhead page (updated 2026-08-04) stil
update routes set access = $q${"fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail.","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","land_manager":"Okanogan-Wenatchee National Forest","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead."}$q$::jsonb where id = 'wa_snow_creek_wall_easter_tower' and access is null;

-- permit is empty. Copied word for word from the live permit on wa_rpm (same on wa_snow_creek_wall_grand_arch); the USFS Snow Lakes Trailhead page re-read 2026-11-23 states the same fee, passes and f
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_snow_creek_wall_easter_tower' and permit is null;

-- access is empty. Copied field for field from the live object on wa_rpm (identical on wa_snow_creek_wall_grand_arch). Re-read 2026-11-23: the USFS Snow Lakes Trailhead page (updated 2026-08-04) stil
update routes set access = $q${"fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail.","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","land_manager":"Okanogan-Wenatchee National Forest","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead."}$q$::jsonb where id = 'wa_snow_creek_wall_poodle_with_a_mohawk' and access is null;

-- permit is empty. Copied word for word from the live permit on wa_rpm (same on wa_snow_creek_wall_grand_arch); the USFS Snow Lakes Trailhead page re-read 2026-11-23 states the same fee, passes and f
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_snow_creek_wall_poodle_with_a_mohawk' and permit is null;

-- access is empty. Copied field for field from the live object on wa_rpm (identical on wa_snow_creek_wall_grand_arch). Re-read 2026-11-23: the USFS Snow Lakes Trailhead page (updated 2026-08-04) stil
update routes set access = $q${"fees":"$5 a day or $30 a year to park.","rules":"The wall lies in the Alpine Lakes Wilderness. Dogs are not allowed on the Snow Lakes Trail.","permit":"A free self-issued day-use wilderness permit, filled out at the Snow Lakes Trailhead.","land_manager":"Okanogan-Wenatchee National Forest","parking_pass":"$5 per vehicle per day ($30 a year), or a Northwest Forest Pass or interagency pass, at the Snow Lakes Trailhead."}$q$::jsonb where id = 'wa_snow_creek_wall_umbrella_tree' and access is null;

-- permit is empty. Copied word for word from the live permit on wa_rpm (same on wa_snow_creek_wall_grand_arch); the USFS Snow Lakes Trailhead page re-read 2026-11-23 states the same fee, passes and f
update routes set permit = $q$Park at the Snow Lakes Trailhead with the $5 day-use fee, a Northwest Forest Pass or an interagency pass, and fill out the free self-issued day-use wilderness permit there.$q$ where id = 'wa_snow_creek_wall_umbrella_tree' and permit is null;

-- access is empty. Copied field for field from wa_concord_tower_north_face (live, researched). Same tower and same trailhead: the AAJ report starts the route in the Concord-Lexington gully and calls 
update routes set access = $q${"fees":"$5/vehicle day-use e-Pass or $30 annual Northwest Forest Pass, purchasable via Recreation.gov","rules":"Leave No Trace; no camping within 0.25 mile of Blue Lake; no stock or mechanized travel on the climbers' path","permit":"No climbing or wilderness permit required","closures":"SR-20 (North Cascades Highway) is gated and closed for winter, typically early-to-mid December through mid-April/May depending on snowpack","seasonal":"WA-20 (North Cascades Highway) closes gate-to-gate roughly early December–mid/late April; the entire Washington Pass corridor is car-inaccessible in winter.","landManager":"Okanogan-Wenatchee National Forest, Methow Valley Ranger District","land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)","parking_pass":"Northwest Forest Pass required at Washington Pass Overlook, Blue Lake, and Cutthroat trailheads — $5/day or $30/annual (America the Beautiful pass also honored).","passRequired":"Northwest Forest Pass or Interagency (America the Beautiful) Pass","overnight_permit":{"url":null,"what":"No overnight permit required","where":"This is general Okanogan-Wenatchee National Forest land outside any wilderness boundary; parties bivy informally at the trailhead or a highway pullout. A Northwest Forest Pass or day-use fee is needed to park, and no camping is allowed within a quarter mile of Blue Lake itself."}}$q$::jsonb where id = 'wa_up_in_arms' and access is null;

-- permit is empty. Copied from wa_concord_tower_north_face, where this exact string is locked official-1 (batch D, expires 2027-11-18). The USFS Blue Lake Trailhead page re-read 2026-11-23 names only
update routes set permit = $q$No climbing or wilderness permit required; Northwest Forest Pass (or day fee) to park at developed trailheads.$q$ where id = 'wa_up_in_arms' and permit is null;

-- The FA party's AAJ report states three protection bolts were added (plus one bolted anchor). MP mentions bolts but gives no count. Single source (not MP): unconfirmed after apply. Stored pitch_deta
update routes set bolts = 3 where id = 'wa_up_in_arms' and bolts is null;

-- pitches 0 is invalid. Mountain Project: a two-bolt route, 2 bolts to anchors, no pitch count (single length to one anchor). Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_romancing_the_stone' and pitches = 0;

-- Mountain Project protection: 2 bolts to anchors; description calls it a two-bolt route (bolts, not clips). Single source (no second publisher lists Minnehaha: theCrag has no entry, rockclimbing.com
update routes set bolts = 2 where id = 'wa_romancing_the_stone' and bolts is null;

-- access is empty. Copied field for field from the live sibling wa_main_crack (same object on wa_z_crack and wa_the_dihedral_3, batch I). Re-read 2026-11-23: the county's Shields Park project page na
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_romancing_the_stone' and access is null;

-- pitches 0 is invalid. Mountain Project: Trad, 30 ft (9 m), no pitch count: one short length. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_dog_food' and pitches = 0;

-- Mountain Project states 30 ft (9 m). Single source (no other publisher lists Minnehaha routes online); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_dog_food' and length_m is null;

-- access is empty. Copied field for field from the live sibling wa_main_crack (same object on wa_z_crack and wa_the_dihedral_3, batch I). Re-read 2026-11-23: the county's Shields Park project page na
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_dog_food' and access is null;

-- pitches 0 is invalid. Mountain Project: a fully bolted line up a bulge left of the Smokey Overhang roof onto an easy slab, no pitch count, on a wall of about 70 ft. Implied, not stated: unconfirmed
update routes set pitches = 1 where id = 'wa_mad_dog' and pitches = 0;

-- access is empty. Copied field for field from the live sibling wa_main_crack (same object on wa_z_crack and wa_the_dihedral_3, batch I). Re-read 2026-11-23: the county's Shields Park project page na
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_mad_dog' and access is null;

-- pitches 0 is invalid, and no source now describes this route (see notes), so no count can be stated.
update routes set pitches = null where id = 'wa_dihedral_arete' and pitches = 0;

-- access is empty. Copied field for field from the live sibling wa_main_crack (same object on wa_z_crack and wa_the_dihedral_3, batch I). Re-read 2026-11-23: the county's Shields Park project page na
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_dihedral_arete' and access is null;

-- pitches 0 is invalid, and no source has a page for this route (see notes), so no count can be stated.
update routes set pitches = null where id = 'wa_tar_babies' and pitches = 0;

-- access is empty. Copied field for field from the live sibling wa_main_crack (same object on wa_z_crack and wa_the_dihedral_3, batch I). Re-read 2026-11-23: the county's Shields Park project page na
update routes set access = $q${"land_manager":"Spokane County Parks, Recreation & Golf (John H. Shields Park, the county-owned part of the Beacon Hill recreation area)"}$q$::jsonb where id = 'wa_tar_babies' and access is null;

-- Mountain Project protection field: '5 bolts to lower-off stainless carabiners' (bolts, one count). Single source: theCrag was rate-limited (redirected) in Chrome and no guidebook page lists Little 
update routes set bolts = 5 where id = 'wa_little_dishman_30_feet_of_fury' and bolts is null;

-- Mountain Project protection field: 'Three protection and two anchor bolts' (bolts, one count). Single source: theCrag was rate-limited (redirected) in Chrome and no guidebook page lists Little Dish
update routes set bolts = 3 where id = 'wa_little_dishman_dad_club' and bolts is null;

-- Mountain Project: three protection bolts and two anchor bolts (the anchor bolts sit over the edge). House spelling 'Two-bolt anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_little_dishman_dad_club' and anchor is null;

-- Mountain Project protection field: '2 bolts to lower-off hooks' (bolts, one count). Single source: theCrag was rate-limited (redirected) in Chrome and no guidebook page lists Little Dishman; locked
update routes set bolts = 2 where id = 'wa_little_dishman_ants_in_your_pants' and bolts is null;

-- Mountain Project protection field: '5 bolts to lower-off stainless carabiners; anchor shared with The Price is Right' (bolts, one count). Single source: theCrag was rate-limited (redirected) in Chr
update routes set bolts = 5 where id = 'wa_little_dishman_bargain_hunter' and bolts is null;

-- Mountain Project protection field: '5 bolts to lower-off stainless carabiners' (bolts, one count). Single source: theCrag was rate-limited (redirected) in Chrome and no guidebook page lists Little 
update routes set bolts = 5 where id = 'wa_little_dishman_earth_day_boogie' and bolts is null;

commit;
