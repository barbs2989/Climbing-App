-- 0363 — Base of the climb: ONE consensus, decided here, and it feeds the route's own Base pin.
--
-- WHAT WAS WRONG (audit 2026-10-23). 0188 stored each climber's on-site GPS check-in, but:
--   1. The consensus was computed in the BROWSER (clusterBasePoints): a greedy pass that put each
--      point in the first cluster within 25 m and let the centre drift with every addition, so the
--      answer depended on the ORDER rows came back in, and a single check-in was already "the base".
--   2. Nothing fed back. The route's Base pin in routes.waypoints — what the map, the waypoint list,
--      the GPX download, the planner and the check-in's own anchor test read — never moved, however
--      many climbers stood somewhere else. The two could disagree on one page forever.
--   3. The check-in's anchor test knew 6 spellings of a Base waypoint; the app's WP_TYPE_MAP knows
--      11 (crag_base, crag base, crag/route start, climb, route are live types it missed).
--
-- THE MODEL (Mountain Project dropped route-level coordinates because phone GPS under a cliff was
-- "too inaccurate, with too many subtly wrong points"; averaging only helps if the outliers are
-- kept out; Google Maps holds a pin move of more than ~200 m for a moderator). So:
--   * A SPOT is found order-independently: the check-in with the most others within 25 m seeds it,
--     its members are the points within 25 m of that seed, its centre is their MEDIAN (an outlier
--     cannot drag a median), and the next spot is found from what is left.
--   * The top spot is CONFIRMED when at least 3 different climbers stood in it AND they are a strict
--     majority of everyone who checked in on this route. One account is one row per route (0188),
--     so one person cannot manufacture it.
--   * A confirmed spot becomes the route's Base pin: placed when the route has none (or has one
--     with no coordinate), moved when the pin on file is within 200 m. A spot more than 200 m from
--     the pin on file is HELD for the owner, not applied: that is a different place, not a
--     correction. Every placement, move and hold is written to route_base_pin_changes with the
--     waypoint as it was, so any of them can be reverted by hand.
--   * A moved pin drops its stored elevation when it moves more than 25 m — that number described
--     the old spot (the ledger keeps it).
--   * Withdrawing check-ins never moves the pin back: a pin confirmed on site is still better
--     evidence than the one it replaced.
--
-- Live counts at the time of writing: 0 check-ins, 0 start_location contributions, 36 routes with
-- a Base-typed pin. Nothing existing is rewritten by this file.

-- The waypoint types that mean "where the climbing starts" — WP_TYPE_MAP's "Base" keys
-- (ClimbMatchCore.jsx), kept equal by hand; lowercase.
create or replace function route_base_wp_type(t text)
returns boolean language sql immutable as $$
  select lower(btrim(coalesce(t, ''))) in ('base', 'route base', 'crag_base', 'crag base', 'route start',
    'route-start', 'route_start', 'start', 'climb', 'crag/route start', 'route')
$$;

