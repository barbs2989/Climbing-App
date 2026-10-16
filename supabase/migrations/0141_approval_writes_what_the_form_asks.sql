-- 0141 — the eight fields the form asks for and approval threw away.
--
-- #862 added `overview`; #877 added `face`, `ropeType`, `ropeNote`, `ascender`; and
-- `whatToBring`, `watchOut`, `objHaz` arrived with them. All eight are offered by AddRoute,
-- allow-listed in `SS`, accepted by the INSERT into `contributions`, and toasted as submitted.
-- `approve_new_route` wrote none of them, so every one was dropped the moment an admin
-- approved the climb. All eight columns already exist on `routes`.
--
-- THIS IS THE THIRD TIME. 0132 dropped `grade_num`; 0135 merged that fork; and the form has
-- been widened twice since without the approval following. The shape is always the same and it
-- always reviews as finished, because the form, the allow-list and the display are each
-- correct on their own -- only the write between them is missing. See
-- [[two-migrations-forked-one-function]].
--
-- `check:approve-route-columns` could not see it: it guards the function against LOSING a
-- column it once wrote, which is a different question from whether the form offers something
-- the function never wrote at all. `check:add-route-fields` could not see it either: it proves
-- a field is in `SS`, which makes session-merge work and says nothing about approval. The rule
-- connecting the two ships with this migration.
--
-- Generated from 0135's body by INSERTION rather than retyping, because retyping a 200-line
-- function is how 0132 lost a column in the first place. Everything else is unchanged: same
-- admin gate, same (area_id, name) refusal, same id minting, same verif payload.
--
-- Five are text. what_to_bring / watch_out / obj_haz are JSONB arrays -- the form builds them
-- with linesOf(), one item per line -- so they are passed through only when they really are
-- arrays, exactly as gear/features/hazards already are.
--
-- Idempotent: drop-if-exists then create-or-replace, so a re-run is a no-op.

drop function if exists approve_new_route(uuid);

create or replace function approve_new_route(p_contribution_id uuid, p_grade_num numeric default null)
returns text
language plpgsql security definer as $$
declare
  c        contributions;
  v        jsonb;
  nm       text;
  a_id     text;
  base_id  text;
  new_id   text;
  n        int := 2;
