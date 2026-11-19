-- 0466: a bare or ± YDS grade from 5.10 up sits INSIDE its number: 5.10- = 10.25, 5.10 = 10.5, 5.10+ = 10.75.
--
-- WHY (owner 2026-11-18: "do what you recommend based on online research"). They were stored at the whole number,
-- so 5.10-, 5.10 and 5.10+ all sorted BELOW 5.10a (10.25), and the Route finder's "5.10c and up" dropped every
-- 5.10+ while "up to 5.10a" took in every 5.10+. There is no official mapping; the common reading is 5.10- ≈ a/b,
-- 5.10 ≈ b/c, 5.10+ ≈ c/d (Mountain Project's forum threads on +/- grades), and every reading agrees on the order
-- - < bare < +. A split grade is stored at its FIRST letter, as "5.10b/c" already is (10.5, 246 of 253 slash rows
-- measured 2026-09-16), so - = a, bare = b, + = c; a d (.9, 0464) stays the top of the number. Below 5.10 there are
-- no letters, so 5.9-, 5.9 and 5.9+ stay 9.
--
-- WHAT. (1) picker_grade_num, the SQL twin of lib/grade.js gradeNumFrom for an agreed correction, takes the sign.
-- (2) Every YDS row whose stored whole number came from a bare or ± grade moves up inside it.
--
-- THE SELECTION IS THE PARSER'S, measured before it was written: of 25,576 YDS rows whose grade names a bare or ±
-- 5.10-5.15, the new lib/grade.js moves 25,569 (6,518 by .25, 11,721 by .5, 7,330 by .75), and this WHERE clause
-- with this CASE selects exactly those rows at exactly those values (0 only-here, 0 only-there, 0 value
-- differences). No row leaves its whole number, so the area grade charts (floor) do not change. Six rows whose
-- stored number already disagreed with the parser (aid grades such as "5.10 A3" stored as 3) are not selected.
-- A row is moved only while its stored number is a whole n, its text names 5.n bare or signed, and it names no
-- lettered 5.n (which would already have given it a fraction).
--
-- IN 32 SLICES, EACH ITS OWN TRANSACTION, as 0464 had to be: one UPDATE of 12,470 rows was cancelled by the
-- 2-minute statement timeout inside the chart-total trigger. ~800 rows a slice. The WHERE only selects a row still
-- at a whole number, so a slice re-run, or the file re-run after a stop, moves nothing twice.
-- On a fresh database (a Supabase preview) the UPDATEs match nothing.

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
        + coalesce(
            case substring(t from '^5\.\d+([abcd])') when 'a' then 0.25 when 'b' then 0.5 when 'c' then 0.75 when 'd' then 0.9 end,
            case when (substring(t from '^5\.(\d+)'))::int >= 10 then
              case substring(t from '^5\.\d+([+-])$') when '+' then 0.75 when '-' then 0.25 else 0.5 end
            end,
            0)
      when t ~ '^VB[+-]?$' then -1
      when t ~ '^V\d+[+-]?$' then (substring(t from '^V(\d+)'))::numeric
      when t ~ '^WI\d\+?$' then (substring(t from '^WI(\d)'))::numeric
      when t ~ '^M\d+\+?$' then (substring(t from '^M(\d+)'))::numeric
      when t ~ '^[AC]\d\+?$' then (substring(t from '^[AC](\d)'))::numeric
      when t ~ '^CLASS \d$' then (substring(t from '^CLASS (\d)$'))::numeric
    end
  from (select case when upper(btrim(p)) ~ '^5\.' then lower(btrim(p)) else upper(btrim(p)) end as t) x;
$$;

commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 0;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 1;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 2;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 3;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 4;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 5;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 6;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 7;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 8;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 9;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 10;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 11;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 12;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 13;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 14;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 15;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 16;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 17;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 18;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 19;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 20;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 21;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 22;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 23;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 24;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 25;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 26;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 27;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 28;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 29;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 30;
commit;

begin;
update public.routes
   set grade_num = grade_num + case
         when grade ~ ('5\.' || grade_num::int || '\+') then 0.75
         when grade ~ ('5\.' || grade_num::int || '([^0-9a-d+-]|$|-\s*[0-9])') then 0.5
         else 0.25 end
 where grade_system = 'yds'
   and grade_num = floor(grade_num) and grade_num between 10 and 15
   and grade ~ ('5\.' || grade_num::int || '([^0-9a-d]|$)')
   and grade !~ ('5\.' || grade_num::int || '[a-d]')
   and abs(hashtext(id)) % 32 = 31;
commit;
