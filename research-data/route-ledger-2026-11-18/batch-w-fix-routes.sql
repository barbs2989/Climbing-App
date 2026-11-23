-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project: a 70 ft bolted face to anchors on top of the pillar (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_thriller_pillar' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_thriller_pillar' and length_m is null;

-- Mountain Project protection: quickdraws plus an optional 1 in cam for the easy runout to the anchor. Rack from MP alone, locked-1src after apply.
update routes set gear = array['optional cam to 1 in']::text[] where id = 'wa_thriller_pillar' and gear is null;

-- access null. Copied field for field from wa_orange_sunshine (live, settled with the owner in batches U and V). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass required on WD
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_thriller_pillar' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_thriller_pillar' and permit is null;

-- pitches 0 is invalid. Mountain Project describes a chimney up the pillar's right side to a wide crack at the top but states no length, pitch count or anchor, so a single pitch is likely but not sta
update routes set pitches = null where id = 'wa_thriller_pillar_right_side' and pitches = 0;

-- Mountain Project protection: gear to 4 inches. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_thriller_pillar_right_side' and gear is null;

-- access null. Copied field for field from wa_orange_sunshine (live, settled with the owner in batches U and V). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass required on WD
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_thriller_pillar_right_side' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_thriller_pillar_right_side' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 70 ft crack to chains on top (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_humpty_dumpty' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_humpty_dumpty' and length_m is null;

-- Mountain Project: chains on top, right of the bush. House spelling 'Chain anchor' (stored on 64 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_humpty_dumpty' and anchor is null;

-- Mountain Project protection: gear to 3 inches. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_humpty_dumpty' and gear is null;

-- access null. Copied field for field from wa_orange_sunshine (live, settled with the owner in batches U and V). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass required on WD
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_humpty_dumpty' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_humpty_dumpty' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 70 ft bolted line on the pillar left of Orange Sunshine to an anchor on top (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_columns_holiday' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_columns_holiday' and length_m is null;

-- access null. Copied field for field from wa_orange_sunshine (live, settled with the owner in batches U and V). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass required on WD
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_columns_holiday' and access is null;

-- permit null. Verbatim copy of wa_orange_sunshine's permit, same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_columns_holiday' and permit is null;

-- pitches 0 is invalid. Mountain Project states 4 pitches and describes P1-P4 one by one. Single source (theCrag not reachable this run; no other publisher found). locked-1src after apply.
update routes set pitches = 4 where id = 'wa_the_big_tree' and pitches = 0;

-- Mountain Project states 500 ft (152 m). Single source. locked-1src after apply.
update routes set length_m = 152 where id = 'wa_the_big_tree' and length_m is null;

-- Mountain Project: gear to 3 in plus long slings (an optional 4 in piece for the first two pitches). House spelling 'gear to 3 in' (already stored on sibling wa_three_o_clock_rock_rashionalization).
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_the_big_tree' and gear is null;

-- Brief W: the stored object is the LEGACY template (it names Glacier Peak Wilderness and a Mount Rainier NP fee line, and adds a Northwest Forest Pass line no official page supports for this trailhe
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_the_big_tree' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","rules":"Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.","permit":"None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)","parking_pass":"Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year."}$q$::jsonb;

-- access is null. Copy the pass-free Boulder River Wilderness object field for field from wa_20th_century_clock (brief W; settled with the owner in batches U and V). Re-read 2026-11-23: the Eight-Mil
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_three_o_clock_rock_rashionalization' and access is null;

-- access is null. Copy the pass-free Boulder River Wilderness object field for field from wa_20th_century_clock (brief W; settled with the owner in batches U and V). Re-read 2026-11-23: the Eight-Mil
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_three_o_clock_rock_beanberry_delight' and access is null;

-- access is null. Copy the pass-free Boulder River Wilderness object field for field from wa_20th_century_clock (brief W; settled with the owner in batches U and V). Re-read 2026-11-23: the Eight-Mil
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_three_o_clock_rock_the_jinx' and access is null;

-- access is null. Copy the pass-free Boulder River Wilderness object field for field from wa_20th_century_clock (brief W; settled with the owner in batches U and V). Re-read 2026-11-23: the Eight-Mil
update routes set access = $q${"rules":"The Eight-Mile Trail to the rock enters the Boulder River Wilderness, where groups are capped at 12 people and stock combined.","group_limit":12,"land_manager":"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"}$q$::jsonb where id = 'wa_three_o_clock_rock_when_butterflies_kiss_bumblebees' and access is null;

-- pitches 0 is invalid. One bolted sport line of 55 ft to a single anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_arapilesian_dog' and pitches = 0;

-- Mountain Project states 55 ft (17 m). Single source (theCrag's Main Wall & Sunbug Slab sector does not list this route); locked-1src after apply.
update routes set length_m = 17 where id = 'wa_arapilesian_dog' and length_m is null;

-- pitches 0 is invalid. One bolted sport line of 90 ft to chain anchors, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_plethora' and pitches = 0;

-- Mountain Project states 90 ft (27 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_plethora' and length_m is null;

-- Two publishers agree on 10 bolts: Mountain Project ('10 bolts' plus a separately mentioned belay bolt, not counted) and theCrag (10).
update routes set bolts = 10 where id = 'wa_plethora' and bolts is null;

-- Mountain Project states chain anchors. House spelling 'Chain anchor' (stored on wa_zig_zag, wa_jiffy_pop, the Jam Sandwich sibling and others). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_plethora' and anchor is null;

-- pitches 0 is invalid. One bolted sport line of about 80 ft to one anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_amorphous' and pitches = 0;

-- Two publishers agree: Mountain Project 80 ft (24 m), theCrag 79 ft.
update routes set length_m = 24 where id = 'wa_amorphous' and length_m is null;

-- pitches 0 is invalid. Three bolts to chains above the overhang: one length to one anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_pygmalion' and pitches = 0;

-- Two publishers agree on 3 bolts: Mountain Project and theCrag.
update routes set bolts = 3 where id = 'wa_pygmalion' and bolts is null;

-- Mountain Project states chains. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_pygmalion' and anchor is null;

-- pitches 0 is invalid. One bolted sport line of 70 ft to an anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_gridlock' and pitches = 0;

-- Mountain Project states 70 ft (21 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_gridlock' and length_m is null;

-- pitches 0 is invalid. Short bolted sport line (about 40-45 ft) to one anchor, so one pitch (count implied, not stated; not locked).
update routes set pitches = 1 where id = 'wa_steppenruf' and pitches = 0;

-- Two publishers agree within tolerance: Mountain Project 45 ft (14 m), theCrag 39 ft (12 m); Mountain Project's metric figure used.
update routes set length_m = 14 where id = 'wa_steppenruf' and length_m is null;

-- pitches 0 is invalid. Mountain Project: one 90 ft bolted line to fixed anchors, lowered on a 60 m rope (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_blue_in_the_face_2' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source (theCrag Forbidden; the guide teaser shows no length): locked-1src after apply.
update routes set length_m = 27 where id = 'wa_blue_in_the_face_2' and length_m is null;

-- Brief W: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; settled with the owner in batches U/V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blue_in_the_face_2' and access = $q${"fees":"None — no climbing fee (National Forest, not Mount Rainier NP)","notes":"Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.","permit":"None required.","land_manager":"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)","parking_pass":"Northwest Forest Pass or America the Beautiful pass required at developed trailheads."}$q$::jsonb;

-- The Index guidebook's own entry (publisher's teaser page) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_blues_cliff_the_blues_riff' and guide_stars is null;

-- Brief W: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; settled with the owner in batches U/V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blues_cliff_the_blues_riff' and access is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 2 stars.
update routes set guide_stars = 2 where id = 'wa_blues_cliff_the_wedgie' and guide_stars is null;

-- Brief W: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; settled with the owner in batches U/V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blues_cliff_the_wedgie' and access is null;

-- Mountain Project states 9 bolts (one count). Single source (theCrag Forbidden; guide teaser silent): locked-1src after apply.
update routes set bolts = 9 where id = 'wa_blues_cliff_the_accidental_discharge' and bolts is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 3 stars.
update routes set guide_stars = 3 where id = 'wa_blues_cliff_the_accidental_discharge' and guide_stars is null;

-- Brief W: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; settled with the owner in batches U/V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blues_cliff_the_accidental_discharge' and access is null;

-- Mountain Project rack: finger-size cams and stoppers, perhaps a couple of hand-size pieces. MP alone may set rack (locked-1src).
update routes set gear = array['finger-size cams','nuts','1-2 hand-size cams']::text[] where id = 'wa_blues_cliff_the_black_cat_bone' and gear is null;

-- The Index guidebook's own entry (publisher's teaser page) rates it 4 stars.
update routes set guide_stars = 4 where id = 'wa_blues_cliff_the_black_cat_bone' and guide_stars is null;

-- Brief W: copy the State Parks object field for field from wa_twelve_gauge_iq (same cliff; settled with the owner in batches U/V). Re-read 2026-11-23: the State Parks boundary layer returns Forks of
update routes set access = $q${"land_manager":"Washington State Parks (Forks of the Sky State Park)"}$q$::jsonb where id = 'wa_blues_cliff_the_black_cat_bone' and access is null;

commit;
