-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_behind_the_tombstone' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- MP gives one length to one anchor and no pitch count; single pitch is clear, so 0 → 1 (level unconfirmed: count implied, not stated).
update routes set pitches = 1 where id = 'wa_behind_the_tombstone' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Single source (theCrag 403 even in Chrome); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_behind_the_tombstone' and length_m is null;

-- Mountain Project states 6 bolts. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_behind_the_tombstone' and bolts is null;

-- Mountain Project: chains with Mussy hooks. Single source; locked-1src after apply.
update routes set anchor = $q$Chains with Mussy hooks$q$ where id = 'wa_behind_the_tombstone' and anchor is null;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_ride_the_lightning' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 4 pitches (300 ft). Single source; locked-1src after apply.
update routes set pitches = 4 where id = 'wa_ride_the_lightning' and pitches = 0;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_index_archeology' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- MP gives one length to one anchor and no pitch count; single pitch is clear, so 0 → 1 (level unconfirmed: count implied, not stated).
update routes set pitches = 1 where id = 'wa_index_archeology' and pitches = 0;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_cupcake_2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 2 pitches (100 ft). Single source; locked-1src after apply.
update routes set pitches = 2 where id = 'wa_cupcake_2' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_cupcake_2' and length_m is null;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_metal' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- MP gives one length to one anchor and no pitch count; single pitch is clear, so 0 → 1 (level unconfirmed: count implied, not stated).
update routes set pitches = 1 where id = 'wa_metal' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_metal' and length_m is null;

-- Mountain Project states 7 bolts (plus 2 fixed pitons). Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_metal' and bolts is null;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_everything_hertz' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 2 pitches (140 ft). Single source; locked-1src after apply.
update routes set pitches = 2 where id = 'wa_everything_hertz' and pitches = 0;

-- Mountain Project states 140 ft (42 m). Single source; locked-1src after apply.
update routes set length_m = 42 where id = 'wa_everything_hertz' and length_m is null;

-- Templated access names Mt. Baker-Snoqualmie NF, a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). Beetle Bailey Slab (OSM crag node 9763591102) and the hillside above it fall insi
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_flying_salamanders_full' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project: 100 ft, continue past the first anchor to the top on a 70 m rope; one length to one top anchor, no pitch count stated. 0 → 1 (unconfirmed).
update routes set pitches = 1 where id = 'wa_flying_salamanders_full' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_flying_salamanders_full' and length_m is null;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_smilodon_fatalis' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- One 70 ft sport lead to an anchor (MP); the Mosasaurus page starts its own pitch from the Smilodon anchor, so this row is one pitch. Ledger after apply: unconfirmed, single-source (count implied, n
update routes set pitches = 1 where id = 'wa_smilodon_fatalis' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_smilodon_fatalis' and length_m is null;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_racer_x' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 3 pitches (P1 5.7 ramp to a bolted belay, P2 5.10a knobby slab, P3 short 5.9+ arch). Single source; locked-1src after apply.
update routes set pitches = 3 where id = 'wa_racer_x' and pitches = 0;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_hedge_trimmer' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- One 50 ft trad lead that shares the Flying Salamanders (Short) anchor (MP): one length to one anchor. Ledger after apply: unconfirmed, single-source (count implied, not stated).
update routes set pitches = 1 where id = 'wa_hedge_trimmer' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Single source; locked-1src after apply.
update routes set length_m = 15 where id = 'wa_hedge_trimmer' and length_m is null;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_michal_s_5_5_5_8' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. No source found for this route at all (see notes), so no pitch count can be stated: null.
update routes set pitches = null where id = 'wa_michal_s_5_5_5_8' and pitches = 0;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_larry_s_gaily_colored_lycra' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- One 65 ft trad pitch from the first Beetle Bailey anchor up to the Beetle Bailey anchor (MP): one length to one anchor.
update routes set pitches = 1 where id = 'wa_larry_s_gaily_colored_lycra' and pitches = 0;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_beetle_bailey_p2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- One 100 ft trad pitch straight up from the Beetle Bailey P1 anchor (MP).
update routes set pitches = 1 where id = 'wa_beetle_bailey_p2' and pitches = 0;

-- Wrong template: names Mt. Baker-Snoqualmie NF and a Northwest Forest Pass. Beetle Bailey Slab lies inside Forks of the Sky State Park: the official WA State Parks Park Boundaries layer returns 'For
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_36_volts_to_anywhere' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Mountain Project states 3 pitches. Single source; locked-1src after apply.
update routes set pitches = 3 where id = 'wa_36_volts_to_anywhere' and pitches = 0;

-- Mountain Project states 180 ft (55 m). Single source; locked-1src after apply.
update routes set length_m = 55 where id = 'wa_36_volts_to_anywhere' and length_m is null;

-- access holds a template naming Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). No Forest Service land is involved: the USFS BasicOwnershi
update routes set access = null where id = 'wa_a_good_first_trad_climb' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP: Trad, one 50 ft line; no pitch count stated, so 1 is implied (one short length), not stated. unconfirmed (single-source) after apply.
update routes set pitches = 1 where id = 'wa_a_good_first_trad_climb' and pitches = 0;

