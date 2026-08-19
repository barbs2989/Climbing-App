-- 0154 — the day-by-day itinerary, buildable at creation time.
--
-- The last of the four structured fields a route page shows that the add-a-route form could not
-- supply. With this, every field the form offers is written by the approval — rule 4 of
-- check:approve-route-columns holds at 40/40.
--
-- The form reuses `ItineraryEditor` and `itinDraftToStructured` VERBATIM. Both are already
-- module-level in ClimbMatchCore and already drive the crew planner and SuggestFix, so there is
-- no new editor to keep in step — building a second day editor is exactly the drift this repo
-- keeps paying for (four grade parsers, two rack readers, two forked approvals).
--
-- Offered only on the disciplines whose outings can span days: alpine, mountaineering,
-- scrambling, hiking, ice, mixed. A single-pitch sport route does not need a day plan.
--
-- Generated from 0153's body by insertion, not retyping. Idempotent.

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
    best_season, outing_shape, rappel_count_note, alpine_draws, rack,
    pitch_detail,
    road, access, timing,
    itinerary,
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
    -- Five more the form now asks for.
    nullif(btrim(coalesce(v->>'bestSeason','')),''),
    -- outing_shape is a VOCABULARY the app computes with, not prose: 'outback' means round
    -- trip = 2 x dist_km, while 'loop' and 'point' mean doubling is wrong. Anything outside
    -- the three known values becomes NULL rather than a string the distance maths would
    -- silently mis-read; NULL is already the documented "not established" state (0087).
    case when v->>'outingShape' in ('outback','loop','point') then v->>'outingShape' end,
    nullif(btrim(coalesce(v->>'rappelCountNote','')),''),
    proposal_num(v->>'alpineDraws')::int,
    -- rack is text[], unlike what_to_bring/watch_out/obj_haz which are jsonb, so the jsonb
    -- array the form builds is unnested into a real array rather than passed through.
    case when jsonb_typeof(v->'rack') = 'array'
      then (select array_agg(x) from jsonb_array_elements_text(v->'rack') x) end,
    -- The pitch/stage table, built row by row in the form. Passed through only when it really
    -- is an array, like the other jsonb columns. The builder drops empty rows and empty keys
    -- before submitting, so this cannot land [{"pitch":"","grade":""}] and make a route look
    -- documented when nothing was typed.
    --
    -- NOTE it does NOT touch `pitches`. On a walk-up these entries are STAGES rather than roped
    -- pitches, so deriving the count from the row count would overstate almost every scramble
    -- in the catalog.
    case when jsonb_typeof(v->'pitchDetail') = 'array' then v->'pitchDetail' end,
    -- The three jsonb OBJECTS a climber can now fill in at creation time. Passed through only
    -- when they really are objects, the same guard the array columns above use. The form emits
    -- null rather than {} when nothing was typed, so an empty object cannot land here and make
    -- a route look documented.
    --
    -- The SUB-KEYS are not validated here on purpose. They come from lib/objKeys.js, which is
    -- the single list SuggestFix and AddRoute both render, so the canonical spelling is settled
    -- at the form rather than re-litigated in SQL — `access` in particular has two land-manager
    -- spellings and only one is what the panel reads first. Re-checking them here would be a
    -- second source of truth for the same fact.
    case when jsonb_typeof(v->'road')   = 'object' then v->'road'   end,
    case when jsonb_typeof(v->'access') = 'object' then v->'access' end,
    case when jsonb_typeof(v->'timing') = 'object' then v->'timing' end,
    -- The day-by-day plan. An OBJECT ({days:[...]}), not an array, unlike pitch_detail —
    -- itinDraftToStructured also carries `cal` and `totalNote` alongside the days.
    --
    -- The form emits null rather than {days:[]} when the builder was left untouched, because
    -- itinDraftToStructured already drops days with nothing in them. An empty object here would
    -- read as a documented plan that happens to have no days, which is not the same claim as
    -- having no plan.
    case when jsonb_typeof(v->'itinerary') = 'object' then v->'itinerary' end,
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
