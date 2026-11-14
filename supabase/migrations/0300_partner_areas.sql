-- 0300: partner_areas — a climber LISTS THEMSELVES AT AN AREA, and partners for sport, trad, top-rope,
-- aid and bouldering are found by AREA instead of by saved route.
--
-- Before this the only partner signal was a saved route objective. For a crag climber that is far too
-- granular: two climbers who both climb at Hellgate every weekend never matched unless they had saved
-- the same route. Alpine, mountaineering, scrambling, ice and mixed stay route-based (an objective IS
-- the trip); this migration adds the area-based half beside them and does not change partners_by_objective.
--
-- The model (owner decision 2026-10-15, "standing + dated"):
--   * one row per (climber, area): "I climb here", with the crag types they want and ONE optional date
--     window ("free at LCC Oct 18-19"). An expired window reads back as no window, never as no listing.
--   * an area at any depth: crag, wall, canyon, range, region or state. NOT a peak (its climbing is
--     matched by route), not world/country.
--   * REACHABILITY IS TWO-WAY on the ltree path: searching T finds a listing at L when L is inside T
--     (L.path <@ T.path) OR L is an ancestor of T (L.path @> T.path). "Listed at Wasatch" surfaces at
--     Hellgate; "listed at Hellgate" surfaces at Wasatch and at Little Cottonwood. Ancestor matches are
--     flagged listed_above so a card can say "listed across Utah" rather than "listed here".
--   * visibility = exactly the partners_near rule (0189/0209): signed in, profiles.discoverable, not the
--     caller, not a climber who blocked the caller. The table itself is OWNER-ONLY; every cross-climber
--     read goes through a definer function so the opt-out and the block list cannot be walked around
--     (objectives is public-read and partners_by_objective had to apply those rules on top of that).
--
-- match_objectives_of_users is the other half of the same decision: a crag-route objective stays a
-- tick list but LEAVES partner matching. It returns, for the climbers on screen, only the objectives
-- that still count: a route whose discipline is not crag-family, or one filed on a PEAK (trad that
-- climbs a peak is alpine — the catOf rule in ClimbMatchCore.jsx). A route the catalog does not hold
-- (a seed id) does not count. partners_by_objective itself is re-created with this rule in a LATER
-- migration, together with the screens that replace crag objectives; this one is additive.

begin;

create table public.partner_areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  area_id     text not null references public.areas(id) on delete cascade,
  disciplines text[] not null default '{}',
  free_from   date,
  free_to     date,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, area_id),
  constraint partner_areas_disciplines_values
    check (disciplines <@ array['trad','sport','toprope','aid','bouldering']::text[]),
  constraint partner_areas_window
    check ((free_from is null) = (free_to is null) and (free_to is null or free_to >= free_from)),
  constraint partner_areas_note_len check (note is null or length(note) <= 140)
);
create index partner_areas_area_idx on public.partner_areas(area_id);
create index partner_areas_user_idx on public.partner_areas(user_id);
comment on table public.partner_areas is
  'A climber listed as an available partner at an area (0300). Owner-only; read across climbers through partners_in_area / partners_for_my_areas / partner_area_counts / partner_areas_of_users, which apply discoverable and blocks.';
comment on column public.partner_areas.disciplines is 'Crag types wanted at this area; empty = any of trad/sport/toprope/aid/bouldering.';
comment on column public.partner_areas.free_from is 'Optional one date window ("free here Oct 18-19"); both ends or neither. Expired windows read back as null, the listing stays.';

-- CHECK cannot subquery, so the area-type rule and the per-climber cap are a trigger.
create or replace function public.partner_areas_validate() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare t text; n integer;
begin
  select a.area_type into t from areas a where a.id = new.area_id;
  if t is null then raise exception 'unknown area'; end if;
  if t in ('peak', 'world', 'country') then
    raise exception 'list yourself at a crag, canyon, range or state — climbing on a peak is matched by route';
  end if;
  select count(*) into n from partner_areas pa where pa.user_id = new.user_id and pa.id <> new.id;
  if n >= 30 then raise exception 'at most 30 listed areas'; end if;
  new.updated_at := now();
  return new;
end $function$;
revoke all on function public.partner_areas_validate() from public, anon, authenticated;
create trigger trg_partner_areas_validate before insert or update on public.partner_areas
  for each row execute function public.partner_areas_validate();

alter table public.partner_areas enable row level security;
create policy "owner reads own partner areas" on public.partner_areas
  for select using (auth.uid() = user_id);
