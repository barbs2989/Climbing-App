-- AREA EDITS ARE HELD FOR THE OWNER, LIKE ROUTE EDITS. One contribution rule, not two.
--
-- 0304 let a climber's edit to an AREA field (blurb, approach, approach_min, parking_note, rock,
-- aspect, season_months) land by itself: a fill of an empty field at once, a change to a filled one
-- when three climbers agreed, applied by an AFTER INSERT trigger that also marked the rows approved.
-- The same day, 0307–0309 decided that every ROUTE field edit is HELD for the owner, with a rate
-- limit, strikes on rejection and a notice to the climber either way. A climber should not get a
-- different answer for "where do you park" than for "what grade is this", so this migration brings
-- area edits under the same rule (owner, 2026-10-15: "do what you recommend").
--
-- ONE DIFFERENCE STAYS, FOR A STRUCTURAL REASON. An approved ROUTE field (grade aside) reaches the
-- page through the browser's overlay of approved contributions; the area page renders straight
-- from `areas` columns. So an approved AREA edit is WRITTEN TO ITS COLUMN here, on approval — the
-- shape 0309 gave apply_agreed_grade: an AFTER UPDATE OF status trigger, when the row turns
-- 'approved', applying coalesce(applied_value, value) of the latest approved row.
--
-- WHAT CHANGES
--   1. The 0304 insert-time applier and its trigger are dropped. An area row stays 'pending'.
--   2. apply_approved_area_field(area_id, field): the latest APPROVED row's value, validated
--      against the column's own limits (0247 / 0248 / 0249 / 0282 / 0304) and written. Fired by
--      trg_contribution_applies_approved_area_field, after update of status.
--   3. approve_field_contribution (0309) gains an AREA branch: no contribution_fields lookup (that
--      table maps ROUTE columns), no route_field_confidence row, the notice names the area.
--      reject_field_contribution words its notice for an area. Strikes are unchanged: an owner
--      rejection is a strike whichever page it was on.
--   4. guard_contribution_status loses the catalog.applier bypass 0304 added — nothing but an
--      admin changes a status now — and keeps the search_path 0171 pinned.
--
-- What already covered area rows and is untouched: 0308's BEFORE INSERT guard (rate limit, forced
-- applied_value null, the restrictive standing policy), contributions_area_field_ck (0304), the
-- leaderboard (0235: an approved field row counts, keyed on coalesce(route_id, area_id)), and
-- useAdminQueueCounts, which never filtered on route_id.
--
-- lib/areaFields.js carries the same seven fields; check:area-edit-fields reads this file's
-- applier and approve-branch literals against it.

-- ── 1. The insert-time applier goes ────────────────────────────────────────────────────────
drop trigger if exists trg_contribution_applies_agreed_area_field on public.contributions;
drop function if exists public.trg_apply_agreed_area_field();
drop function if exists public.apply_agreed_area_field(text, text);
-- The insert-time clustering key is not read by anything now (the owner clusters in the queue with sameEditValue).
drop function if exists public.area_field_norm(jsonb);

