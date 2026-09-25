-- 0207 (applied by hand in the SQL Editor on 2026-09-24): the partner-match signals a profile
-- collected and never stored, and crew gear claims.
--
-- 1. profiles.availability / avail_week / hiking_speed_ft_hr. The week grid, the Me-tab availability
--    chips and the Speed profile were React state only, so compat() had no pace or availability for
--    any real climber and the browse row refused every match %. Public read like disciplines.
-- 2. partners_near (0189) re-created to return those three columns; grants unchanged
--    (authenticated + service_role).
-- 3. crew_members.gear_claims / gear_extras, written through set_my_crew_gear: the row policy
--    "member updates own membership" refuses a CONFIRMED member who joined by request, so a plain
--    update would silently fail for them. The definer touches only the two gear columns on the
--    caller's own row in a crew they are in.

alter table public.profiles
  add column if not exists availability text[] not null default '{}',
  add column if not exists avail_week text[] not null default '{}',
  add column if not exists hiking_speed_ft_hr integer;
alter table public.profiles drop constraint if exists profiles_availability_values;
alter table public.profiles add constraint profiles_availability_values
  check (availability <@ array['weekends','weekday_am','weekday_pm','flexible']::text[]);
alter table public.profiles drop constraint if exists profiles_avail_week_values;
alter table public.profiles add constraint profiles_avail_week_values
  check (avail_week <@ array['mon_am','mon_pm','tue_am','tue_pm','wed_am','wed_pm','thu_am','thu_pm','fri_am','fri_pm','sat_am','sat_pm','sun_am','sun_pm']::text[]);
alter table public.profiles drop constraint if exists profiles_hiking_speed_range;
alter table public.profiles add constraint profiles_hiking_speed_range
  check (hiking_speed_ft_hr is null or hiking_speed_ft_hr between 100 and 6000);

drop function if exists public.partners_near(double precision, double precision, integer, integer);
create function public.partners_near(p_lat double precision, p_lng double precision, p_radius_mi integer, p_limit integer default 24)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb,
              sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean,
              availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  r double precision := least(greatest(coalesce(p_radius_mi, 50), 10), 500);
  n integer := least(greatest(coalesce(p_limit, 24), 1), 50);
begin
  if auth.uid() is null then raise exception 'sign in to search for partners'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'a valid origin is required';
  end if;
  return query
    with d as (
      select p.*, 3958.8 * 2 * asin(sqrt(
               power(sin(radians(z.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - p_lng) / 2), 2))) as miles
      from profiles p
      join profile_zips pz on pz.user_id = p.id
      join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and p.id <> auth.uid() and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr,
           (greatest(1, ceil(d.miles / 5.0)) * 5)::integer as dist_mi
    from d where d.miles <= r order by d.miles, d.id limit n;
end;
$function$;
revoke all on function public.partners_near(double precision, double precision, integer, integer) from public, anon;
grant execute on function public.partners_near(double precision, double precision, integer, integer) to authenticated, service_role;

alter table public.crew_members
  add column if not exists gear_claims text[] not null default '{}',
  add column if not exists gear_extras text[] not null default '{}';

create or replace function public.set_my_crew_gear(p_crew_id uuid, p_claims text[], p_extras text[])
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if coalesce(array_length(p_claims,1),0) > 100 or coalesce(array_length(p_extras,1),0) > 50 then
    raise exception 'too many gear items'; end if;
  if exists (select 1 from unnest(coalesce(p_claims,'{}') || coalesce(p_extras,'{}')) g where length(g) > 80 or length(trim(g)) = 0) then
    raise exception 'a gear item must be 1-80 characters'; end if;
  update crew_members set gear_claims = coalesce(p_claims,'{}'), gear_extras = coalesce(p_extras,'{}')
   where crew_id = p_crew_id and user_id = auth.uid() and status in ('confirmed','pending');
  get diagnostics n = row_count;
  if n = 0 then raise exception 'you are not in this crew'; end if;
end;
$function$;
revoke all on function public.set_my_crew_gear(uuid, text[], text[]) from public, anon;
grant execute on function public.set_my_crew_gear(uuid, text[], text[]) to authenticated, service_role;
