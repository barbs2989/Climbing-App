-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. Mountain Project describes one 60 ft lead up a lieback flake to a ledge below a bolted anchor. One length to one anchor; count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_pipeline_2' and pitches = 0;

-- Mountain Project states 60 ft (18 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 18 where id = 'wa_pipeline_2' and length_m is null;

-- Mountain Project protection: a bolt anchor with rings, stated as bolts. House spelling "bolt anchor" (14 routes). Single source; locked-1src after apply.
update routes set anchor = $q$bolt anchor$q$ where id = 'wa_pipeline_2' and anchor is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_pipeline_2' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_pipeline_2' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 65 ft bolted line through three roofs to anchors about 15 ft above the last roof. One length to one anchor; count implied, not stated: unconfirm
update routes set pitches = 1 where id = 'wa_stone_rodeo' and pitches = 0;

-- Mountain Project states 65 ft (20 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 20 where id = 'wa_stone_rodeo' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_stone_rodeo' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_stone_rodeo' and permit is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_seagull' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_seagull' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 80 ft bolted pillar. One length; count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_old_warriors_never_die' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'wa_old_warriors_never_die' and length_m is null;

-- Mountain Project protection: 5 bolts, stated as bolts (one called questionable, to be replaced). Single source; locked-1src after apply.
update routes set bolts = 5 where id = 'wa_old_warriors_never_die' and bolts is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_old_warriors_never_die' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_old_warriors_never_die' and permit is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches. Stated count, single source (theCrag gives none); locked-1src after apply.
update routes set pitches = 2 where id = 'wa_flying_dutchman' and pitches = 0;

-- Mountain Project states 200 ft (61 m). Single source; locked-1src after apply.
update routes set length_m = 61 where id = 'wa_flying_dutchman' and length_m is null;

-- Mountain Project: rappel from Metolius anchors (no slings or rap rings at present). House spelling "rap anchors" (11 routes, 3 on this face). Single source; locked-1src after apply.
update routes set anchor = $q$rap anchors$q$ where id = 'wa_flying_dutchman' and anchor is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_flying_dutchman' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_flying_dutchman' and permit is null;

-- pitches 0 is invalid. Mountain Project and theCrag both describe one corner to a bolted ledge anchor (lowering takes nearly a full 60 m rope); neither states a count, so implied: unconfirmed after 
update routes set pitches = 1 where id = 'wa_windsurfer' and pitches = 0;

-- Mountain Project states 105 ft (32 m); theCrag states 100 ft (30 m). Within 10%: agree-2 after apply.
update routes set length_m = 32 where id = 'wa_windsurfer' and length_m is null;

-- Mountain Project: bolted anchors on the ledge at the top, stated as bolts. House spelling "bolted anchors" (39 routes). Single source; locked-1src after apply.
update routes set anchor = $q$bolted anchors$q$ where id = 'wa_windsurfer' and anchor is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_windsurfer' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_windsurfer' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 100 ft lead from a finger crack under a small roof, along the arch to where it meets Crusin', then up and right on the South East Corner travers
update routes set pitches = 1 where id = 'wa_couchmaster' and pitches = 0;

-- Mountain Project states 100 ft (30 m). Single source; locked-1src after apply.
update routes set length_m = 30 where id = 'wa_couchmaster' and length_m is null;

-- Mountain Project: the route ends at the South East Corner bolt belay, stated as bolts. House spelling "bolt belay" (7 routes). Single source; locked-1src after apply.
update routes set anchor = $q$bolt belay$q$ where id = 'wa_couchmaster' and anchor is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still closes the south and so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_couchmaster' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_couchmaster' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 90 ft pitch from a bolted anchor reached via Spring Fever, Winter Delight or Sufficiently Breathless, ending on the ledge shared with Right Gull
update routes set pitches = null where id = 'wa_bluebird' and pitches = 0;

-- Mountain Project states 90 ft (27 m) for the Bluebird pitch. Single source (theCrag lists no length); locked-1src after apply.
update routes set length_m = 27 where id = 'wa_bluebird' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_bluebird' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_bluebird' and permit is null;

-- pitches 0 is invalid. No source gives this route's grade, length or pitch count: it has no Mountain Project page (not on the South Face area list) and is not on any of theCrag's four South Face sec
update routes set pitches = null where id = 'wa_aging_fruits' and pitches = 0;

-- pitches 0 is invalid. Mountain Project's type line states 4 pitches and describes P1 to P4. Single source (theCrag gives no count); locked-1src after apply.
update routes set pitches = 4 where id = 'wa_ground_zero_3' and pitches = 0;

-- Mountain Project states 400 ft (121 m). Single source; locked-1src after apply.
update routes set length_m = 121 where id = 'wa_ground_zero_3' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_ground_zero_3' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_ground_zero_3' and permit is null;

-- pitches 0 is invalid. Mountain Project's type line states 6 pitches and describes P1 to P6. Single source (not on theCrag's South Face sector pages); locked-1src after apply.
update routes set pitches = 6 where id = 'wa_lost_warriors' and pitches = 0;

-- Mountain Project states 650 ft (197 m). Single source; locked-1src after apply.
update routes set length_m = 197 where id = 'wa_lost_warriors' and length_m is null;

-- gear is empty. Mountain Project protection: one set of wires (brass and alloy offsets), double cams to #3 Camalot, #2 and #3 Ball Nutz, quickdraws and long slings. Camalot #3 and Ball Nutz #2/#3 ex
update routes set gear = array['set of wires, brass and alloy offsets','double cams to Camalot #3','Ball Nutz #2 and #3','quickdraws and long slings']::text[] where id = 'wa_lost_warriors' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_lost_warriors' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_lost_warriors' and permit is null;

-- pitches 0 is invalid. Mountain Project's type line states 4 pitches (5.9, 5.10d, 5.10b, 5.10a). Single source (theCrag lists no count); locked-1src after apply.
update routes set pitches = 4 where id = 'wa_flying_swallow' and pitches = 0;

-- Mountain Project states 400 ft (121 m). Single source; locked-1src after apply.
update routes set length_m = 121 where id = 'wa_flying_swallow' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_flying_swallow' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_flying_swallow' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 100 ft line from a shallow dihedral past pins and a roof to a finger crack to the top, and theCrag lists 'Rock Master' as one 100 ft trad climb.
update routes set pitches = 1 where id = 'wa_rockmaster' and pitches = 0;

-- Mountain Project 100 ft (30 m) and theCrag 100 ft agree: agree-2 after apply.
update routes set length_m = 30 where id = 'wa_rockmaster' and length_m is null;

-- gear is empty. Mountain Project protection: draws, slings, cams and stoppers, plus fixed pins to the roof. Single source.
update routes set gear = array['quickdraws','slings','cams','stoppers']::text[] where id = 'wa_rockmaster' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_rockmaster' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_rockmaster' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 70 ft corner from a boulder start to a rap anchor around the top of the pillar (webbing with rings, a Metolius rap bolt and a piton): one length
update routes set pitches = 1 where id = 'wa_tennessee_walker' and pitches = 0;

-- Mountain Project states 70 ft (21 m). Single source; locked-1src after apply.
update routes set length_m = 21 where id = 'wa_tennessee_walker' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only). Re-read 2026-11-23: the park page still says the south and sout
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_tennessee_walker' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-23.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_tennessee_walker' and permit is null;

