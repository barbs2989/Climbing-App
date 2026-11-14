-- 0434 — profiles: the API itself honours a climber's privacy choices, and signed-out visitors get only
-- the public card. STEP 1 of 2: everything additive (the public_* columns, my_profile(), the trigger, the
-- definer readers). The column grants described below are STEP 2 (supabase/profile-grants-step2.sql),
-- applied in a later migration once this PR's client is live; see section 4.
--
-- Until now `profiles` was readable in full by `anon` and `authenticated` (table-level SELECT, policy
-- "profiles public read" from 0095: every row except one whose owner blocked the reader). The privacy
-- switches were honoured only by what the app RENDERED: `show_name` (0175), `photos_public` (0174) and
-- `discoverable` (0104) each said so in their own column comments. Anyone holding the public anon key,
-- signed out included, could read every column of every profile: the real name whatever show_name said,
-- the photos whatever photos_public said, location, gender, availability, free_until, and account
-- bookkeeping (account_type, primary_account_id, terms_*, pinned_states, requests_from, ...).
--
-- THE SHAPE, and why it is column privileges rather than a view:
--   * The row policy is unchanged (owner, or anyone the owner has not blocked). What changes is WHICH
--     COLUMNS each client role may select, with a column-level GRANT per role.
--   * Three choices have to vary PER ROW, which a column grant cannot do, so they become stored
--     generated columns that apply the switch inside the row:
--       public_name         = name         when show_name,     else null
--       public_photos       = photos       when photos_public, else '{}'
--       public_photo_alts   = photo_alts   when photos_public, else null
--     The raw `name`, `photos` and `photo_alts` are granted to nobody but the owner (below). The app
--     selects `name:public_name` etc., so every consumer keeps reading `.name`.
--   * A view was the alternative. Every PostgREST embed of a profile (`sender:sender_id(...)`,
--     `profiles(name, avatar)` from comments, reviews, inquiries, guide listings) follows a foreign key
--     to THIS table, and the climber_resumes policy reads it as the caller; moving reads to a view would
--     turn each of those into a silent null rather than a loud error. With column grants a missed reader
--     fails with "permission denied", which every guard and the console can see.
--   * The OWNER reads their own full row through my_profile() (SECURITY DEFINER, own row only). Updates
--     are unchanged: UPDATE needs SELECT only on the columns it filters or returns (`id`).
--
-- WHO GETS WHAT
--   anon (signed out): the public card — handle, public name, avatar, bio, grades, disciplines, level,
--     climbing_since, created_at, the public photo strip, and the visibility flags the app branches on.
--   authenticated: the card plus what partner matching reads (location, availability, avail_week,
--     free_until, gender, climb_grades, hiking_speed_ft_hr, discoverable) and the climbing résumé
--     (certifications with cert_expiry, skills, belay_devices), which FullProfile shows other climbers.
--   nobody but the owner (via my_profile): name, photos, photo_alts, account_type, primary_account_id,
--     terms_accepted_version, terms_accepted_at, pinned_states, requests_from, mutuals_visible,
--     trip_reports_default.
--   is_admin stays readable by both roles: is_admin(uid) is a SECURITY INVOKER helper that roughly 90
--     policies call as the caller, signed out included, so revoking it would fail those reads.
--
-- WHAT RUNS AS THE CALLER and reads profiles (audited on a replay of 0001–0427): the climber_resumes
-- policy (reads resume_public: granted), is_admin() (is_admin: granted), and the
-- climb_logs_default_visibility trigger, which reads the inserting climber's trip_reports_default. That
-- trigger becomes SECURITY DEFINER (search_path pinned), the shape every other trigger here already has.
-- No view reads profiles. SECURITY DEFINER functions read as the owner and are unaffected.
--
-- A COLUMN ADDED TO profiles LATER IS READABLE BY NO CLIENT until a migration grants it. That is the
-- safe default; the migration adding it must say which role may read it.
--
-- SECURITY DEFINER readers: most return names through show_name already; seven returned the raw name of
-- another climber and are re-created in section 5 to read it through show_name.
--
-- Not changed: the row policy, blocking (profile_owner_blocked_me), service_role, INSERT/UPDATE/DELETE
-- grants and their policies.