-- MP states Trad, 50 ft (15 m). locked-1src after apply.
update routes set length_m = 15 where id = 'wa_a_good_first_trad_climb' and length_m is null;

-- MP rack: nuts and cams to .75. locked-1src (rack) after apply.
update routes set gear = array['nuts','cams to #0.75 Camalot']::text[] where id = 'wa_a_good_first_trad_climb' and gear is null;

-- access holds a template naming Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). No Forest Service land is involved: the USFS BasicOwnershi
update routes set access = null where id = 'wa_delusions_of_grandeur' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP states no length and no pitch count (only that it ends near a small tree on top, starting lower than the right-side routes), so a single pitch is not clear; null per brief 
update routes set pitches = null where id = 'wa_delusions_of_grandeur' and pitches = 0;

-- MP rack: full range from wired stoppers to 3 in. locked-1src (rack) after apply.
update routes set gear = array['wired nuts','cams to 3 in']::text[] where id = 'wa_delusions_of_grandeur' and gear is null;

-- access holds a template naming Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). No Forest Service land is involved: the USFS BasicOwnershi
update routes set access = null where id = 'wa_undertow' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP: Trad, 90 ft, on the middle left of a ~50-90 ft buttress; no pitch count stated, so 1 is implied, not stated. unconfirmed (single-source) after apply.
update routes set pitches = 1 where id = 'wa_undertow' and pitches = 0;

-- MP states Trad, 90 ft (27 m). locked-1src after apply.
update routes set length_m = 27 where id = 'wa_undertow' and length_m is null;

-- MP rack line states 5 bolts. locked-1src after apply.
update routes set bolts = 5 where id = 'wa_undertow' and bolts is null;

-- MP rack: doubles to #2 Camalot, 5 bolts. locked-1src (rack) after apply.
update routes set gear = array['double cams to #2 Camalot','quickdraws for 5 bolts']::text[] where id = 'wa_undertow' and gear is null;

-- access holds a template naming Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). No Forest Service land is involved: the USFS BasicOwnershi
update routes set access = null where id = 'wa_delusions_of_adequacy' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP: Trad, one 70 ft line beside Agent Orange; MP says it can be previewed by toproping Corner Flash and scrambling to its anchor (one anchor). No pitch count stated, so 1 is i
update routes set pitches = 1 where id = 'wa_delusions_of_adequacy' and pitches = 0;

-- MP states Trad, 70 ft (21 m). locked-1src after apply.
update routes set length_m = 21 where id = 'wa_delusions_of_adequacy' and length_m is null;

-- MP rack: a #3, a #2, two draws and small cams to about .75. locked-1src (rack) after apply.
update routes set gear = array['small cams to #0.75','one #2 and one #3 cam','2 quickdraws']::text[] where id = 'wa_delusions_of_adequacy' and gear is null;

-- access holds a template naming Mt. Baker-Snoqualmie NF (Skykomish RD), a Northwest Forest Pass and unrelated peaks (Persis, Gunn, Baring). No Forest Service land is involved: the USFS BasicOwnershi
update routes set access = null where id = 'wa_the_last_delusion' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. MP: Trad, 80 ft from the boulder at the buttress's low point to anchors beside a tree (one length, one anchor; a mid-route ledge is not called a belay). No pitch count stated,
update routes set pitches = 1 where id = 'wa_the_last_delusion' and pitches = 0;

-- MP states Trad, 80 ft (24 m). locked-1src after apply.
update routes set length_m = 24 where id = 'wa_the_last_delusion' and length_m is null;

-- MP rack: 5 QDs, single rack to 2 in with nuts, some runners. locked-1src (rack) after apply.
update routes set gear = array['single rack to 2 in','nuts','5 quickdraws','slings']::text[] where id = 'wa_the_last_delusion' and gear is null;

-- pitches 0 is invalid. MP: 140 ft, shares its top anchor with MX (stored as 2 pitches); a photo is titled '2nd pitch', and a 70 m rope reaches 'the big ledge' from the top. May be one or two pitches
update routes set pitches = null where id = 'wa_seizure' and pitches = 0;

-- MP states Trad, 140 ft (42 m); 140 ft = 42.7 m, stored as 43 like sibling wa_bend_center_riptide (also 140 ft). locked-1src after apply.
update routes set length_m = 43 where id = 'wa_seizure' and length_m is null;

-- access is empty. Copied field for field from the LIVE value on wa_bend_center_riptide (read from the DB 2026-11-19). Every sampled node of the OSM cliff 'The Bend' (way 688667624) falls in the Oak 
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_seizure' and access is null;

-- permit is empty. Same LIVE string as wa_bend_center_riptide; WDFW Oak Creek unit page states the Discover Pass / Vehicle Access Pass rule. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_seizure' and permit is null;

