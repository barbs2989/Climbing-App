-- Route quality control, part 2 of 3: the confidence rule, and the guards on the contributions
-- INSERT that make a HIGH field unwritable and a contributor's standing enforceable.
--
-- THE LEVEL IS COMPUTED, NOT STORED. route_field_level(route, field) returns the explicit row from
-- route_field_confidence when there is one, else derives the level from the routes row itself. So
-- the first pass over the whole catalog costs nothing, the rule can be tightened later without a
-- data pass, and the client and the insert trigger cannot disagree, because both ask this function.
--
-- THE RULE (owner-chosen 2026-10-15; "high" = locked, flag-only):
--   explicit override                                   -> that level
--   unknown field key                                   -> medium
--   the column is empty (null / "" / [] / {})           -> low
--   name, area                                          -> high
--   discipline                                          -> high, EXCEPT scrambling / mountaineering /
--                                                          alpine / trad -> medium (the owner's stated
--                                                          ambiguity: alpine is 5th class on a peak,
--                                                          mountaineering is snow or glacier travel up to
--                                                          4th class, scrambling is 4th class or lower
--                                                          with no snow in the normal season; and
--                                                          alpine routes place trad gear)
--   grade on a crag discipline (sport / trad / toprope / bouldering / ice / aid / mixed) -> high
--   any field when verif.status = 'verified'            -> high
--   a gear field when gear_confidence = 'verified'      -> high
--   an OPEN flag on exactly this field                  -> low (only from medium; a flag never lowers
--                                                          a high, or one flag would unlock a lock)
--   a gear field when gear_confidence = 'inferred'      -> low
--   a prose field on an auto_generated row              -> low
--   otherwise                                           -> medium
--
-- THE GUARDS. A BEFORE INSERT trigger on contributions refuses a kind='field' row when the field is
-- high (unless the caller is an admin), and refuses more than 20 field edits in 24 hours (5 for an
-- account under 7 days old). A RESTRICTIVE insert policy refuses field edits from a restricted or
-- banned contributor. Every refusal is plain English the sheet shows verbatim, as 0267 does.

-- ---------------------------------------------------------------------------------------------
-- 1. The rule.
-- ---------------------------------------------------------------------------------------------
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

create or replace function route_field_level(p_route_id text, p_field text) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r routes%rowtype;
begin
  select * into r from routes where id = p_route_id;
  if not found then return null; end if;
  return _route_field_level_for(r, p_field);
end;
$$;
revoke all on function route_field_level(text, text) from public;
grant execute on function route_field_level(text, text) to anon, authenticated;

-- One call per route page: {"grade": "high", "approach": "medium", ...} over every form key, plus
-- the reason when a row is explicit, under "_reasons".
create or replace function route_field_confidence_map(p_route_id text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  r   routes%rowtype;
  res jsonb := '{}'::jsonb;
  f   record;
  reasons jsonb := '{}'::jsonb;
begin
  select * into r from routes where id = p_route_id;
  if not found then return null; end if;
  for f in select form_key from contribution_fields loop
    res := res || jsonb_build_object(f.form_key, _route_field_level_for(r, f.form_key));
  end loop;
  select coalesce(jsonb_object_agg(field, jsonb_build_object('reason', reason, 'set_at', set_at)), '{}'::jsonb)
    into reasons from route_field_confidence where route_id = p_route_id;
  return res || jsonb_build_object('_reasons', reasons);
end;
$$;
revoke all on function route_field_confidence_map(text) from public;
grant execute on function route_field_confidence_map(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Standing checks. A lapsed restriction needs no job to lift it: `until` passing is enough.
-- ---------------------------------------------------------------------------------------------
create or replace function can_contribute_fields(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select uid is not null and (
    is_admin(uid) or not exists (
      select 1 from contribution_standing s
       where s.user_id = uid
         and (s.status = 'banned' or (s.status = 'restricted' and (s.until is null or s.until > now())))
    )
  );
$$;
revoke all on function can_contribute_fields(uuid) from public, anon;
grant execute on function can_contribute_fields(uuid) to authenticated;

create or replace function can_flag(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select uid is not null and (
    is_admin(uid) or not exists (select 1 from contribution_standing s where s.user_id = uid and s.status = 'banned')
  );
$$;
revoke all on function can_flag(uuid) from public, anon;
grant execute on function can_flag(uuid) to authenticated;

-- Restrictive, so AND-ed onto the table's own insert policy and 0264's.
drop policy if exists "contribution standing allows field edits" on contributions;
create policy "contribution standing allows field edits" on contributions as restrictive for insert
  with check (kind <> 'field' or can_contribute_fields(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 3. The lock and the rate limit. BEFORE INSERT; sorts ahead of trg_contribution_status by name,
--    which does not matter — both only read `new`.
-- ---------------------------------------------------------------------------------------------
create or replace function guard_field_contribution() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid   uuid := auth.uid();
  n     int;
  cap   int;
  young boolean;
begin
  if new.kind <> 'field' then return new; end if;
  -- The submitter never sets the applied value; only an approval does (0309).
  new.applied_value := null;

  if new.route_id is not null and new.field is not null and not is_admin(uid)
     and route_field_level(new.route_id, new.field) = 'high' then
    raise exception 'This detail is locked at high confidence; flag it instead if it has changed.';
  end if;

  if not is_admin(uid) then
    select created_at > now() - interval '7 days' into young from profiles where id = uid;
    cap := case when coalesce(young, true) then 5 else 20 end;
    select count(*) into n from contributions
     where contributor = uid::text and kind = 'field' and created_at > now() - interval '24 hours';
    if n >= cap then
      raise exception 'You’ve suggested a lot of edits today — try again tomorrow.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function guard_field_contribution() from public, anon, authenticated;
drop trigger if exists contributions_guard_field_edit on contributions;
create trigger contributions_guard_field_edit before insert on contributions
  for each row execute function guard_field_contribution();

-- Confirm (each on its own):
--   select route_field_level(id, 'grade') from routes where discipline = 'sport' limit 1;   -- high
--   select route_field_level(id, 'approach') from routes where approach is null limit 1;   -- low
--   select jsonb_object_keys(route_field_confidence_map((select id from routes limit 1)));  -- 77 keys (76 fields + _reasons)
