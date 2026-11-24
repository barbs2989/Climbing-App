-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project states 5 pitches and lists each one (11c, about 12, 5.6, about 12, 11a). Stated count, single source (theCrag has no entry for it on the sector pages read); l
update routes set pitches = 5 where id = 'wa_the_beekeeper_s_apprentice' and pitches = 0;

-- Mountain Project states 500 ft (152 m). Single source; locked-1src after apply.
update routes set length_m = 152 where id = 'wa_the_beekeeper_s_apprentice' and length_m is null;

-- gear is empty. Mountain Project protection by pitch: a single rack from Metolius 00 with doubles in #1-#2 on P1; stoppers and Metolius #1-#5 on P2; Metolius #1-#5 plus brass offset nuts (Astro Nut 
update routes set gear = array['set of stoppers','cams Metolius 00 to #5','doubles in Metolius #1 and #2','small brass offsets for the fourth pitch','quickdraws']::text[] where id = 'wa_the_beekeeper_s_apprentice' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_beekeeper_s_apprentice' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_the_beekeeper_s_apprentice' and permit is null;

-- pitches 0 is invalid. Mountain Project gives 90 ft with no pitch count; it starts just west of Big Ledge, passes a bolted arete and reaches the anchor atop Dastardly Crack, after which parties eith
update routes set pitches = null where id = 'wa_windwalker_2' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_windwalker_2' and length_m is null;

-- gear is empty. Mountain Project protection: gear to 3 in; the description adds a bolted arete (no bolt count). Single source.
update routes set gear = array['gear to 3 in','quickdraws']::text[] where id = 'wa_windwalker_2' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_windwalker_2' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_windwalker_2' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 100 ft lead from the foot of the South East Corner ramp pitch to a gear belay on the Duck Blind ledge, then a third-class walk to the hiker trai
update routes set pitches = 1 where id = 'wa_uprising' and pitches = 0;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_uprising' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_uprising' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 90 ft line starting just right of Pipeline and finishing at the Windsurfer anchor. One length to one anchor; count implied, not stated: unconfirmed after
update routes set pitches = 1 where id = 'wa_rise_up' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_rise_up' and length_m is null;

-- Mountain Project's description names a single bolt on the route ("a lone bolt"), stated as a bolt. Single source; locked-1src after apply.
update routes set bolts = 1 where id = 'wa_rise_up' and bolts is null;

-- gear is empty. Mountain Project protection: gear to 3 in, plus the one bolt. Single source.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_rise_up' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_rise_up' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_rise_up' and permit is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches (P1 about 11b/c up the zig-zag crack, P2 about 11a to the anchors at the top of the crack, then a step right into Flying Dutchman to the gras
update routes set pitches = 2 where id = 'wa_bears_in_heat' and pitches = 0;

-- Mountain Project states 220 ft (67 m). Single source; locked-1src after apply.
update routes set length_m = 67 where id = 'wa_bears_in_heat' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_bears_in_heat' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_bears_in_heat' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 60 ft bolted line up the buttress on the right side of Big Ledge to anchors (crux a few bolts below them). One length to one anchor; count implied, not s
update routes set pitches = 1 where id = 'wa_the_norseman' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_the_norseman' and length_m is null;

-- gear is empty. Mountain Project protection: bolts, with small cams or nuts for the first 15-20 ft (no bolt count). Single source.
update routes set gear = array['small cams or nuts for the first 15-20 ft','quickdraws']::text[] where id = 'wa_the_norseman' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_norseman' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_the_norseman' and permit is null;

-- pitches 0 is invalid. Mountain Project gives 120 ft with no pitch count and says nothing about an anchor, ledge or descent at the top. Not clear enough for 1: 0 -> null.
update routes set pitches = null where id = 'wa_fresh_squeeze' and pitches = 0;

-- Mountain Project states 120 ft (36 m). Single source; locked-1src after apply.
update routes set length_m = 36 where id = 'wa_fresh_squeeze' and length_m is null;

-- gear is empty. Mountain Project protection: nuts and Metolius cams #1-#7; two fixed pitons (mid-route and near the top). Single source.
update routes set gear = array['nuts','cams Metolius #1 to #7']::text[] where id = 'wa_fresh_squeeze' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_fresh_squeeze' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_fresh_squeeze' and permit is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches (P1 11d, P2 about 12c). Stated count, single source (theCrag blocked after one sector page, which did not list this route); locked-1src after
update routes set pitches = 2 where id = 'wa_the_dirty_double' and pitches = 0;

-- Mountain Project states 225 ft (68 m). Its own pitch lengths (35 m + 40 m) add to 75 m; the headline figure is used. Single source; locked-1src after apply.
update routes set length_m = 68 where id = 'wa_the_dirty_double' and length_m is null;

-- Mountain Project: the second pitch ends at a bolted anchor on the grassy ledge (the first-pitch belay is three equalized pins with rap rings). House spelling 'Bolted anchor' (stored on 14 routes). 
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_the_dirty_double' and anchor is null;

