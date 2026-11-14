-- THE CRAG'S PARKING PIN CAN BE SUGGESTED, LIKE EVERY OTHER AREA FIELD.
--
-- The owner's note (2026-10): "Audit that everything that is offered on the app for routes can be
-- added or edited. Ie I'm not seeing parking location for sport, trad or bouldering routes."
-- #2462 made a ROUTE's own parking pin editable. The pin most crag routes actually show is the
-- CRAG's (areas.parking_lat / parking_lng / parking_name): every route at the crag reads it, the
-- area page's GETTING THERE drives to it, and climbers had no way to add or move it. 9,637 areas
-- carry one; the rest offered "Drive & park" prose and nothing to say where the car goes.
--
-- One new area field, `parking_pin`, joins the seven 0304 listed: its value is
-- {"lat": <number>, "lng": <number>, "name": <optional text>}. It goes through the same path as the
-- others: a contributions row (area_id, route_id null, kind 'field'), HELD for the owner (0319),
-- written to the three columns by apply_approved_area_field when approved. The columns' own rule
-- (areas_parking_check: in range, not 0,0) is checked here first, so an approval of a value the
-- column would refuse leaves the page alone rather than raising, as 0319 does for the others.
-- A pin with no name keeps the name already on file (theCrag and Mountain Project both treat the
-- name as optional and the point as the fact).
--
-- lib/areaFields.js carries the same eight fields; check:area-edit-fields reads this file's
-- constraint, applier and approve-branch literals against it (the newest migration that defines
-- each one).

begin;

-- ── 1. The constraint takes the new field ──────────────────────────────────────────────────
alter table public.contributions drop constraint if exists contributions_area_field_ck;
alter table public.contributions add constraint contributions_area_field_ck check (
  not (area_id is not null and route_id is null and kind = 'field')
  or field in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months')
);