-- MP rack: double rack to 3 in, a #4 useful midway, prehung nuts. locked-1src (rack) after apply.
update routes set gear = array['double cams to 3 in','one #4 cam','nuts']::text[] where id = 'wa_seizure' and gear is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Bolted line; shares its start with Chunk in the Trunk. MP gives no pitch count (single pitch is implied, so record it as
update routes set pitches = 1 where id = 'wa_bite_your_tongue' and pitches = 0;

-- length_m empty. MP states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_bite_your_tongue' and length_m is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bite_your_tongue' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bite_your_tongue' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Six bolts on a short mini-buttress before the main wall. MP gives no pitch count (single pitch is implied, so record it 
update routes set pitches = 1 where id = 'wa_deadbeat_descendant' and pitches = 0;

-- bolts empty. MP states 6 bolts. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_deadbeat_descendant' and bolts is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_deadbeat_descendant' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_deadbeat_descendant' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Nine bolts to chain anchors. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, single-sourc
update routes set pitches = 1 where id = 'wa_salvaged' and pitches = 0;

-- bolts empty. MP states 9 bolts. Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_salvaged' and bolts is null;

-- anchor empty. MP states chain anchors. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_salvaged' and anchor is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_salvaged' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_salvaged' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: 14 bolts to one anchor up top, 100 ft. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, si
update routes set pitches = 1 where id = 'wa_chunk_in_the_trunk' and pitches = 0;

-- length_m empty. MP states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_chunk_in_the_trunk' and length_m is null;

-- bolts empty. MP states 14 bolts. Single source; locked-1src after apply.
update routes set bolts = 14 where id = 'wa_chunk_in_the_trunk' and bolts is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_chunk_in_the_trunk' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_chunk_in_the_trunk' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Six bolts, over a roof to the anchors. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, si
update routes set pitches = 1 where id = 'wa_arrowleaf' and pitches = 0;

-- bolts empty. MP states 6 bolts. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_arrowleaf' and bolts is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_arrowleaf' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_arrowleaf' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Four bolts on a short overhanging arete. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, 
update routes set pitches = 1 where id = 'wa_bite_sized_chunk' and pitches = 0;

-- bolts empty. MP states 4 bolts. Single source; locked-1src after apply.
update routes set bolts = 4 where id = 'wa_bite_sized_chunk' and bolts is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_bite_sized_chunk' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_bite_sized_chunk' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Past a bulge to chain anchors. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, single-sou
update routes set pitches = 1 where id = 'wa_a_chunk_is_blown' and pitches = 0;

-- anchor empty. MP states chain anchors. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_a_chunk_is_blown' and anchor is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_a_chunk_is_blown' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_a_chunk_is_blown' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Bulges, a hanging crack/slab and a headwall; single line. MP gives no pitch count (single pitch is implied, so record it
update routes set pitches = 1 where id = 'wa_superchunk' and pitches = 0;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_superchunk' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_superchunk' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: 8 bolts and chain anchors, 60 ft. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, single-
update routes set pitches = 1 where id = 'wa_hidden_in_plain_view' and pitches = 0;

-- length_m empty. MP states 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_hidden_in_plain_view' and length_m is null;

-- bolts empty. MP states 8 bolts. Single source; locked-1src after apply.
update routes set bolts = 8 where id = 'wa_hidden_in_plain_view' and bolts is null;

-- anchor empty. MP states chain anchors. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_hidden_in_plain_view' and anchor is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_hidden_in_plain_view' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_hidden_in_plain_view' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: 6 bolts with chain anchors, 60 ft. MP gives no pitch count (single pitch is implied, so record it as unconfirmed, single
update routes set pitches = 1 where id = 'wa_chunked_and_formed' and pitches = 0;

-- length_m empty. MP states 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_chunked_and_formed' and length_m is null;

-- bolts empty. MP states 6 bolts. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_chunked_and_formed' and bolts is null;

-- anchor empty. MP states chain anchors. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_chunked_and_formed' and anchor is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_chunked_and_formed' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_chunked_and_formed' and permit is null;

-- pitches 0 is invalid. One bolted lower-off line at a short single-tier crag: Five bolts past a bulge to chain anchors. MP gives no pitch count (single pitch is implied, so record it as unconfirmed,
update routes set pitches = 1 where id = 'wa_yellow_bell' and pitches = 0;

-- bolts empty. MP states 5 bolts. Single source; locked-1src after apply.
update routes set bolts = 5 where id = 'wa_yellow_bell' and bolts is null;

-- anchor empty. MP states chain anchors. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_yellow_bell' and anchor is null;

-- access is empty. The Chunkyard sits just east of Moon Rocks; batch O placed the Moon Rocks cliff (OSM way 453131149) and points 500 m east of it inside a WDFW-owned Oak Creek parcel (DFWOwnedParcel
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_yellow_bell' and access is null;

-- permit is empty. Same official WDFW page; same LIVE string as wa_bend_center_riptide and wa_chunkyard_the_the_deconstructionist. official-1, expires 2027-11-19.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_yellow_bell' and permit is null;

commit;