-- Rack empty. Mountain Project lists draws, a single rack green C3 to #2, stoppers, extra finger pieces, fixed pins and two newer bolts near the detached block. Paragraph, not lockable.
update routes set detailed_rack = $q$Quickdraws, one set of cams from a green C3 to a #2 Camalot, a set of stoppers and a few extra finger-size pieces; several fixed pins, and two bolts by the big detached block on the second pitch.$q$ where id = 'wa_the_dirty_double' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_dirty_double' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_the_dirty_double' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 60 ft length from just left of Tunnel #1 to a ledge with a two-bolt rap anchor (an optional continuation goes into Bluebird, its own row). One length to 
update routes set pitches = 1 where id = 'wa_winter_delight' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_winter_delight' and length_m is null;

-- Mountain Project protection: four bolts (stated as bolts) plus gear to 2 in. Single source; locked-1src after apply.
update routes set bolts = 4 where id = 'wa_winter_delight' and bolts is null;

-- Mountain Project: a double Metolius rap-bolt anchor. House spelling '2-bolt anchor' (stored on 259 routes). Single source; locked-1src after apply.
update routes set anchor = $q$2-bolt anchor$q$ where id = 'wa_winter_delight' and anchor is null;

-- Rack empty. Mountain Project: four bolts, gear to 2 in, a 3/4 in cam essential between bolts 1 and 2, high first bolt (stick clip advised). Paragraph, not lockable.
update routes set detailed_rack = $q$Four bolts plus gear to 2 in; a 3/4 in cam protects the runout between the first and second bolts. The first bolt is high, so a stick clip helps.$q$ where id = 'wa_winter_delight' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_winter_delight' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_winter_delight' and permit is null;

