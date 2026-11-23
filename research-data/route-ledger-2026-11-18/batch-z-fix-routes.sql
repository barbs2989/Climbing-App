-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project: 90 ft of bolted pillar face from a starting slab to the top ledge and one chain anchor (one length to one anchor). Count implied, not stated: unconfirmed aft
update routes set pitches = 1 where id = 'wa_imperial_master' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source, locked-1src after apply.
update routes set length_m = 27 where id = 'wa_imperial_master' and length_m is null;

-- Mountain Project protection states 9 bolts (it was once a mixed line with 5 bolts plus gear). Single source, locked-1src after apply.
update routes set bolts = 9 where id = 'wa_imperial_master' and bolts is null;

-- Mountain Project: chain anchor. House spelling 'Chain anchor' (stored on 64 routes, incl. wa_ignorant_pursuit on this wall). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_imperial_master' and anchor is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_imperial_master' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_imperial_master' and permit is null;

-- pitches 0 is invalid. Mountain Project gives only a poorly protected chimney, with no length, no anchor and no pitch count, so one pitch is likely but not stated: null rather than a guess.
update routes set pitches = null where id = 'wa_rock_n_roll_chimney' and pitches = 0;

-- Mountain Project protection: gear to 10 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 10 in']::text[] where id = 'wa_rock_n_roll_chimney' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_rock_n_roll_chimney' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_rock_n_roll_chimney' and permit is null;

-- pitches 0 is invalid. Mountain Project: hand crack to a small ledge, left to a three-bolt arete, then right onto an upper flake to a bolted anchor on the ledge above (one length to one anchor). Cou
update routes set pitches = 1 where id = 'wa_slash' and pitches = 0;

-- Mountain Project protection states three bolts (on the arete crux). Single source, locked-1src after apply.
update routes set bolts = 3 where id = 'wa_slash' and bolts is null;

-- Mountain Project: bolted anchor on the ledge above the route (it may lack chains). House spelling 'Bolted anchor' (stored on 5+ routes, incl. wa_the_arete_acal on this wall). Single source, locked-
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_slash' and anchor is null;

-- Mountain Project protection: a few small and medium cams, a #3 Camalot suggested for the upper flake. Rack from MP alone, locked-1src after apply.
update routes set gear = array['cams to #3 Camalot']::text[] where id = 'wa_slash' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_slash' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_slash' and permit is null;

-- pitches 0 is invalid. Mountain Project: 90 ft, a crack to Talking Heads Ledge (~75 ft) then ~15 ft more to the cliff top and a shared bolt anchor (one length to one anchor). Count implied, not stat
update routes set pitches = 1 where id = 'wa_not_so_easy' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source, locked-1src after apply.
update routes set length_m = 27 where id = 'wa_not_so_easy' and length_m is null;

