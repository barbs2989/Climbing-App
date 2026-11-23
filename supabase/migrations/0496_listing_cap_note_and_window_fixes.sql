-- 0496: route and area listings — four fixes from the review of 0489 (2026-11-23).
--
--   1. THE 30-LISTING CAP REFUSED AN EDIT. route_partner_listings_validate counted every row of the climber
--      on INSERT, and the app saves with an upsert, whose BEFORE INSERT trigger fires even when the row
--      exists and the statement ends as an update. A climber with 30 listings could not change the dates or
--      note on any of them ("at most 30 listed climbs"). The count now leaves out the row being written, on
--      every operation. partner_areas_validate had the same fault by another road: it left out pa.id <> new.id,
--      and on an upsert new.id is a fresh uuid that matches nothing, so it now leaves out the same AREA.
--   2. THE NOTE WAS NOT CHECKED. A listing's note is free text that every signed-in climber who opens the
--      route (or searches the area) reads, and nothing compared it with the screening floor (0265). Both
--      validate triggers now refuse a note that matches it, at save time. This is the floor only: a listing
--      has no moderation column and no queue entry, so a note is refused, never held. The climber who wrote
--      one can still be reported from their profile.
--   3. A WINDOW ENDING TODAY VANISHED IN THE AFTERNOON. partners_by_objective compared free_to with
--      current_date, the database's UTC day, so "free Nov 28" stopped showing to others at 4 pm Pacific on
--      the 28th. It now keeps a window through the day after its last day, which no time zone outruns.
--
-- partner_areas' own readers keep their current_date test; that table gets the cap fix and the note check.

begin;

create or replace function public.route_partner_listings_validate() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare d text; t text; n integer;
begin
  select rt.discipline, a.area_type into d, t from routes rt left join areas a on a.id = rt.area_id where rt.id = new.route_id;
  if not found then raise exception 'unknown route'; end if;
  if d in ('trad','sport','toprope','aid','bouldering') and coalesce(t, '') <> 'peak' then
    raise exception 'list yourself at the crag — partners for a crag climb are found by area';
  end if;
  select count(*) into n from route_partner_listings l where l.user_id = new.user_id and l.route_id <> new.route_id;
  if n >= 30 then raise exception 'at most 30 listed climbs'; end if;
  if new.note is not null and screening_match(new.note) is not null then
    raise exception 'that note can''t be posted — please reword it';
  end if;
  new.updated_at := now();
  return new;
end $function$;
revoke all on function public.route_partner_listings_validate() from public, anon, authenticated;

create or replace function public.partner_areas_validate() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare t text; n integer;
begin
  select a.area_type into t from areas a where a.id = new.area_id;
  if t is null then raise exception 'unknown area'; end if;
  if t in ('world', 'country') then
    raise exception 'list yourself at a peak, crag, canyon, range or state — a country is too broad to search';
  end if;
  select count(*) into n from partner_areas pa where pa.user_id = new.user_id and pa.area_id <> new.area_id;
  if n >= 30 then raise exception 'at most 30 listed areas'; end if;
  if new.note is not null and screening_match(new.note) is not null then
    raise exception 'that note can''t be posted — please reword it';
  end if;
  new.updated_at := now();
  return new;
end $function$;
revoke all on function public.partner_areas_validate() from public, anon, authenticated;

create or replace function public.partners_by_objective(p_route_ids text[] DEFAULT NULL::text[], p_area_id text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
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
             case when l.free_to is not null and l.free_to >= current_date - 1 then l.free_from end,
             case when l.free_to is not null and l.free_to >= current_date - 1 then l.free_to end
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
