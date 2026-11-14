-- A route edit that TAKES SOMETHING OFF the page never goes live by itself (owner note, 2026-10-22:
-- "People shouldn't be able to delete waypoints when editing? … someone reckless could do [it] to
-- try and harm the app's correctness").
--
-- Since 0325 a route edit goes live on its own when the field is empty or when a SECOND climber
-- sends the same value. Neither case protects a removal: two accounts (or one person with two)
-- could agree to strip a route's waypoints, pitches, rappel stations or hazards, and the page would
-- lose them with nobody having looked. Deleting is where the other catalogs are strictest:
-- theCrag will not delete a route or area that anything references (it merges instead); Mountain
-- Project sends deletions to the regional admin; OpenStreetMap's OSMCha flags "mass deletion"
-- changesets for review. So here:
--
--   * An edit REMOVES something when the page holds a value and the edit is empty, or both are
--     lists and the edit has fewer rows, or fewer rows that carry a map coordinate (a pin taken off
--     a waypoint that stays in the list is a removal too).
--   * Such an edit stays `pending` for the owner whatever anyone else sends — it is never
--     approved by agreement, and it is never counted as the second climber for another row.
--   * It is marked with review_note REMOVAL_NOTE so the edit sheet and the owner's queue can say so.
--     (review_note on a pending row is read by nobody else: "Your contributions" shows it only on
--     a rejected row, and the owner's approve / reject functions overwrite it.)
--   * The climber's reason travels with the row (`contributions.reason`), so the owner reads WHY a
--     waypoint was taken off before deciding. The edit sheet requires one for a removal.
--
-- Everything else in 0307–0309 / 0325 stands: high fields locked, rate limit, standing, strikes
-- (a reckless removal the owner turns down is a strike: 3 → restricted, 5 → banned).

alter table contributions add column if not exists reason text;
alter table contributions drop constraint if exists contributions_reason_len_ck;
alter table contributions add constraint contributions_reason_len_ck
  check (reason is null or char_length(reason) <= 1000);
comment on column contributions.reason is
  'Why the climber sent this edit, in their words (the edit sheet''s "Why" box). Required by the sheet for an edit that removes something (0351).';

-- ── 1. What the page shows for a field now ─────────────────────────────────────────────────
-- The latest approved climber edit (the owner's applied_value when set), else the column.
create or replace function public.route_field_page_value(p_route_id text, p_field text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare col text; v jsonb;
begin
  select coalesce(c.applied_value, c.value) into v
    from contributions c
   where c.route_id = p_route_id and c.kind = 'field' and c.field = p_field and c.status = 'approved'
   order by c.reviewed_at desc nulls last, c.created_at desc
   limit 1;
  if found then return v; end if;
  select column_name into col from contribution_fields where form_key = p_field;
  if col is null then return null; end if;
  select to_jsonb(r) -> col into v from routes r where r.id = p_route_id;
  return v;
end;
$$;
revoke all on function public.route_field_page_value(text, text) from public, anon, authenticated;

-- ── 2. Does a proposed value take something off? ───────────────────────────────────────────
create or replace function public._edit_is_empty(v jsonb) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select v is null or v = 'null'::jsonb
      or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '')
      or (jsonb_typeof(v) = 'array'  and jsonb_array_length(v) = 0)
      or (jsonb_typeof(v) = 'object' and v = '{}'::jsonb);
$$;

create or replace function public._edit_pins(v jsonb) returns int
language sql immutable set search_path = public, pg_temp as $$
  select count(*)::int from jsonb_array_elements(v) e
   where jsonb_typeof(e) = 'object'
     and coalesce(e ->> 'lat', '') <> '' and coalesce(e ->> 'lng', '') <> '';
$$;

create or replace function public._edit_removes(cur jsonb, nxt jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if _edit_is_empty(cur) then return false; end if;      -- nothing on the page to lose
  if _edit_is_empty(nxt) then return true; end if;       -- clears the field
  if jsonb_typeof(cur) = 'array' and jsonb_typeof(nxt) = 'array' then
    if jsonb_array_length(nxt) < jsonb_array_length(cur) then return true; end if;
    if _edit_pins(nxt) < _edit_pins(cur) then return true; end if;
  end if;
  return false;
end;
$$;

-- ── 3. The decision, on INSERT — 0325's body with the removal exit ─────────────────────────
create or replace function public.contribution_consensus() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  ids    uuid[];
  who    uuid;
  place  text;
  flabel text;
  removal_note constant text := 'Removes something from the page — waits for ClimbMatch to check it';
begin
  if new.kind <> 'field' or new.field is null or new.route_id is null or new.area_id is not null then
    return new;
  end if;

  if route_field_is_empty(new.route_id, new.field) then
    new.status := 'approved'; new.reviewed_at := now(); new.review_note := 'Added to an empty field';
    return new;
  end if;

  -- 0351: a removal is the owner's call, however many climbers send it.
  if _edit_removes(route_field_page_value(new.route_id, new.field), new.value) then
    new.review_note := removal_note;
    return new;
  end if;

  select coalesce(array_agg(c.id), '{}') into ids
    from contributions c
   where c.route_id = new.route_id and c.kind = 'field' and c.field = new.field and c.status = 'pending'
     and c.contributor is distinct from new.contributor
     and c.review_note is distinct from removal_note
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

-- Confirm (each on its own):
--   select _edit_removes('[{"name":"a"},{"name":"b"}]', '[{"name":"a"}]');                       -- true
--   select _edit_removes('[{"name":"a","lat":47,"lng":-121}]', '[{"name":"a","lat":null}]');      -- true
--   select _edit_removes('[{"name":"a"}]', '[{"name":"a"},{"name":"b"}]');                       -- false
--   select _edit_removes('"some text"', '""');                                                   -- true
--   select _edit_removes(null, '[]');                                                            -- false