-- ── 2. Apply the approved value to the area column ─────────────────────────────────────────
create or replace function public.apply_approved_area_field(p_area_id text, p_field text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a record; raw jsonb; txt text; num numeric; months smallint[];
begin
  if p_field not in ('blurb','approach','approach_min','parking_note','rock','aspect','season_months') then return; end if;
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

create or replace function public.trg_apply_approved_area_field()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind = 'field' and new.area_id is not null and new.route_id is null and new.field is not null then
    perform apply_approved_area_field(new.area_id, new.field);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contribution_applies_approved_area_field on public.contributions;
create trigger trg_contribution_applies_approved_area_field
  after update of status on public.contributions
  for each row when (new.status = 'approved') execute function public.trg_apply_approved_area_field();

revoke all on function public.apply_approved_area_field(text, text) from public, anon, authenticated;
revoke all on function public.trg_apply_approved_area_field() from public, anon, authenticated;

-- ── 3. The owner's approve / reject take an area row ───────────────────────────────────────
-- Same bodies as 0309 with an area branch. The area field labels are the ones lib/areaFields.js
-- shows the climber (AREA_EDIT_FIELDS), so the notice names the field the way the sheet did.
create or replace function public.area_field_label(p_field text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case p_field
    when 'blurb' then 'About this area' when 'approach' then 'Walk in' when 'approach_min' then 'Walk-in time'
    when 'parking_note' then 'Drive & park' when 'rock' then 'Rock' when 'aspect' then 'Faces'
    when 'season_months' then 'Season' else p_field end;
$$;

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
    if c.field not in ('blurb','approach','approach_min','parking_note','rock','aspect','season_months') then raise exception 'unknown area field: %', c.field; end if;
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

create or replace function reject_field_contribution(p_id uuid, p_reason text, p_also uuid[] default '{}', p_strike boolean default true)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c   contributions%rowtype;
  ids uuid[];
  who uuid;
  r   record;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  is_area boolean;
  place text;
  flabel text;
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can turn down a route edit' using errcode = '42501'; end if;
  if v_reason is null or length(v_reason) < 10 then raise exception 'give the reason the climber will be shown (at least 10 characters)'; end if;
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  if c.kind <> 'field' then raise exception 'contribution % is not a field edit', p_id; end if;
  if c.status <> 'pending' then raise exception 'contribution % is already %', p_id, c.status; end if;
  is_area := c.area_id is not null and c.route_id is null;

  select coalesce(array_agg(x.id), '{}') into ids
    from contributions x
   where x.id = any (coalesce(p_also, '{}')) and x.id <> c.id and x.status = 'pending'
     and x.kind = 'field' and x.route_id is not distinct from c.route_id and x.area_id is not distinct from c.area_id and x.field is not distinct from c.field;
  ids := array_prepend(c.id, ids);

  update contributions
     set status = 'rejected', reviewed_by = uid, reviewed_at = now(), review_note = left(v_reason, 2000)
   where id = any (ids);

  place  := case when is_area then coalesce((select name from areas where id = c.area_id), 'an area')
                 else coalesce((select name from routes where id = c.route_id), 'a route') end;
  flabel := case when is_area then area_field_label(c.field)
                 else coalesce((select label from contribution_fields where form_key = c.field), c.field) end;

  for r in select x.id, x.contributor from contributions x where x.id = any (ids) loop
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, 'reject_contribution', 'contribution', r.id::text, _contributor_uuid(r.contributor),
            coalesce(c.route_id, c.area_id, '') || '/' || coalesce(c.field, '') || ': ' || v_reason);
  end loop;
  for who in select distinct _contributor_uuid(x.contributor) from contributions x where x.id = any (ids) loop
    perform _notify(who, 'contribution_rejected', case when is_area then 'An area edit of yours was turned down' else 'A route edit of yours was turned down' end,
      'Your edit to ' || flabel || ' on ' || place || ' was checked and not applied. Reason: ' || v_reason,
      case when is_area then jsonb_build_object('area', c.area_id, 'field', c.field, 'contribution', c.id)
           else jsonb_build_object('route', c.route_id, 'field', c.field, 'contribution', c.id) end);
    if p_strike then perform _add_contribution_strike(who, v_reason, c.id); end if;
  end loop;
end;
$$;
revoke all on function reject_field_contribution(uuid, text, uuid[], boolean) from public, anon;
grant execute on function reject_field_contribution(uuid, text, uuid[], boolean) to authenticated;

-- ── 4. The status guard, as 0127 wrote it, with the search_path 0171 pinned ───────────────
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
  if new.status is distinct from old.status and not is_admin(auth.uid()) then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  return new;
end $$;

-- No backfill: a pending area row now waits for the owner; rows 0304's applier approved are
-- already in their columns.