-- Mountain Project: a shared pair of bolts (new in 2025) with steel lower-off carabiners at the top, the same anchor Too Far Out uses. House spelling 'Two-bolt anchor' (stored on 5+ routes, incl. wa_
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_not_so_easy' and anchor is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_not_so_easy' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_not_so_easy' and permit is null;

-- pitches 0 is invalid. Mountain Project describes only a wide, dirty crack and states no length, anchor or pitch count, so one pitch is likely but not stated: null rather than a guess.
update routes set pitches = null where id = 'wa_nobody_loves_me' and pitches = 0;

-- Mountain Project protection: gear to 4 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_nobody_loves_me' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_nobody_loves_me' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_nobody_loves_me' and permit is null;

-- pitches 0 is invalid. Mountain Project: 80 ft, one line of 9 bolts from the top of the column to a 2-bolt chain anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply
update routes set pitches = 1 where id = 'wa_hard_last' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source, locked-1src after apply.
update routes set length_m = 24 where id = 'wa_hard_last' and length_m is null;

-- Mountain Project protection states 9 bolts. Single source, locked-1src after apply.
update routes set bolts = 9 where id = 'wa_hard_last' and bolts is null;

-- Mountain Project: a 2-bolt anchor with chains at the top of the column, shared with Mush Maker and First Blood. House spelling 'Chain anchor' (stored on 64 routes). Single source, locked-1src after
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_hard_last' and anchor is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_hard_last' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_hard_last' and permit is null;

-- pitches 0 is invalid. Mountain Project: the left side of a broken pillar to its top, then a wide crack on the main wall; no length, anchor or pitch count stated, so null rather than a guess.
update routes set pitches = null where id = 'wa_rattler' and pitches = 0;

-- Mountain Project protection: gear to 4 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_rattler' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine), read from the DB 2026-11-23. WDFW's Oak Creek unit page re-read 2026-11-23: u
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_rattler' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_rattler' and permit is null;

-- pitches 0 is invalid. Mountain Project: 70 ft of crack to a chain anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_first_blood' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source, locked-1src after apply.
update routes set length_m = 21 where id = 'wa_first_blood' and length_m is null;

-- Mountain Project protection: chain anchor. House spelling 'Chain anchor' (stored on 65 routes, incl. wa_twin_cracks and wa_ignorant_pursuit on this wall). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_first_blood' and anchor is null;

-- Mountain Project protection: pro to 4 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_first_blood' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_first_blood' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_first_blood' and permit is null;

-- pitches 0 is invalid. Mountain Project: 80 ft hand crack to a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_mush_maker' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source, locked-1src after apply.
update routes set length_m = 24 where id = 'wa_mush_maker' and length_m is null;

-- Mountain Project protection: two bolt anchor. House spelling 'Two-bolt anchor' (stored on 7 routes, incl. wa_nimble_novice and wa_slot_machine_3 on this wall). Single source, locked-1src after appl
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_mush_maker' and anchor is null;

-- Mountain Project protection: gear to 3 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_mush_maker' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_mush_maker' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_mush_maker' and permit is null;

-- pitches 0 is invalid. Mountain Project: 90 ft, double crack that jogs left round a roof, to a bolted anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_nimrod_s_nemesis' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source, locked-1src after apply.
update routes set length_m = 27 where id = 'wa_nimrod_s_nemesis' and length_m is null;

-- Mountain Project protection: bolted anchor (type not given). House spelling 'Bolted anchor' (stored on 6 routes, incl. wa_main_face_stopper_popper on this wall). Single source, locked-1src after ap
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_nimrod_s_nemesis' and anchor is null;

-- Mountain Project protection: gear to 4 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_nimrod_s_nemesis' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_nimrod_s_nemesis' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_nimrod_s_nemesis' and permit is null;

-- pitches 0 is invalid. Mountain Project: a 60 ft crack, first route on the face from the Orange Sunshine side; one short length. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_slacker' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Single source, locked-1src after apply.
update routes set length_m = 18 where id = 'wa_slacker' and length_m is null;

-- Mountain Project protection: medium nuts to 3 in cams. Rack from MP alone, locked-1src after apply.
update routes set gear = array['nuts','cams to 3 in']::text[] where id = 'wa_slacker' and gear is null;

-- '??' is a placeholder copied from MP's 'FA: ??' (first ascent unknown); it renders as junk. Null until a source names the party.
update routes set fa = null where id = 'wa_slacker' and fa = $q$??$q$;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_slacker' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_slacker' and permit is null;

-- pitches 0 is invalid. Mountain Project: 80 ft, one of the longer lines here, to anchors at the top (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_chasing_amy' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source, locked-1src after apply.
update routes set length_m = 24 where id = 'wa_chasing_amy' and length_m is null;

-- Mountain Project protection: quickdraws and gear to 2 in (mixed bolts and gear). Rack from MP alone, locked-1src after apply.
update routes set gear = array['quickdraws','gear to 2 in']::text[] where id = 'wa_chasing_amy' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_chasing_amy' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_chasing_amy' and permit is null;

-- pitches 0 is invalid. Mountain Project: 100 ft to the top, where you build an anchor or belay from The Sorcerer's rap station (one length). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_the_apprentice' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source, locked-1src after apply.
update routes set length_m = 30 where id = 'wa_the_apprentice' and length_m is null;

-- Mountain Project protection: gear to 3 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_the_apprentice' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_the_apprentice' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_the_apprentice' and permit is null;

-- pitches 0 is invalid. Mountain Project: a sport line of 11 bolts to a chain anchor (one line to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_humble_pie' and pitches = 0;

-- Mountain Project protection states 11 bolts (rebolted 2011). Single source, locked-1src after apply.
update routes set bolts = 11 where id = 'wa_humble_pie' and bolts is null;

-- Mountain Project protection: chain anchor. House spelling 'Chain anchor' (stored on 65 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_humble_pie' and anchor is null;

-- access null. Copied field for field from wa_journeyman_crack (read live 2026-11-23, owner-approved; same object on wa_orange_sunshine and the batch Y Main Face rows). WDFW's Oak Creek unit page re-
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_humble_pie' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_humble_pie' and permit is null;

-- pitches 0 is invalid. Mountain Project gives no length, no pitch count and no anchor, so a single pitch is not clear: null.
update routes set pitches = null where id = 'wa_slime_puppy' and pitches = 0;

-- Mountain Project protection: gear to 2 in plus one fixed pin. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_slime_puppy' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_slime_puppy' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_slime_puppy' and permit is null;

-- pitches 0 is invalid. Mountain Project gives no length, no pitch count and no anchor, so a single pitch is not clear: null.
update routes set pitches = null where id = 'wa_gray_digger' and pitches = 0;

-- Mountain Project protection: gear to 4 in (thin to off-width jams). Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 4 in']::text[] where id = 'wa_gray_digger' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_gray_digger' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_gray_digger' and permit is null;

-- pitches 0 is invalid. Mountain Project: two parallel cracks from a tree belay in an alcove to chain anchors above (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_level_head' and pitches = 0;

-- Mountain Project protection: chain anchors above. House spelling 'Chain anchor' (stored on 79 routes, incl. wa_twin_cracks on this face). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_level_head' and anchor is null;

-- Mountain Project protection: doubles from 0.6 to 2 in (thin hands to hands). Rack from MP alone, locked-1src after apply.
update routes set gear = array['doubles from 0.6 to 2 in']::text[] where id = 'wa_level_head' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_level_head' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_level_head' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 90 ft crack with a pod low down, finishing at an anchor a little off line to the left. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_switchback' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source, locked-1src after apply.
update routes set length_m = 27 where id = 'wa_switchback' and length_m is null;

-- Mountain Project protection: pro to 3 in, a large piece can go in low. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in','one large piece optional low']::text[] where id = 'wa_switchback' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_switchback' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_switchback' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 100 ft crack line (single route length, no second pitch or intermediate belay mentioned). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_the_sorcerer' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source, locked-1src after apply.
update routes set length_m = 30 where id = 'wa_the_sorcerer' and length_m is null;

-- Mountain Project protection: gear to 3 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_the_sorcerer' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_the_sorcerer' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_the_sorcerer' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 65 ft crack from a broken pillar to the top. Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_good_timer' and pitches = 0;

-- '??' is a placeholder, not an ascent. Mountain Project's FA line is also '??' (unknown). Clearing a placeholder per the batch M rule; nothing is filled.
update routes set fa = null where id = 'wa_good_timer' and fa = $q$??$q$;

-- Mountain Project protection: medium nuts up to a 3 in cam. Rack from MP alone, locked-1src after apply.
update routes set gear = array['medium nuts','cams to 3 in']::text[] where id = 'wa_good_timer' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_good_timer' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_good_timer' and permit is null;

-- pitches 0 is invalid. Mountain Project: 90 ft of two corner cracks to the top and a two-bolt anchor (one length to one anchor). Count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_little_known_wonder' and pitches = 0;

-- Mountain Project protection: two bolt anchor. House spelling 'Two-bolt anchor' (stored on 11 routes, incl. wa_nimble_novice on this face). Single source, locked-1src after apply.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_little_known_wonder' and anchor is null;

-- Mountain Project protection: pro to 3 in. Rack from MP alone, locked-1src after apply.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_little_known_wonder' and gear is null;

-- access null. Copied field for field from wa_journeyman_crack (live, owner-approved; same object on wa_orange_sunshine). WDFW's Oak Creek unit page re-read 2026-11-23: unchanged (Discover Pass requi
update routes set access = $q${"land_manager":"Washington Department of Fish and Wildlife (Oak Creek Wildlife Area)","parking_pass":"Discover Pass or WDFW Vehicle Access Pass in the wildlife area lot"}$q$::jsonb where id = 'wa_little_known_wonder' and access is null;

-- permit null. Verbatim copy of wa_journeyman_crack's permit (same on wa_orange_sunshine), same reason as access.
update routes set permit = $q$A Discover Pass, or a WDFW Vehicle Access Pass, is needed to park in the Oak Creek Wildlife Area lot.$q$ where id = 'wa_little_known_wonder' and permit is null;

commit;
