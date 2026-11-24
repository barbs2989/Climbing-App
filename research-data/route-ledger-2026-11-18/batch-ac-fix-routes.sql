-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project states 5 pitches and lays out P1-P5 (5.7, 5.10+ R, 5.12c/d R, 5.11a, 5.11a). Stated count, single source (theCrag blocked); locked-1src after apply.
update routes set pitches = 5 where id = 'wa_whit_s_wall' and pitches = 0;

-- Mountain Project states 500 ft (152 m). Single source; locked-1src after apply.
update routes set length_m = 152 where id = 'wa_whit_s_wall' and length_m is null;

-- Rack empty. Mountain Project lists stoppers, Metolius 0-8 (00-8 and a BD 3 on the crux pitch), bolts on P1 and one bolt each on P3 and P4. Paragraph, not lockable.
update routes set detailed_rack = $q$A set of stoppers and Metolius cams from 00 to 8 plus one BD #3; the first pitch is bolted and two higher pitches each have one bolt.$q$ where id = 'wa_whit_s_wall' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_whit_s_wall' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_whit_s_wall' and permit is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches (P1 about 10c up a dihedral right of the second tunnel to a two-bolt belay at the left side of Beacon Tower; P2 the hard dihedral). Stated co
update routes set pitches = 2 where id = 'wa_wild_turkeys' and pitches = 0;

-- Mountain Project states 210 ft (64 m). Single source; locked-1src after apply.
update routes set length_m = 64 where id = 'wa_wild_turkeys' and length_m is null;

-- Rack empty. Mountain Project lists two pitons, three #2 Metolius cams, small nuts and a red and a blue ball nut. Paragraph, not lockable.
update routes set detailed_rack = $q$Small nuts, three #2 Metolius cams and small ball nuts (red and blue); two fixed pitons on the route.$q$ where id = 'wa_wild_turkeys' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_wild_turkeys' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_wild_turkeys' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 60 ft length from just left of Tunnel #1 to an anchor ledge (an optional continuation goes into Bluebird, its own row); theCrag lists it at 59 ft with no
update routes set pitches = 1 where id = 'wa_sufficiently_breathless' and pitches = 0;

-- Mountain Project 60 ft (18 m) and theCrag 59 ft agree within tolerance (two independent publishers): agree-2 after apply.
update routes set length_m = 18 where id = 'wa_sufficiently_breathless' and length_m is null;

-- Rack empty. Mountain Project lists 2 pitons, many small nuts and cams to 1.25 in. Paragraph, not lockable.
update routes set detailed_rack = $q$Lots of small nuts and cams up to 1.25 in; two fixed pitons.$q$ where id = 'wa_sufficiently_breathless' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_sufficiently_breathless' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_sufficiently_breathless' and permit is null;

-- pitches 0 is invalid. Mountain Project gives 110 ft and no pitch count: the crack runs to an intermediate anchor or on to a ledge with bolted chain anchors, and the descent is one 70 m lower/two-ro
update routes set pitches = null where id = 'wa_free_for_some' and pitches = 0;

-- Mountain Project states 110 ft (33 m). Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'wa_free_for_some' and length_m is null;

-- Mountain Project: the route ends at bolted anchors with chains on a ledge. House spelling 'Chain anchor' (stored on 95 routes). Single source, locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_free_for_some' and anchor is null;

-- Rack empty. Mountain Project lists a standard rack with small wires, offset Aliens useful, occasional fixed pins, and a 70 m rope or two ropes for the descent. Paragraph, not lockable.
update routes set detailed_rack = $q$A standard rack with plenty of small wires; offset cams are useful. Sometimes a few fixed pins. A 70 m rope or two ropes to get down from the top anchor.$q$ where id = 'wa_free_for_some' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_free_for_some' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_free_for_some' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 65 ft bolted line from just left of Tunnel #1 to an anchor with rap hangers. One length to one anchor; count implied, not stated: unconfirmed after apply
update routes set pitches = 1 where id = 'wa_fall_guy' and pitches = 0;

-- Mountain Project states 65 ft (20 m). Single source; locked-1src after apply.
update routes set length_m = 20 where id = 'wa_fall_guy' and length_m is null;

-- Mountain Project protection: 7 bolts (stated as bolts, not clips). Single source, locked-1src after apply.
update routes set bolts = 7 where id = 'wa_fall_guy' and bolts is null;

