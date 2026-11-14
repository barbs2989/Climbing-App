-- AREA PAGES: a season of their own, a climbs-by-discipline count, and climber edits that land.
--
-- An area page (lib/DbAreaBrowser.jsx AreaPage) showed a name, a type, a count and a Google-Maps
-- link. Mountain Project's page for the same crag shows a description, how to get there, a month
-- strip, and "Improve this page". The description, walk-in, parking and rock columns ALREADY
-- existed on `areas` (0001, 0247, 0248, 0249, 0255, 0282) and reached only the route page. This
-- migration adds the three things the page still could not get from the database:
--
--   1. areas.season_months — the months climbers go, as numbers 1–12. ITS OWN FIELD, contributed
--      or researched, NEVER derived from the routes' `season` strings: those wrap the year end
--      ("May-Oct (snow climb Dec-Apr)") and a min-to-max of the months mentioned renders Mount
--      Stuart as "Apr to Dec" (SummitBriefing's note). An ACCESS notice is deliberately NOT added:
--      the owner removed the area-level Access & Permits block on 2026-10-04 and confirmed on
--      2026-10-15 that access stays on the route.
--   2. area_climb_stats(aid) — one call for the chart: climbs per discipline and per grade bucket
--      over the area's SUBTREE (Utah's page must count all of Utah; the page's own route query
--      sees only a leaf). Public, read-only.
--   3. Climber edits to seven area fields, through `contributions` rows carrying area_id and no
--      route_id (the column has been there since 0002; Ranks (0235) and Top Contributors (0148)
--      already count such rows). THE RULE IS THE ROUTE PAGE'S: a fill of an EMPTY field goes live
--      at once; a change to a filled one needs 3 distinct climbers on the same value. Applied by a
--      trigger as 0210 does for grades, so `areas` keeps no client write path at all.
--      The rows that landed are marked 'approved' so Ranks counts a lone empty-field fill (0235
--      counts a field row only when approved or when a second climber filed the same value).
--      guard_contribution_status (0127) lets only is_admin(auth.uid()) change status — and
--      auth.uid() is the SUBMITTER's claim even inside a definer — so it gains the repo's GUC
--      bypass (catalog.applier, the shape 0218 uses for catalog.allow_duplicate). It is recreated
--      WITH its search_path: 0171 pinned that by ALTER, and `create or replace` resets proconfig.
--
-- The seven editable fields are listed ONCE here (contributions_area_field_ck) and once in
-- lib/areaFields.js; check:area-edit-fields fails if the two lists ever differ.

-- ── 1. season_months ───────────────────────────────────────────────────────────────────────

create or replace function public.months_ok(m smallint[]) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select m is null or (
    cardinality(m) between 1 and 12
    and m <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
    and cardinality(m) = (select count(distinct x) from unnest(m) x)
  );
$$;

alter table public.areas add column if not exists season_months smallint[];
alter table public.areas drop constraint if exists areas_season_months_check;
alter table public.areas add constraint areas_season_months_check check (months_ok(season_months));
comment on column public.areas.season_months is
  'Months climbers go here, 1-12, distinct. Contributed or researched; NEVER derived from routes.season (those windows wrap the year end). Rendered as the month strip on the area page.';

-- ── 2. area_climb_stats ────────────────────────────────────────────────────────────────────

-- by_disc counts routes.discipline as stored (the raw column, which is what routes_in_subtree
-- filters on, so a bar's count is the finder's count). by_grade buckets floor(grade_num) within
-- grade_system; rows with no readable grade are in `total` but not in by_grade, and `graded` says
-- how many were, so the page can print "12 of 15 list a grade" instead of a silent gap.
-- ONE pass over the subtree. The first draft took four (total, graded, by_disc, by_grade each
-- re-ran the join) and California answered in 2.9 s against a 3 s statement timeout; the join
-- itself is ~140 ms, so everything is derived from one small grouped set instead.
create or replace function public.area_climb_stats(aid text) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  with g as materialized (
    select r.discipline, r.grade_system,
           case when r.grade_num is not null and r.grade_system is not null then floor(r.grade_num) end as b,
           count(*) as n
      from routes r
      join areas ra on ra.id = r.area_id
      join areas root on root.id = aid
     where ra.path <@ root.path
     group by 1, 2, 3
  )
  select jsonb_build_object(
    'total',  coalesce((select sum(n) from g), 0),
    'graded', coalesce((select sum(n) from g where b is not null), 0),
    'by_disc', coalesce((
      select jsonb_agg(jsonb_build_object('disc', discipline, 'n', n) order by n desc, discipline)
        from (select discipline, sum(n) as n from g where discipline is not null group by 1) d
    ), '[]'::jsonb),
    'by_grade', coalesce((
      select jsonb_agg(jsonb_build_object('sys', grade_system, 'bucket', b, 'n', n) order by grade_system, b)
        from (select grade_system, b, sum(n) as n from g where b is not null group by 1, 2) q
    ), '[]'::jsonb)
  );