begin;

-- ── 1. the per-row switches, applied inside the row ──────────────────────────────────────────────────
alter table public.profiles
  add column if not exists public_name text
    generated always as (case when show_name then name end) stored;
alter table public.profiles
  add column if not exists public_photos text[]
    generated always as (case when photos_public then photos else '{}'::text[] end) stored;
alter table public.profiles
  add column if not exists public_photo_alts jsonb
    generated always as (case when photos_public then photo_alts end) stored;

comment on column public.profiles.public_name is
  'name when show_name, else null. What other climbers and signed-out visitors can read (0434); the raw name is owner-only.';
comment on column public.profiles.public_photos is
  'photos when photos_public, else empty. What other climbers can read (0434); the raw photos column is owner-only.';
comment on column public.profiles.public_photo_alts is
  'photo_alts when photos_public, else null (0434).';
comment on column public.profiles.show_name is
  'Show my real name publicly. Enforced by the API since 0434: other readers get public_name, which is null when this is false.';
comment on column public.profiles.photos_public is
  'Show my profile photos to other climbers. Enforced by the API since 0434: other readers get public_photos, which is empty when this is false.';

-- ── 2. the owner's own full row ──────────────────────────────────────────────────────────────────────
create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public, pg_temp as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated, service_role;

-- ── 3. the one invoker trigger that read a column clients lose ───────────────────────────────────────
-- Body as 0272. Definer so it can read the inserting climber's trip_reports_default; it reads only the
-- row of the climber the log belongs to and writes only the inserted row's visibility.
create or replace function public.climb_logs_default_visibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.trip_report_visibility is null then
    select p.trip_reports_default into new.trip_report_visibility
      from profiles p where p.id = new.user_id;
    new.trip_report_visibility := coalesce(new.trip_report_visibility, 'public');
  end if;
  return new;
end;
$$;

-- ── 4. column privileges: STEP 2, NOT IN THIS MIGRATION ───────────────────────────────────────────
-- The revoke/grant that makes the columns above private lives in supabase/profile-grants-step2.sql and
-- ships as its own migration only once the client from this PR has reached users. Applied together, every
-- open tab still running the previous build (Pages deploys queue behind CI; the service worker serves the
-- old bundle until it updates) would fail its select("*") profile reads, own profile at sign-in included.
-- Until step 2 the table-level grant stands, so the new client and the old one both work.

-- ── 5. the definer readers that handed out a hidden name ─────────────────────────────────────────────
-- These run as the owner, so the grants above do not reach them, and each returned another climber's
-- raw `name` whatever show_name said (the app then hid it, but the API response carried it). Bodies are
-- exactly the current definitions (pg_get_functiondef on a replay of 0001–0427) with ONE change each:
--   log_tags_for_me, partners_near, partners_by_objective, partners_for_my_areas, partners_in_area:
--     the name column reads public_name (none of them returns the caller's own row);
--   crag_regular, leaderboard: name only when show_name, or when the row is the caller's own.
-- Signatures, result columns and grants are unchanged (create or replace keeps EXECUTE grants).

-- log_tags_for_me()
create or replace function public.log_tags_for_me()
returns table(log_id uuid, author_id uuid, author_name text, author_username text, author_avatar text, route_id text, route_name text, route_grade text, date_climbed date, tick_type text, verdict text)
language sql stable security definer set search_path = public, pg_temp as $function$
  select l.id, l.user_id, p.public_name, p.username, p.avatar, l.route_id, ro.name, ro.grade,
         l.date_climbed, l.tick_type, c.verdict
    from climb_logs l
    join profiles p on p.id = l.user_id
    left join routes ro on ro.id = l.route_id
    left join climb_log_confirmations c on c.log_id = l.id and c.partner_id = auth.uid()
   where auth.uid() is not null
     and auth.uid() = any(l.partners)
     and log_tag_eligible(l.user_id)
   order by (c.verdict is null) desc, l.date_climbed desc nulls last, l.id
   limit 50;
$function$;

-- partners_near(double precision,double precision,integer,integer)
create or replace function public.partners_near(p_lat double precision, p_lng double precision, p_radius_mi integer, p_limit integer DEFAULT 24)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, free_until date, dist_mi integer)
language plpgsql stable security definer set search_path = public, pg_temp as $function$
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
    select d.id, d.public_name, d.username, d.avatar, d.bio, d.location, d.disciplines,
           d.sport_grade, d.trad_grade, d.boulder_grade, d.show_name, d.resume_public,
           d.availability, d.avail_week, d.hiking_speed_ft_hr, d.free_until,
           (greatest(1, ceil(d.miles / 5.0)) * 5)::integer as dist_mi
    from d where d.miles <= r order by d.miles, d.id limit n;