-- Mountain Project: anchors with rap hangers. House spelling 'rap anchors' (stored on 8 routes). Single source, locked-1src after apply.
update routes set anchor = $q$rap anchors$q$ where id = 'wa_fall_guy' and anchor is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_fall_guy' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_fall_guy' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 60 ft thin crack from just right of Tunnel #1, joining Winter Delight near the top, to an anchor ledge (an optional extension continues into Bluebird, it
update routes set pitches = 1 where id = 'wa_spring_fever_3' and pitches = 0;

-- Mountain Project states 60 ft (18 m). Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_spring_fever_3' and length_m is null;

-- Rack empty. Mountain Project: mostly small, with chances for cams to 3 in. Paragraph, not lockable.
update routes set detailed_rack = $q$Mostly small gear, with placements for cams up to 3 in.$q$ where id = 'wa_spring_fever_3' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_spring_fever_3' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_spring_fever_3' and permit is null;

-- pitches 0 is invalid. Mountain Project gives 110 ft, no pitch count, and says to rappel the route with a 60 m rope - which cannot reach 110 ft in one rappel, so the line may have an intermediate st
update routes set pitches = null where id = 'wa_local_access_only' and pitches = 0;

-- Mountain Project states 110 ft (33 m). Single source; locked-1src after apply.
update routes set length_m = 33 where id = 'wa_local_access_only' and length_m is null;

-- Mountain Project protection lists Rap Anchors. House spelling 'rap anchors' (stored on 8 routes). Single source, locked-1src after apply.
update routes set anchor = $q$rap anchors$q$ where id = 'wa_local_access_only' and anchor is null;

-- Rack empty. Mountain Project lists Camalots 0.1-0.4 and 1, small-medium or offset nuts, about 10 draws and bolts (no count). Paragraph, not lockable; bolts not proposed (no bolt count, only draws).
update routes set detailed_rack = $q$Camalots 0.1 to 0.4 and a #1, small to medium nuts or offsets, and about 10 quickdraws for the bolts.$q$ where id = 'wa_local_access_only' and detailed_rack is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_local_access_only' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_local_access_only' and permit is null;

-- pitches 0 is invalid. Both publishers give one 100 ft length that ends at an anchor and no second pitch; neither states a count, so this is one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_gitmo_love_machine' and pitches = 0;

-- Mountain Project 100 ft (30 m) and theCrag 100ft agree; 100 ft = 30.5 m, stored 30. agree-2 after apply.
update routes set length_m = 30 where id = 'wa_gitmo_love_machine' and length_m is null;

-- gear is empty. Mountain Project protection: gear to 2 in, TCUs and bolts (no bolt count given). Single source.
update routes set gear = array['gear to 2 in','TCUs','quickdraws']::text[] where id = 'wa_gitmo_love_machine' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_gitmo_love_machine' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_gitmo_love_machine' and permit is null;

-- pitches 0 is invalid. Mountain Project gives one 110 ft length to a top anchor and says to rappel the route; no count is stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_full_steam_ahead' and pitches = 0;

-- Mountain Project states 110 ft (33 m); 110 ft = 33.5 m, stored 34. Single source; locked-1src after apply.
update routes set length_m = 34 where id = 'wa_full_steam_ahead' and length_m is null;

-- gear is empty. Mountain Project protection: Camalots 0.2 to 4, offset nuts, small to medium nuts, 10-12 draws. Single source.
update routes set gear = array['cams 0.2 to #4','offset nuts','small to medium nuts','10-12 quickdraws']::text[] where id = 'wa_full_steam_ahead' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_full_steam_ahead' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_full_steam_ahead' and permit is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches and theCrag lists 210ft, 2 pitches. agree-2 after apply.
update routes set pitches = 2 where id = 'wa_burning_calves' and pitches = 0;

-- Mountain Project 210 ft (64 m) and theCrag 210ft agree; 210 ft = 64.0 m. agree-2 after apply.
update routes set length_m = 64 where id = 'wa_burning_calves' and length_m is null;

-- Mountain Project: each of the two pitches ends at a bolted anchor. 'Bolted anchor' is a house spelling (13 rows). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_burning_calves' and anchor is null;

-- gear is empty. Mountain Project protection: good gear to 2 in plus bolts (no count). Single source.
update routes set gear = array['gear to 2 in','quickdraws']::text[] where id = 'wa_burning_calves' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_burning_calves' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_burning_calves' and permit is null;

