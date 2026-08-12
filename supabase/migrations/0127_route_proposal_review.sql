-- 0127 — the CONSUME half of the add-a-route flow.
--
-- Renumbered twice, 0125 -> 0126 -> 0127. main took 0125 for black_peak_under_washington_pass
-- while this was being verified, and #812 (Fifty Classics, Canada) then claimed 0126 as well.
-- 0127 was chosen over waiting because #812 has to renumber its OWN 0125 regardless — that one
-- collides with main, not with a peer — so moving this file unblocks both instead of one.
--
-- The SQL below is ALREADY APPLIED to the live DB (applied as 0125 on
-- 2026-08-12 and verified: 12 columns on contributions, route_slug correct, the admin gate
-- returning P0001, and a submitter-set status overwritten to pending). The number is
-- bookkeeping for check:migrations; the database does not read the filename. Do not re-run
-- expecting a change — every statement is guarded (add column if not exists / create or
-- replace / drop trigger if exists), so a re-run is a no-op.
--
-- #794 made the submit half real: `AddRoute` files a `new_route` row into `contributions`,
-- verified against the live DB (signed-in INSERT 201, `contributor` stamped from the JWT).
-- Nothing has ever read those rows. Grep `new_route` across the app and you find the write
-- site and a comment — there is no `createRoute` anywhere, and `lib/db.js` has 100+ exports
-- of which none inserts into `routes`. So a climber's proposal is accepted, toasted as
-- "Submitted for review", and can never become a route. The form is honest about filing it
-- and silent about the fact that nothing downstream exists.
--
-- Two things were missing, and they are separate:
--
--   1. `contributions` had no review STATE at all — 8 columns, no status. A proposal could
--      not be marked approved or rejected even by hand.
--   2. There was no way to turn one into a row in `routes`.
--
-- WHY AN RPC AND NOT A CLIENT INSERT. `routes` is a 205k-row catalog that the whole app
-- reads. Granting `authenticated` INSERT on it would put catalog integrity behind a policy
-- predicate, and the rules that keep this table coherent are not expressible there: the id
-- convention (`area_id || '_' || slug(name)`, see the route-identity notes in CLAUDE.md),
-- the `(area_id, name)` duplicate refusal, and "never let the submitter choose `source` or
-- `verif`". So approval is a SECURITY DEFINER function that admins call and nobody else can,
-- and `routes` stays ungranted. Same shape as `verify_my_email()` in 0085.
--
-- WHY A TRIGGER AND NOT AN INSERT-POLICY REWRITE. The INSERT policy on `contributions` is
-- contested right now — 0079/0080/#561/#797 have gone back and forth on whether anonymous
-- contributions are allowed, and as of 2026-08-12 the live DB accepts an anon INSERT (201,
-- `contributor` null) whatever 0080 intended. That question is being settled elsewhere.
-- Rewriting the policy here would collide with it, so `status` is defended by a BEFORE
-- trigger instead, which holds regardless of which INSERT policy wins. It also closes the
-- self-approval hole [[insert-policies-must-constrain-status]] records: the submitter cannot
-- set `status` at insert time, because the trigger overwrites it.
--
-- NOT INCLUDED, deliberately: widening the form from ~47 to ~85 columns. Seven keys the form
-- already collects have no column to land in (`rockStyle`, `rock`, `protRating`, `crux`,
-- `landing`, `pads`, `startType`) — they are preserved verbatim in `verif.proposal` rather
-- than dropped, so approving a route loses nothing, and adding those columns is its own
-- change. See [[log-form-collected-what-it-could-not-store]] for this exact shape.

-- ---------------------------------------------------------------- review state

alter table contributions add column if not exists status      text not null default 'pending';
alter table contributions add column if not exists reviewed_by  uuid references profiles(id);
alter table contributions add column if not exists reviewed_at  timestamptz;
alter table contributions add column if not exists review_note  text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contributions_status_chk') then
    alter table contributions
      add constraint contributions_status_chk check (status in ('pending','approved','rejected'));
  end if;
end $$;

create index if not exists contributions_pending_idx
  on contributions(kind, status, created_at desc);

comment on column contributions.status is
  'pending | approved | rejected. Forced to ''pending'' on INSERT by trg_contribution_status; only an admin can move it afterwards. A submitter cannot self-approve.';

-- ---------------------------------------------------------------- status guard

create or replace function guard_contribution_status() returns trigger
language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    -- The submitter does not get to choose any of this, whatever they post.
    new.status      := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;
  if new.status is distinct from old.status and not is_admin(auth.uid()) then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  return new;
end $$;

drop trigger if exists trg_contribution_status on contributions;
create trigger trg_contribution_status
  before insert or update on contributions
  for each row execute function guard_contribution_status();

-- ---------------------------------------------------------------- helpers

-- Route ids are `area_id || '_' || slug(name)`. Kept in SQL so the id cannot be minted
-- differently by a different caller — the root cause behind migrations 0044-0046 writing
-- to nothing was ids composed client-side from display names.
create or replace function route_slug(txt text) returns text
language sql immutable as $$
  select trim(both '_' from regexp_replace(lower(coalesce(txt,'')), '[^a-z0-9]+', '_', 'g'));
$$;

-- The form posts every number as a STRING, and empty fields as '' or null. A bare cast
-- would raise 22P02 on '' and abort an otherwise good approval, so anything that is not
-- plainly numeric becomes null rather than an error.
create or replace function proposal_num(t text) returns numeric
language sql immutable as $$
  select case when btrim(coalesce(t,'')) ~ '^-?\d+(\.\d+)?$' then btrim(t)::numeric else null end;
$$;

-- ---------------------------------------------------------------- approve

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

-- ---------------------------------------------------------------- reject

create or replace function reject_new_route(p_contribution_id uuid, p_note text default null)
returns void
language plpgsql security definer as $$
declare c contributions;
begin
  if not is_admin(auth.uid()) then
    raise exception 'only an admin can reject a route proposal';
  end if;
  select * into c from contributions where id = p_contribution_id;
  if c.id is null then
    raise exception 'no contribution with id %', p_contribution_id;
  end if;
  if c.status <> 'pending' then
    raise exception 'contribution % is already %', p_contribution_id, c.status;
  end if;
  update contributions
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = nullif(btrim(coalesce(p_note,'')),'')
   where id = p_contribution_id;
end $$;

revoke all on function approve_new_route(uuid) from public, anon;
revoke all on function reject_new_route(uuid, text) from public, anon;
grant execute on function approve_new_route(uuid) to authenticated;
grant execute on function reject_new_route(uuid, text) to authenticated;

comment on function approve_new_route(uuid) is
  'Admin-only. Turns a pending new_route contribution into a row in routes, minting the id as area_id || ''_'' || route_slug(name) and refusing when (area_id, name) already exists. Returns the new route id. `routes` itself stays ungranted.';

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
-- A pasted script is ONE transaction: a failing SELECT rolls back everything above it.
-- Run each of these on its own.
--
--   select column_name from information_schema.columns
--    where table_name='contributions' and column_name in ('status','reviewed_by','reviewed_at','review_note');
--   -- expect 4 rows
--
--   select proname from pg_proc
--    where proname in ('approve_new_route','reject_new_route','route_slug','proposal_num','guard_contribution_status');
--   -- expect 5 rows
--
--   select tgname from pg_trigger where tgname = 'trg_contribution_status';
--   -- expect 1 row
--
--   select route_slug('North Ridge (Complete)');
--   -- expect north_ridge_complete
