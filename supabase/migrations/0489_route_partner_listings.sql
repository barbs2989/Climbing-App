-- 0489: route_partner_listings — a climber LISTS THEMSELVES AS A PARTNER FOR ONE ROUTE (owner, 2026-11-23:
-- "you should be able to list yourself as a partner under the partners tab for all routes").
--
-- Before this a crag route had "List me at <crag>" (partner_areas, 0300), and every other route — alpine,
-- mountaineering, scrambling, ice, mixed, a hike — had nothing: a climber showed on the route's own page
-- only by SAVING it as an objective, and nothing on the page said so. This is the route-level half:
--
--   * one row per (climber, route): "I want a partner for this", an optional note and ONE optional date
--     window, exactly as a partner_areas row carries them. An expired window reads back as no window.
--   * NOT a crag route. Sport, trad, top-rope, aid and bouldering stay AREA-based (0300, check:partner-areas):
--     the trigger refuses a crag-family route unless it is filed on a peak — the same rule
--     partners_by_objective and match_objectives_of_users apply to an objective.
--   * a listing is NOT an objective. A climber can list without saving the route, and remove the listing
--     without losing the objective; match_objectives_of_users (the match %) is untouched.
--   * OWNER-ONLY table, like partner_areas and unlike objectives (public-read). The one cross-climber read
--     is partners_by_objective, re-created here: it unions listings into the climbers it already found by
--     objective, under the same gate (signed in, profiles.discoverable, not a climber who blocked the
--     caller), puts listed climbers first, and returns `listed`, `listing_note`, `free_from`, `free_to` and `saved`
--     (they also saved one of the routes, so the page can still say how many savers it cannot show).
--     So the route page AND the partner finder's by-climb search both find a listed climber.

begin;

create table public.route_partner_listings (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  route_id   text not null references public.routes(id) on delete cascade,
  free_from  date,
  free_to    date,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, route_id),
  constraint route_partner_listings_window
    check ((free_from is null) = (free_to is null) and (free_to is null or free_to >= free_from)),
  constraint route_partner_listings_note_len check (note is null or length(note) <= 140)
);
create index route_partner_listings_route_idx on public.route_partner_listings(route_id);
comment on table public.route_partner_listings is
  'A climber listed as an available partner for one route (0489). Owner-only; read across climbers only through partners_by_objective, which applies discoverable and blocks. Crag routes are refused: they list by area (partner_areas).';
comment on column public.route_partner_listings.free_from is 'Optional one date window; both ends or neither. Expired windows read back as null, the listing stays.';

-- CHECK cannot subquery, so the crag rule and the per-climber cap are a trigger.
create or replace function public.route_partner_listings_validate() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare d text; t text; n integer;
begin
  select rt.discipline, a.area_type into d, t from routes rt left join areas a on a.id = rt.area_id where rt.id = new.route_id;
  if not found then raise exception 'unknown route'; end if;
  if d in ('trad','sport','toprope','aid','bouldering') and coalesce(t, '') <> 'peak' then
    raise exception 'list yourself at the crag — partners for a crag climb are found by area';
  end if;
  if tg_op = 'INSERT' then
    select count(*) into n from route_partner_listings l where l.user_id = new.user_id;
    if n >= 30 then raise exception 'at most 30 listed climbs'; end if;
  end if;
  new.updated_at := now();
  return new;
end $function$;
revoke all on function public.route_partner_listings_validate() from public, anon, authenticated;
create trigger trg_route_partner_listings_validate before insert or update on public.route_partner_listings
  for each row execute function public.route_partner_listings_validate();

alter table public.route_partner_listings enable row level security;
create policy "owner reads own route listings" on public.route_partner_listings
  for select using (auth.uid() = user_id);
create policy "owner adds own route listings" on public.route_partner_listings
  for insert with check (auth.uid() = user_id);
create policy "owner updates own route listings" on public.route_partner_listings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner removes own route listings" on public.route_partner_listings
  for delete using (auth.uid() = user_id);
revoke all on public.route_partner_listings from anon;

-- ── partners_by_objective: climbers who SAVED one of these routes, or LISTED themselves for one ──
-- The return type grows by five columns, so the function is dropped and re-created (0434's body otherwise).
drop function if exists public.partners_by_objective(text[], text, double precision, double precision, integer, integer);
create function public.partners_by_objective(p_route_ids text[] DEFAULT NULL::text[], p_area_id text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, shared_route_ids text[], shared_count integer, listed boolean, listing_note text, free_from date, free_to date, saved boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $function$
declare
  n integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  apath ltree;
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if p_route_ids is null and p_area_id is null then raise exception 'a route or an area is required'; end if;
  if coalesce(array_length(p_route_ids, 1), 0) > 500 then raise exception 'too many routes'; end if;
  if p_area_id is not null then
    select a.path into apath from areas a where a.id = p_area_id;
    if apath is null then raise exception 'unknown area'; end if;
  end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
    raise exception 'a valid origin is required';
  end if;
  return query
    with src as (
      select o.user_id, o.route_id, o.created_at, false as is_listed, null::text as note, null::date as ff, null::date as ft
      from objectives o
      union all
      select l.user_id, l.route_id, l.created_at, true, l.note,
             case when l.free_to is not null and l.free_to >= current_date then l.free_from end,
             case when l.free_to is not null and l.free_to >= current_date then l.free_to end
      from route_partner_listings l
    ), u as (
      -- one row per (climber, route): a route both saved and listed counts once, as listed
      select s.user_id, s.route_id, max(s.created_at) as at, bool_or(s.is_listed) as is_listed, bool_or(not s.is_listed) as is_saved,
             max(s.note) as note, max(s.ff) as ff, max(s.ft) as ft
      from src s
      join routes rt on rt.id = s.route_id
      join areas a on a.id = rt.area_id
      where s.user_id <> auth.uid()
        and (p_route_ids is null or s.route_id = any(p_route_ids))
        and (rt.discipline not in ('trad','sport','toprope','aid','bouldering') or a.area_type = 'peak')
        and (apath is null or a.path <@ apath)
      group by s.user_id, s.route_id
    ), m as (
      select u.user_id, array_agg(u.route_id order by u.is_listed desc, u.at desc) as ids, count(*)::integer as cnt,
             bool_or(u.is_listed) as is_listed, bool_or(u.is_saved) as is_saved,
             (array_agg(u.note order by u.at desc) filter (where u.is_listed))[1] as note,
             (array_agg(u.ff order by u.at desc) filter (where u.is_listed))[1] as ff,
             (array_agg(u.ft order by u.at desc) filter (where u.is_listed))[1] as ft
      from u
      group by u.user_id
    ), d as (
      select p.*, m.ids, m.cnt, m.is_listed, m.is_saved, m.note as l_note, m.ff, m.ft,
             case when p_lat is null or z.lat is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians(z.lat - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) end as miles
      from m
      join profiles p on p.id = m.user_id
      left join profile_zips pz on pz.user_id = p.id
      left join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.public_name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr,
           case when d.miles is null then null else (greatest(1, ceil(d.miles / 5.0)) * 5)::integer end,
           d.ids[1:20], d.cnt, d.is_listed, d.l_note, d.ff, d.ft, d.is_saved
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.is_listed desc, d.cnt desc, d.miles nulls last, d.id
    limit n;
end;
$function$;
revoke all on function public.partners_by_objective(text[], text, double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_by_objective(text[], text, double precision, double precision, integer, integer) to authenticated, service_role;

commit;
