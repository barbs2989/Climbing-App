-- The route finder can filter a grade range on ONE scale: `grade_sys`.
--
-- grade_num is a single number line shared by every grading system — a WI4 ice climb and a 5.4
-- rock route are both 4 — so a range is only meaningful between routes graded on the same scale.
-- Until now the finder offered a range only for disciplines whose rows all share one scale, and
-- could not offer one for ice at all, because ice rows carry TWO: the ice climbs imported from
-- OpenBeta's WI grade (grade "WI4", grade_system 'wi') and the older rows whose only grade is a
-- 5.x rock grade. `grade_sys` restricts the range to rows whose grade_system says which scale
-- grade_num is on, so "WI3 to WI5" and "5.6 to 5.9" can both be asked of the ice discipline.
--
-- PART 1 — make grade_system TRUE on the three disciplines it was wrong on.
-- The loaders wrote grade_system from the DISCIPLINE (gradeSystem(disc)), not from the grade:
-- measured 2026-09-24 over all 205,543 routes, aid rows graded "5.12a" say 'aid', ice rows graded
-- "5.10c" or "4th" say 'wi', mixed rows graded "5.8" say 'm'. grade_num on those rows is already
-- the 5.x / class number (the parser falls through to the generic branches), so only the LABEL is
-- wrong. The app is unaffected: routeGradeSystem (ClimbMatchCore.jsx) reads the grade STRING
-- first and consults grade_system only when the string says nothing.
-- Scoped to ice / mixed / aid on purpose: those are the disciplines the finder now offers a 5.x
-- range on, and a relabel elsewhere would be a change nobody measured.

update routes set grade_system = 'yds'
 where discipline in ('ice', 'mixed', 'aid')
   and grade ~ '^5\.\d'
   and grade_system is distinct from 'yds';

update routes set grade_system = 'class'
 where discipline in ('ice', 'mixed', 'aid')
   and grade ~* '^((class\s*\d)|((easy |low )?\d(st|nd|rd|th)( class)?))'
   and grade_system is distinct from 'class';

-- PART 2 — the finder takes the scale.
-- A new argument is a NEW function (create or replace cannot cross argument lists), and two
-- overloads make every partial call ambiguous (PGRST203) — 0162 records exactly that. So the
-- 12-argument versions are dropped first. A caller still sending the old named arguments resolves
-- to the new function on its default, so a stale app bundle keeps working through the deploy.
drop function if exists public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer);
drop function if exists public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer);

-- Bodies are 0074's verbatim; the only addition is the grade_sys line.
create or replace function routes_in_subtree(
  root_id text,
  q text default null,
  disc text default null,
  min_grade numeric default null,
  max_grade numeric default null,
  min_stars numeric default null,
  min_pitches int default null,
  min_length_m int default null,
  max_length_m int default null,
  sort_by text default 'name',
  lim int default 50,
  off int default 0,
  grade_sys text default null
)
returns setof routes language sql stable as $$
  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
    and (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
    and (min_grade is null or r.grade_num >= min_grade)
    and (max_grade is null or r.grade_num <= max_grade)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m)
  order by
    case when sort_by = 'area' then ra.name end asc nulls last,
    case when sort_by = 'grade_asc' then r.grade_num end asc nulls last,
    case when sort_by = 'grade_desc' then r.grade_num end desc nulls last,
    case when sort_by = 'stars_desc' then r.stars end desc nulls last,
    case when sort_by = 'name_desc' then r.name end desc,
    r.name asc
  limit lim offset off;
$$;

create or replace function routes_in_subtree_count(
  root_id text,
  q text default null,
  disc text default null,
  min_grade numeric default null,
  max_grade numeric default null,
  min_stars numeric default null,
  min_pitches int default null,
  min_length_m int default null,
  max_length_m int default null,
  grade_sys text default null
)
returns bigint language sql stable as $$
  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
    and (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
    and (min_grade is null or r.grade_num >= min_grade)
    and (max_grade is null or r.grade_num <= max_grade)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m);
$$;

-- Grants: the finders are read by the anon role (the app is usable signed out).
grant execute on function public.routes_in_subtree(text, text, text, numeric, numeric, numeric, integer, integer, integer, text, integer, integer, text) to anon, authenticated;
grant execute on function public.routes_in_subtree_count(text, text, text, numeric, numeric, numeric, integer, integer, integer, text) to anon, authenticated;
