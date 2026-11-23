-- 0502: two small hardenings from the crews-and-partners review (2026-11-23). Each function below is its LIVE
-- definition with one substitution, so nothing else about it changes.
--
--   1. THE 5-MILE ROUNDING DID NOT PROTECT A ZIP. The four partner searches take any origin the caller names and
--      filter on the exact distance to a climber's zip centroid, so "is this climber within r miles of here?"
--      could be asked from three points and the centroid read off -- and with it the zip, which is owner-only.
--      The centroid is now snapped to a 0.1 degree grid (about 7 by 5 miles) before any distance is taken, so
--      the most that can be recovered is the grid cell. The distance a card shows was already rounded up to the
--      next 5 miles; it can now be off by a few miles more, never by less than the truth allows.
--   2. "TODAY" WAS REFUSED FROM LATE AFTERNOON. crew_propose_day refused a day before current_date, the
--      database's UTC day, so from about 4 pm Pacific proposing today failed with "pick today or a later day";
--      crew_share_preview dropped a share link the evening of the climb for the same reason. Both now allow
--      one day of slack, which no time zone outruns.

begin;

CREATE OR REPLACE FUNCTION public.crew_propose_day(p_crew uuid, p_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_crew public.crews%rowtype;
  v_key text := to_char(p_date, 'YYYY-MM-DD');
begin
  if v_uid is null then
    raise exception 'sign in to propose a day' using errcode = '42501';
  end if;
  select * into v_crew from public.crews where id = p_crew for update;
  if not found then
    raise exception 'crew not found' using errcode = 'P0002';
  end if;
  if v_crew.created_by is distinct from v_uid and not exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew and m.user_id = v_uid and m.status = 'confirmed'
  ) then
    raise exception 'only the crew''s members can propose a day' using errcode = '42501';
  end if;
  if p_date is null or p_date < current_date - 1 then
    raise exception 'pick today or a later day' using errcode = '22023';
  end if;
  if coalesce(v_crew.dates, '[]'::jsonb) ? v_key then
    -- Already proposed: still say the caller can make it, nothing else changes.
    insert into public.crew_day_acks (crew_id, user_id, date) values (p_crew, v_uid, p_date)
      on conflict do nothing;
    return;
  end if;
  if jsonb_array_length(coalesce(v_crew.dates, '[]'::jsonb)) >= 10 then
    raise exception 'a crew can have at most 10 proposed days — take one back first' using errcode = '22023';
  end if;
  update public.crews
     set dates = (select coalesce(jsonb_agg(d order by d), '[]'::jsonb)
                    from (select jsonb_array_elements_text(coalesce(v_crew.dates, '[]'::jsonb)) as d
                          union select v_key) s),
         date_proposers = coalesce(date_proposers, '{}'::jsonb) || jsonb_build_object(v_key, v_uid::text)
   where id = p_crew;
  -- Putting a day forward says you can make it.
  insert into public.crew_day_acks (crew_id, user_id, date) values (p_crew, v_uid, p_date)
    on conflict do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.crew_share_preview(p_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with c as (
    select cr.*
      from crews cr
     where cr.share_token = p_token
       and cr.share_on
       and not cr.dismissed
       and not cr.private
  ),
  last_day as (
    select coalesce(
             case when c.agreed_date ~ '^\d{4}-\d{2}-\d{2}$' then c.agreed_date::date end,
             (select max(x::date) from jsonb_array_elements_text(c.dates) x where x ~ '^\d{4}-\d{2}-\d{2}$')
           ) as d
      from c
  ),
  ids as (
    select c.created_by as user_id from c where c.created_by is not null
    union
    select cm.user_id from c join crew_members cm on cm.crew_id = c.id and cm.status = 'confirmed'
  ),
  people as (
    select p.name, p.show_name from ids join profiles p on p.id = ids.user_id
  )
  select case
    when not exists (select 1 from c) then null
    when (select d from last_day) is not null and (select d from last_day) < current_date - 1 then null
    else jsonb_build_object(
      'crew_id',     (select id from c),
      'route_id',    (select route_id from c),
      'area_id',     (select area_id from c),
      'discipline',  (select discipline from c),
      'dates',       (select dates from c),
      'agreed_date', (select agreed_date from c),
      'cap',         (select cap from c),
      'going',       (select count(*) from ids),
      'first_names', (select coalesce(jsonb_agg(split_part(btrim(name), ' ', 1)), '[]'::jsonb)
                        from people where show_name and coalesce(btrim(name), '') <> ''),
      'place_name',  coalesce((select r.name from c join routes r on r.id = c.route_id),
                              (select a.name from c join areas a on a.id = c.area_id))
    )
  end;
$function$;

CREATE OR REPLACE FUNCTION public.partners_by_objective(p_route_ids text[] DEFAULT NULL::text[], p_area_id text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, shared_route_ids text[], shared_count integer, listed boolean, listing_note text, free_from date, free_to date, saved boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
             case when p_lat is null or (round(z.lat::numeric, 1))::double precision is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians((round(z.lat::numeric, 1))::double precision - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians((round(z.lat::numeric, 1))::double precision)) * power(sin(radians((round(z.lng::numeric, 1))::double precision - p_lng) / 2), 2))) end as miles
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

CREATE OR REPLACE FUNCTION public.partners_for_my_areas(p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[], free_from date, free_to date, listed_above boolean, shared_count integer, via_area_names text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      join my on (la.path <@ my.area_path or (la.path @> my.area_path and la.area_type <> 'state'))
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
             case when p_lat is null or (round(z.lat::numeric, 1))::double precision is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians((round(z.lat::numeric, 1))::double precision - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians((round(z.lat::numeric, 1))::double precision)) * power(sin(radians((round(z.lng::numeric, 1))::double precision - p_lng) / 2), 2))) end as miles
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
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t,
           d.cnt, d.via[1:10]
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partners_in_area(p_area_id text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[], free_from date, free_to date, listed_above boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      where pa.user_id <> auth.uid() and (la.path <@ tp or (la.path @> tp and la.area_type <> 'state'))
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
             case when p_lat is null or (round(z.lat::numeric, 1))::double precision is null then null else 3958.8 * 2 * asin(sqrt(
                 power(sin(radians((round(z.lat::numeric, 1))::double precision - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians((round(z.lat::numeric, 1))::double precision)) * power(sin(radians((round(z.lng::numeric, 1))::double precision - p_lng) / 2), 2))) end as miles
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
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partners_near(p_lat double precision, p_lng double precision, p_radius_mi integer, p_limit integer DEFAULT 24)
 RETURNS TABLE(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, free_until date, dist_mi integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
               power(sin(radians((round(z.lat::numeric, 1))::double precision - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians((round(z.lat::numeric, 1))::double precision)) * power(sin(radians((round(z.lng::numeric, 1))::double precision - p_lng) / 2), 2))) as miles
      from profiles p
      join profile_zips pz on pz.user_id = p.id
      join zip_centroids z on z.zip = pz.zip
      where p.discoverable = true and p.id <> auth.uid() and not profile_owner_blocked_me(p.id)
    )
    select d.id, d.public_name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr, d.free_until,
           (greatest(1, ceil(d.miles / 5.0)) * 5)::integer as dist_mi
    from d where d.miles <= r order by d.miles, d.id limit n;
end;
$function$;

commit;
