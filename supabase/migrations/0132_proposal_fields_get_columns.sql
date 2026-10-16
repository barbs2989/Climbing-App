-- 0132 — six fields the contribute form has always collected and could never store.
--
-- Renumbered 0131 -> 0132. This is the FOURTH number the route-proposal work has needed in
-- one afternoon (0125 -> 0126 -> 0127 for the review migration, then 0131 -> 0132 for this
-- one), and every collision was the same shape: main moved between choosing the number and
-- pushing. check:migration-claims compares OPEN PRs, so it sees peer-vs-peer and is
-- structurally blind to this one. The rule that actually works: re-check the free number
-- immediately before pushing, never when you write the file.
--
-- The SQL is ALREADY APPLIED to the live DB (as 0131, verified: 6/6 columns with pads an
-- integer, and approve_new_route still answering P0001 for a non-admin). Every statement is
-- guarded, so a re-run is a no-op and nothing needs running again.
--
-- `var SS={…}` in ClimbMatch.jsx is the allow-list both merge paths consult, and all six of
-- these are in it: a climber's edit to `protRating`, `startType`, `landing`, `pads`, `rock` or
-- `crux` is ACCEPTED, merged onto the route in session state, toasted as recorded — and then
-- lost on reload, because `routes` has no column for any of them.
--
-- Four of the six are worse than merely unstored: `protRating`, `startType`, `landing` and
-- `pads` ALREADY RENDER, in the discipline-agnostic TECH STATS tiles in RouteDetail.jsx. The
-- comment above that block says why it was written — "every one of these is offered in
-- SuggestFix and, until now, rendered nowhere". So the display half was fixed and the storage
-- half was not, which is the exact inverse of the descent_text case (populated on 1,021 routes,
-- rendered on none) and the same underlying mismatch running the other way. See
-- [[log-form-collected-what-it-could-not-store]].
--
-- `rock` (the rock type) and `crux` (what the hard bit actually is) had neither a column nor a
-- reader; both are added here, into that same tile block, so nothing lands in a column with no
-- way to see it.
--
-- NOT ADDED: `rock_style`. The form's seventh orphan key is `rockStyle`, and it is the rock
-- sub-discipline ("trad" / "sport" / "bouldering") — `disc==="rock" ? sub : null`. That is
-- already carried by `discipline`, and giving it a column would create a second source of truth
-- for the same fact, which is how a route ends up filed as sport in one place and trad in
-- another. It stays out deliberately rather than by omission.
--
-- Types are taken from what the existing readers already do, not invented: `prot_rating` is
-- matched against /^(R|X)$/i and /PG/i, `start_type` against the form's Stand/Sit options,
-- `landing` against /bad|danger/i and /slop/i — all text. `pads` is guarded as
-- `route.pads != null && route.pads !== ""` and printed through String(), i.e. a count.

alter table routes add column if not exists prot_rating text;
alter table routes add column if not exists start_type  text;
alter table routes add column if not exists landing     text;
alter table routes add column if not exists pads        integer;
alter table routes add column if not exists rock        text;
alter table routes add column if not exists crux        text;

comment on column routes.prot_rating is
  'Protection rating as climbers write it: PG, PG13, R, X. Rendered in the TECH STATS tiles, coloured red for R/X and amber for PG — the reason the field exists is the runout ones, so keep the letter, not a sentence.';
comment on column routes.start_type is
  'Boulder problem start: Stand or Sit (the two the form offers). Text rather than an enum so a third convention does not need a migration.';
comment on column routes.landing is
  'What you land on, in the words that matter: "bad", "sloping", "flat, clean". The reader colours on /bad|danger/i and /slop/i, so lead with the hazard word rather than burying it.';
comment on column routes.pads is
  'How many crash pads the problem wants. A COUNT, not prose — it is printed straight into a tile.';
comment on column routes.rock is
  'Rock type: granite, basalt, sandstone. A short noun, not a geology paragraph — that belongs in peak_metadata.geology, which has its own home on the description card.';
comment on column routes.crux is
  'What the crux actually is, in a phrase: "thin hands to a slopey topout". Longer beta belongs in `beta`; this is the one-line answer to "what is the hard bit".';

-- ---------------------------------------------------------------- approve, widened
--
-- 0127 introduced this. Replaced whole rather than patched, because a function body cannot be
-- ALTERed in pieces, and the six new columns are read from the SAME proposal jsonb the form has
-- always sent — so approving a route now keeps everything the climber typed instead of parking
-- the remainder in verif.proposal. That fallback stays: it is still the only home for anything
-- the schema does not model.

create or replace function approve_new_route(p_contribution_id uuid)
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
    grade, discipline, pitches,
    length_m, gain_ft, loss_ft, dist_km,
    aspect, approach, season, commitment, descent_text, fa, beta,
    rappels, turnaround, comms,
    features, hazards, gear,
    prot_rating, start_type, landing, pads, rock, crux,
    source, verif
  ) values (
    new_id, a_id, nm, false, false,
    nullif(btrim(coalesce(v->>'grade','')),''),
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
    -- The six the form has always collected and could never store. Four of them
    -- (prot_rating, start_type, landing, pads) ALREADY render in the TECH STATS tiles, so
    -- until this migration they merged into session state and vanished on reload — the
    -- log-form-collected-what-it-could-not-store shape. `pads` is the only integer.
    nullif(btrim(coalesce(v->>'protRating','')),''),
    nullif(btrim(coalesce(v->>'startType','')),''),
    nullif(btrim(coalesce(v->>'landing','')),''),
    proposal_num(v->>'pads')::int,
    nullif(btrim(coalesce(v->>'rock','')),''),
    nullif(btrim(coalesce(v->>'crux','')),''),
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
-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
--   select column_name, data_type from information_schema.columns
--    where table_name='routes' and column_name in
--      ('prot_rating','start_type','landing','pads','rock','crux');
--   -- expect 6 rows; pads integer, the rest text
--
--   select pg_get_functiondef('approve_new_route(uuid)'::regprocedure) like '%prot_rating%';
--   -- expect true
