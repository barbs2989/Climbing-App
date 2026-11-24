-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- anchor is empty. Mountain Project: the line ends at a two-bolt anchor at the top. House spelling 'Two-bolt anchor' (stored on 14 WA routes). Single source; locked-1src after apply.
update routes set anchor = $q$Two-bolt anchor$q$ where id = 'wa_south_face_4_sunrise_express' and anchor is null;

-- gear is empty. Mountain Project: gear to 2 in plus bolts, small cams recommended. Single source (rack); locked-1src after apply.
update routes set gear = array['gear to 2 in','small cams']::text[] where id = 'wa_south_face_4_sunrise_express' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_sunrise_express' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_sunrise_express' and permit is null;

-- gear is empty. Mountain Project: bolts plus finger-size cams and nuts; a 0.4 cam or medium stopper for the crux before the last bolts. Single source (rack); locked-1src after apply. Scope-independe
update routes set gear = array['finger-size cams and nuts','0.4 cam or medium nut for the crux']::text[] where id = 'wa_south_face_4_sunrise_direct' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_sunrise_direct' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_sunrise_direct' and permit is null;

-- gear is empty. Mountain Project: mixed bolts and gear, gear up to a #6 Black Diamond, stoppers and cams on P2-P3 (#6 for the end of P3). Single source (rack); locked-1src after apply.
update routes set gear = array['cams to #6 BD','stoppers']::text[] where id = 'wa_south_face_4_the_bellflower' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_the_bellflower' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_the_bellflower' and permit is null;

-- bolts is empty. Mountain Project states 4 bolts on the face. Single source; locked-1src after apply.
update routes set bolts = 4 where id = 'wa_south_face_4_roll_on_columbia' and bolts is null;

-- anchor is empty. Mountain Project: bolted anchor. House spelling 'Bolted anchor' (stored on 19 WA routes). Single source; locked-1src after apply.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_south_face_4_roll_on_columbia' and anchor is null;

-- gear is empty. Mountain Project: small and medium nuts and Metolius cams from 00 to #8 (both sizes exist in Metolius' line). Single source (rack); locked-1src after apply.
update routes set gear = array['small and medium nuts','Metolius cams 00 to #8']::text[] where id = 'wa_south_face_4_roll_on_columbia' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_roll_on_columbia' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_roll_on_columbia' and permit is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still closes the 
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_north_country' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_north_country' and permit is null;

-- gear is empty. Mountain Project's recommended rack: two each BD C4 .3 to #2 and #4, one each #3 and #5, optional third .5, medium-to-large offset nuts. All sizes exist in the Camalot C4 line. Singl
update routes set gear = array['Camalot 0.3 to #2, two each','Camalot #3, one','Camalot #4, two','Camalot #5, one','offset nuts, medium to large']::text[] where id = 'wa_south_face_4_flying_circus' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_flying_circus' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_flying_circus' and permit is null;

-- gear is empty. Mountain Project protection: single rack to BD .5, doubles .75 to #2, 6-8 quickdraws. Sizes exist in the Camalot line. Single source.
update routes set gear = array['Camalot to 0.5, one each','Camalot 0.75 to #2, two each','6-8 quickdraws']::text[] where id = 'wa_south_face_4_the_maiden_s_escape' and gear is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_the_maiden_s_escape' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_the_maiden_s_escape' and permit is null;

-- access is empty. Copied field for field from the live owner-approved sibling wa_jill_s_thrill (read with the service key, read-only, 2026-11-24). Re-read 2026-11-24: the park page still says the so
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The south and southeast faces close every Feb 1 for nesting peregrine falcons and are expected to reopen around mid-July. The east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_south_face_4_second_wind' and access is null;

-- permit is empty. Copied verbatim from wa_jill_s_thrill; facts re-checked on the official park and Discover Pass pages 2026-11-24.
update routes set permit = $q$Discover Pass required to park. The south and southeast faces close each year on Feb 1 for nesting peregrine falcons and should reopen around mid-July; the east face is closed for good.$q$ where id = 'wa_south_face_4_second_wind' and permit is null;