create policy "owner lists own partner areas" on public.partner_areas
  for insert with check (auth.uid() = user_id);
create policy "owner updates own partner areas" on public.partner_areas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner removes own partner areas" on public.partner_areas
  for delete using (auth.uid() = user_id);

-- ── partners_in_area: who is listed at this area, inside it, or across an area that contains it ──
drop function if exists public.partners_in_area(text, double precision, double precision, integer, integer);
create function public.partners_in_area(
  p_area_id text, p_lat double precision default null, p_lng double precision default null,
  p_radius_mi integer default null, p_limit integer default 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
              sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
              availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer,
              listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[],
              free_from date, free_to date, listed_above boolean)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  tp ltree;
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  select a.path into tp from areas a where a.id = p_area_id;
  if tp is null then raise exception 'unknown area'; end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'a valid origin is required';
  end if;
  return query
    with lr as (
      select pa.user_id, pa.area_id, la.name as area_name, la.path as area_path, pa.disciplines as discs,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_from end as ff,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_to end as ft,
             (la.path @> tp and la.path <> tp) as above_t
      from partner_areas pa join areas la on la.id = pa.area_id
      where pa.user_id <> auth.uid() and (la.path <@ tp or la.path @> tp)
    ), m as (
      select lr.user_id,
             array_agg(lr.area_id order by nlevel(lr.area_path) desc, lr.area_id) as ids,
             array_agg(lr.area_name order by nlevel(lr.area_path) desc, lr.area_id) as names,
             array_agg(lr.area_path::text order by nlevel(lr.area_path) desc, lr.area_id) as paths,
             (select array_agg(distinct x order by x) from lr lr2, unnest(lr2.discs) x where lr2.user_id = lr.user_id) as discs,
             (array_agg(lr.ff order by lr.ff nulls last))[1] as ff,
             (array_agg(lr.ft order by lr.ff nulls last))[1] as ft,
             bool_and(lr.above_t) as above_t
      from lr group by lr.user_id
    ), d as (
      select p.*, m.ids, m.names, m.paths, m.discs, m.ff, m.ft, m.above_t,
             case when p_lat is null or z.lat is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians(z.lat - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) end as miles
      from m
      join profiles p on p.id = m.user_id
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end,
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;
revoke all on function public.partners_in_area(text, double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_in_area(text, double precision, double precision, integer, integer) to authenticated, service_role;

-- ── partners_for_my_areas: "Near my areas" — climbers whose listings overlap any of MINE ──
drop function if exists public.partners_for_my_areas(double precision, double precision, integer, integer);
create function public.partners_for_my_areas(
  p_lat double precision default null, p_lng double precision default null,
  p_radius_mi integer default null, p_limit integer default 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
              sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
              availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer,
              listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[],
              free_from date, free_to date, listed_above boolean,
              shared_count integer, via_area_names text[])
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'a valid origin is required';
  end if;
  return query
    with my as (
      select la.id as area_id, la.name as area_name, la.path as area_path
      from partner_areas pa join areas la on la.id = pa.area_id where pa.user_id = auth.uid()
    ), lr as (
      select pa.user_id, pa.area_id, la.name as area_name, la.path as area_path, pa.disciplines as discs,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_from end as ff,
             case when pa.free_to is not null and pa.free_to >= current_date then pa.free_to end as ft,
             (la.path @> my.area_path and la.path <> my.area_path) as above_t,
             my.area_name as via_name
      from partner_areas pa
      join areas la on la.id = pa.area_id
      join my on (la.path <@ my.area_path or la.path @> my.area_path)
      where pa.user_id <> auth.uid()
    ), m as (
      select lr.user_id,
             (select array_agg(q.area_id order by nlevel(q.area_path) desc, q.area_id) from (select distinct lr2.area_id, lr2.area_path from lr lr2 where lr2.user_id = lr.user_id) q) as ids,
             (select array_agg(q.area_name order by nlevel(q.area_path) desc, q.area_id) from (select distinct lr2.area_id, lr2.area_name, lr2.area_path from lr lr2 where lr2.user_id = lr.user_id) q) as names,
             (select array_agg(q.area_path::text order by nlevel(q.area_path) desc, q.area_id) from (select distinct lr2.area_id, lr2.area_path from lr lr2 where lr2.user_id = lr.user_id) q) as paths,
             (select array_agg(distinct x order by x) from lr lr2, unnest(lr2.discs) x where lr2.user_id = lr.user_id) as discs,
             (array_agg(lr.ff order by lr.ff nulls last))[1] as ff,
             (array_agg(lr.ft order by lr.ff nulls last))[1] as ft,
             bool_and(lr.above_t) as above_t,
             count(distinct lr.area_id)::integer as cnt,
             array_agg(distinct lr.via_name) as via
      from lr group by lr.user_id
    ), d as (
      select p.*, m.ids, m.names, m.paths, m.discs, m.ff, m.ft, m.above_t, m.cnt, m.via,
             case when p_lat is null or z.lat is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians(z.lat - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) end as miles
      from m
      join profiles p on p.id = m.user_id
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end,
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t,
           d.cnt, d.via[1:10]
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;
revoke all on function public.partners_for_my_areas(double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_for_my_areas(double precision, double precision, integer, integer) to authenticated, service_role;

-- ── partner_area_counts: "12 climbers listed here", for up to 50 areas in one call ──
drop function if exists public.partner_area_counts(text[]);
create function public.partner_area_counts(p_area_ids text[])
returns table(area_id text, listed_count integer)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to see who is listed'; end if;
  if coalesce(array_length(p_area_ids, 1), 0) > 50 then raise exception 'too many areas'; end if;
  return query
    select t.aid, (
      select count(distinct pa.user_id)::integer
      from partner_areas pa
      join areas la on la.id = pa.area_id
      join profiles p on p.id = pa.user_id
      where pa.user_id <> auth.uid()
        and (la.path <@ ta.path or la.path @> ta.path)
        and p.discoverable = true and not profile_owner_blocked_me(p.id))
    from unnest(p_area_ids) as t(aid)
    join areas ta on ta.id = t.aid;
end;
$function$;
revoke all on function public.partner_area_counts(text[]) from public, anon;
grant execute on function public.partner_area_counts(text[]) to authenticated, service_role;

-- ── partner_areas_of_users: the listings of the climbers on screen, ONE read (the useObjectivesOfUsers analogue) ──
drop function if exists public.partner_areas_of_users(uuid[]);
create function public.partner_areas_of_users(p_ids uuid[])
returns table(user_id uuid, area_id text, area_name text, area_type text, area_path text,
              disciplines text[], free_from date, free_to date)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to see partner listings'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 200 then raise exception 'too many climbers'; end if;
  return query
    select pa.user_id, pa.area_id, la.name, la.area_type, la.path::text, pa.disciplines,
           case when pa.free_to is not null and pa.free_to >= current_date then pa.free_from end,
           case when pa.free_to is not null and pa.free_to >= current_date then pa.free_to end
    from partner_areas pa
    join areas la on la.id = pa.area_id
    join profiles p on p.id = pa.user_id
    where pa.user_id = any(p_ids)
      and (p.id = auth.uid() or (p.discoverable = true and not profile_owner_blocked_me(p.id)))
    order by pa.user_id, nlevel(la.path) desc, pa.area_id;
end;
$function$;
revoke all on function public.partner_areas_of_users(uuid[]) from public, anon;
grant execute on function public.partner_areas_of_users(uuid[]) to authenticated, service_role;

-- ── match_objectives_of_users: the objectives that STILL COUNT for a match — crag routes have left ──
-- Rule (one place, mirrored by ME.matchObjectiveIds in the app): a route counts when its discipline is
-- not crag-family, or it is filed on a PEAK. check:partner-areas pins both halves.
drop function if exists public.match_objectives_of_users(uuid[]);
create function public.match_objectives_of_users(p_ids uuid[])
returns table(user_id uuid, route_id text)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to see objectives'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 200 then raise exception 'too many climbers'; end if;
  return query
    select o.user_id, o.route_id
    from objectives o
    join routes rt on rt.id = o.route_id
    join areas a on a.id = rt.area_id
    join profiles p on p.id = o.user_id
    where o.user_id = any(p_ids)
      and (rt.discipline not in ('trad','sport','toprope','aid','bouldering') or a.area_type = 'peak')
      and (p.id = auth.uid() or (p.discoverable = true and not profile_owner_blocked_me(p.id)))
    order by o.user_id, o.created_at desc;
end;
$function$;
revoke all on function public.match_objectives_of_users(uuid[]) from public, anon;
grant execute on function public.match_objectives_of_users(uuid[]) to authenticated, service_role;

commit;
