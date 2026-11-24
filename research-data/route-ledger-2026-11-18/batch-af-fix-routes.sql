-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- pitches 0 is invalid. The two sources disagree on the count: Mountain Project states 5 pitches (P5 is a scramble on the SE Face route to the top); theCrag lists four separate pitch entries (P1 5.8,
update routes set pitches = null where id = 'wa_young_warriors' and pitches = 0;

-- gear is empty. Mountain Project: bolts mark much of the line and the guidebook suggests gear to 2.5 in. Single source (rack); locked-1src after apply.
update routes set gear = array['gear to 2.5 in']::text[] where id = 'wa_young_warriors' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_young_warriors' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_young_warriors' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one lead up the corner to a new set of anchors with slings to lower from (or continue up the Southeast Corner). One length to one anchor; count impl
update routes set pitches = 1 where id = 'wa_rookie_nookie' and pitches = 0;

-- Mountain Project states 90 ft (27 m); theCrag states 100 ft. Within 50 ft / 10%: agree-2 at MP's figure after apply.
update routes set length_m = 27 where id = 'wa_rookie_nookie' and length_m is null;

-- gear is empty. Mountain Project: cams and nuts, a 4 in cam useful for the wide start. Single source (rack); locked-1src after apply.
update routes set gear = array['cams and nuts','4 in cam for the start']::text[] where id = 'wa_rookie_nookie' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_rookie_nookie' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_rookie_nookie' and permit is null;

-- pitches 0 is invalid. Mountain Project states 2 pitches (P1 to an anchor, P2 to the belay ledge at the base of the SE Face corner and on to the top of the slab). Stated count, single source; locked
update routes set pitches = 2 where id = 'wa_rock_police' and pitches = 0;

-- Mountain Project states 220 ft (67 m). theCrag gives no length. Single source; locked-1src after apply.
update routes set length_m = 67 where id = 'wa_rock_police' and length_m is null;

-- gear is empty. Mountain Project: bolts and a pin on P1 with an optional 0.5-0.75 in piece; P2 needs gear to 1 in including micro cams. Single source (rack); locked-1src after apply.
update routes set gear = array['optional 0.5 to 0.75 in piece on P1','gear to 1 in with micro cams for P2']::text[] where id = 'wa_rock_police' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_rock_police' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_rock_police' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 110 ft lead past five bolts to a finger-crack finish and top anchors; theCrag gives one 110 ft entry. One length to one anchor; count implied, n
update routes set pitches = 1 where id = 'wa_bladerunner' and pitches = 0;

-- Mountain Project states 110 ft (33 m); theCrag states 110 ft. agree-2 after apply.
update routes set length_m = 33 where id = 'wa_bladerunner' and length_m is null;

-- Mountain Project protection: 5 bolts, stated as bolts (rebolted Oct 2016 by the ASCA). theCrag's 'bolts/clips (excluding anchor)' field also reads 5, but it is a bolts-or-clips field, so it is supp
update routes set bolts = 5 where id = 'wa_bladerunner' and bolts is null;

-- gear is empty. Mountain Project: gear to 1.5 in, Camalots 0.3-1 (real sizes in that line) and offset and small nuts beside the bolts. Single source (rack); locked-1src after apply.
update routes set gear = array['Camalots 0.3 to 1','offset and small nuts']::text[] where id = 'wa_bladerunner' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_bladerunner' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_bladerunner' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 80 ft lead to the belay ledge shared with Reasonable Richard and Local Access Only, the starting ledge for the upper routes. One length to one a
update routes set pitches = 1 where id = 'wa_the_3rd_rail' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Not on theCrag's Second or Third Tunnel sector pages. Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'wa_the_3rd_rail' and length_m is null;

-- gear is empty. Mountain Project: small to medium wires and a few TCUs or Aliens; placements are hard and runout low. Single source (rack); locked-1src after apply.
update routes set gear = array['small to medium wired nuts','a few TCUs or Aliens']::text[] where id = 'wa_the_3rd_rail' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_3rd_rail' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_the_3rd_rail' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 80 ft lead to the anchor at the top of the pillar. One length to one anchor; count implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_left_gull' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Not on theCrag's First Tunnel sector page. Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'wa_left_gull' and length_m is null;

-- gear is empty. Mountain Project: gear to 5 in including small nuts. MP also names 'one #5' without a maker, so that item is left out. Single source (rack); locked-1src after apply.
update routes set gear = array['gear to 5 in','small nuts']::text[] where id = 'wa_left_gull' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_left_gull' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_left_gull' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 100 ft lead ending at the South East Corner P2 anchors (rap from two Metolius bolts or continue on that route); theCrag gives one 100 ft entry. 
update routes set pitches = 1 where id = 'wa_cruisin' and pitches = 0;

-- Mountain Project states 100 ft (30 m); theCrag states 100 ft. agree-2 after apply.
update routes set length_m = 30 where id = 'wa_cruisin' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_cruisin' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_cruisin' and permit is null;

-- pitches 0 is invalid. Mountain Project's type line states 2 pitches (P1 5.10c 80 ft, P2 5.13a 120 ft). Single source (theCrag has no Beacon Rock entry for this 2020 route); locked-1src after apply.
update routes set pitches = 2 where id = 'wa_the_pink_panther' and pitches = 0;

-- Mountain Project states 200 ft (61 m). Single source; locked-1src after apply.
update routes set length_m = 61 where id = 'wa_the_pink_panther' and length_m is null;

-- gear is empty. Mountain Project protection: 6 bolts and a single rack to a BD #2 (the bolts protect the P2 cruxes). BD Camalot #2 exists in that line. Single source.
update routes set gear = array['single rack to Camalot #2','6 bolts on the second pitch']::text[] where id = 'wa_the_pink_panther' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_the_pink_panther' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_the_pink_panther' and permit is null;

-- pitches 0 is invalid. No source states a pitch count, and the descriptions use different starts: Mountain Project gives one 80 ft line from the top of the Beacon Towers (approached via Wild Turkeys
update routes set pitches = null where id = 'wa_borderline' and pitches = 0;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_borderline' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_borderline' and permit is null;

-- pitches 0 is invalid. Mountain Project's type line states 2 pitches from the top of the Beacon Towers. Single source (theCrag lists no count); locked-1src after apply.
update routes set pitches = 2 where id = 'wa_excalibur_2' and pitches = 0;

-- Mountain Project states 180 ft (55 m). Single source; locked-1src after apply.
update routes set length_m = 55 where id = 'wa_excalibur_2' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_excalibur_2' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_excalibur_2' and permit is null;

-- pitches 0 is invalid. Mountain Project's type line states 2 pitches (P1 to the Flying Swallow anchor, then P2). Single source (theCrag lists no count); locked-1src after apply.
update routes set pitches = 2 where id = 'wa_flight_time' and pitches = 0;

-- Mountain Project states 200 ft (61 m). Single source; locked-1src after apply.
update routes set length_m = 61 where id = 'wa_flight_time' and length_m is null;

-- gear is empty. Mountain Project protection: pro to 1.5 in, small brass nuts and small cams for pin scars and the thin crack. Single source.
update routes set gear = array['gear to 1.5 in','small brass nuts','small cams']::text[] where id = 'wa_flight_time' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_flight_time' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_flight_time' and permit is null;

-- pitches 0 is invalid. Mountain Project describes one 80 ft line of cracks and slab to a belay anchor just left of and above Snag Ledge: one length to one anchor -> 1. Mountain Project does not prin
update routes set pitches = 1 where id = 'wa_little_wing_2' and pitches = 0;

-- Mountain Project states 80 ft (24 m). Single source; locked-1src after apply.
update routes set length_m = 24 where id = 'wa_little_wing_2' and length_m is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_little_wing_2' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_little_wing_2' and permit is null;

-- pitches 0 is invalid. No source states a pitch count. Mountain Project describes one long pitch (about 160-170 ft) from a belay stance to Big Ledge, reached by an approach pitch (Reasonable Richard
update routes set pitches = null where id = 'wa_blood_sweat_and_smears' and pitches = 0;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_blood_sweat_and_smears' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_blood_sweat_and_smears' and permit is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_steppenwolf' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_steppenwolf' and permit is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_it_takes_a_village' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_it_takes_a_village' and permit is null;

-- anchor is empty. Mountain Project: new bolted top anchors installed in the October 2023 rebolt, used to rappel. House spelling 'Bolted anchor' (17 rows). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_northwest_face_cornercopia' and anchor is null;

-- gear is empty. Mountain Project protection: Camalots 0.2 to 2 (or Totems black to orange), doubles in 0.2, 0.3, 0.4, small and medium offset nuts; optional 0.75 for the first slab. Single source. T
update routes set gear = array['cams 0.2 to #2','doubles 0.2 to 0.4','small and medium offset nuts']::text[] where id = 'wa_northwest_face_cornercopia' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_cornercopia' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_cornercopia' and permit is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_winters_passage' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_winters_passage' and permit is null;

-- bolts is empty. Mountain Project protection: 9 bolts plus cams. Stated as bolts; single source.
update routes set bolts = 9 where id = 'wa_northwest_face_walk_the_plank' and bolts is null;

-- gear is empty. Mountain Project protection: Camalots 0.3 to 1.0 (or Totems blue to red) with 9 bolts. Single source.
update routes set gear = array['cams 0.3 to #1']::text[] where id = 'wa_northwest_face_walk_the_plank' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_walk_the_plank' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_walk_the_plank' and permit is null;

-- bolts is empty. Mountain Project protection: 4 bolts plus gear. Stated as bolts; single source.
update routes set bolts = 4 where id = 'wa_northwest_face_the_bertrand' and bolts is null;

-- anchor is empty. Mountain Project: chain anchor in an alcove shared with The Arabia; MP's Arabia page also says it ends at chains in that alcove. House spelling 'Chain anchor' (99 rows). Single pub
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_northwest_face_the_bertrand' and anchor is null;

-- gear is empty. Mountain Project protection: gear 0.2 to 1, small nuts, alpine draws, with 4 bolts. Single source.
update routes set gear = array['cams 0.2 to #1','small nuts']::text[] where id = 'wa_northwest_face_the_bertrand' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_the_bertrand' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_the_bertrand' and permit is null;

-- bolts is empty. Mountain Project protection: 4 bolts plus gear. Stated as bolts; single source.
update routes set bolts = 4 where id = 'wa_northwest_face_piracy' and bolts is null;

-- anchor is empty. Mountain Project: bolted top anchor. House spelling 'Bolted anchor' (17 rows). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_northwest_face_piracy' and anchor is null;

-- gear is empty. Mountain Project protection: Camalots 0.3 to 1.0 with a double 0.75, medium nuts (BD 7-9), 4 bolts. Single source.
update routes set gear = array['cams 0.3 to #1','double 0.75','medium nuts']::text[] where id = 'wa_northwest_face_piracy' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_piracy' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_piracy' and permit is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_rogue_wave' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_rogue_wave' and permit is null;

commit;
