-- A route edit goes live on its own in two cases (owner, 2026-10-15, superseding "every edit is
-- held" from 0307–0309 for ROUTE fields):
--
--   1. THE FIELD IS EMPTY. Adding something where the page has nothing goes straight in — the
--      first contribution sets the value, as theCrag's first grade contribution does.
--   2. TWO CLIMBERS AGREE. An edit to a field that already holds a value waits until a SECOND,
--      different climber sends the same value (the route page's "Agree" button sends it verbatim;
--      two independent entries match after _edit_value_norm). Google Maps publishes a suggested
--      edit the same way once other people confirm it in "Check the facts".
--
-- Everything else in 0307–0309 stands: a HIGH field is still locked (the insert guard runs
-- first), the rate limit and contribution standing still refuse, an edit with no second climber
-- still waits in the owner's queue and the owner can approve it alone. Area edits (0319) are
-- untouched — still held. A climber's agreement lands as `approved` with reviewed_by NULL and
-- review_note naming the rule, so the owner's own approvals stay distinguishable; an
-- auto-applied field is NOT raised to high (only the owner's check locks a field).

-- ── 1. When two values are "the same" ──────────────────────────────────────────────────────
-- Case-, whitespace- and trailing-full-stop-blind for strings; a numeric string equals its
-- number; arrays keep their order; objects drop empty members. Deliberately STRICTER than the
-- client's sameEditValue (no tolerance on numbers): a near miss waits for the owner, it does not
-- go live.
create or replace function public._edit_value_norm(v jsonb) returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare t text; s text; res jsonb;
begin
  if v is null then return 'null'::jsonb; end if;
  t := jsonb_typeof(v);
  if t = 'string' then
    s := regexp_replace(btrim(lower(v #>> '{}')), '\s+', ' ', 'g');
    s := regexp_replace(s, '\.+$', '');
    if s ~ '^-?[0-9]+(\.[0-9]+)?$' then return to_jsonb(s::numeric); end if;
    return to_jsonb(s);
  elsif t = 'array' then
    select coalesce(jsonb_agg(public._edit_value_norm(e) order by o), '[]'::jsonb) into res
      from jsonb_array_elements(v) with ordinality as a(e, o);
    return res;
  elsif t = 'object' then
    select coalesce(jsonb_object_agg(k, public._edit_value_norm(e)), '{}'::jsonb) into res
      from jsonb_each(v) as a(k, e)
     where not (e = 'null'::jsonb or (jsonb_typeof(e) = 'string' and btrim(e #>> '{}') = ''));
    return res;
  end if;
  return v;
end;
$$;

-- ── 2. Is the field empty on the page? ─────────────────────────────────────────────────────
-- Its column is empty (the same test route_field_level uses) AND no climber's edit to it has
-- been approved — an approved edit is what the page shows, even though it lives in
-- contributions rather than the column.
create or replace function public.route_field_is_empty(p_route_id text, p_field text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare col text; v jsonb;
begin
  if exists (select 1 from contributions c where c.route_id = p_route_id and c.kind = 'field'
              and c.field = p_field and c.status = 'approved') then return false; end if;
  select column_name into col from contribution_fields where form_key = p_field;
  if not found then return false; end if;           -- an unknown key is never "empty"
  if col is null then return true; end if;
  select to_jsonb(r) -> col into v from routes r where r.id = p_route_id;
  return v is null or v = 'null'::jsonb
    or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '')
    or (jsonb_typeof(v) = 'array'  and jsonb_array_length(v) = 0)
    or (jsonb_typeof(v) = 'object' and v = '{}'::jsonb);
end;
$$;
revoke all on function public.route_field_is_empty(text, text) from public;
grant execute on function public.route_field_is_empty(text, text) to anon, authenticated;

-- ── 3. The level: a field a climber filled is no longer "empty → low" ──────────────────────
-- Same body as 0308 except the empty test also asks for an approved contribution.
create or replace function _route_field_level_for(r routes, p_field text) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  f      contribution_fields%rowtype;
  v      jsonb;
  explicit text;
  v_empty boolean;
  lvl    text;
begin
  select level into explicit from route_field_confidence where route_id = r.id and field = p_field;
  if explicit is not null then return explicit; end if;

  select * into f from contribution_fields where form_key = p_field;
  if not found then return 'medium'; end if;

  if f.column_name is null then
    v_empty := true;
  else
    v := to_jsonb(r) -> f.column_name;
    v_empty := v is null or v = 'null'::jsonb
      or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '')
      or (jsonb_typeof(v) = 'array'  and jsonb_array_length(v) = 0)
      or (jsonb_typeof(v) = 'object' and v = '{}'::jsonb);
  end if;
  if v_empty and exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                          and c.field = p_field and c.status = 'approved') then
    v_empty := false;
  end if;
  if v_empty then return 'low'; end if;

  if p_field in ('name') then return 'high'; end if;
  if p_field in ('discipline', 'rockStyle') then
    return case when r.discipline in ('scrambling', 'mountaineering', 'alpine', 'trad') then 'medium' else 'high' end;
  end if;
  if p_field = 'grade' and r.discipline in ('sport', 'trad', 'toprope', 'bouldering', 'ice', 'aid', 'mixed') then
    return 'high';
  end if;
  if r.verif is not null and r.verif ->> 'status' = 'verified' then return 'high'; end if;
  if f.is_gear and r.gear_confidence = 'verified' then return 'high'; end if;

  lvl := 'medium';
  if f.is_gear and r.gear_confidence = 'inferred' then lvl := 'low'; end if;
  if f.is_prose and coalesce(r.auto_generated, false) then lvl := 'low'; end if;
  if lvl = 'medium' and exists (select 1 from route_flags where route_id = r.id and field = p_field and status = 'open') then
    lvl := 'low';
  end if;
  return lvl;
end;
$$;
revoke all on function _route_field_level_for(routes, text) from public, anon, authenticated;

-- ── 4. The status guard lets the consensus trigger, and only it, approve ───────────────────
-- 0127/0319's body plus one exit: a transaction-local setting the trigger below sets around its
-- own UPDATE. A client cannot set it — PostgREST runs one statement per request and exposes no
-- set_config.
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
  if new.status is distinct from old.status and not is_admin(auth.uid())
     and coalesce(current_setting('climbmatch.consensus', true), '') <> 'on' then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  return new;
end $$;

-- ── 5. The decision, on INSERT ─────────────────────────────────────────────────────────────
-- BEFORE INSERT, named to fire after trg_contribution_status (triggers fire in name order), so
-- it overrides the forced 'pending' — the row comes back from `insert … select` already live.
create or replace function public.contribution_consensus() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  ids    uuid[];
  who    uuid;
  place  text;
  flabel text;
begin
  if new.kind <> 'field' or new.field is null or new.route_id is null or new.area_id is not null then
    return new;
  end if;

  if route_field_is_empty(new.route_id, new.field) then
    new.status := 'approved'; new.reviewed_at := now(); new.review_note := 'Added to an empty field';
    return new;
  end if;

  select coalesce(array_agg(c.id), '{}') into ids
    from contributions c
   where c.route_id = new.route_id and c.kind = 'field' and c.field = new.field and c.status = 'pending'
     and c.contributor is distinct from new.contributor
     and _edit_value_norm(c.value) = _edit_value_norm(new.value);
  if cardinality(ids) = 0 then return new; end if;

  new.status := 'approved'; new.reviewed_at := now(); new.review_note := 'Agreed by 2 climbers';
  perform set_config('climbmatch.consensus', 'on', true);
  update contributions set status = 'approved', reviewed_at = now(), review_note = 'Agreed by 2 climbers'
   where id = any (ids);
  perform set_config('climbmatch.consensus', 'off', true);

  place  := coalesce((select name from routes where id = new.route_id), 'a route');
  flabel := coalesce((select label from contribution_fields where form_key = new.field), new.field);
  for who in select distinct _contributor_uuid(c.contributor) from contributions c where c.id = any (ids) loop
    perform _notify(who, 'contribution_approved', 'Your route edit is live',
      'Another climber sent the same ' || flabel || ' for ' || place || ', so your edit is now on the page.',
      jsonb_build_object('route', new.route_id, 'field', new.field));
  end loop;
  return new;
end;
$$;
revoke all on function public.contribution_consensus() from public, anon, authenticated;
drop trigger if exists trg_contribution_vote on contributions;
create trigger trg_contribution_vote before insert on contributions
  for each row execute function contribution_consensus();

-- ── 6. A grade that goes live on INSERT writes routes.grade too ────────────────────────────
-- 0309's write-back fires on UPDATE OF status; a row born approved never takes that path.
create or replace function public.trg_apply_agreed_grade_on_insert()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind = 'field' and new.field = 'grade' and new.route_id is not null and new.status = 'approved' then
    perform apply_agreed_grade(new.route_id);
  end if;
  return new;
end;
$$;
revoke all on function public.trg_apply_agreed_grade_on_insert() from public, anon, authenticated;
drop trigger if exists trg_contribution_applies_agreed_grade_on_insert on contributions;
create trigger trg_contribution_applies_agreed_grade_on_insert
  after insert on contributions
  for each row when (new.status = 'approved') execute function trg_apply_agreed_grade_on_insert();

comment on column contributions.status is
  'pending | approved | rejected. Forced to ''pending'' on INSERT by trg_contribution_status, then trg_contribution_vote (0325) approves a ROUTE field edit when the field is empty or a second climber sent the same value; otherwise only an admin can move it.';

-- Confirm (each on its own):
--   select _edit_value_norm('" Hello  World. "'::jsonb) = _edit_value_norm('"hello world"'::jsonb);   -- true
--   select _edit_value_norm('"4"'::jsonb) = _edit_value_norm('4'::jsonb);                             -- true
--   select tgname from pg_trigger where tgrelid = 'contributions'::regclass and not tgisinternal order by 1;
