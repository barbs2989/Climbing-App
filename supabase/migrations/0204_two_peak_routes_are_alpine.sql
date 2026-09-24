-- Two peak routes typed `mountaineering` are roped technical climbs, so they are `alpine`
-- (owner's rules: mountaineering = walk-ups and glacier routes; alpine = a REQUIRED roped
-- technical grade; a peak never carries a crag type — 0197).
--
--   wa_north_face_left_buttress   Castle Peak (Pasayten), "Fight or Flight": 5.10d, grade IV,
--                                 14 pitches — its own rock_grade says so.
--   wa_golden_horn_north_face     Golden Horn's north face (Beckey & Watson, 1958): listed among
--                                 the peak's infrequently climbed TECHNICAL routes; Golden Horn
--                                 carries no glacier, so nothing about it is a walk-up.
--
-- Found by the peak research behind 0197. Also flagged then: Indian Head Peak's Class 2
-- standard route typed trad — already corrected to `mountaineering` (a Class 2 walk-up) by
-- scripts/oneoff/fix-walkup-and-scramble-disciplines.mjs, so it is not touched here.
--
-- Assert-then-set: a row no longer typed `mountaineering` is left alone. The route triggers
-- (0051, 0198) re-derive each peak's main type and type list.

update routes set discipline = 'alpine'
 where id in ('wa_north_face_left_buttress', 'wa_golden_horn_north_face')
   and discipline = 'mountaineering'
   and area_id in ('wa_castle_peak_pasayten', 'wa_golden_horn');

-- Golden Horn's MAIN type (the pin colour). 0197 set it `scrambling` from a "Class 3" figure for
-- the Southwest Route, but that route is graded Easy 5th (Mountain Project) and was researched as
-- roped 5th class, and it is typed `alpine` like every other route on the peak. A main type of
-- scrambling on a peak whose only type is alpine put it under a colour its own filter never
-- lists. The 0197 function keeps a peak's mountain type once set, so it is set here.
update areas set dominant_discipline = 'alpine'
 where id = 'wa_golden_horn' and dominant_discipline = 'scrambling';