-- gear is empty. Mountain Project protection: bolts and gear to 3 in. Single source. Bolt count not stated (the start passes two bolts), so bolts not proposed.
update routes set gear = array['gear to 3 in']::text[] where id = 'wa_northwest_face_false_prophets' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_false_prophets' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_false_prophets' and permit is null;

-- gear is empty. Mountain Project protection: Camalots 0.2 to #4, doubles 0.2 to 0.75 and #2, an offset nut set, small to medium nuts, alpine slings. Single source. No bolts mentioned.
update routes set gear = array['cams 0.2 to #4','doubles 0.2 to 0.75 and #2','offset nuts','small to medium nuts','alpine slings']::text[] where id = 'wa_northwest_face_crossing_wakes' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_crossing_wakes' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_crossing_wakes' and permit is null;

-- bolts is empty. Mountain Project states 6 bolts plus cams. Single source.
update routes set bolts = 6 where id = 'wa_northwest_face_siren_s_call' and bolts is null;

-- gear is empty. Mountain Project: Camalots 0.5 to 2, a double 0.75, an optional 3 or 4 at the start; save the #2 for above the bolts. Single source.
update routes set gear = array['cams 0.5 to #2','double 0.75','optional #3 or #4 for the start']::text[] where id = 'wa_northwest_face_siren_s_call' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_siren_s_call' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_siren_s_call' and permit is null;

-- anchor is empty. Mountain Project: P2 ends at a bolted anchor with rap rings. House spelling 'Bolted anchor' (19 rows). Single source.
update routes set anchor = $q$Bolted anchor$q$ where id = 'wa_northwest_face_torpedo' and anchor is null;

-- gear is empty. Mountain Project: two sets of Camalots 0.2 to #2, one each 0.1 and #3, one set of nuts, 12 draws, 3 long slings. Single source.
update routes set gear = array['doubles cams 0.2 to #2','one 0.1 and one #3','set of nuts','12 quickdraws','3 long slings']::text[] where id = 'wa_northwest_face_torpedo' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_torpedo' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_torpedo' and permit is null;

-- gear is empty. Mountain Project: P1 bolts plus gear to 2 in (Totems help in flares and pods); P2 bolts plus optional 0.2 to 0.4 cam and a black Totem or purple Metolius. Single source.
update routes set gear = array['gear to 2 in','Totems for flares','cams 0.2 to 0.4 for P2','black Totem or purple Metolius for P2']::text[] where id = 'wa_northwest_face_riptide' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_riptide' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_riptide' and permit is null;

-- bolts is empty. Mountain Project states 6 bolts plus gear. Single source.
update routes set bolts = 6 where id = 'wa_northwest_face_the_arabia' and bolts is null;

-- anchor is empty. Mountain Project: finishes at chains, a semi-hanging anchor in an alcove, shared with The Bertrand (wa_northwest_face_the_bertrand, which stores 'Chain anchor'). House spelling 'Ch
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_northwest_face_the_arabia' and anchor is null;

-- gear is empty. Mountain Project: gear from #0 to 2 in, optional bigger pieces for a mid-route fist crack. Single source.
update routes set gear = array['gear to 2 in','optional larger cams for the fist crack']::text[] where id = 'wa_northwest_face_the_arabia' and gear is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_the_arabia' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_the_arabia' and permit is null;

-- access is empty. Copied field for field from the live, owner-approved sibling wa_northwest_face_pioneer_iron_spike_route (same face, same park; read with the service key, read-only). Re-read 2026-1
update routes set access = $q${"fees":"Discover Pass: $10 for one day or $45 for a year.","rules":"The northwest face is open all year. The south and southeast faces close every Feb 1 for nesting peregrine falcons until about mid-July, and the east face is closed for good. Park hours are 8 a.m. to dusk.","land_manager":"Washington State Parks (Beacon Rock State Park)","parking_pass":"Discover Pass."}$q$::jsonb where id = 'wa_northwest_face_arete_in_the_sky' and access is null;

-- permit is empty. Copied from wa_northwest_face_pioneer_iron_spike_route; same official re-read as the access fix.
update routes set permit = $q$Discover Pass required to park. The northwest face stays open all year; the south and southeast faces close from Feb 1 to about mid-July for nesting falcons, and the east face is closed for good.$q$ where id = 'wa_northwest_face_arete_in_the_sky' and permit is null;

commit;
