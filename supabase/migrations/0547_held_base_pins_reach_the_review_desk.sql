-- 0547 — A HELD base pin reaches the owner (audit of the base-of-the-climb check-in, owner note
-- 2026-11-26: "when someone checks in at the base of climb what does that do and how does that feed
-- into the app? What happens after that?").
--
-- WHAT WAS WRONG. 0363 feeds a CONFIRMED check-in spot back into the route's Base pin, except when
-- the spot is more than 200 m from the pin on file: that is a different place, not a correction, so
-- apply_route_base_consensus() writes a 'held' row to route_base_pin_changes "for the owner", and the
-- route page tells the climber "ClimbMatch checks it before the Base pin moves". Nothing read that
-- row: the table is RLS-on with no policies, no RPC returned it, and no screen, script or desk
-- section named it. A held spot sat there forever and the promise on the page was empty.
--
-- WHAT THIS DOES.
--   * A held row can be RESOLVED: resolved_at / resolved_by / resolution ('applied' or 'kept').
--   * The admin may READ the ledger (a select policy on is_admin()), so the Review desk lists the
--     open holds and counts them in its tab badge.
--   * resolve_base_pin_hold(id, apply) — admin-only — either MOVES the route's Base pin to the spot
--     the climbers confirmed (re-reading the consensus first: if the top spot is no longer confirmed,
--     or is no longer where the hold says, it refuses, because the evidence changed), logging a
--     'moved' row with the waypoint as it was, exactly as the automatic path does; or KEEPS the pin
--     on file. Either way every open hold on that route is closed with the same answer.
--   * A kept spot is not re-held for the same evidence (0363 already skips a spot within 5 m held
--     with the same climber count); a new climber standing there makes it a new hold, which is new
--     evidence worth a second look.
--
-- Live counts at the time of writing are in the PR. Nothing existing is rewritten by this file.

alter table route_base_pin_changes add column if not exists resolved_at timestamptz;
alter table route_base_pin_changes add column if not exists resolved_by uuid;
alter table route_base_pin_changes add column if not exists resolution text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'route_base_pin_changes_resolution_chk') then
    alter table route_base_pin_changes add constraint route_base_pin_changes_resolution_chk
      check (resolution is null or (action = 'held' and resolution in ('applied', 'kept')));
  end if;
end $$;
create index if not exists route_base_pin_changes_open_holds_idx
  on route_base_pin_changes(created_at) where action = 'held' and resolved_at is null;

drop policy if exists "admins read base pin changes" on route_base_pin_changes;
create policy "admins read base pin changes" on route_base_pin_changes
  for select using (is_admin(auth.uid()));
grant select on route_base_pin_changes to authenticated;

create or replace function resolve_base_pin_hold(p_id bigint, p_apply boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid   uuid := auth.uid();
  h     record;
  top   record;
  total integer;
  wps   jsonb;
  idx   integer := null;
  i     integer := 0;
  wp    jsonb;
  old   jsonb := null;
  d     double precision := null;
begin
  if uid is null or not is_admin(uid) then
    raise exception 'only ClimbMatch Safety can decide a held base pin' using errcode = '42501';
  end if;
  select * into h from route_base_pin_changes where id = p_id and action = 'held' for update;
  if not found then raise exception 'no held base pin %', p_id; end if;
  if h.resolved_at is not null then raise exception 'that held base pin was already decided (%)', h.resolution; end if;

  if not p_apply then
    update route_base_pin_changes set resolved_at = now(), resolved_by = uid, resolution = 'kept'
     where route_id = h.route_id and action = 'held' and resolved_at is null;
    return 'kept';
  end if;

  -- The evidence must still stand: the route's top spot confirmed, and where the hold says.
  select * into top from route_base_spots(h.route_id) limit 1;
  if not found or not top.confirmed then
    raise exception 'the check-ins no longer confirm a spot on this route — reload the desk';
  end if;
  if base_checkin_dist_m(top.lat, top.lng, h.lat, h.lng) > 25 then
    raise exception 'the confirmed spot has moved since this was held — reload the desk';
  end if;
  select count(*) into total from route_base_checkins where route_id = h.route_id;

  select waypoints into wps from routes where id = h.route_id for update;
  if not found then raise exception 'route % no longer exists', h.route_id; end if;
  if wps is null or jsonb_typeof(wps) <> 'array' then wps := '[]'::jsonb; end if;
  for wp in select * from jsonb_array_elements(wps) loop
    if route_base_wp_type(wp->>'type') then idx := i; old := wp; exit; end if;
    i := i + 1;
  end loop;
  if old is not null and (old->>'lat') ~ '^-?[0-9]+(\.[0-9]+)?$' and (old->>'lng') ~ '^-?[0-9]+(\.[0-9]+)?$' then
    d := base_checkin_dist_m(top.lat, top.lng, (old->>'lat')::double precision, (old->>'lng')::double precision);
  end if;

  if idx is null then
    wps := wps || jsonb_build_array(jsonb_build_object('type', 'Base', 'name', 'Base of the climb',
             'lat', top.lat, 'lng', top.lng, 'distMi', null, 'checkedIn', top.n));
  else
    -- More than 200 m away, so the stored height described the old spot: drop it (the ledger keeps it).
    wp := (old || jsonb_build_object('lat', top.lat, 'lng', top.lng, 'checkedIn', top.n)) - 'elev' - 'elevFt';
    wps := jsonb_set(wps, array[idx::text], wp);
  end if;
  update routes set waypoints = wps where id = h.route_id;
  insert into route_base_pin_changes (route_id, action, climbers, total, lat, lng, moved_m, previous)
  values (h.route_id, case when d is null then 'placed' else 'moved' end, top.n, total, top.lat, top.lng,
          case when d is null then null else round(d::numeric, 1) end, old);
  update route_base_pin_changes set resolved_at = now(), resolved_by = uid, resolution = 'applied'
   where route_id = h.route_id and action = 'held' and resolved_at is null;
  return 'applied';
end;
$$;

revoke all on function resolve_base_pin_hold(bigint, boolean) from public, anon;
grant execute on function resolve_base_pin_hold(bigint, boolean) to authenticated;

comment on function resolve_base_pin_hold(bigint, boolean) is
  'Admin-only (0547). Decide a HELD base pin (0363): apply moves the route''s Base pin to the spot '
  'climbers confirmed (refused if the consensus changed), keep leaves the pin on file. Closes every '
  'open hold on that route.';
