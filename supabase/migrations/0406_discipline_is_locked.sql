-- Discipline is locked on every route (owner, 2026-11-05: "Discipline should be locked and not
-- allowed to be edited. They can only flag it for review.").
--
-- 0308 made discipline HIGH except on scrambling / mountaineering / alpine / trad routes, where it
-- stayed MEDIUM for the owner's stated ambiguity between those four. That exception is withdrawn:
-- `discipline` and `rockStyle` (the trad/sport split the same chip row sends) now answer 'high'
-- whenever the row holds one. An EMPTY discipline is the one opening (owner, same day: "when
-- there's no information they should be able to edit it though"): it takes the ordinary
-- "empty → low" branch, so a climber can fill it in, and once the owner approves that edit the
-- approval's own upsert (0309) sets the field high. The owner's explicit route_field_confidence
-- row still wins, as it does for every field, so the Review queue's hand lock/unlock keeps working.
-- A climber who thinks a filed discipline is wrong files a route_flag on `discipline` (the edit
-- sheet's Discipline card carries the button).
--
-- Same body as 0325 otherwise. The insert guard (0308) and the page's confidence map both ask this
-- function, so the chips lock and the database refuses in the same breath.
begin;

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
  -- Discipline is locked once it is on file (0406); an EMPTY one returned 'low' above and stays editable.
  if p_field in ('discipline', 'rockStyle') then return 'high'; end if;
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

-- Probe (after applying by hand):
--   select route_field_level(id, 'discipline') from routes where discipline = 'alpine' limit 1;  -- high
--   select route_field_level(id, 'rockStyle')  from routes where discipline = 'trad'   limit 1;  -- high

commit;