-- pitches 0 is invalid. Both publishers give one 100 ft length ending at a rap-ring anchor on a large tree; no count is stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_fireballs' and pitches = 0;

-- Mountain Project 100 ft (30 m) and theCrag 100ft agree; 100 ft = 30.5 m, stored 30. agree-2 after apply.
update routes set length_m = 30 where id = 'wa_fireballs' and length_m is null;

-- Mountain Project: rap-ring anchor at a large tree. 'tree' is the house spelling (35 rows). Single source.
update routes set anchor = $q$tree$q$ where id = 'wa_fireballs' and anchor is null;

-- gear is empty. Mountain Project protection: small and medium cams, nuts, slings. Single source.
update routes set gear = array['small to medium cams','nuts','slings']::text[] where id = 'wa_fireballs' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_fireballs' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_fireballs' and permit is null;

-- pitches 0 is invalid. Mountain Project states 3 pitches (P1 30 m, P2 25 m, P3 35 m) and theCrag lists 300ft, 3 pitches. agree-2 after apply.
update routes set pitches = 3 where id = 'wa_genesis' and pitches = 0;

-- Mountain Project 300 ft (91 m) and theCrag 300ft agree; 300 ft = 91.4 m. agree-2 after apply.
update routes set length_m = 91 where id = 'wa_genesis' and length_m is null;

-- gear is empty. Mountain Project protection: cams 0.4 to #1, a small nut or ball nut for a pin scar on P1, 8-10 alpine draws (a 70 m rope is also listed; ropes are not gear items). Single source.
update routes set gear = array['cams 0.4 to #1','small nut or ball nut','8-10 alpine draws']::text[] where id = 'wa_genesis' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_genesis' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_genesis' and permit is null;

