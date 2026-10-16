-- 0188 — A climber standing at the base of a climb can record where it starts.
--
-- The app already had a "start location" form, but it took a map tap or typed coordinates, kept
-- the answer in React state for one session, and checked nothing: anyone anywhere could put a
-- route's start in the ocean. This replaces the trust model rather than the form. A check-in is a
-- position the climber's own DEVICE reports while they stand there, and the claim it makes is
-- verified HERE, not only in the browser.
--
-- WHY THE RULES LIVE IN THE DATABASE. The client samples GPS and refuses a weak fix before it ever
-- calls this, but a client check is advice: anything a browser decides, a crafted request can skip.
-- So this function is the only write path — the table has NO insert/update policy — and it
-- re-applies every rule it can see: fix accuracy, fix age, distance from what the catalog knows
-- about where this climb is, not-standing-at-the-trailhead, and impossible travel between two of
-- your own check-ins. What it cannot see (GPS stability across samples, device speed) is judged by
-- the client and is stated as such, never claimed as verified.
--
-- WHAT IT DOES NOT PROVE, stated rather than implied: a device can report a position it is not at.
-- A web app cannot detect a spoofed location. What makes the RESULT trustworthy is agreement — the
-- route page shows how many DIFFERENT climbers checked in at each spot, and one account is one row
-- per route (upsert), so one person cannot manufacture a consensus.
--
-- THE RADII ARE MEASURED, NOT CHOSEN (2026-09-24, catalog-wide): of the waypoints typed or named as
-- a route's base/start, the ones on CRAG-typed areas sit 0-1 m from the crag coordinate (p97 1 m);
-- on PEAK-typed areas they sit p50 131 m, p90 168 m, max 1,561 m from the peak coordinate, and big
-- alpine routes start further out than any pin records (Rainier's Liberty Ridge begins on the Carbon
-- Glacier ~4.5 km from the summit). So: 500 m of a crag, 5 km of a peak, or 600 m of the route's own
-- base pin — any one is enough. Only `crag` and `peak` hold routes today.
--
-- PRIVACY. A check-in stores the device position against the account. Other climbers never see who
-- checked in or when: `route_base_checkin_points()` returns coordinates and a `mine` flag only. The table's
-- own SELECT policy is owner-only. The Privacy Policy states this in the same change.

create table if not exists route_base_checkins (
  id          uuid primary key default gen_random_uuid(),
  route_id    text not null references routes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  accuracy_m  real not null check (accuracy_m > 0),
  samples     integer not null default 1 check (samples >= 1),
  fixed_at    timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (route_id, user_id)
);
create index if not exists route_base_checkins_user_idx on route_base_checkins(user_id, updated_at desc);

alter table route_base_checkins enable row level security;

drop policy if exists "read own base checkins" on route_base_checkins;
create policy "read own base checkins" on route_base_checkins for select using (user_id = auth.uid());
-- A climber may withdraw their own check-in. No insert or update policy: the function below is
-- the only way a row gets written, which is what makes its checks binding.
drop policy if exists "delete own base checkin" on route_base_checkins;
create policy "delete own base checkin" on route_base_checkins for delete using (user_id = auth.uid());