$$;
grant execute on function public.area_climb_stats(text) to anon, authenticated;

-- ── 3. Area field edits ────────────────────────────────────────────────────────────────────

-- ONE list of the fields a climber may edit on an area. lib/areaFields.js carries the same seven
-- in the same order; check:area-edit-fields reads this literal.
alter table public.contributions drop constraint if exists contributions_area_field_ck;
alter table public.contributions add constraint contributions_area_field_ck check (
  not (area_id is not null and route_id is null and kind = 'field')
  or field in ('blurb','approach','approach_min','parking_note','rock','aspect','season_months')
);

-- The clustering key: what the app's sameEditValue does for strings (case, whitespace and a
-- trailing full stop do not separate two climbers who agree), plus the two non-string shapes
-- these fields take — a number, and a set of months (order-free, duplicates dropped).
create or replace function public.area_field_norm(v jsonb) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case jsonb_typeof(v)
    when 'string' then nullif(regexp_replace(lower(btrim(regexp_replace(v #>> '{}', '\s+', ' ', 'g'))), '\.$', ''), '')
    when 'number' then (v #>> '{}')
    when 'array'  then (select string_agg(x::text, ',' order by x) from (select distinct (e #>> '{}')::int as x from jsonb_array_elements(v) e where jsonb_typeof(e) = 'number') s)
    else null end;
$$;

create or replace function public.apply_agreed_area_field(p_area_id text, p_field text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a record; win record; cur_empty boolean; raw jsonb; txt text; num numeric; months smallint[];
begin
  if p_field not in ('blurb','approach','approach_min','parking_note','rock','aspect','season_months') then return; end if;
  select * into a from areas where id = p_area_id;
  if not found then return; end if;

  -- Largest group of DISTINCT, named contributors on one normalised value; rejected rows never
  -- count. `raw` is the most recent submission in the group (the value that gets written).
  select s.norm,
         (array_agg(s.value order by s.created_at desc))[1] as raw,
         count(distinct s.contributor) as n,
         array_agg(s.id) as ids
    into win
    from (select c.id, c.value, c.contributor, c.created_at, area_field_norm(c.value) as norm
            from contributions c
           where c.area_id = p_area_id and c.route_id is null and c.kind = 'field' and c.field = p_field
             and coalesce(c.status, 'pending') <> 'rejected'
             and c.contributor is not null and c.contributor not in ('', 'anon')) s
   where s.norm is not null
   group by s.norm
   order by 3 desc, max(s.created_at) desc
   limit 1;
  if win.norm is null then return; end if;

  cur_empty := case p_field
    when 'blurb'         then a.blurb is null or btrim(a.blurb) = ''
    when 'approach'      then a.approach is null or btrim(a.approach) = ''
    when 'approach_min'  then a.approach_min is null
    when 'parking_note'  then a.parking_note is null or btrim(a.parking_note) = ''
    when 'rock'          then a.rock is null or btrim(a.rock) = ''
    when 'aspect'        then a.aspect is null
    when 'season_months' then a.season_months is null or cardinality(a.season_months) = 0
  end;
  if not (win.n >= 3 or cur_empty) then return; end if;

  raw := win.raw;
  -- Validate against the column's own rules (0247 / 0248 / 0249 / 0282 / this file) and write.
  -- A value the column would refuse is left pending rather than raised: the climber's row stays,
  -- the page is unchanged, and an admin can still read it.
  if p_field in ('blurb','approach','parking_note','rock','aspect') then
    if jsonb_typeof(raw) <> 'string' then return; end if;
    txt := btrim(raw #>> '{}');
    if p_field = 'blurb'        and char_length(txt) not between 20 and 1500 then return; end if;
    if p_field = 'approach'     and char_length(txt) not between 1 and 600 then return; end if;
    if p_field = 'parking_note' and char_length(txt) not between 5 and 400 then return; end if;
    if p_field = 'rock'         and char_length(txt) not between 1 and 40 then return; end if;
    if p_field = 'aspect'       and txt not in ('N','NE','E','SE','S','SW','W','NW','varies') then return; end if;
    if p_field = 'blurb'        then if a.blurb        is not distinct from txt then return; end if; update areas set blurb = txt where id = p_area_id; end if;
    if p_field = 'approach'     then if a.approach     is not distinct from txt then return; end if; update areas set approach = txt where id = p_area_id; end if;
    if p_field = 'parking_note' then if a.parking_note is not distinct from txt then return; end if; update areas set parking_note = txt where id = p_area_id; end if;
    if p_field = 'rock'         then if a.rock         is not distinct from txt then return; end if; update areas set rock = txt, rock_basis = 'stated' where id = p_area_id; end if;
    if p_field = 'aspect'       then if a.aspect       is not distinct from txt then return; end if; update areas set aspect = txt where id = p_area_id; end if;
  elsif p_field = 'approach_min' then
    if jsonb_typeof(raw) = 'number' then num := (raw #>> '{}')::numeric;
    elsif jsonb_typeof(raw) = 'string' and btrim(raw #>> '{}') ~ '^\d{1,4}$' then num := (btrim(raw #>> '{}'))::numeric;
    else return; end if;
    if num < 1 or num > 600 then return; end if;
    if a.approach_min is not distinct from num::int then return; end if;
    update areas set approach_min = num::int where id = p_area_id;
  elsif p_field = 'season_months' then
    if jsonb_typeof(raw) <> 'array' then return; end if;
    select array_agg(x order by x) into months
      from (select distinct (e #>> '{}')::smallint as x from jsonb_array_elements(raw) e where jsonb_typeof(e) = 'number') s;
    if months is null or not months_ok(months) then return; end if;
    if a.season_months is not distinct from months then return; end if;
    update areas set season_months = months where id = p_area_id;
  end if;

  -- The rows that landed are approved, so Ranks counts them. The status guard admits this call
  -- through catalog.applier (transaction-local; reset on the way out).
  perform set_config('catalog.applier', 'on', true);
  update contributions
     set status = 'approved', reviewed_at = now(),
         review_note = 'agreed and applied to areas.' || p_field
   where id = any (win.ids) and status = 'pending';
  perform set_config('catalog.applier', 'off', true);
end;
$$;

create or replace function public.trg_apply_agreed_area_field()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind = 'field' and new.area_id is not null and new.route_id is null and new.field is not null then
    perform apply_agreed_area_field(new.area_id, new.field);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contribution_applies_agreed_area_field on public.contributions;
create trigger trg_contribution_applies_agreed_area_field
  after insert on public.contributions
  for each row execute function public.trg_apply_agreed_area_field();

revoke all on function public.apply_agreed_area_field(text, text) from public, anon, authenticated;
revoke all on function public.trg_apply_agreed_area_field() from public, anon, authenticated;

-- ── 4. The status guard admits the applier ─────────────────────────────────────────────────
-- Same body as 0127, plus the bypass, plus the search_path 0171 pinned.

create or replace function public.guard_contribution_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    -- The submitter does not get to choose any of this, whatever they post.
    new.status      := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;
  if coalesce(current_setting('catalog.applier', true), '') = 'on' then return new; end if;
  if new.status is distinct from old.status and not is_admin(auth.uid()) then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  return new;
end $$;

-- Backfill: nothing to apply today (measured 2026-10-15: no area-keyed field rows exist), but a
-- preview database replays this file against whatever it holds, so run it anyway.
select apply_agreed_area_field(area_id, field) from (
  select distinct area_id, field from contributions
   where kind = 'field' and area_id is not null and route_id is null and field is not null
) s;