begin
  if not is_admin(auth.uid()) then
    raise exception 'only an admin can approve a route proposal';
  end if;

  select * into c from contributions where id = p_contribution_id;
  if c.id is null then
    raise exception 'no contribution with id %', p_contribution_id;
  end if;
  if c.kind <> 'new_route' then
    raise exception 'contribution % is kind %, not new_route', p_contribution_id, c.kind;
  end if;
  if c.status <> 'pending' then
    raise exception 'contribution % is already %', p_contribution_id, c.status;
  end if;

  v  := coalesce(c.value, '{}'::jsonb);
  nm := btrim(coalesce(v->>'name',''));
  if nm = '' then
    raise exception 'proposal % carries no route name', p_contribution_id;
  end if;

  a_id := c.area_id;
  if a_id is null then
    raise exception 'proposal % names no area, so it cannot be filed anywhere', p_contribution_id;
  end if;
  if not exists (select 1 from areas where id = a_id) then
    raise exception 'proposal % points at area %, which does not exist', p_contribution_id, a_id;
  end if;

  -- `(area_id, name)` is the identity that actually means "the same climb" — the same test
  -- load-state.mjs preflights on. Refuse rather than mint a near-duplicate.
  if exists (
    select 1 from routes r
     where r.area_id = a_id and lower(btrim(r.name)) = lower(nm)
  ) then
    raise exception 'area % already holds a route named % — resolve that duplicate before approving', a_id, nm;
  end if;

  base_id := a_id || '_' || route_slug(nm);
  if base_id = a_id || '_' then
    raise exception 'route name % slugifies to nothing usable', nm;
  end if;
  new_id := base_id;
  -- Only fires on a genuine id clash with a DIFFERENT climb (same slug, different name).
  while exists (select 1 from routes where id = new_id) loop
    new_id := base_id || '_' || n;
    n := n + 1;
    if n > 50 then
      raise exception 'could not mint a free id from %', base_id;
    end if;
  end loop;

  insert into routes (
    id, area_id, name, classic, auto_generated,
    grade, grade_num, discipline, pitches,
    length_m, gain_ft, loss_ft, dist_km,
    aspect, approach, season, commitment, descent_text, fa, beta,
    rappels, turnaround, comms,
    features, hazards, gear,
    prot_rating, start_type, landing, pads, rock, crux,
    overview, face, rope_type, rope_note, ascender, what_to_bring, watch_out, obj_haz,
    source, verif
  ) values (
    new_id, a_id, nm, false, false,
    nullif(btrim(coalesce(v->>'grade','')),''),
    -- from 0128. Both finder RPCs (0018/0019) rank and filter on this column, so a null
    -- sorts a community route behind all ~205k catalog routes under either grade sort.
    p_grade_num,
    nullif(btrim(coalesce(v->>'discipline','')),''),
    proposal_num(v->>'pitchCount')::int,
    -- the form asks for height in FEET (its own local preview does routeFt = height), so
    -- length_m is a conversion, not a copy. Same for dist: the form asks in MILES.
    round(proposal_num(v->>'length') * 0.3048)::int,
    proposal_num(v->>'gain')::int,
    proposal_num(v->>'loss')::int,
    round(proposal_num(v->>'dist') * 1.609344, 3),
    nullif(btrim(coalesce(v->>'aspect','')),''),
    nullif(btrim(coalesce(v->>'approach','')),''),
    nullif(btrim(coalesce(v->>'season','')),''),
    nullif(btrim(coalesce(v->>'commit','')),''),
    nullif(btrim(coalesce(v->>'descentText','')),''),
    nullif(btrim(coalesce(v->>'fa','')),''),
    nullif(btrim(coalesce(v->>'beta','')),''),
    nullif(btrim(coalesce(v->>'rap','')),''),
    nullif(btrim(coalesce(v->>'turn','')),''),
    nullif(btrim(coalesce(v->>'comms','')),''),
    case when jsonb_typeof(v->'style') = 'array'
      then (select array_agg(x) from jsonb_array_elements_text(v->'style') x) end,
    case when jsonb_typeof(v->'haz') = 'array'
      then (select array_agg(x) from jsonb_array_elements_text(v->'haz') x) end,
    case when jsonb_typeof(v->'gear') in ('object','array') then v->'gear' end,
    -- from 0132. The six the form has always collected and could never store. Four of them
    -- (prot_rating, start_type, landing, pads) already render in the TECH STATS tiles.
    -- `pads` is the only integer — it is printed straight into a tile as a count.
    nullif(btrim(coalesce(v->>'protRating','')),''),
    nullif(btrim(coalesce(v->>'startType','')),''),
    nullif(btrim(coalesce(v->>'landing','')),''),
    proposal_num(v->>'pads')::int,
    nullif(btrim(coalesce(v->>'rock','')),''),
    nullif(btrim(coalesce(v->>'crux','')),''),
    -- The eight the form has offered since #862/#877 and approval silently dropped.
    -- Five are text; what_to_bring / watch_out / obj_haz are JSONB arrays, built by the form's
    -- linesOf() helper, so they are passed through only when they really are arrays -- the same
    -- guard the gear/features/hazards values above use.
    nullif(btrim(coalesce(v->>'overview','')),''),
    nullif(btrim(coalesce(v->>'face','')),''),
    nullif(btrim(coalesce(v->>'ropeType','')),''),
    nullif(btrim(coalesce(v->>'ropeNote','')),''),
    nullif(btrim(coalesce(v->>'ascender','')),''),
    case when jsonb_typeof(v->'whatToBring') = 'array' then v->'whatToBring' end,
    case when jsonb_typeof(v->'watchOut')    = 'array' then v->'watchOut' end,
    case when jsonb_typeof(v->'objHaz')      = 'array' then v->'objHaz' end,
    -- `source` is DATA PROVENANCE (openbeta, a state import), NOT the form's "where did you
    -- learn this" answer. Writing "My own ascent" here would corrupt the column the pipeline
    -- reads. That answer stays in verif.proposal below.
    'community',
    jsonb_build_object(
      'community_submitted', true,
      'contribution_id',     p_contribution_id,
      'submitted_by',        c.contributor,
      'approved_by',         auth.uid(),
      'approved_at',         now(),
      -- verbatim, so anything with no column of its own is not lost on approval. With the six
      -- above now stored, `rockStyle` is the only form key left with no column — deliberately,
      -- since `discipline` already carries that fact (0132 explains why a second home for it
      -- would be a second source of truth).
      'proposal',            v
    )
  );

  update contributions
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_contribution_id;

  -- route_count is maintained by the existing trigger on `routes`, so every ancestor of
  -- a_id updates itself. Do NOT recount by hand here.
  return new_id;
end $$;

-- Restated rather than relied upon. `create or replace` preserves the privileges of an
-- existing function, but the `drop` above may have removed the only one that carried them.
revoke all on function approve_new_route(uuid, numeric) from public, anon;
grant execute on function approve_new_route(uuid, numeric) to authenticated;

comment on function approve_new_route(uuid, numeric) is
  'Admin-only. Turns a pending new_route contribution into a row in routes, minting the id as area_id || ''_'' || route_slug(name) and refusing when (area_id, name) already exists. Returns the new route id. Writes all 33 columns the proposal can fill, including grade_num (0128) and the six tech-stat fields (0132) — two forks that this migration merged. `routes` itself stays ungranted.';

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
-- A pasted script is ONE transaction: a failing SELECT rolls back everything above it.
-- Run each of these on its own.
--
-- 1. Exactly ONE overload must survive, and it must take two arguments:
--
--   select p.oid::regprocedure::text
--     from pg_proc p where p.proname = 'approve_new_route';
--   -- expect exactly 1 row: approve_new_route(uuid,numeric)
--
-- 2. The insert must name all six 0132 columns AND grade_num. Reading the body back is the
--    only check that distinguishes this from either fork, since both answer P0001 to a
--    non-admin and that is what made the original defect pass review:
--
--   select count(*) filter (where prosrc like '%grade_num%')   as has_grade_num,
--          count(*) filter (where prosrc like '%prot_rating%') as has_prot_rating,
--          count(*) filter (where prosrc like '%start_type%')  as has_start_type,
--          count(*) filter (where prosrc like '%landing%')     as has_landing,
--          count(*) filter (where prosrc like '%pads%')        as has_pads,
--          count(*) filter (where prosrc like '%crux%')        as has_crux
--     from pg_proc where proname = 'approve_new_route';
--   -- expect 1 for every column