-- Great-circle distance in metres. Plain SQL, not a definer, so it needs no search_path pin.
create or replace function base_checkin_dist_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function check_in_at_route_base(
  p_route_id   text,
  p_lat        double precision,
  p_lng        double precision,
  p_accuracy_m double precision,
  p_samples    integer,
  p_fixed_at   timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me        uuid := auth.uid();
  r         record;
  wp        jsonb;
  wtype     text;
  wname     text;
  wlat      double precision;
  wlng      double precision;
  d         double precision;
  best      double precision := null;   -- distance to the nearest anchor that ACCEPTS the fix
  best_kind text := null;
  near      double precision := null;   -- distance to the nearest anchor of any kind
  near_rad  double precision := null;
  near_kind text := null;
  anchors   integer := 0;
  area_rad  double precision;
  th_d      double precision;
  area_th   double precision;
  prev      record;
  secs      double precision;
  n_day     integer;
begin
  if me is null then
    raise exception 'sign in to check in' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return jsonb_build_object('ok', false, 'reason', 'bad_fix');
  end if;
  -- Matches the client's own bar. A fix this vague cannot place a climber at a cliff base.
  if p_accuracy_m is null or p_accuracy_m <= 0 or p_accuracy_m > 50 then
    return jsonb_build_object('ok', false, 'reason', 'accuracy', 'accuracy_m', p_accuracy_m, 'limit_m', 50);
  end if;
  -- A fix taken with no signal may be sent later, from the car. Seven days bounds how stale a
  -- queued check-in may be; a fix from the future is a clock or a forgery.
  if p_fixed_at is null or p_fixed_at > now() + interval '5 minutes' or p_fixed_at < now() - interval '7 days' then
    return jsonb_build_object('ok', false, 'reason', 'stale');
  end if;

  select rt.id, rt.waypoints, a.lat as alat, a.lng as alng, a.area_type, a.coords_approx
    into r
    from routes rt left join areas a on a.id = rt.area_id
   where rt.id = p_route_id;
  if not found then
    raise exception 'no such route' using errcode = 'P0002';
  end if;

  -- Anchor 1: the area's own coordinate.
  if r.alat is not null and r.alng is not null then
    area_rad := case when r.area_type = 'peak' then 5000 else 500 end
              * case when coalesce(r.coords_approx, false) then 4 else 1 end;
    d := base_checkin_dist_m(p_lat, p_lng, r.alat, r.alng);
    anchors := anchors + 1;
    if d <= area_rad and (best is null or d < best) then best := d; best_kind := coalesce(r.area_type, 'crag'); end if;
    if near is null or d - area_rad < near - near_rad then near := d; near_rad := area_rad; near_kind := coalesce(r.area_type, 'crag'); end if;
  end if;

  -- Anchor 2: any waypoint the route itself records as its base or start.
  if jsonb_typeof(r.waypoints) = 'array' then
    for wp in select * from jsonb_array_elements(r.waypoints) loop
      wtype := lower(coalesce(wp->>'type', ''));
      wname := lower(coalesce(wp->>'name', ''));
      if (wp->>'lat') !~ '^-?[0-9]+(\.[0-9]+)?$' or (wp->>'lng') !~ '^-?[0-9]+(\.[0-9]+)?$' then continue; end if;
      wlat := (wp->>'lat')::double precision;
      wlng := (wp->>'lng')::double precision;
      if wtype in ('base', 'start', 'route start', 'route-start', 'route_start', 'route base')
         or wname ~ '(^|[^a-z])(base of|start of|route start|bergschrund)' then
        d := base_checkin_dist_m(p_lat, p_lng, wlat, wlng);
        anchors := anchors + 1;
        if d <= 600 and (best is null or d < best) then best := d; best_kind := 'base pin'; end if;
        if near is null or d - 600 < near - near_rad then near := d; near_rad := 600; near_kind := 'base pin'; end if;
      end if;
    end loop;
  end if;

  if anchors = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_location');
  end if;
  if best is null then
    return jsonb_build_object('ok', false, 'reason', 'too_far', 'distance_m', round(near), 'radius_m', near_rad, 'anchor', near_kind);
  end if;

  -- Standing at the trailhead is not standing at the base — unless the climb IS roadside, i.e. its
  -- own coordinate is within 600 m of that trailhead.
  if jsonb_typeof(r.waypoints) = 'array' then
    for wp in select * from jsonb_array_elements(r.waypoints) loop
      wtype := lower(coalesce(wp->>'type', ''));
      if wtype not in ('trailhead', 'trailhead/pass') then continue; end if;
      if (wp->>'lat') !~ '^-?[0-9]+(\.[0-9]+)?$' or (wp->>'lng') !~ '^-?[0-9]+(\.[0-9]+)?$' then continue; end if;
      wlat := (wp->>'lat')::double precision;
      wlng := (wp->>'lng')::double precision;
      th_d := base_checkin_dist_m(p_lat, p_lng, wlat, wlng);
      area_th := case when r.alat is null then null else base_checkin_dist_m(r.alat, r.alng, wlat, wlng) end;
      if th_d <= 300 and (area_th is null or area_th > 600) then
        return jsonb_build_object('ok', false, 'reason', 'trailhead', 'distance_m', round(th_d));
      end if;
    end loop;
  end if;

  -- Impossible travel: your previous check-in on another route, and a speed no car keeps up.
  select lat, lng, fixed_at into prev
    from route_base_checkins
   where user_id = me and route_id <> p_route_id
   order by fixed_at desc limit 1;
  if found then
    secs := greatest(abs(extract(epoch from (p_fixed_at - prev.fixed_at))), 60);
    if base_checkin_dist_m(p_lat, p_lng, prev.lat, prev.lng) / secs > 70 then
      return jsonb_build_object('ok', false, 'reason', 'travel');
    end if;
  end if;

  select count(*) into n_day from route_base_checkins where user_id = me and updated_at > now() - interval '1 day';
  if n_day >= 40 then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;

  insert into route_base_checkins (route_id, user_id, lat, lng, accuracy_m, samples, fixed_at)
  values (p_route_id, me, p_lat, p_lng, p_accuracy_m, greatest(coalesce(p_samples, 1), 1), p_fixed_at)
  on conflict (route_id, user_id) do update
     set lat = excluded.lat, lng = excluded.lng, accuracy_m = excluded.accuracy_m,
         samples = excluded.samples, fixed_at = excluded.fixed_at, updated_at = now();

  return jsonb_build_object('ok', true, 'distance_m', round(best), 'anchor', best_kind);
end;
$$;

-- Unattributed on purpose: coordinates and whether the row is YOURS. No user id, no timestamp —
-- a timestamped point would say where a climber was at a given hour, which nobody asked to share.
create or replace function route_base_checkin_points(p_route_id text)
returns table (lat double precision, lng double precision, mine boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select round(c.lat::numeric, 5)::double precision,
         round(c.lng::numeric, 5)::double precision,
         (c.user_id = auth.uid())
    from route_base_checkins c
   where c.route_id = p_route_id
   order by c.updated_at desc
   limit 200
$$;

revoke all on function check_in_at_route_base(text, double precision, double precision, double precision, integer, timestamptz) from public, anon;
grant execute on function check_in_at_route_base(text, double precision, double precision, double precision, integer, timestamptz) to authenticated;
revoke all on function route_base_checkin_points(text) from public;
grant execute on function route_base_checkin_points(text) to anon, authenticated;

comment on table route_base_checkins is
  'A climber''s device position recorded while standing at the base of a route (0188). One row per '
  'climber per route. Written ONLY by check_in_at_route_base(), which verifies accuracy, age and '
  'distance from the route''s own location; read by others only through route_base_checkin_points(), '
  'which returns no identity and no time.';
