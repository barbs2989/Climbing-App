-- 0128 — approved community routes had no `grade_num`, so they sorted behind the catalog.
--
-- #814 built the approval path and its insert lists 27 columns; `grade_num` is not one of
-- them. That column is what both finder RPCs rank on (0018/0019):
--
--     and (min_grade is null or r.grade_num >= min_grade)
--     case when sort_by = 'grade_asc' then r.grade_num end asc nulls last,
--
-- so every climber-approved route landed with a null and sorted behind all ~205k catalog
-- routes under either grade sort. A grade RANGE filter would drop it entirely (NULL >=
-- min_grade is not true); the finder does not offer one today, which is the only reason this
-- reads as a sorting bug rather than an invisible-route bug.
--
-- WHY THE NUMBER IS COMPUTED IN JS AND PASSED IN, rather than parsed here. The arithmetic
-- already exists FOUR times in this repo (scripts/pipeline/load-state.mjs,
-- load-wa-rock-safe.mjs, import-alpine.mjs, oneoff/import-class2-3-routes.mjs). A fifth
-- implementation, in a different language, is precisely the drift this codebase keeps paying
-- for. So `lib/grade.js` exports `gradeNumFor()` — lifted verbatim from load-state.mjs and
-- checked against the live column by scripts/oneoff/verify-grade-num-parity.mjs (98.09%
-- agreement over 8,021 WA rows; the residual is the stored column disagreeing with ITSELF,
-- e.g. "alpine rock" carrying a stored 10) — and the number travels in as an argument.
-- `routes` still has no client INSERT/UPDATE policy (only "routes public read" from 0001),
-- so this SECURITY DEFINER function remains the only thing that can write the row. Only the
-- arithmetic moved out; the authority did not.
--
-- THE DROP IS LOAD-BEARING. Adding a defaulted parameter with `create or replace` does NOT
-- replace the function — a different argument list is a different function, so Postgres would
-- keep BOTH approve_new_route(uuid) and approve_new_route(uuid, numeric). PostgREST resolves
-- an RPC by the argument names it is handed, and two candidates that both accept
-- {p_contribution_id} is an ambiguity, not a preference: the one-arg version could keep being
-- called and keep writing nulls, with nothing failing. Drop the old signature first.
--
-- Idempotent: `drop ... if exists` then `create or replace`, so a re-run is a no-op.
-- Everything else about the function is unchanged from 0127 — same admin gate, same
-- (area_id, name) refusal, same id minting, same verif payload.

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
    source, verif
  ) values (
    new_id, a_id, nm, false, false,
    nullif(btrim(coalesce(v->>'grade','')),''),
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
      -- verbatim, so the seven keys with no column of their own are not lost on approval.
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
