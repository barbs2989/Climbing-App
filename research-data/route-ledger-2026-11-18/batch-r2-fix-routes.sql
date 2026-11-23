-- Research batch fixes (2026-11-18): enrich:apply cannot write — routes. Old value in every WHERE.
begin;

-- Majority of independent publishers: the Exit 38 guidebook (Kutzke & Price, on Rakkup) and theCrag both give 5.12a; only Mountain Project gives 5.11+. agree-2 (guide + theCrag); lock grade 5.12a aft
update routes set grade = $q$5.12a$q$ where id = 'wa_stick_boy' and grade = $q$5.11+$q$;

-- Moves with the grade: gradeNumFrom('5.12a') in lib/grade.js = 12.25.
update routes set grade_num = 12.25 where id = 'wa_stick_boy' and grade_num = 11.75;

-- Majority of independent publishers: the Exit 38 guidebook (Kutzke & Price, on Rakkup) and theCrag both give 5.10c; only Mountain Project gives 5.10b. agree-2 (guide + theCrag); lock grade 5.10c aft
update routes set grade = $q$5.10c$q$ where id = 'wa_namby_pamby' and grade = $q$5.10b$q$;

-- Moves with the grade: gradeNumFrom('5.10c') in lib/grade.js = 10.75.
update routes set grade_num = 10.75 where id = 'wa_namby_pamby' and grade_num = 10.5;

-- Spelling only: the climber is 'Bryan Burdo' in the American Alpine Journal (2008 Washington summary) and on the Peak Season podcast (Mountain Bureau, 2021), two publishers independent of Mountain P
update routes set fa = $q$Bryan Burdo$q$ where id = 'wa_subliminal' and fa = $q$Brian Burdo$q$;

-- Spelling only: the climber is 'Bryan Burdo' in the American Alpine Journal (2008 Washington summary) and on the Peak Season podcast (Mountain Bureau, 2021), two publishers independent of Mountain P
update routes set fa = $q$Bryan Burdo$q$ where id = 'wa_namby_pamby' and fa = $q$Brian Burdo$q$;

-- Spelling only: the climber is 'Bryan Burdo' in the American Alpine Journal (2008 Washington summary) and on the Peak Season podcast (Mountain Bureau, 2021), two publishers independent of Mountain P
update routes set fa = $q$Bryan Burdo$q$ where id = 'wa_lovey_dovey' and fa = $q$Brian Burdo$q$;

-- guide_stars is the guidebook's own rating. The Exit 38 guide (Kutzke & Price) on Rakkup rates Hangover Helper three stars on both its route page and the Substation list; the stored 1 matches no gui
update routes set guide_stars = 3 where id = 'wa_hangover_helper' and guide_stars = 1;

-- guide_stars is the guidebook's own rating; the Exit 38 guide (Kutzke & Price) Substation list rates this route 3 stars.
update routes set guide_stars = 3 where id = 'wa_you_re_only_nice_to_me_when_i_tie_you_up' and guide_stars = 1;

-- guide_stars is the guidebook's own rating; the Exit 38 guide (Kutzke & Price) Substation list rates this route 2 stars.
update routes set guide_stars = 2 where id = 'wa_glob_job' and guide_stars is null;

-- guide_stars is the guidebook's own rating; the Exit 38 guide (Kutzke & Price) Substation list rates this route 2 stars.
update routes set guide_stars = 2 where id = 'wa_slippery_when_wet' and guide_stars is null;

-- guide_stars is the guidebook's own rating; the Exit 38 guide (Kutzke & Price) Substation list rates this route 3 stars.
update routes set guide_stars = 3 where id = 'wa_you_re_only_nice_to_me_when_you_re_wet' and guide_stars is null;

commit;
