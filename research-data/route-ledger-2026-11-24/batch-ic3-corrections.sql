-- IC3 corrections (2026-11-24): two live racks stated a fact their page does not. Old value in every WHERE.
begin;

-- The page gives no quickdraw count; the retro re-check found '~12 quickdraws for last pitch' nowhere on it.
update routes set detailed_rack = $q$Start with a handful of finger and hand cams, maybe a #5 for the chimney. Pitch one finishes on a big ledge with solid anchors.$q$ where id = 'ut_the_schoolmaster' and detailed_rack = $q$Start with a handful of finger and hand cams, maybe a #5 for the chimney, and about 12 quickdraws for the last pitch. Pitch one finishes on a big ledge with solid anchors.$q$;

-- The page does not mention a yellow TCU at the roof (retro re-check).
update routes set detailed_rack = $q$Rack: 5 blue TCU and smaller, C3 00/000, and a black Alien for the top.$q$ where id = 'ut_left_affair' and detailed_rack = $q$Rack: 5 blue TCU and smaller, a yellow TCU at the roof, C3 00/000, and a black Alien for the top.$q$;

commit;
