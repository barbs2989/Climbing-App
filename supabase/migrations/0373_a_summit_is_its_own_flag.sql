-- 0373: a summit is its own flag, so one climb can be a summit AND a style (owner note, 2026-10-25).
--
-- The log form offered Summit as one pick, beside Lead, Follow, Hung and Fell. A climber who led a
-- route and topped out had to choose one of them, so the summit was lost from the peak count. Mountain
-- Project logs the style of the ascent and mentions the summit in the text; theCrag and 8a.nu list it
-- as a separate outcome. This keeps the style in tick_type and records the summit beside it.
--
--   * climb_logs.summited: true when the climber reached the top. NULL on every existing row, which
--     keeps its meaning: a Summit tick still counts exactly as before.
--   * leaderboard() (0335) and rank_breakdown() (0357) count a peak when the tick is Summit OR the log
--     is summited, for the same alpine, mountaineering and scrambling disciplines. Their bodies are
--     otherwise copied unchanged; the changed lines are the peak tests and the join that reads the flag.
--
-- The app writes the column with a degrade (withoutNewLogCols) so that a checkout without this
-- migration still saves the log.

begin;

alter table public.climb_logs add column if not exists summited boolean;
comment on column public.climb_logs.summited is
  'True when the climber reached the summit on this climb, whatever style tick_type records (0373). A Summit tick needs no flag.';

CREATE OR REPLACE FUNCTION public.leaderboard(p_scope text, p_area_id text DEFAULT NULL::text, p_radius_mi integer DEFAULT 120)
 RETURNS TABLE(user_id uuid, is_me boolean, name text, username text, show_name boolean, avatar text, location text, disciplines jsonb, dist_mi integer, no_origin boolean, catches integer, vouches integer, contribs integer, stats jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    select p.id, (p.id = me) as is_me, p.name, p.username, p.show_name, p.avatar, p.location, p.disciplines,
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
  stats as (select sv.user_id, jsonb_object_agg(sv.v, sv.st) as st from stats_v sv group by sv.user_id)
  select s.id, s.is_me, s.name, s.username, s.show_name, s.avatar, s.location, s.disciplines,
         case when p_scope = 'near' and not s.is_me and s.miles is not null
              then (greatest(1, ceil(s.miles / 5.0)) * 5)::integer end,
         (p_scope = 'near' and o_lat is null),
         counted_catch_count(s.id),
         (select count(distinct vo.from_id)::integer from vouches vo where vo.to_id = s.id and vo.from_id <> s.id),
         -- contribution points (0333): the one ledger every contributor board reads; in the By-area
         -- scope, only what was added in that area or a place inside it
         (select coalesce(sum(cp.pts), 0)::integer from contribution_points() cp
           where cp.contributor = s.id::text and (p_scope <> 'area' or cp.area_path <@ a_path)),
         st.st
    from scoped s
    left join stats st on st.user_id = s.id
   where p_scope <> 'area' or st.st is not null
      or exists (select 1 from contribution_points() cp where cp.contributor = s.id::text and cp.area_path <@ a_path)
   order by s.is_me desc, coalesce((st.st -> 'all' ->> 'logged')::integer, 0) desc, s.id
   limit 500;
end $function$;

create or replace function public.rank_breakdown(p_user uuid, p_area_id text default null)
returns table(
  log_id uuid, hidden boolean, route_id text, route_name text, grade text, area_name text,
  date_climbed date, tick_type text, tier text, disc text, raw_disc text,
  sent boolean, recent boolean, classic boolean, climb_ft numeric,
  send_pts numeric, onsight_pts numeric, route_key text, day_key text, peak_key text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  a_path ltree;
  salt text := gen_random_uuid()::text;
begin
  if me is null then raise exception 'sign in to see rankings'; end if;
  if p_user is null then raise exception 'which climber?'; end if;
  if p_user <> me and not exists (
       select 1 from profiles p
        where p.id = p_user and coalesce(p.show_on_ranks, true)
          and not profile_owner_blocked_me(p.id)
          and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)) then
    raise exception 'this climber is not on the rankings';
  end if;
  if p_area_id is not null then
    select a.path into a_path from areas a where a.id = p_area_id;
    if a_path is null then raise exception 'unknown area %', p_area_id; end if;
  end if;

  return query
  with counted0 as (
    -- leaderboard()'s counted0, for one climber
    select rl.id, rl.route_id, rl.date_climbed, rl.tick_type, lower(coalesce(rl.tick_type, '')) as tt, rl.tier,
           cl.summited, rl.created_at, coalesce(ro.classic, false) as classic, ro.area_id, ro.name as rname, ro.grade as rgrade,
           ra.name as aname, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc,
           case when coalesce(ro.gain_ft, 0) > 0 then ro.gain_ft
                when coalesce(ro.length_m, 0) > 0 then round(ro.length_m * 3.28084) else 0 end as climb_ft,
           case rl.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (rl.date_climbed >= current_date - 365) as recent,
           rank_grade(ro.grade_system, ro.grade_num) as g,
           (p_user = me
            or cl.trip_report_visibility = 'public'
            or (cl.trip_report_visibility = 'friends' and are_friends(me, p_user))
            or (cl.trip_report_visibility = 'crew' and cl.crew_id in (
                  select cm.crew_id from crew_members cm where cm.user_id = me and cm.status = 'confirmed'))) as visible
      from rankable_logs(array[p_user]) rl
      join climb_logs cl on cl.id = rl.id
      join routes ro on ro.id = rl.route_id
      join areas ra on ra.id = ro.area_id
     where (a_path is null or ra.path <@ a_path)
       and lower(coalesce(rl.tick_type, '')) <> 'conditions'
  ),
  counted as (
    select c.*,
           (c.tt not in ('attempt', 'turned around', 'fell', 'hung', 'project')) as is_sent,
           row_number() over (partition by c.route_id order by c.date_climbed, c.created_at, c.id) as nth_on_route,
           greatest(0, c.g - case when c.tt in ('top-rope', 'follow') then 0.25 else 0 end) as g_style
      from counted0 c
  )
  select c.id,
         not c.visible,
         case when c.visible then c.route_id end,
         case when c.visible then c.rname end,
         case when c.visible then c.rgrade end,
         case when c.visible then c.aname end,
         case when c.visible then c.date_climbed end,
         case when c.visible then c.tick_type end,
         c.tier, c.disc, c.raw_disc, c.is_sent, c.recent, c.classic, c.climb_ft::numeric,
         case when c.is_sent then (8 + c.g_style * c.g_style * 0.35) * c.w else 0 end::numeric,
         case when c.tt in ('onsight', 'flash') and c.nth_on_route = 1 and c.disc in ('sport', 'trad', 'bouldering')
              then (10 + c.g * c.g * 0.3) * c.w else 0 end::numeric,
         case when c.visible then c.route_id else md5(salt || c.route_id) end,
         case when c.visible then c.date_climbed::text else md5(salt || c.date_climbed::text) end,
         case when (c.tt = 'summit' or c.summited is true) and c.raw_disc in ('mountaineering', 'alpine', 'scrambling')
              then case when c.visible then c.area_id else md5(salt || c.area_id) end end
    from counted c
   order by c.date_climbed desc, c.created_at desc;
end $function$;

commit;
