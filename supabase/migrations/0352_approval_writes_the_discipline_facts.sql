-- 0352 — approval writes the eleven facts add-a-climb now asks per discipline.
--
-- The owner asked (2026-10-22) whether adding a climb gives a climber everything the app holds
-- for that discipline. Measured against the route page's own edit sheet (SuggestFix: its FIELDS
-- minus its per-discipline DROP), the add form asked for less on every one of the ten types: no
-- location / anchor / rock quality / wet on crags, no bolts on sport, no rope length, no split
-- rock / ice / alpine grade, no steepest angle. lib/AddRoute.jsx asks now, check:add-route-fields
-- (3b) holds the two forms level, and this function writes what the form sends.
--
-- `approach` needs no new line: approve_new_route has read v->>'approach' since 0135; the form
-- simply stopped sending it when its bucket chips were removed (#1713) and sends a SENTENCE now.
--
-- Generated from 0327's body by INSERTION, not retyping. Same signature, so no drop is needed and
-- 0171's search_path pin is restated in the definition itself. Idempotent.

create or replace function approve_new_route(p_contribution_id uuid, p_grade_num numeric default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
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
    ffa, fwa, alt_names, variations, high_point_ft, sun, pro_tips,
    location, bolts, anchor, fixed_gear, rock_quality, wet, rope_length_m,
    rock_grade, ice_grade, alpine_grade, max_angle,
    verif
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
    -- The seven that became editable on the route page in 0317 (first free / first winter ascent,
    -- alternative names, variations, high point, sun, pro tips) and that add-a-climb now asks for,
    -- so a climber who proposes a route is not asked less than one who corrects it. Same shapes
    -- as the edit sheet writes: alt_names is text[] (unnested like rack), variations and pro_tips
    -- are jsonb string arrays (passed through like what_to_bring), high_point_ft is FEET — the
    -- form converts from the climber's units before submitting, exactly as it does for gain.
    nullif(btrim(coalesce(v->>'ffa','')),''),
    nullif(btrim(coalesce(v->>'fwa','')),''),
    case when jsonb_typeof(v->'altNames') = 'array'
      then (select array_agg(x) from jsonb_array_elements_text(v->'altNames') x) end,
    case when jsonb_typeof(v->'variations') = 'array' then v->'variations' end,
    round(proposal_num(v->>'highPointFt'))::int,
    nullif(btrim(coalesce(v->>'sun','')),''),
    case when jsonb_typeof(v->'proTips') = 'array' then v->'proTips' end,
    -- 0352: the eleven the edit sheet takes per discipline and add-a-climb now asks too
    -- (check:add-route-fields 3b). Each text value is kept only when it fits the column's own
    -- CHECK (anchor 1-80, location / fixed_gear / rock_quality / wet 1-160): a value that would
    -- violate it becomes NULL rather than failing the whole approval. The form caps the same
    -- lengths, so this only matters for a hand-made proposal. Numbers go through proposal_num,
    -- and bolts is held to its own 0-500 CHECK.
    case when char_length(btrim(coalesce(v->>'location',''))) between 1 and 160 then btrim(v->>'location') end,
    case when proposal_num(v->>'bolts') between 0 and 500 then round(proposal_num(v->>'bolts'))::int end,
    case when char_length(btrim(coalesce(v->>'anchor',''))) between 1 and 80 then btrim(v->>'anchor') end,
    case when char_length(btrim(coalesce(v->>'fixedGear',''))) between 1 and 160 then btrim(v->>'fixedGear') end,
    case when char_length(btrim(coalesce(v->>'rockQuality',''))) between 1 and 160 then btrim(v->>'rockQuality') end,
    case when char_length(btrim(coalesce(v->>'wet',''))) between 1 and 160 then btrim(v->>'wet') end,
    round(proposal_num(v->>'ropeLen'))::int,
    nullif(btrim(coalesce(v->>'rockGrade','')),''),
    nullif(btrim(coalesce(v->>'iceGrade','')),''),
    nullif(btrim(coalesce(v->>'alpineGrade','')),''),
    round(proposal_num(v->>'angle'))::int,
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

-- Restated rather than relied upon (0157's note): `create or replace` keeps an existing
-- function's privileges, but the definition should carry them in case it is ever created fresh.
revoke all on function approve_new_route(uuid, numeric) from public, anon;
grant execute on function approve_new_route(uuid, numeric) to authenticated;

comment on function approve_new_route(uuid, numeric) is
  'Admin-only. Turns a pending new_route contribution into a row in routes, minting the id as area_id || ''_'' || route_slug(name) and refusing when (area_id, name) already exists. Returns the new route id. Writes every column the proposal can fill (0157''s set plus ffa, fwa, alt_names, variations, high_point_ft, sun, pro_tips since 0327, and location, bolts, anchor, fixed_gear, rock_quality, wet, rope_length_m, rock_grade, ice_grade, alpine_grade, max_angle since 0352). `routes` itself stays ungranted.';

-- Confirm:  select count(*) from pg_proc where proname = 'approve_new_route';   -- 1
