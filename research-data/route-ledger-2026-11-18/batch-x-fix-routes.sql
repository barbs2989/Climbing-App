-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. One bolted line (6 bolts) to a single clip-up anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_riled_child' and pitches = 0;

-- Mountain Project states 6 bolts. theCrag lists the route with no bolt count. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_riled_child' and bolts is null;

-- pitches 0 is invalid. One bolted line of 80 ft, 9 bolts to chains, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_nobody_s_fault' and pitches = 0;

-- Mountain Project states 80 ft (24 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'wa_nobody_s_fault' and length_m is null;

-- Mountain Project states 9 bolts. theCrag gives no count. Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_nobody_s_fault' and bolts is null;

-- Mountain Project states chains at the top. House spelling "Chain anchor". Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_nobody_s_fault' and anchor is null;

-- pitches 0 is invalid. One bolted line up the arete to one anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_drive_by_nose_job' and pitches = 0;

-- pitches 0 is invalid. One short bolted line (3 bolts) to one anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_concentric_extraction' and pitches = 0;

-- Mountain Project states 3 bolts. theCrag does not list the route by this name. Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_concentric_extraction' and bolts is null;

-- pitches 0 is invalid. One bolted line of 90 ft to chain anchors, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_two_bolts_or_not' and pitches = 0;

-- Mountain Project states 90 ft (27 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_two_bolts_or_not' and length_m is null;

-- Mountain Project states chain anchors. House spelling "Chain anchor". Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_two_bolts_or_not' and anchor is null;

-- pitches 0 is invalid. One bolted line of 60 ft to a lower-off shared with Invasive Species, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_kids_nowadays' and pitches = 0;

-- Mountain Project states 60 ft (18 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_kids_nowadays' and length_m is null;

-- pitches 0 is invalid. One bolted line of 75-82 ft to one anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_psychological_crutch' and pitches = 0;

-- Two publishers agree within tolerance: Mountain Project 75 ft (23 m), theCrag 82 ft; Mountain Project's metric figure used.
update routes set length_m = 23 where id = 'wa_psychological_crutch' and length_m is null;

-- pitches 0 is invalid. One bolted line up the slab to chains, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_boltergeist' and pitches = 0;

-- Mountain Project states chains at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_boltergeist' and anchor is null;

-- pitches 0 is invalid. One bolted line up the slab to chains, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_bolterheist' and pitches = 0;

-- Mountain Project states chains at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_bolterheist' and anchor is null;

-- pitches 0 is invalid. One bolted diagonal to a first set of chains, so one pitch (count implied, not stated; not locked). The extension to higher chains is Creamsicle, its own row.
update routes set pitches = 1 where id = 'wa_cream' and pitches = 0;

-- Mountain Project states 5 bolts to the chains (8 for the Creamsicle extension). theCrag gives no count. Single source; locked-1src after apply.
update routes set bolts = 5 where id = 'wa_cream' and bolts is null;

-- Mountain Project states chains at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_cream' and anchor is null;

-- pitches 0 is invalid. One crack line of about 55-59 ft to a chained anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_snake_fingers' and pitches = 0;

-- Two publishers: Mountain Project says the crack was fully retro-bolted and can be led on quickdraws alone (type listed 'Trad, Sport'); theCrag lists it as Sport with 6 bolts. Gear to 2 in is option
update routes set discipline = $q$sport$q$ where id = 'wa_snake_fingers' and discipline = $q$trad$q$;

-- Two publishers agree within tolerance: Mountain Project 55 ft (17 m), theCrag 59 ft.
update routes set length_m = 17 where id = 'wa_snake_fingers' and length_m is null;

-- theCrag's sector page lists 6 bolts. Mountain Project gives no count (only 'a handful of quickdraws', not used). Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_snake_fingers' and bolts is null;

-- Mountain Project states chains at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_snake_fingers' and anchor is null;

-- pitches 0 is invalid. Five bolts to chains, one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_guide_s_day_off' and pitches = 0;

-- Two publishers agree on 5 bolts: Mountain Project ('5 bolts to the chains') and theCrag (5).
update routes set bolts = 5 where id = 'wa_guide_s_day_off' and bolts is null;

-- Two publishers agree within the 50 ft tolerance: Mountain Project 40 ft (12 m), theCrag 49 ft. Mountain Project's figure used.
update routes set length_m = 12 where id = 'wa_guide_s_day_off' and length_m is null;

-- Mountain Project states chains at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_guide_s_day_off' and anchor is null;

-- pitches 0 is invalid. One bolted line of 80 ft to chains, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_finger_food' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source (theCrag's sector page does not list this route); locked-1src after apply.
update routes set length_m = 24 where id = 'wa_finger_food' and length_m is null;

-- Mountain Project states 9 bolts to chains. Single source; locked-1src after apply.
update routes set bolts = 9 where id = 'wa_finger_food' and bolts is null;

-- Mountain Project states chains at the top. House spelling 'Chain anchor' (stored on 64 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_finger_food' and anchor is null;

-- pitches 0 is invalid. Mountain Project names a first set of chains, several lower-offs at the top and a belay stance above the first chains for bringing up a follower, so the line may be one or two
update routes set pitches = null where id = 'wa_wide_load_2' and pitches = 0;

-- pitches 0 is invalid. Mountain Project: sport, 60 ft, 8 bolts to a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_the_color_of_pain' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Single source (theCrag Forbidden; the guide teaser shows no length): locked-1src after apply.
update routes set length_m = 18 where id = 'wa_the_color_of_pain' and length_m is null;

-- Mountain Project states "8 bolts and a two bolt anchor" (bolts, not draws). Single source: locked-1src after apply.
update routes set bolts = 8 where id = 'wa_the_color_of_pain' and bolts is null;

-- Mountain Project: a two-bolt anchor. House spelling "2-bolt anchor" (stored on 254 routes). Single source: locked-1src after apply.
update routes set anchor = $q$2-bolt anchor$q$ where id = 'wa_the_color_of_pain' and anchor is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 1 star.
update routes set guide_stars = 1 where id = 'wa_the_color_of_pain' and guide_stars is null;

-- Brief X: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; owner-approved in batch V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the Sky, St
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_the_color_of_pain' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: approach by rappelling in from the top and climb back to the chains below the Mid Wall trail viewpoint (one length to one anchor; the adjacent #9, done the s
update routes set pitches = 1 where id = 'wa_starfish' and pitches = 0;

-- Mountain Project protection line: "Standard rack, 4 bolts" (bolts, not draws). Single source: locked-1src after apply.
update routes set bolts = 4 where id = 'wa_starfish' and bolts is null;

-- Brief X: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; owner-approved in batch V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the Sky, St
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_starfish' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: sport, 75 ft, 6 bolts to chains under a big roof (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_rhythm_and_bolts' and pitches = 0;

-- Mountain Project states 75 ft (23 m). Single source (theCrag Forbidden; the guide teaser shows no length): locked-1src after apply.
update routes set length_m = 23 where id = 'wa_rhythm_and_bolts' and length_m is null;

-- Mountain Project: "6 bolts to chains" (bolts, not draws). Single source: locked-1src after apply.
update routes set bolts = 6 where id = 'wa_rhythm_and_bolts' and bolts is null;

-- Mountain Project: two chains hanging under the roof. House spelling "Chain anchor" (stored on 67 routes). Single source: locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_rhythm_and_bolts' and anchor is null;

-- Brief X: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; owner-approved in batch V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the Sky, St
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_rhythm_and_bolts' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- pitches 0 is invalid. Mountain Project: sport, 50 ft, 4 bolts to a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_cry_baby' and pitches = 0;

-- Mountain Project states 50 ft (15 m). Single source (theCrag Forbidden; not in the guide's Blues Cliff or Mid Wall lists): locked-1src after apply.
update routes set length_m = 15 where id = 'wa_cry_baby' and length_m is null;

-- Mountain Project: "4 bolts; two bolt anchor" (bolts, not draws). Single source: locked-1src after apply.
update routes set bolts = 4 where id = 'wa_cry_baby' and bolts is null;

-- Mountain Project: two-bolt anchor (chains only guessed by the poster, so not stated). House spelling "2-bolt anchor" (254 routes). Single source: locked-1src after apply.
update routes set anchor = $q$2-bolt anchor$q$ where id = 'wa_cry_baby' and anchor is null;

-- Brief X: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; owner-approved in batch V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the Sky, St
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_cry_baby' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- Brief X: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; owner-approved in batch V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the Sky, St
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blues_cliff_the_black_dog_bo' and access is null;

-- The Index guidebook's own entry (publisher's teaser page and sector list) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_blues_cliff_the_unicorn_blues' and guide_stars is null;

-- Brief X: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; owner-approved in batch V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of the Sky, St
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blues_cliff_the_unicorn_blues' and access is null;

commit;
