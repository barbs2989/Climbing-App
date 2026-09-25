-- A grade the climbers AGREED on now reaches the routes row, so the route finder's grade ranges
-- (routes_in_subtree reads grade_num / grade_system and, for WI / M / A-C, the per-scale columns
-- 0206 added) can find it. Approved by the owner 2026-09-24.
--
-- Until now a grade correction was a `contributions` row (kind 'field', field 'grade') that the app
-- laid over the route IN THE BROWSER once it passed the agreement rule — and nothing wrote it to
-- `routes`. So the route page showed the corrected grade while search kept filtering on the old one.
-- Measured before writing this: 0 grade corrections exist, so this changes no row today.
--
-- THE RULE IS THE APP'S, NOT A NEW ONE (ClimbMatch.jsx, the dbContribs merge): group the route's
-- grade corrections by value, count DISTINCT contributors per value, take the largest group, and
-- apply it when it has 3 or more climbers — or when the route has no grade yet. Values compare
-- case- and whitespace-insensitively, as `sameEditValue` does for strings. Rejected rows never count.
--
-- ONLY PICKER GRADES ARE APPLIED. The contribute form's grade picker offers a fixed vocabulary
-- (ADDR_YDS / ADDR_VS / ADDR_WIS / ADDR_MS / ADDR_AIDS / ADDR_CLS in ClimbMatchCore.jsx), and
-- picker_grade_num() converts exactly those shapes to the number lib/grade.js gradeNumFrom gives —
-- scripts/oneoff/probe-picker-grade-num-parity.mjs checks every picker entry against it, live.
-- Anything else (the free-text fallback, an alpine grade) converts to nothing and is never applied:
-- this is deliberately NOT a second general grade parser.
--
-- AND ONLY ON A SCALE THE DISCIPLINE USES, so a stray token cannot move a sport route onto the V
-- scale. Alpine and mountaineering are excluded: their picker offers commitment / alpine grades,
-- which the finder cannot range over.
--
-- Only a trigger calls these, and it runs as the definer; nobody can call them directly.

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
        + coalesce(position(substring(t from '^5\.\d+([abcd])') in 'abcd')::numeric / 4, 0)
      when t ~ '^VB[+-]?$' then -1
      when t ~ '^V\d+[+-]?$' then (substring(t from '^V(\d+)'))::numeric
      when t ~ '^WI\d\+?$' then (substring(t from '^WI(\d)'))::numeric
      when t ~ '^M\d+\+?$' then (substring(t from '^M(\d+)'))::numeric
      when t ~ '^[AC]\d\+?$' then (substring(t from '^[AC](\d)'))::numeric
      when t ~ '^CLASS \d$' then (substring(t from '^CLASS (\d)$'))::numeric
    end
  from (select case when upper(btrim(p)) ~ '^5\.' then lower(btrim(p)) else upper(btrim(p)) end as t) x;
$$;

create or replace function public.apply_agreed_grade(p_route_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record; win record; conv record; allowed text[];
begin
  select id, discipline, grade into r from routes where id = p_route_id;
  if not found then return; end if;

  allowed := case r.discipline
    when 'sport' then array['yds'] when 'trad' then array['yds'] when 'toprope' then array['yds']
    when 'bouldering' then array['v'] when 'ice' then array['wi', 'yds']
    when 'mixed' then array['m', 'yds'] when 'aid' then array['aid', 'yds']
    when 'scrambling' then array['class'] when 'hiking' then array['class']
    else array[]::text[] end;
  if cardinality(allowed) = 0 then return; end if;

  -- `raw` is the MOST COMMON spelling in the agreeing group, not the alphabetically first: the
  -- picker submits "WI5", and a lone hand-typed "wi5" in the group must not become the stored grade
  -- (measured in the rollback test — min() picked "wi5" out of WI5 / wi5 / WI5).
  select upper(btrim(c.value #>> '{}')) as key,
         mode() within group (order by btrim(c.value #>> '{}')) as raw,
         count(distinct c.contributor) as n
    into win
    from contributions c
   where c.route_id = p_route_id and c.kind = 'field' and c.field = 'grade'
     and jsonb_typeof(c.value) = 'string' and coalesce(c.status, 'pending') <> 'rejected'
   group by 1
   order by 3 desc, max(c.created_at) desc
   limit 1;
  if win.key is null then return; end if;
  if not (win.n >= 3 or r.grade is null or btrim(r.grade) = '') then return; end if;

  select * into conv from picker_grade_num(win.raw);
  if conv.sys is null or conv.num is null or not (conv.sys = any (allowed)) then return; end if;
  if r.grade is not distinct from win.raw then return; end if;

  update routes set
    grade = win.raw, grade_system = conv.sys, grade_num = conv.num,
    ice_grade_num   = case when conv.sys = 'wi'  then conv.num else ice_grade_num end,
    mixed_grade_num = case when conv.sys = 'm'   then conv.num else mixed_grade_num end,
    aid_grade_num   = case when conv.sys = 'aid' then conv.num else aid_grade_num end
  where id = p_route_id;
end;
$$;

create or replace function public.trg_apply_agreed_grade()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind = 'field' and new.field = 'grade' and new.route_id is not null then
    perform apply_agreed_grade(new.route_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contribution_applies_agreed_grade on contributions;
create trigger trg_contribution_applies_agreed_grade
  after insert on contributions
  for each row execute function trg_apply_agreed_grade();

revoke all on function public.apply_agreed_grade(text) from public, anon, authenticated;
revoke all on function public.trg_apply_agreed_grade() from public, anon, authenticated;

-- Backfill: apply whatever has already been agreed (0 grade corrections at time of writing).
select apply_agreed_grade(route_id) from (
  select distinct route_id from contributions where kind = 'field' and field = 'grade' and route_id is not null
) s;
