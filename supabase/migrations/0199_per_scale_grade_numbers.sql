-- One route can carry more than one grade: "5.8 AI3", "5.9 A2", "WI4 M5". grade_num holds ONE
-- number, so a route like that could be found by a 5.x range or a WI range, never both. These
-- columns hold the number on each additional scale, so the route finder's WI / M / A-C ranges read
-- their own column while 5.x keeps reading grade_num (0196).
--
-- Filled by scripts/pipeline/import-mp-grades.mjs (Mountain Project export, fetched under the
-- owner's licence) from the ice / mixed / aid token in the route's grade, converted with
-- lib/grade.js gradeNumFrom — the single parser — so nothing here parses a grade in SQL.

alter table routes add column if not exists ice_grade_num numeric;
alter table routes add column if not exists mixed_grade_num numeric;
alter table routes add column if not exists aid_grade_num numeric;

-- Rows already graded on one of these scales as their PRIMARY grade (the 5 WI climbs 0196's
-- import added) carry the same number in the per-scale column, so one filter finds both kinds.
update routes set ice_grade_num = grade_num where grade_system = 'wi' and ice_grade_num is null and grade_num is not null;
update routes set mixed_grade_num = grade_num where grade_system = 'm' and mixed_grade_num is null and grade_num is not null;
update routes set aid_grade_num = grade_num where grade_system = 'aid' and aid_grade_num is null and grade_num is not null;

-- The finders: for wi / m / aid the range reads that scale's column; any other grade_sys keeps
-- 0196's rule (grade_num on rows whose grade_system matches). Same 13-argument signature as 0196,
-- so `create or replace` replaces in place and no overload is left behind.
create or replace function routes_in_subtree(
  root_id text, q text default null, disc text default null,
  min_grade numeric default null, max_grade numeric default null, min_stars numeric default null,
  min_pitches int default null, min_length_m int default null, max_length_m int default null,
  sort_by text default 'name', lim int default 50, off int default 0, grade_sys text default null
)
returns setof routes language sql stable as $$
  select r.* from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
    and (case
      when grade_sys = 'wi' then (min_grade is null or r.ice_grade_num >= min_grade) and (max_grade is null or r.ice_grade_num <= max_grade) and r.ice_grade_num is not null
      when grade_sys = 'm' then (min_grade is null or r.mixed_grade_num >= min_grade) and (max_grade is null or r.mixed_grade_num <= max_grade) and r.mixed_grade_num is not null
      when grade_sys = 'aid' then (min_grade is null or r.aid_grade_num >= min_grade) and (max_grade is null or r.aid_grade_num <= max_grade) and r.aid_grade_num is not null
      else (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
    end)
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
  root_id text, q text default null, disc text default null,
  min_grade numeric default null, max_grade numeric default null, min_stars numeric default null,
  min_pitches int default null, min_length_m int default null, max_length_m int default null,
  grade_sys text default null
)
returns bigint language sql stable as $$
  select count(*) from routes r
  join areas ra on ra.id = r.area_id
  join areas root on root.id = root_id
  where ra.path <@ root.path
    and (q is null or q = '' or r.name ilike '%' || q || '%')
    and (disc is null or disc = '' or r.discipline = disc)
    and (case
      when grade_sys = 'wi' then (min_grade is null or r.ice_grade_num >= min_grade) and (max_grade is null or r.ice_grade_num <= max_grade) and r.ice_grade_num is not null
      when grade_sys = 'm' then (min_grade is null or r.mixed_grade_num >= min_grade) and (max_grade is null or r.mixed_grade_num <= max_grade) and r.mixed_grade_num is not null
      when grade_sys = 'aid' then (min_grade is null or r.aid_grade_num >= min_grade) and (max_grade is null or r.aid_grade_num <= max_grade) and r.aid_grade_num is not null
      else (grade_sys is null or grade_sys = '' or r.grade_system = grade_sys)
        and (min_grade is null or r.grade_num >= min_grade)
        and (max_grade is null or r.grade_num <= max_grade)
    end)
    and (min_stars is null or coalesce(r.stars, 0) >= min_stars)
    and (min_pitches is null or coalesce(nullif(r.pitches, 0),
         case when r.discipline = 'bouldering' then 0 else 1 end) >= min_pitches)
    and (min_length_m is null or r.length_m >= min_length_m)
    and (max_length_m is null or r.length_m <= max_length_m);
$$;