end;
$function$;

-- partners_by_objective(text[],text,double precision,double precision,integer,integer)
create or replace function public.partners_by_objective(p_route_ids text[] DEFAULT NULL::text[], p_area_id text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, shared_route_ids text[], shared_count integer)
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
    with m as (
      select o.user_id, array_agg(o.route_id order by o.created_at desc) as ids, count(*)::integer as cnt
      from objectives o
      join routes rt on rt.id = o.route_id
      join areas a on a.id = rt.area_id
      where o.user_id <> auth.uid()
        and (p_route_ids is null or o.route_id = any(p_route_ids))
        and (rt.discipline not in ('trad','sport','toprope','aid','bouldering') or a.area_type = 'peak')
        and (apath is null or a.path <@ apath)
      group by o.user_id
    ), d as (
      select p.*, m.ids, m.cnt,
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
           d.ids[1:20], d.cnt
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.miles nulls last, d.id
    limit n;
end;
$function$;

-- partners_for_my_areas(double precision,double precision,integer,integer)
create or replace function public.partners_for_my_areas(p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[], free_from date, free_to date, listed_above boolean, shared_count integer, via_area_names text[])
language plpgsql stable security definer set search_path = public, pg_temp as $function$
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
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t,
           d.cnt, d.via[1:10]
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.cnt desc, d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;

-- partners_in_area(text,double precision,double precision,integer,integer)
create or replace function public.partners_in_area(p_area_id text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_radius_mi integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
returns table(id uuid, name text, username text, avatar text, bio text, location text, disciplines jsonb, sport_grade text, trad_grade text, boulder_grade text, show_name boolean, resume_public boolean, availability text[], avail_week text[], hiking_speed_ft_hr integer, dist_mi integer, listed_area_ids text[], listed_area_names text[], listed_area_paths text[], listed_disciplines text[], free_from date, free_to date, listed_above boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $function$
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
           d.ids[1:10], d.names[1:10], d.paths[1:10], coalesce(d.discs, '{}'::text[]), d.ff, d.ft, d.above_t
    from d
    where p_lat is null or (d.miles is not null and d.miles <= r)
    order by d.above_t asc, d.miles nulls last, d.id
    limit n;
end;
$function$;

-- crag_regular(text)
create or replace function public.crag_regular(p_area_id text)
returns table(user_id uuid, name text, username text, show_name boolean, avatar text, days integer, logs integer, last_day date, is_me boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  a_path ltree;
begin
  if me is null then raise exception 'sign in to see the crag regular'; end if;
  select a.path into a_path from areas a where a.id = p_area_id;
  if a_path is null then return; end if;

  return query
  with people as (
    select p.id, case when p.show_name or p.id = me then p.name end as name, p.username, p.show_name, p.avatar
      from profiles p
     where (p.id = me or coalesce(p.show_on_ranks, true))
       and not profile_owner_blocked_me(p.id)
       and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)
  ),
  d as (
    select l.user_id,
           count(distinct l.date_climbed)::integer as days,
           count(*)::integer as logs,
           max(l.date_climbed) as last_day
      from climb_logs l
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where ra.path <@ a_path
       and l.moderation = 'visible'
       and l.date_climbed is not null
       and l.date_climbed >= current_date - 90
       and l.date_climbed <= current_date + 1
       and lower(coalesce(l.tick_type, '')) <> 'conditions'
       and l.user_id in (select pe.id from people pe)
       and (l.user_id = me
            or l.trip_report_visibility = 'public'
            or (l.trip_report_visibility = 'friends' and are_friends(me, l.user_id))
            or (l.trip_report_visibility = 'crew' and l.crew_id in (
                  select cm.crew_id from crew_members cm where cm.user_id = me and cm.status = 'confirmed')))
     group by l.user_id
  )
  select pe.id, pe.name, pe.username, pe.show_name, pe.avatar, d.days, d.logs, d.last_day, (pe.id = me)
    from d
    join people pe on pe.id = d.user_id
   where d.days >= 2
   order by d.days desc, d.logs desc, d.last_day desc, pe.id
   limit 1;
end $function$;

-- leaderboard(text,text,integer)
create or replace function public.leaderboard(p_scope text, p_area_id text DEFAULT NULL::text, p_radius_mi integer DEFAULT 120)
returns table(user_id uuid, is_me boolean, name text, username text, show_name boolean, avatar text, location text, disciplines jsonb, dist_mi integer, no_origin boolean, vouches integer, contribs integer, stats jsonb)
language plpgsql stable security definer set search_path = public, pg_temp as $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  r double precision := least(greatest(coalesce(p_radius_mi, 120), 10), 500);
  o_lat double precision; o_lng double precision;
  a_path ltree;
begin
  if me is null then raise exception 'sign in to see rankings'; end if;
  if p_scope is null or p_scope not in ('overall', 'near', 'friends', 'area') then
    raise exception 'unknown scope %', p_scope;
  end if;
  if p_scope = 'near' then
    select z.lat, z.lng into o_lat, o_lng
      from profile_zips pz join zip_centroids z on z.zip = pz.zip where pz.user_id = me;
  end if;
  if p_scope = 'area' then
    select a.path into a_path from areas a where a.id = p_area_id;
    if a_path is null then raise exception 'unknown area %', p_area_id; end if;
  end if;

  return query
  with people as (
    select p.id, (p.id = me) as is_me, case when p.show_name or p.id = me then p.name end as name, p.username, p.show_name, p.avatar, p.location, p.disciplines, coalesce(p.show_on_ranks, true) as ranks_ok,
           case when p_scope = 'near' and o_lat is not null then (
             select 3958.8 * 2 * asin(sqrt(
                      power(sin(radians(z.lat - o_lat) / 2), 2)
                    + cos(radians(o_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - o_lng) / 2), 2)))
               from profile_zips pz join zip_centroids z on z.zip = pz.zip where pz.user_id = p.id)
           end as miles
      from profiles p
     where (p.id = me or coalesce(p.show_on_ranks, true))
       and not profile_owner_blocked_me(p.id)
       and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)
       and (p_scope <> 'friends' or p.id = me
            or exists (select 1 from connections c where c.status = 'accepted'
                        and ((c.requester = me and c.addressee = p.id) or (c.addressee = me and c.requester = p.id))))
  ),
  scoped as (
    select * from people pe
     where p_scope <> 'near' or pe.is_me or (pe.miles is not null and pe.miles <= r)
  ),
  -- WHICH logs count and how well each is backed is rankable_logs (0203), shared with my_trust_counts
  -- score. A conditions report is not a climb, so it is dropped here, before the first-log order.
  counted0 as (
    select rl.id, rl.user_id, rl.route_id, rl.date_climbed, lower(coalesce(rl.tick_type, '')) as tt, rl.tier,
           cl.summited, rl.created_at, coalesce(ro.classic, false) as classic, ro.area_id, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc,
           case when coalesce(ro.gain_ft, 0) > 0 then ro.gain_ft
                when coalesce(ro.length_m, 0) > 0 then round(ro.length_m * 3.28084) else 0 end as climb_ft,
           case rl.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (rl.date_climbed >= current_date - 365) as recent,
           rank_grade(ro.grade_system, ro.grade_num) as g
      from rankable_logs(array(select sc.id from scoped sc)) rl
      join climb_logs cl on cl.id = rl.id
      join routes ro on ro.id = rl.route_id
      join areas ra on ra.id = ro.area_id
     where (p_scope <> 'area' or ra.path <@ a_path)
       and lower(coalesce(rl.tick_type, '')) <> 'conditions'
  ),
  counted as (
    select c.*,
           (c.tt not in ('attempt', 'turned around', 'fell', 'hung', 'project')) as sent,
           row_number() over (partition by c.user_id, c.route_id order by c.date_climbed, c.created_at, c.id) as nth_on_route,
           greatest(0, c.g - case when c.tt in ('top-rope', 'follow') then 0.25 else 0 end) as g_style
      from counted0 c
  ),
  vlogs as (
    select c.*, va.v from counted c
    cross join (values ('all'), ('backed')) as va(v)
     where va.v = 'all' or c.tier <> 'self'
  ),
  -- every log under each discipline key it ranks on: sport and trad also rank as rock
  vkeys as (
    select vl.*, k from vlogs vl
    cross join lateral unnest(case when vl.disc in ('sport', 'trad') then array[vl.disc, 'rock'] else array[vl.disc] end) as k
  ),
  per_route as (
    select vl.user_id, vl.v, vl.route_id, max(vl.disc) as disc,
           max((8 + vl.g_style * vl.g_style * 0.35) * vl.w) as pts,
           bool_or(vl.recent) as recent_any, bool_or(vl.classic) as classic
      from vlogs vl where vl.sent group by vl.user_id, vl.v, vl.route_id
  ),
  route_keys as (
    select pr.*, k from per_route pr
    cross join lateral unnest(case when pr.disc in ('sport', 'trad') then array[pr.disc, 'rock'] else array[pr.disc] end) as k
  ),
  sends as (
    select rk.user_id, rk.v,
           jsonb_object_agg(rk.k, jsonb_build_object('life', rk.life, 'yr', rk.yr)) as sends,
           jsonb_object_agg(rk.k, rk.pts) as points
      from (select user_id, v, k, count(*) as life, count(*) filter (where recent_any) as yr,
                   round(sum(pts)) as pts
              from route_keys group by user_id, v, k) rk
     group by rk.user_id, rk.v
  ),
  totals as (
    select pr.user_id, pr.v, round(sum(pr.pts)) as pts_all,
           count(*) filter (where pr.classic) as classics
      from per_route pr group by pr.user_id, pr.v
  ),
  onsights as (
    select o.user_id, o.v,
           jsonb_object_agg(o.k, jsonb_build_object('life', o.life, 'yr', o.yr)) as onsights,
           jsonb_object_agg(o.k, o.pts) as onsight_pts
      from (select vl.user_id, vl.v, k, count(*) as life, count(*) filter (where vl.recent) as yr,
                   round(sum((10 + vl.g * vl.g * 0.3) * vl.w)) as pts
              from vlogs vl
             cross join lateral unnest(case when vl.disc in ('sport', 'trad') then array[vl.disc, 'rock']
                                            when vl.disc = 'bouldering' then array['bouldering']
                                            else array[]::text[] end) as k
             where vl.tt in ('onsight', 'flash') and vl.nth_on_route = 1
             group by vl.user_id, vl.v, k) o
     group by o.user_id, o.v
  ),
  peaks as (
    select vl.user_id, vl.v, count(distinct vl.area_id) as life,
           count(distinct vl.area_id) filter (where vl.recent) as yr
      from vlogs vl
     where (vl.tt = 'summit' or vl.summited is true) and vl.raw_disc in ('mountaineering', 'alpine', 'scrambling')
     group by vl.user_id, vl.v
  ),
  base as (
    select vl.user_id, vl.v, count(*) as logged, count(*) filter (where vl.tier <> 'self') as backed,
           count(distinct vl.date_climbed) filter (where vl.recent) as days_yr,
           coalesce(sum(vl.climb_ft) filter (where vl.recent and vl.sent), 0) as vert_yr
      from vlogs vl group by vl.user_id, vl.v
  ),
  -- the same counts per discipline key, so a discipline board never shows a career total
  by_key as (
    select bk.user_id, bk.v, jsonb_object_agg(bk.k, jsonb_build_object(
             'logged', bk.logged, 'backed', bk.backed, 'daysYr', bk.days_yr, 'vertYr', bk.vert_yr,
             'classics', bk.classics, 'peaks', jsonb_build_object('life', bk.pk_life, 'yr', bk.pk_yr))) as by
      from (select vk.user_id, vk.v, vk.k, count(*) as logged, count(*) filter (where vk.tier <> 'self') as backed,
                   count(distinct vk.date_climbed) filter (where vk.recent) as days_yr,
                   coalesce(sum(vk.climb_ft) filter (where vk.recent and vk.sent), 0) as vert_yr,
                   count(distinct vk.route_id) filter (where vk.sent and vk.classic) as classics,
                   count(distinct vk.area_id) filter (where (vk.tt = 'summit' or vk.summited is true) and vk.raw_disc in ('mountaineering', 'alpine', 'scrambling')) as pk_life,
                   count(distinct vk.area_id) filter (where (vk.tt = 'summit' or vk.summited is true) and vk.raw_disc in ('mountaineering', 'alpine', 'scrambling') and vk.recent) as pk_yr
              from vkeys vk group by vk.user_id, vk.v, vk.k) bk
     group by bk.user_id, bk.v
  ),
  stats_v as (
    select b.user_id, b.v, jsonb_build_object(
             'logged', b.logged, 'backed', b.backed, 'daysYr', b.days_yr, 'vertYr', b.vert_yr,
             'classics', coalesce(t.classics, 0),
             'sends', coalesce(s.sends, '{}'::jsonb),
             'points', coalesce(s.points, '{}'::jsonb) || jsonb_build_object('all', coalesce(t.pts_all, 0)),
             'onsights', coalesce(o.onsights, '{}'::jsonb),
             'onsightPts', coalesce(o.onsight_pts, '{}'::jsonb),
             'peaks', jsonb_build_object('life', coalesce(pk.life, 0), 'yr', coalesce(pk.yr, 0)),
             'by', coalesce(bk.by, '{}'::jsonb)) as st
      from base b
      left join sends s on s.user_id = b.user_id and s.v = b.v
      left join totals t on t.user_id = b.user_id and t.v = b.v
      left join onsights o on o.user_id = b.user_id and o.v = b.v
      left join peaks pk on pk.user_id = b.user_id and pk.v = b.v
      left join by_key bk on bk.user_id = b.user_id and bk.v = b.v
  ),
  stats as (select sv.user_id, jsonb_object_agg(sv.v, sv.st) as st from stats_v sv group by sv.user_id),
  rows0 as (
  select s.id as uid, s.is_me, s.name, s.username, s.show_name, s.avatar, s.location, s.disciplines,
         case when p_scope = 'near' and not s.is_me and s.miles is not null
              then (greatest(1, ceil(s.miles / 5.0)) * 5)::integer end as dist_mi,
         (p_scope = 'near' and o_lat is null) as no_origin,
         (select count(distinct vo.from_id)::integer from vouches vo where vo.to_id = s.id and vo.from_id <> s.id) as vouches,
         -- contribution points (0333): the one ledger every contributor board reads; in the By-area
         -- scope, only what was added in that area or a place inside it
         (select coalesce(sum(cp.pts), 0)::integer from contribution_points() cp
           where cp.contributor = s.id::text and (p_scope <> 'area' or cp.area_path <@ a_path)) as contribs,
         st.st as st, s.ranks_ok
    from scoped s
    left join stats st on st.user_id = s.id
   where p_scope <> 'area' or st.st is not null
      or exists (select 1 from contribution_points() cp where cp.contributor = s.id::text and cp.area_path <@ a_path)
  ),
  -- 0379: every board the Ranks tab can show, valued exactly as lib/Leaderboards.jsx values a real row:
  -- v = the Backed-climbs-only switch, d = the Climbing type, b = the Ranking. A climber is returned
  -- when they are in the top 100 of ANY board, so each board's top 100 is exact at any population.
  metric as (
    select r.uid, r.is_me, va.v, d.disc, b.board, x.s, x.bd, r.vouches, r.contribs, r.disciplines
      from rows0 r
     cross join (values ('all'), ('backed')) as va(v)
     cross join (values ('all'), ('sport'), ('trad'), ('toprope'), ('bouldering'), ('alpine'), ('mountaineering'),
                        ('scrambling'), ('ice'), ('mixed'), ('aid')) as d(disc)
     cross join lateral (select coalesce(r.st -> va.v, '{}'::jsonb) as s,
                                case when d.disc = 'all' then null
                                     else coalesce(r.st -> va.v -> 'by' -> d.disc, '{}'::jsonb) end as bd) x
     cross join (values ('points'), ('onsight'), ('sendsYr'), ('sendsLife'), ('peaksYr'), ('peaksLife'), ('vert'),
                        ('days'), ('active'), ('classics_b'), ('vouched'), ('contribs')) as b(board)
     where r.ranks_ok
  ),
  scored as (
    select m.uid, m.is_me, m.v || '|' || m.disc || '|' || m.board as bkey,
           case m.board
             when 'points' then coalesce((m.s -> 'points' ->> m.disc)::numeric, 0)
             when 'onsight' then case when m.disc = 'all'
                  then coalesce((m.s -> 'onsightPts' ->> 'rock')::numeric, 0) + coalesce((m.s -> 'onsightPts' ->> 'bouldering')::numeric, 0)
                  else coalesce((m.s -> 'onsightPts' ->> m.disc)::numeric, 0) end
             when 'sendsYr' then coalesce((m.s -> 'sends' -> m.disc ->> 'yr')::numeric, 0)
             when 'sendsLife' then coalesce((m.s -> 'sends' -> m.disc ->> 'life')::numeric, 0)
             when 'peaksYr' then coalesce((coalesce(m.bd, m.s) -> 'peaks' ->> 'yr')::numeric, 0)
             when 'peaksLife' then coalesce((coalesce(m.bd, m.s) -> 'peaks' ->> 'life')::numeric, 0)
             when 'vert' then coalesce((coalesce(m.bd, m.s) ->> 'vertYr')::numeric, 0)
             when 'days' then coalesce((coalesce(m.bd, m.s) ->> 'daysYr')::numeric, 0)
             when 'active' then coalesce((coalesce(m.bd, m.s) ->> 'logged')::numeric, 0)
             when 'classics_b' then coalesce((coalesce(m.bd, m.s) ->> 'classics')::numeric, 0)
             when 'vouched' then coalesce(m.vouches, 0)
             when 'contribs' then coalesce(m.contribs, 0)
           end as val,
           -- who a discipline board lists (the app's peopleForBoard): anyone with a log or a send in
           -- that discipline, or who climbs it by their profile
           (m.disc = 'all' or m.is_me
            or coalesce((m.s -> 'sends' -> m.disc ->> 'life')::numeric, 0) > 0
            or coalesce((m.bd ->> 'logged')::numeric, 0) > 0
            or (jsonb_typeof(m.disciplines) = 'array' and m.disciplines ? m.disc)) as eligible
      from metric m
  ),
  -- only a score above 0 is ranked, and equal scores share a rank (1, 2, 2, 4)
  ranked_b as (
    select sc.uid, sc.is_me, sc.bkey, sc.val,
           rank() over (partition by sc.bkey order by sc.val desc) as rnk,
           count(*) over (partition by sc.bkey) as n
      from scored sc where sc.eligible and sc.val > 0
  ),
  keep as (select distinct rb.uid from ranked_b rb where rb.rnk <= 100),
  -- your place and every board's size, so "You're #N of M" holds when you sit outside the top 100
  standing as (
    select jsonb_object_agg(g.bkey, jsonb_build_array(g.r, g.n)) as sd
      from (select rb.bkey, max(rb.n) as n, max(rb.rnk) filter (where rb.is_me) as r
              from ranked_b rb group by rb.bkey) g
  )
  select r.uid, r.is_me, r.name, r.username, r.show_name, r.avatar, r.location, r.disciplines, r.dist_mi, r.no_origin,
         r.vouches, r.contribs,
         case when r.is_me then coalesce(r.st, '{}'::jsonb) || jsonb_build_object('standing', coalesce((select sd.sd from standing sd), '{}'::jsonb))
              else r.st end
    from rows0 r
   where r.is_me or r.uid in (select kp.uid from keep kp)
   order by r.is_me desc, coalesce((r.st -> 'all' ->> 'logged')::integer, 0) desc, r.uid;
end $function$;

commit;

-- Confirm (read-only):
--   select grantee, column_name from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'profiles' and privilege_type = 'SELECT'
--      and grantee in ('anon', 'authenticated') order by grantee, column_name;
--   -- expect anon 19 columns, authenticated 31; neither lists name, photos or photo_alts.