-- pitches 0 is invalid. Mountain Project describes a first pitch (about 5.10a, corner to a ledge with a belay/rap anchor) and a second pitch (5.10b thin crack joining Jill's Thrill). Stated count, si
update routes set pitches = 2 where id = 'wa_fear_of_flying' and pitches = 0;

-- Rack empty. Mountain Project: standard rack to 1.5 in, three draws for fixed pins, and a single bolt partway up. Paragraph, not lockable.
update routes set detailed_rack = $q$A standard rack to 1.5 in and three quickdraws for fixed pins; one bolt partway up.$q$ where id = 'wa_fear_of_flying' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_fear_of_flying' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_fear_of_flying' and permit is null;

-- pitches 0 is invalid. Mountain Project's type line states 3 pitches and theCrag lists 220 ft, 3 pitches. agree-2 after apply. (MP's original line from Snag Ledge via SE Corner is 4 pitches counting
update routes set pitches = 3 where id = 'wa_right_gull' and pitches = 0;

-- Mountain Project 220 ft (67 m) and theCrag 220 ft agree: agree-2 after apply.
update routes set length_m = 67 where id = 'wa_right_gull' and length_m is null;

-- Rack empty. Mountain Project lists a double rack to #2, single #3 and #4, offset nuts; the description and photos mention pitons, one of them missing. Paragraph, not lockable.
update routes set detailed_rack = $q$Double cams to #2, one each #3 and #4, and offset nuts; a few fixed pitons, some of them gone.$q$ where id = 'wa_right_gull' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_right_gull' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_right_gull' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 125 ft length from the pillar up a hand crack, past a ledge, to a semi-hanging belay with rap hangers. One length to one anchor; count implied, not state
update routes set pitches = 1 where id = 'wa_free_for_all' and pitches = 0;

-- Mountain Project states 125 ft (38 m). Single source; locked-1src after apply.
update routes set length_m = 38 where id = 'wa_free_for_all' and length_m is null;

-- Mountain Project: the belay in the corner has rap hangers on the right-hand wall. House spelling 'rap anchors' (stored on 10 routes, also used by batch AC on this face). Single source; locked-1src 
update routes set anchor = $q$rap anchors$q$ where id = 'wa_free_for_all' and anchor is null;

-- Rack empty. Mountain Project gives no gear list, only that the first twenty feet are hard to protect in a flaring offwidth, then a steep hand crack. Paragraph, not lockable.
update routes set detailed_rack = $q$Hard to protect for the first 20 ft, where a flared offwidth splits the pillar from the wall; a long hand crack follows.$q$ where id = 'wa_free_for_all' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_free_for_all' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_free_for_all' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 39 m length from the trail to the RR anchor, then a 35 m rappel. One length to one anchor; count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_reasonable_richard' and pitches = 0;

-- Mountain Project states 130 ft (39 m). Single source; locked-1src after apply.
update routes set length_m = 39 where id = 'wa_reasonable_richard' and length_m is null;

-- Mountain Project: a new bolt at the vertical section (replacing an old pin), then another older bolt; stated as bolts. Single source; locked-1src after apply.
update routes set bolts = 2 where id = 'wa_reasonable_richard' and bolts is null;

-- Mountain Project: the anchor is two newer bolts with Metolius rap hangers beside several old bolts. House spelling 'Bolted anchor' (stored on 14 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_reasonable_richard' and anchor is null;

-- Rack empty. Mountain Project: cams and nuts to 1.5 in in discontinuous cracks, two bolts, and a 35 m rappel on a single 70 m rope (or a 60 m rope plus easy downclimbing). Paragraph, not lockable.
update routes set detailed_rack = $q$Cams and nuts to 1.5 in for scattered cracks and pods, two bolts on the steep upper corner; a 70 m rope reaches the ground on the 35 m rappel.$q$ where id = 'wa_reasonable_richard' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_reasonable_richard' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_reasonable_richard' and permit is null;

-- pitches null. Mountain Project: one 105 ft line up Blade Runner to its 4th bolt, left onto the face and up to Snag Ledge. One length to one anchor ledge; count implied, not stated: unconfirmed afte
update routes set pitches = 1 where id = 'wa_south_face_4_fire_and_ice' and pitches is null;

-- Mountain Project states 105 ft (32 m). Single source; locked-1src after apply.
update routes set length_m = 32 where id = 'wa_south_face_4_fire_and_ice' and length_m is null;

-- Rack empty. Mountain Project: bolts, small wires, TCUs to 1 in, and pitons in the thin seam near the top. Paragraph, not lockable.
update routes set detailed_rack = $q$Bolts with small wires and small cams to 1 in; pitons in the finishing seam.$q$ where id = 'wa_south_face_4_fire_and_ice' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_fire_and_ice' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_fire_and_ice' and permit is null;

-- pitches 0 is invalid. Mountain Project states 8 pitches (P1-P7 5.7 to 5.9, P8 4th class). Single source (theCrag's sector does not list the route); locked-1src after apply.
update routes set pitches = 8 where id = 'wa_pleasure_cruise' and pitches = 0;

-- Mountain Project states 450 ft (136 m); 450 ft = 137.2 m, stored 137 as on sibling rows (ft converted). Single source; locked-1src after apply.
update routes set length_m = 137 where id = 'wa_pleasure_cruise' and length_m is null;

-- anchor is empty. Mountain Project states that all belays are bolted. House spelling 'Bolted anchor' (14 rows, incl. The Steamboat Captain's Dream next door). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_pleasure_cruise' and anchor is null;

-- gear is empty. Mountain Project protection: one set of cams 0.2 to 3 (optional 4) and 10 extendable alpine draws; most pitches also have bolts (only P6 counted, 9). Single source.
update routes set gear = array['cams 0.2 to #3','optional #4','10 alpine draws']::text[] where id = 'wa_pleasure_cruise' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_pleasure_cruise' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_pleasure_cruise' and permit is null;

-- pitches 0 is invalid. No source found for this route, so no pitch count can be stated; null rather than a guess.
update routes set pitches = null where id = 'wa_the_stowaway' and pitches = 0;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_stowaway' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_the_stowaway' and permit is null;

-- pitches 0 is invalid. theCrag gives one 90 ft length and no second pitch; Mountain Project folds the line into Steamboat Captain's Dream P1 (one pitch, 31 m, different start). No count stated, so o
update routes set pitches = 1 where id = 'wa_smoke_signals' and pitches = 0;

-- theCrag states 90 ft; 90 ft = 27.4 m, stored 27. Single source (MP's P1 is 31 m but starts differently, so it is not the same length). locked-1src after apply.
update routes set length_m = 27 where id = 'wa_smoke_signals' and length_m is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_smoke_signals' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_smoke_signals' and permit is null;

-- pitches 0 is invalid. Both publishers give one 70 ft length to rap rings; no count stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_dorian_s_dilemma' and pitches = 0;

-- Mountain Project 70 ft (21 m) and theCrag 70ft agree; agree-2 after apply.
update routes set length_m = 21 where id = 'wa_dorian_s_dilemma' and length_m is null;

-- bolts is empty. Mountain Project protection: gear to 2 in and 2 bolts (stated as bolts). Single source.
update routes set bolts = 2 where id = 'wa_dorian_s_dilemma' and bolts is null;

-- gear is empty. Mountain Project: gear to 2 in plus 2 bolts. Single source.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_dorian_s_dilemma' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_dorian_s_dilemma' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_dorian_s_dilemma' and permit is null;

-- pitches 0 is invalid. Mountain Project gives one 85 ft length, top-roped from the Piracy rap rings; no count stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_forbidden_slab' and pitches = 0;

-- Mountain Project states 85 ft (26 m); 85 ft = 25.9 m, stored 26. Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'wa_forbidden_slab' and length_m is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_forbidden_slab' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_forbidden_slab' and permit is null;

-- bolts is empty. Mountain Project protection: 3 bolts (stated as bolts) plus gear. Single source.
update routes set bolts = 3 where id = 'wa_northwest_face_higher_ground' and bolts is null;

-- gear is empty. Mountain Project: gear to 2 in, to 3 in for the extension, plus 3 bolts. Single source.
update routes set gear = array['gear to 2 in','gear to 3 in for the extension']::text[] where id = 'wa_northwest_face_higher_ground' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_higher_ground' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_higher_ground' and permit is null;

commit;