-- pitches 0 is invalid. Mountain Project and theCrag both give one 60 ft length, ending at a rappel anchor below a big roof; no count is stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_siege_tactics' and pitches = 0;

-- Mountain Project states 60 ft (18 m) and theCrag 60ft; 60 ft = 18.3 m, stored 18. agree-2 after apply.
update routes set length_m = 18 where id = 'wa_siege_tactics' and length_m is null;

-- anchor is empty. Mountain Project: the route ends at a rappel anchor below a large roof. House spelling 'rap anchor' (6 rows). Single source.
update routes set anchor = $q$rap anchor$q$ where id = 'wa_siege_tactics' and anchor is null;

-- gear is empty. Mountain Project protection: micro cams, small wires, gear to 2 in; no bolts mentioned. Single source.
update routes set gear = array['micro cams','small wires','gear to 2 in']::text[] where id = 'wa_siege_tactics' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_siege_tactics' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_siege_tactics' and permit is null;

-- pitches 0 is invalid. Mountain Project describes P1 (5.10b, 25 m) and P2 (5.8, 30 m), and its FA line also credits a P3 and P4 (2025) that are not described; no pitch count is stated, so null rathe
update routes set pitches = null where id = 'wa_batten_down_the_hatches' and pitches = 0;

-- Mountain Project states 270 ft (82 m); 270 ft = 82.3 m, stored 82. Single source (not on theCrag's sector); locked-1src after apply.
update routes set length_m = 82 where id = 'wa_batten_down_the_hatches' and length_m is null;

-- gear is empty. Mountain Project protection: Camalots 0.1 to #3, doubles in 0.3-0.4 (optional third 0.3), offset nuts. Single source.
update routes set gear = array['cams 0.1 to #3','doubles 0.3 to 0.4','offset nuts']::text[] where id = 'wa_batten_down_the_hatches' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_batten_down_the_hatches' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_batten_down_the_hatches' and permit is null;

-- pitches 0 is invalid. Mountain Project gives one 85 ft length ending at chains; no count is stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_northwest_face_bermuda_triangle' and pitches = 0;

-- anchor is empty. Mountain Project: three bolts up the arete to the chains. House spelling 'Chain anchor' (98 rows). Single source.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_northwest_face_bermuda_triangle' and anchor is null;

-- bolts is empty. Mountain Project states three bolts on the arete to the chains (the first an old buttonhead). Stated as bolts; single source.
update routes set bolts = 3 where id = 'wa_northwest_face_bermuda_triangle' and bolts is null;

-- gear is empty. Mountain Project protection: Black Diamond cams 0.3 to 3 plus draws for the bolts. Single source.
update routes set gear = array['cams 0.3 to #3']::text[] where id = 'wa_northwest_face_bermuda_triangle' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_bermuda_triangle' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_bermuda_triangle' and permit is null;

-- pitches 0 is invalid. Mountain Project and theCrag both give one 65 ft length to a rap-ring anchor; no count is stated, so one pitch by length, unconfirmed (no lock).
update routes set pitches = 1 where id = 'wa_head_case' and pitches = 0;

-- Mountain Project states 65 ft (20 m) and theCrag 65ft; 65 ft = 19.8 m, stored 20. agree-2 after apply.
update routes set length_m = 20 where id = 'wa_head_case' and length_m is null;

-- bolts is empty. Mountain Project protection: 1 bolt and 2 pins (pins not counted as bolts). Stated as a bolt; single source.
update routes set bolts = 1 where id = 'wa_head_case' and bolts is null;

-- anchor is empty. Mountain Project: rap ring anchor after the slab above the roof. House spelling 'rap anchor' (6 rows). Single source.
update routes set anchor = $q$rap anchor$q$ where id = 'wa_head_case' and anchor is null;

-- gear is empty. Mountain Project protection: a #3 Camalot plus minor gear to 2 in (with 1 bolt and 2 pins). Single source.
update routes set gear = array['#3 Camalot','gear to 2 in']::text[] where id = 'wa_head_case' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_head_case' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_head_case' and permit is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_maiden_voyage' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_maiden_voyage' and permit is null;

-- gear is empty. Mountain Project protection: bolts and gear to 2 in (no bolt count). Single source.
update routes set gear = array['gear to 2 in']::text[] where id = 'wa_northwest_face_lost_at_sea' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_lost_at_sea' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_lost_at_sea' and permit is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_armada' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_armada' and permit is null;

commit;