-- Ledger of every time a consensus touched a route's Base pin. Owner-only: RLS on, no policies.
create table if not exists route_base_pin_changes (
  id          bigint generated always as identity primary key,
  route_id    text not null references routes(id) on delete cascade,
  action      text not null check (action in ('placed', 'moved', 'held')),
  climbers    integer not null,
  total       integer not null,
  lat         double precision not null,
  lng         double precision not null,
  moved_m     double precision,
  previous    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists route_base_pin_changes_route_idx on route_base_pin_changes(route_id, created_at desc);
alter table route_base_pin_changes enable row level security;

-- The spots, most-confirmed first. Unattributed like route_base_checkin_points(): a centre, a
-- climber count, whether YOU are in it, how tight it is, and whether it is confirmed.
create or replace function route_base_spots(p_route_id text)
returns table (lat double precision, lng double precision, n integer, mine boolean, spread_m double precision, confirmed boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me     uuid := auth.uid();
  la     double precision[];
  lo     double precision[];
  mi     boolean[];
  ids    text[];
  alive  boolean[];
  total  integer;
  left_n integer;
  rnk    integer := 0;
  i      integer;
  j      integer;
  k      integer;
  s      double precision;
  best_i integer;
  best_k integer;
  best_s double precision;
  mem_la double precision[];
  mem_lo double precision[];
  c_lat  double precision;
  c_lng  double precision;
  sp     double precision;
  any_me boolean;
begin
  select array_agg(c.lat order by c.id), array_agg(c.lng order by c.id),
         array_agg(me is not null and c.user_id = me order by c.id), array_agg(c.id::text order by c.id)
    into la, lo, mi, ids
    from (select * from route_base_checkins where route_id = p_route_id order by updated_at desc limit 200) c;
  total := coalesce(array_length(la, 1), 0);
  if total = 0 then return; end if;
  alive := array_fill(true, array[total]);
  left_n := total;
  while left_n > 0 loop
    -- Seed: the remaining point with the most remaining neighbours within 25 m; ties go to the
    -- tighter neighbourhood, then the lower id, so the same rows always give the same answer.
    best_i := null;
    for i in 1..total loop
      continue when not alive[i];
      k := 0; s := 0;
      for j in 1..total loop
        continue when not alive[j];
        if base_checkin_dist_m(la[i], lo[i], la[j], lo[j]) <= 25 then k := k + 1; s := s + base_checkin_dist_m(la[i], lo[i], la[j], lo[j]); end if;
      end loop;
      if best_i is null or k > best_k or (k = best_k and (s < best_s or (s = best_s and ids[i] < ids[best_i]))) then
        best_i := i; best_k := k; best_s := s;
      end if;
    end loop;
    rnk := rnk + 1;
    mem_la := '{}'; mem_lo := '{}'; any_me := false;
    for j in 1..total loop
      continue when not alive[j];
      if base_checkin_dist_m(la[best_i], lo[best_i], la[j], lo[j]) <= 25 then
        mem_la := mem_la || la[j]; mem_lo := mem_lo || lo[j]; any_me := any_me or mi[j];
      end if;
    end loop;
    -- The centre is the MEDIAN of the members, so one stray reading cannot drag it.
    select percentile_cont(0.5) within group (order by x) into c_lat from unnest(mem_la) x;
    select percentile_cont(0.5) within group (order by x) into c_lng from unnest(mem_lo) x;
    sp := 0;
    for j in 1..total loop
      continue when not alive[j];
      if base_checkin_dist_m(la[best_i], lo[best_i], la[j], lo[j]) <= 25 then
        sp := greatest(sp, base_checkin_dist_m(c_lat, c_lng, la[j], lo[j]));
      end if;
    end loop;
    for j in 1..total loop
      if alive[j] and j <> best_i and base_checkin_dist_m(la[best_i], lo[best_i], la[j], lo[j]) <= 25 then alive[j] := false; left_n := left_n - 1; end if;
    end loop;
    alive[best_i] := false; left_n := left_n - 1;
    lat := round(c_lat::numeric, 5)::double precision;
    lng := round(c_lng::numeric, 5)::double precision;
    n := best_k;
    mine := any_me;
    spread_m := round(sp::numeric, 1)::double precision;
    confirmed := rnk = 1 and best_k >= 3 and best_k * 2 > total;
    return next;
  end loop;
end;
$$;

-- 0188's check-in, unchanged but for ONE line: a Base pin is recognised by route_base_wp_type(),
-- the app's own 11 spellings, not the 6 it had.
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
      if route_base_wp_type(wtype)
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

-- The feedback: a confirmed spot becomes the route's Base pin. Called by the trigger below; not
-- granted to any client role.
create or replace function apply_route_base_consensus(p_route_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  top    record;
  total  integer;
  wps    jsonb;
  idx    integer := null;
  i      integer := 0;
  wp     jsonb;
  old    jsonb := null;
  d      double precision := null;
  upd    jsonb;
begin
  select * into top from route_base_spots(p_route_id) limit 1;
  if not found or not top.confirmed then return 'unconfirmed'; end if;
  select count(*) into total from route_base_checkins where route_id = p_route_id;

  select waypoints into wps from routes where id = p_route_id for update;
  if not found then return 'no_route'; end if;
  if wps is null or jsonb_typeof(wps) <> 'array' then wps := '[]'::jsonb; end if;

  -- The route's own Base pin: the first Base-typed waypoint; one with no coordinate is filled in.
  for wp in select * from jsonb_array_elements(wps) loop
    if route_base_wp_type(wp->>'type') then idx := i; old := wp; exit; end if;
    i := i + 1;
  end loop;
  if old is not null and (old->>'lat') ~ '^-?[0-9]+(\.[0-9]+)?$' and (old->>'lng') ~ '^-?[0-9]+(\.[0-9]+)?$' then
    d := base_checkin_dist_m(top.lat, top.lng, (old->>'lat')::double precision, (old->>'lng')::double precision);
  end if;

  if d is not null and d > 200 then
    -- A different place, not a correction: the owner decides. Logged once per distinct spot.
    if not exists (select 1 from route_base_pin_changes x where x.route_id = p_route_id and x.action = 'held'
                     and base_checkin_dist_m(x.lat, x.lng, top.lat, top.lng) <= 5 and x.climbers = top.n) then
      insert into route_base_pin_changes (route_id, action, climbers, total, lat, lng, moved_m, previous)
      values (p_route_id, 'held', top.n, total, top.lat, top.lng, round(d::numeric, 1), old);
    end if;
    return 'held';
  end if;

  if idx is null then
    upd := wps || jsonb_build_array(jsonb_build_object('type', 'Base', 'name', 'Base of the climb',
             'lat', top.lat, 'lng', top.lng, 'distMi', null, 'checkedIn', top.n));
  else
    wp := old || jsonb_build_object('lat', top.lat, 'lng', top.lng, 'checkedIn', top.n);
    if d is null or d > 25 then wp := wp - 'elev' - 'elevFt'; end if;
    if d is not null and d <= 0.5 and (old->>'checkedIn') = top.n::text then return 'unchanged'; end if;
    upd := jsonb_set(wps, array[idx::text], wp);
  end if;
  update routes set waypoints = upd where id = p_route_id;
  if d is null or d > 0.5 then
    insert into route_base_pin_changes (route_id, action, climbers, total, lat, lng, moved_m, previous)
    values (p_route_id, case when d is null then 'placed' else 'moved' end, top.n, total, top.lat, top.lng,
            case when d is null then null else round(d::numeric, 1) end, old);
  end if;
  return case when d is null then 'placed' else 'moved' end;
end;
$$;

create or replace function route_base_checkins_feedback()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform apply_route_base_consensus(coalesce(new.route_id, old.route_id));
  return null;
end;
$$;

drop trigger if exists trg_route_base_checkins_feedback on route_base_checkins;
create trigger trg_route_base_checkins_feedback
  after insert or update or delete on route_base_checkins
  for each row execute function route_base_checkins_feedback();

revoke all on function route_base_spots(text) from public;
grant execute on function route_base_spots(text) to anon, authenticated;
revoke all on function apply_route_base_consensus(text) from public, anon, authenticated;
revoke all on function route_base_checkins_feedback() from public, anon, authenticated;

comment on table route_base_pin_changes is
  'Every time the base-of-the-climb consensus (0363) placed, moved or held a route''s Base pin, with '
  'the waypoint as it was. Owner-only (RLS, no policies). A held row is a confirmed spot more than '
  '200 m from the pin on file, left for the owner.';