-- pitches 0 is invalid. Mountain Project gives one 85 ft length and says to rappel the route or carry on up pitch 2 of Batten Down the Hatches; no count stated, so one pitch by length, unconfirmed (n
update routes set pitches = 1 where id = 'wa_red_sky_at_night' and pitches = 0;

-- Mountain Project states 85 ft (26 m); 85 ft = 25.9 m. Single source; locked-1src after apply.
update routes set length_m = 26 where id = 'wa_red_sky_at_night' and length_m is null;

-- gear is empty. Mountain Project protection: Camalot 0.2 to 0.75 (narrow-head cams suit the shallow placements), doubles in 0.4, small to medium nuts and offsets, 10-12 draws (some extended). Single
update routes set gear = array['cams 0.2 to 0.75','double 0.4','small to medium nuts and offsets','10-12 quickdraws']::text[] where id = 'wa_red_sky_at_night' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_red_sky_at_night' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_red_sky_at_night' and permit is null;

-- pitches 0 is invalid. Mountain Project states 9 pitches (8 roped pitches 5.9 to 5.11c/d, then a 4th-class ridge pitch). Single source (not on theCrag's sector); locked-1src after apply.
update routes set pitches = 9 where id = 'wa_charted_waters' and pitches = 0;

-- gear is empty. Mountain Project protection: a single set of six cams (Camalot 0.2 to 2), 10-12 alpine draws. Single source.
update routes set gear = array['single set of cams 0.2 to #2','10-12 alpine draws']::text[] where id = 'wa_charted_waters' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_charted_waters' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_charted_waters' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 110 ft length up a dihedral and crack to an anchor near the roof, descended with a single 60 m rappel (one length to one anchor). Count implied, not stat
update routes set pitches = 1 where id = 'wa_boardwalk' and pitches = 0;

-- Mountain Project states 110 ft (33 m). Single source (theCrag lists none of these routes and redirected to its home page in the owner's Chrome); locked-1src after apply.
update routes set length_m = 33 where id = 'wa_boardwalk' and length_m is null;

-- Rack empty. Mountain Project lists nuts and cams 1/2 to 2 in plus one optional 4 in placement. Paragraph, not lockable.
update routes set detailed_rack = $q$Nuts and cams from 0.5 to 2 in, with an optional 4 in piece.$q$ where id = 'wa_boardwalk' and detailed_rack is null;

-- access is empty. Brief AC: copied field for field from wa_jill_s_thrill (read live 2026-11-23 with the service key, read-only). Re-read 2026-11-23: the park page still says the south and southeast 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_boardwalk' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_boardwalk' and permit is null;

-- pitches 0 is invalid. Mountain Project states no pitch count, no anchor and no descent: the line finishes by joining Cruisin' at its second roof or traversing into Rockmaster's upper dihedral, so t
update routes set pitches = null where id = 'wa_stardust' and pitches = 0;

-- Mountain Project states 90 ft (27 m). Single source; locked-1src after apply.
update routes set length_m = 27 where id = 'wa_stardust' and length_m is null;

-- Rack empty. Mountain Project lists nuts and cams to 3 in and says the spaced small nuts and cams are awkward. Paragraph, not lockable.
update routes set detailed_rack = $q$A full rack of nuts and cams to 3 in; the small pieces are fiddly to place.$q$ where id = 'wa_stardust' and detailed_rack is null;

-- access is empty. Brief AC: copied field for field from wa_jill_s_thrill (read live 2026-11-23 with the service key, read-only). Re-read 2026-11-23: the park page still says the south and southeast 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_stardust' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_stardust' and permit is null;

-- pitches 0 is invalid. Mountain Project: one 95 ft length up a white left-facing dihedral to the top anchors it shares with Switchblade (one length to one anchor). Count implied, not stated: unconfi
update routes set pitches = 1 where id = 'wa_icy_treats' and pitches = 0;

-- Mountain Project states 95 ft (29 m). Single source; locked-1src after apply.
update routes set length_m = 29 where id = 'wa_icy_treats' and length_m is null;

-- Rack empty. Mountain Project lists the protection as gear and bolts, with no sizes or bolt count. Paragraph, not lockable.
update routes set detailed_rack = $q$A trad rack; the route also has some bolts.$q$ where id = 'wa_icy_treats' and detailed_rack is null;

-- access is empty. Brief AC: copied field for field from wa_jill_s_thrill (read live 2026-11-23 with the service key, read-only). Re-read 2026-11-23: the park page still says the south and southeast 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_icy_treats' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_icy_treats' and permit is null;

-- pitches 0 is invalid. Mountain Project's type field gives 80 ft and no pitch count, but its description lays out two pitches: a bolted first pitch (80 ft, 6 bolts, to a bolt anchor) and a sparsely 
update routes set pitches = null where id = 'wa_rhythm_method' and pitches = 0;

-- Mountain Project states 6 bolts (pitch 1; pitch 2 is protected by nuts and cams only). Stated as bolts, not quickdraws. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_rhythm_method' and bolts is null;

-- Rack empty. Mountain Project: six draws for P1 with optional small cams and nuts; P2 takes small to medium nuts and cams. Paragraph, not lockable.
update routes set detailed_rack = $q$About six quickdraws for the bolted first pitch, with a few small cams or nuts if wanted; the upper pitch needs small to medium nuts and cams.$q$ where id = 'wa_rhythm_method' and detailed_rack is null;

-- access is empty. Brief AC: copied field for field from wa_jill_s_thrill (read live 2026-11-23 with the service key, read-only). Re-read 2026-11-23: the park page still says the south and southeast 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_rhythm_method' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_rhythm_method' and permit is null;

-- Brief AC: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only). Re-read 2026-11-23: USFS EDW BasicOwnership at the crag's 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_c_est_la_vie' and access is null;

-- Mountain Project protection field: 6 bolts. Stated as bolts. Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_the_gentlemen_s_club_c_est_la_vie' and bolts is null;

-- Mountain Project: chains for the anchor. House spelling 'Chain anchor' (95 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_c_est_la_vie' and anchor is null;

-- Brief AC: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only). Re-read 2026-11-23: USFS EDW BasicOwnership at the crag's 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_all_dawgs_go_to_heaven' and access is null;

-- Brief AC: copy access field for field from wa_the_gentlemen_s_club_aquaman (read live 2026-11-23 with the service key: land_manager only). Re-read 2026-11-23: USFS EDW BasicOwnership at the crag's 
update routes set access = $q${"land_manager":"Okanogan-Wenatchee National Forest (Methow Valley Ranger District)"}$q$::jsonb where id = 'wa_the_gentlemen_s_club_deceptively_straight' and access is null;

-- Mountain Project protection field: 7 bolts. Stated as bolts. Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_the_gentlemen_s_club_deceptively_straight' and bolts is null;

-- Mountain Project: chains for the anchor. House spelling 'Chain anchor' (95 routes). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_the_gentlemen_s_club_deceptively_straight' and anchor is null;

commit;