-- ── 2. The applier writes it ───────────────────────────────────────────────────────────────
create or replace function public.apply_approved_area_field(p_area_id text, p_field text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a record; raw jsonb; txt text; num numeric; months smallint[]; plat double precision; plng double precision; pname text;
begin
  if p_field not in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months') then return; end if;
  select * into a from areas where id = p_area_id;
  if not found then return; end if;

  -- The latest approved row for this area and field; the owner's adjusted value wins over the
  -- climber's when one was given.
  select coalesce(c.applied_value, c.value) into raw
    from contributions c
   where c.area_id = p_area_id and c.route_id is null and c.kind = 'field' and c.field = p_field
     and c.status = 'approved'
   order by c.reviewed_at desc nulls last, c.created_at desc
   limit 1;
  if raw is null then return; end if;

  -- Validate against the column's own rules and write. A value the column would refuse is left
  -- alone rather than raised: the approval stands in the ledger, the page is unchanged, and the
  -- owner can see the row in Your contributions / the queue history.
  if p_field in ('blurb','approach','parking_note','rock','aspect') then
    if jsonb_typeof(raw) <> 'string' then return; end if;
    txt := btrim(raw #>> '{}');
    if p_field = 'blurb'        and char_length(txt) not between 20 and 1500 then return; end if;
    if p_field = 'approach'     and char_length(txt) not between 1 and 600 then return; end if;
    if p_field = 'parking_note' and char_length(txt) not between 5 and 400 then return; end if;
    if p_field = 'rock'         and char_length(txt) not between 1 and 40 then return; end if;
    if p_field = 'aspect'       and txt not in ('N','NE','E','SE','S','SW','W','NW','varies') then return; end if;
    if p_field = 'blurb'        then update areas set blurb = txt where id = p_area_id and blurb is distinct from txt; end if;
    if p_field = 'approach'     then update areas set approach = txt where id = p_area_id and approach is distinct from txt; end if;
    if p_field = 'parking_note' then update areas set parking_note = txt where id = p_area_id and parking_note is distinct from txt; end if;
    if p_field = 'rock'         then update areas set rock = txt, rock_basis = 'stated' where id = p_area_id and rock is distinct from txt; end if;
    if p_field = 'aspect'       then update areas set aspect = txt where id = p_area_id and aspect is distinct from txt; end if;
  elsif p_field = 'parking_pin' then
    if jsonb_typeof(raw) <> 'object' or jsonb_typeof(raw->'lat') <> 'number' or jsonb_typeof(raw->'lng') <> 'number' then return; end if;
    plat := (raw->>'lat')::double precision;
    plng := (raw->>'lng')::double precision;
    if plat not between -90 and 90 or plng not between -180 and 180 or plat = 0 or plng = 0 then return; end if;
    pname := case when jsonb_typeof(raw->'name') = 'string' then nullif(btrim(raw->>'name'), '') end;
    if pname is not null and char_length(pname) > 60 then return; end if;
    pname := coalesce(pname, a.parking_name, 'Parking');
    update areas set parking_lat = plat, parking_lng = plng, parking_name = pname
     where id = p_area_id
       and (parking_lat is distinct from plat or parking_lng is distinct from plng or parking_name is distinct from pname);
  elsif p_field = 'approach_min' then
    if jsonb_typeof(raw) = 'number' then num := (raw #>> '{}')::numeric;
    elsif jsonb_typeof(raw) = 'string' and btrim(raw #>> '{}') ~ '^\d{1,4}$' then num := (btrim(raw #>> '{}'))::numeric;
    else return; end if;
    if num < 1 or num > 600 then return; end if;
    update areas set approach_min = num::int where id = p_area_id and approach_min is distinct from num::int;
  elsif p_field = 'season_months' then
    if jsonb_typeof(raw) <> 'array' then return; end if;
    select array_agg(x order by x) into months
      from (select distinct (e #>> '{}')::smallint as x from jsonb_array_elements(raw) e where jsonb_typeof(e) = 'number') s;
    if months is null or not months_ok(months) then return; end if;
    update areas set season_months = months where id = p_area_id and season_months is distinct from months;
  end if;
end;
$$;
revoke all on function public.apply_approved_area_field(text, text) from public, anon, authenticated;

-- ── 3. The notice names it the way the sheet does ──────────────────────────────────────────
create or replace function public.area_field_label(p_field text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case p_field
    when 'blurb' then 'About this area' when 'approach' then 'Walk in' when 'approach_min' then 'Walk-in time'
    when 'parking_note' then 'Drive & park' when 'parking_pin' then 'Parking pin' when 'rock' then 'Rock' when 'aspect' then 'Faces'
    when 'season_months' then 'Season' else p_field end;
$$;

-- ── 4. The owner can approve it: 0319's body, the area-field list widened ──────────────────
create or replace function approve_field_contribution(p_id uuid, p_value jsonb default null, p_also uuid[] default '{}')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c   contributions%rowtype;
  ids uuid[];
  who uuid;
  r   record;
  is_area boolean;
  place text;
  flabel text;
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can approve a route edit' using errcode = '42501'; end if;
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  is_area := c.area_id is not null and c.route_id is null;
  if c.kind <> 'field' or c.field is null or (c.route_id is null and not is_area) then raise exception 'contribution % is not a field edit', p_id; end if;
  if c.status <> 'pending' then raise exception 'contribution % is already %', p_id, c.status; end if;
  if is_area then
    if c.field not in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months') then raise exception 'unknown area field: %', c.field; end if;
  else
    if not exists (select 1 from contribution_fields where form_key = c.field) then raise exception 'unknown field: %', c.field; end if;
  end if;
  if p_value is not null and length(p_value::text) > 20000 then raise exception 'the approved value is too long'; end if;

  select coalesce(array_agg(x.id), '{}') into ids
    from contributions x
   where x.id = any (coalesce(p_also, '{}')) and x.id <> c.id and x.status = 'pending'
     and x.kind = 'field' and x.route_id is not distinct from c.route_id and x.area_id is not distinct from c.area_id and x.field = c.field;
  ids := array_prepend(c.id, ids);

  update contributions
     set status = 'approved', reviewed_by = uid, reviewed_at = now(), review_note = null,
         applied_value = case when p_value is not null and p_value is distinct from value then p_value end
   where id = any (ids);

  if not is_area then
    insert into route_field_confidence (route_id, field, level, reason, set_by, set_at)
    values (c.route_id, c.field, 'high', 'Approved by ClimbMatch', uid, now())
    on conflict (route_id, field) do update
      set level = 'high', reason = excluded.reason, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;

  place  := case when is_area then coalesce((select name from areas where id = c.area_id), 'an area')
                 else coalesce((select name from routes where id = c.route_id), 'a route') end;
  flabel := case when is_area then area_field_label(c.field)
                 else coalesce((select label from contribution_fields where form_key = c.field), c.field) end;

  for r in select x.id, x.contributor from contributions x where x.id = any (ids) loop
    who := _contributor_uuid(r.contributor);
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, 'approve_contribution', 'contribution', r.id::text, who,
            coalesce(c.route_id, c.area_id) || '/' || c.field || case when p_value is not null then ' (edited)' else '' end);
  end loop;
  for who in select distinct _contributor_uuid(x.contributor) from contributions x where x.id = any (ids) loop
    perform _notify(who, 'contribution_approved', case when is_area then 'Your area edit is live' else 'Your route edit is live' end,
      'Thanks — your edit to ' || flabel || ' on ' || place ||
      case when p_value is not null then ' was applied with a small adjustment.' else ' was checked and applied.' end,
      case when is_area then jsonb_build_object('area', c.area_id, 'field', c.field)
           else jsonb_build_object('route', c.route_id, 'field', c.field) end);
  end loop;
end;
$$;
revoke all on function approve_field_contribution(uuid, jsonb, uuid[]) from public, anon;
grant execute on function approve_field_contribution(uuid, jsonb, uuid[]) to authenticated;

commit;
