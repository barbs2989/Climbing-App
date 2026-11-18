-- 0464: a 5.xd grade is stored INSIDE its own number — 5.10d = 10.9, no longer 11.
--
-- WHY (route finder audit, 2026-11-18). grade_num put the four letters on quarter steps, a .25 … d +1, so
-- 5.10d was stored as 11: the same number as a bare 5.11, 5.11- and 5.11+. Two screens then disagreed:
--   * the area GRADE SPREAD buckets floor(grade_num) (0421), so every 5.10d was drawn in the 5.11 bar;
--   * the Route finder's "5.10a–5.10d" range ends at 11 inclusive, so it took in every bare 5.11.
-- Leavenworth's 5.10 bar read 347 climbs and opened a list of 435 (32 5.10d + 57 bare/± 5.11 at 11);
-- its 5.11 bar 177 → 208, 5.12 62 → 74. Climbing's own convention puts d inside its number (Mountain
-- Project: 5.10+ ≈ 5.10d, 5.11- ≈ 5.11a; lib/grade.js YDS_CONV). .9 keeps the order 5.10c < 5.10d <
-- bare 5.11 < 5.11a, and floor() now files a d with its own number.
--
-- WHAT. (1) picker_grade_num (0210), the SQL twin of lib/grade.js gradeNumFrom for an agreed grade
-- correction, takes d as .9. (2) Every YDS row whose stored number came from a d letter moves down 0.1.
--
-- THE SELECTION IS THE PARSER'S, measured before it was written: of the 12,484 YDS rows whose grade
-- names a d, the new lib/grade.js changes 12,470, and this WHERE clause selects exactly those 12,470
-- (0 only-here, 0 only-there), each to stored − 0.1. A row is moved only when its stored number is a
-- whole n, its text names (n-1)d, and nothing in it reads as a bare 5.n (which would keep it at n).
-- Two rows whose stored number already disagreed with the parser (co_crescent_wall_cool_aid,
-- ut_playing_hooky: aid grades) are not selected, so this writes no pre-existing drift.
--
-- The area chart totals follow by trigger (trg_routes_area_rollup fires on grade_num).
-- On a fresh database (a Supabase preview) the UPDATE matches nothing.

begin;

create or replace function public.picker_grade_num(p text, out sys text, out num numeric)
language sql immutable set search_path = public, pg_temp as $$
  select
    case
      when t ~ '^5\.\d+[abcd]?[+-]?$' then 'yds'
      when t ~ '^V(B|\d+)[+-]?$' then 'v'
      when t ~ '^WI\d\+?$' then 'wi'
      when t ~ '^M\d+\+?$' then 'm'
      when t ~ '^[AC]\d\+?$' then 'aid'
      when t ~ '^CLASS \d$' then 'class'
    end,
    case
      when t ~ '^5\.\d+[abcd]?[+-]?$' then
        (substring(t from '^5\.(\d+)'))::numeric
        + coalesce(case substring(t from '^5\.\d+([abcd])') when 'a' then 0.25 when 'b' then 0.5 when 'c' then 0.75 when 'd' then 0.9 end, 0)
      when t ~ '^VB[+-]?$' then -1
      when t ~ '^V\d+[+-]?$' then (substring(t from '^V(\d+)'))::numeric
      when t ~ '^WI\d\+?$' then (substring(t from '^WI(\d)'))::numeric
      when t ~ '^M\d+\+?$' then (substring(t from '^M(\d+)'))::numeric
      when t ~ '^[AC]\d\+?$' then (substring(t from '^[AC](\d)'))::numeric
      when t ~ '^CLASS \d$' then (substring(t from '^CLASS (\d)$'))::numeric
    end
  from (select case when upper(btrim(p)) ~ '^5\.' then lower(btrim(p)) else upper(btrim(p)) end as t) x;
$$;

update public.routes
   set grade_num = grade_num - 0.1
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 11 and 16
   and grade ~ ('(5\.|/\s*)' || (grade_num::int - 1) || 'd')
   and grade !~ ('5\.' || grade_num::int || '([^0-9]|$)')
   and grade !~ ('/\s*' || grade_num::int || '([^0-9.a-z]|$)');

commit;
