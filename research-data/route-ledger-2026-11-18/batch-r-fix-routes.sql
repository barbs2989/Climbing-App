-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Mountain Project describes one 120 ft pitch from the Zig Zag P1 chains to an anchor on the Zig Zag ledge; one length to one anchor.
update routes set pitches = 1 where id = 'wa_undercover' and pitches = 0;

-- access is empty. Copied field for field from the live, verified object on wa_zig_zag (batch N; also on the batch Q Main Wall West rows). Re-read 2026-11-23: the city's ACFL page names Anacortes Par
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_undercover' and access is null;

-- Mountain Project: a 40 ft line to the chain anchor shared with Zig Zag P1, Another Option and LGK; one length to one anchor.
update routes set pitches = 1 where id = 'wa_crack_n_the_code' and pitches = 0;

-- Mountain Project: Trad, 40 ft (12 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 12 where id = 'wa_crack_n_the_code' and length_m is null;

-- Mountain Project protection: chain anchor (shared with Zig Zag P1, Another Option and LGK). Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_crack_n_the_code' and anchor is null;

-- Mountain Project protection: gear to 1 in. Single source; locked-1src after apply.
update routes set gear = array['gear to 1 in']::text[] where id = 'wa_crack_n_the_code' and gear is null;

-- access is empty. Copied field for field from the live, verified object on wa_zig_zag (batch N; also on the batch Q Main Wall West rows). Re-read 2026-11-23: the city's ACFL page names Anacortes Par
update routes set access = $q${"fees":null,"rules":"Climbing and scrambling are allowed only in the Mt. Erie summit and south/west face area. The forest lands are open 6 am to 10 pm. New fixed anchors and new climbing areas need Forest Advisory Board approval.","permit":"No permit for individual climbers. Groups should send their planned climbing dates to Anacortes Parks & Recreation ahead of time.","group_limit":null,"land_manager":"City of Anacortes Parks & Recreation (Anacortes Community Forest Lands)","parking_pass":null}$q$::jsonb where id = 'wa_crack_n_the_code' and access is null;

-- Mountain Project: Sport, 45 ft, bolts to a chain anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_namby_pamby' and pitches = 0;

-- Mountain Project: Sport, 45 ft (14 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 14 where id = 'wa_namby_pamby' and length_m is null;

-- Mountain Project protection: chain anchor. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_namby_pamby' and anchor is null;

-- access is empty. Copied field for field from the live object on wa_substation_glob_job_extension (= wa_jiffy_pop), verified in batch Q. Re-checked 2026-11-23: the Substation point (47.4370112,-121.
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_namby_pamby' and access is null;

-- Mountain Project: Sport, 30 ft, ending with a traverse to a shared anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_turf_safari' and pitches = 0;

-- Mountain Project: Sport, 30 ft (9 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_turf_safari' and length_m is null;

-- Mountain Project protection: 6 bolts (one count, stated as bolts). Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_turf_safari' and bolts is null;

-- access is empty. Copied field for field from the live object on wa_substation_glob_job_extension (= wa_jiffy_pop), verified in batch Q. Re-checked 2026-11-23: the Substation point (47.4370112,-121.
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_turf_safari' and access is null;

-- Mountain Project: Sport, 50 ft to a chain anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_you_re_only_nice_to_me_when_you_re_wet' and pitches = 0;

-- access is empty. Copied field for field from the live object on wa_substation_glob_job_extension (= wa_jiffy_pop), verified in batch Q. Re-checked 2026-11-23: the Substation point (47.4370112,-121.
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_you_re_only_nice_to_me_when_you_re_wet' and access is null;

-- Mountain Project: Sport, 50 ft, 7 bolts to a chain anchor; one length to one anchor.
update routes set pitches = 1 where id = 'wa_lovey_dovey' and pitches = 0;

-- Mountain Project: Sport, 50 ft (15 m). Single source (the guidebook page is a teaser); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_lovey_dovey' and length_m is null;

-- Mountain Project protection: 7 bolts. Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_lovey_dovey' and bolts is null;

-- Mountain Project protection: chain anchor with lower-offs. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_lovey_dovey' and anchor is null;

-- access is empty. Copied field for field from the live object on wa_substation_glob_job_extension (= wa_jiffy_pop), verified in batch Q. Re-checked 2026-11-23: the Substation point (47.4370112,-121.
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_lovey_dovey' and access is null;

-- pitches 0 is invalid. Mountain Project gives one 30 ft sport line, 3 bolts to a chain anchor: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_subversive' and pitches = 0;

-- access is empty. Copied field for field from the live verified sibling wa_substation_glob_job_extension (= wa_jiffy_pop), batch Q. Re-queried the official WA State Parks boundary layer at the Subst
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_subversive' and access is null;

-- Mountain Project states 30 ft (9 m). Single source (theCrag 403, the Exit 38 guide's length is paywalled on Rakkup); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_subversive' and length_m is null;

-- Mountain Project protection: '3 bolts, chain anchor with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_subversive' and bolts is null;

-- Mountain Project: chain anchor. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_subversive' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 40 ft sport line, 6 bolts to a chain anchor: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_stick_boy' and pitches = 0;

-- access is empty. Copied field for field from the live verified sibling wa_substation_glob_job_extension (= wa_jiffy_pop), batch Q. Re-queried the official WA State Parks boundary layer at the Subst
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_stick_boy' and access is null;

-- Mountain Project states 40 ft (12 m). Single source (theCrag 403, the Exit 38 guide's length is paywalled on Rakkup); locked-1src after apply.
update routes set length_m = 12 where id = 'wa_stick_boy' and length_m is null;

-- Mountain Project protection: '6 bolts, chain anchor' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 6 where id = 'wa_stick_boy' and bolts is null;

-- Mountain Project: chain anchor. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_stick_boy' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 40 ft sport line, 4 bolts to a chain anchor: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_glob_job' and pitches = 0;

-- access is empty. Copied field for field from the live verified sibling wa_substation_glob_job_extension (= wa_jiffy_pop), batch Q. Re-queried the official WA State Parks boundary layer at the Subst
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_glob_job' and access is null;

-- Mountain Project states 40 ft (12 m). Single source (theCrag 403, the Exit 38 guide's length is paywalled on Rakkup); locked-1src after apply.
update routes set length_m = 12 where id = 'wa_glob_job' and length_m is null;

-- Mountain Project protection: '4 bolts, chain anchor with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 4 where id = 'wa_glob_job' and bolts is null;

-- Mountain Project: chain anchor. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_glob_job' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 25 ft sport line, 3 bolts to a chain anchor: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_subliminal' and pitches = 0;

-- access is empty. Copied field for field from the live verified sibling wa_substation_glob_job_extension (= wa_jiffy_pop), batch Q. Re-queried the official WA State Parks boundary layer at the Subst
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_subliminal' and access is null;

-- Mountain Project states 25 ft (8 m). Single source (theCrag 403, the Exit 38 guide's length is paywalled on Rakkup); locked-1src after apply.
update routes set length_m = 8 where id = 'wa_subliminal' and length_m is null;

-- Mountain Project protection: '3 bolts, chain anchor with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_subliminal' and bolts is null;

-- Mountain Project: chain anchor. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_subliminal' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 25 ft sport line, 3 bolts to a chain anchor: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_chain_smokin' and pitches = 0;

-- access is empty. Copied field for field from the live verified sibling wa_substation_glob_job_extension (= wa_jiffy_pop), batch Q. Re-queried the official WA State Parks boundary layer at the Subst
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_chain_smokin' and access is null;

-- Mountain Project states 25 ft (8 m). Single source (theCrag 403, the Exit 38 guide's length is paywalled on Rakkup); locked-1src after apply.
update routes set length_m = 8 where id = 'wa_chain_smokin' and length_m is null;

-- Mountain Project protection: '3 bolts, chain anchor with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 3 where id = 'wa_chain_smokin' and bolts is null;

-- Mountain Project: chain anchor. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_chain_smokin' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one line, 75 ft (23 m) with 5 bolts to a chain anchor with lower-offs: one length to one anchor, so a single pitch is clear. Implied, not stated: unconf
update routes set pitches = 1 where id = 'wa_rug_monkey' and pitches = 0;

-- Mountain Project states 75 ft (23 m). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set length_m = 23 where id = 'wa_rug_monkey' and length_m is null;

-- Mountain Project protection: 5 bolts (bolts, not clips). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set bolts = 5 where id = 'wa_rug_monkey' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. House spelling 'Chain anchor'. Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after 
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_rug_monkey' and anchor is null;

-- access is empty. Copied field for field from the live verified siblings wa_substation_glob_job_extension and wa_jiffy_pop (batch Q). Re-queried the official WA State Parks boundary layer on 2026-11
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_rug_monkey' and access is null;

-- pitches 0 is invalid. Mountain Project gives one line, 75 ft (23 m) with 6 bolts to a chain anchor with lower-offs: one length to one anchor, so a single pitch is clear. Implied, not stated: unconf
update routes set pitches = 1 where id = 'wa_homo_erectus' and pitches = 0;

-- Mountain Project states 75 ft (23 m). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set length_m = 23 where id = 'wa_homo_erectus' and length_m is null;

-- Mountain Project protection: 6 bolts (bolts, not clips). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set bolts = 6 where id = 'wa_homo_erectus' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. House spelling 'Chain anchor'. Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after 
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_homo_erectus' and anchor is null;

-- access is empty. Copied field for field from the live verified siblings wa_substation_glob_job_extension and wa_jiffy_pop (batch Q). Re-queried the official WA State Parks boundary layer on 2026-11
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_homo_erectus' and access is null;

-- pitches 0 is invalid. Mountain Project gives one line, 25 ft (8 m) with 2 bolts to a chain anchor with lower-offs: one length to one anchor, so a single pitch is clear. Implied, not stated: unconfi
update routes set pitches = 1 where id = 'wa_primordial_blues' and pitches = 0;

-- Mountain Project states 25 ft (8 m). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set length_m = 8 where id = 'wa_primordial_blues' and length_m is null;

-- Mountain Project protection: 2 bolts (bolts, not clips); very high first bolt. Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after 
update routes set bolts = 2 where id = 'wa_primordial_blues' and bolts is null;

-- Mountain Project: chain anchor with lower-offs. House spelling 'Chain anchor'. Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after 
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_primordial_blues' and anchor is null;

-- access is empty. Copied field for field from the live verified siblings wa_substation_glob_job_extension and wa_jiffy_pop (batch Q). Re-queried the official WA State Parks boundary layer on 2026-11
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_primordial_blues' and access is null;

-- pitches 0 is invalid. Mountain Project gives one line, 40 ft (12 m) with 4 bolts to a chain anchor shared with Glob Job: one length to one anchor, so a single pitch is clear. Implied, not stated: u
update routes set pitches = 1 where id = 'wa_glom_don' and pitches = 0;

-- access is empty. Copied field for field from the live verified siblings wa_substation_glob_job_extension and wa_jiffy_pop (batch Q). Re-queried the official WA State Parks boundary layer on 2026-11
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_glom_don' and access is null;

-- pitches 0 is invalid. Mountain Project gives one line, 45 ft (14 m) with 5 bolts to a chain anchor with mussy hooks: one length to one anchor, so a single pitch is clear. Implied, not stated: uncon
update routes set pitches = 1 where id = 'wa_hangover_helper' and pitches = 0;

-- Mountain Project states 45 ft (14 m). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set length_m = 14 where id = 'wa_hangover_helper' and length_m is null;

-- Mountain Project protection: 5 bolts (bolts, not clips). Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after apply.
update routes set bolts = 5 where id = 'wa_hangover_helper' and bolts is null;

-- Mountain Project: chain anchor with mussy hooks. House spelling 'Chain anchor'. Single source (Rakkup's free pages give no length, bolts or anchor; the rest is in the paid guide); locked-1src after
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_hangover_helper' and anchor is null;

-- access is empty. Copied field for field from the live verified siblings wa_substation_glob_job_extension and wa_jiffy_pop (batch Q). Re-queried the official WA State Parks boundary layer on 2026-11
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_hangover_helper' and access is null;

-- pitches 0 is invalid. Mountain Project gives one 25 ft sport line (4 bolts, chain anchor with loweroffs): one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed afte
update routes set pitches = 1 where id = 'wa_hurly_burly' and pitches = 0;

-- access is empty. Copied field for field from the live verified object on wa_substation_glob_job_extension (same as wa_jiffy_pop), per batch R brief. Re-queried the official WA State Parks boundary 
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_hurly_burly' and access is null;

-- Mountain Project states 25 ft (8 m). Single source (the guidebook preview gives no lengths); locked-1src after apply.
update routes set length_m = 8 where id = 'wa_hurly_burly' and length_m is null;

-- Mountain Project protection: '4 bolts, chain anchor with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 4 where id = 'wa_hurly_burly' and bolts is null;

-- Mountain Project: '4 bolts, chain anchor with loweroffs'. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_hurly_burly' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 30 ft sport line (5 bolts, chain anchors with loweroffs): one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed aft
update routes set pitches = 1 where id = 'wa_savannah_daydreamin' and pitches = 0;

-- access is empty. Copied field for field from the live verified object on wa_substation_glob_job_extension (same as wa_jiffy_pop), per batch R brief. Re-queried the official WA State Parks boundary 
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_savannah_daydreamin' and access is null;

-- Mountain Project states 30 ft (9 m). Single source (the guidebook preview gives no lengths); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_savannah_daydreamin' and length_m is null;

-- Mountain Project protection: '5 bolts, chain anchors with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 5 where id = 'wa_savannah_daydreamin' and bolts is null;

-- Mountain Project: '5 bolts, chain anchors with loweroffs'. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_savannah_daydreamin' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 50 ft sport line (7 bolts, chain anchor): one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_slippery_when_wet' and pitches = 0;

-- access is empty. Copied field for field from the live verified object on wa_substation_glob_job_extension (same as wa_jiffy_pop), per batch R brief. Re-queried the official WA State Parks boundary 
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_slippery_when_wet' and access is null;

-- Mountain Project states 50 ft (15 m). Single source (the guidebook preview gives no lengths); locked-1src after apply.
update routes set length_m = 15 where id = 'wa_slippery_when_wet' and length_m is null;

-- Mountain Project protection: '7 bolts, chain anchor' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_slippery_when_wet' and bolts is null;

-- Mountain Project: '7 bolts, chain anchor'. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_slippery_when_wet' and anchor is null;

-- pitches 0 is invalid. Mountain Project gives one 30 ft sport line (5 bolts, anchor with loweroffs): one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after appl
update routes set pitches = 1 where id = 'wa_bwana_be_your_man' and pitches = 0;

-- access is empty. Copied field for field from the live verified object on wa_substation_glob_job_extension (same as wa_jiffy_pop), per batch R brief. Re-queried the official WA State Parks boundary 
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_bwana_be_your_man' and access is null;

-- Mountain Project states 30 ft (9 m). Single source (the guidebook preview gives no lengths); locked-1src after apply.
update routes set length_m = 9 where id = 'wa_bwana_be_your_man' and length_m is null;

-- Mountain Project protection: '5 bolts, anchor with loweroffs' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 5 where id = 'wa_bwana_be_your_man' and bolts is null;

-- pitches 0 is invalid. Mountain Project gives one 45 ft sport line (7 bolts, chain anchor): one length to one anchor, so a single pitch is clear. Implied, not stated: unconfirmed after apply.
update routes set pitches = 1 where id = 'wa_you_re_only_nice_to_me_when_i_tie_you_up' and pitches = 0;

-- access is empty. Copied field for field from the live verified object on wa_substation_glob_job_extension (same as wa_jiffy_pop), per batch R brief. Re-queried the official WA State Parks boundary 
update routes set access = $q${"rules":"Day use only, 6:30 a.m. to dusk. Climbing at Deception Crags can be closed between February and August while peregrine falcons nest; check the park's alerts before going.","land_manager":"Washington State Parks (Olallie State Park)","parking_pass":"Discover Pass required to park at Washington State Parks ($10 one day, $45 a year)."}$q$::jsonb where id = 'wa_you_re_only_nice_to_me_when_i_tie_you_up' and access is null;

-- Mountain Project states 45 ft (14 m). Single source (the guidebook preview gives no lengths); locked-1src after apply.
update routes set length_m = 14 where id = 'wa_you_re_only_nice_to_me_when_i_tie_you_up' and length_m is null;

-- Mountain Project protection: '7 bolts, chain anchor' (bolts, not clips; one count). Single source; locked-1src after apply.
update routes set bolts = 7 where id = 'wa_you_re_only_nice_to_me_when_i_tie_you_up' and bolts is null;

-- Mountain Project: '7 bolts, chain anchor'. House spelling 'Chain anchor'. Single source; locked-1src after apply.
update routes set anchor = $q$Chain anchor$q$ where id = 'wa_you_re_only_nice_to_me_when_i_tie_you_up' and anchor is null;

commit;
