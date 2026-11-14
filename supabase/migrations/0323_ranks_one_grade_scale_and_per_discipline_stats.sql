-- Ranks audit (2026-10-15). leaderboard() is 0235's body with these corrections, each found by
-- reading what a board printed against what a climber logged:
--
-- 1. ONE GRADE SCALE. Points weighed `grade_num` raw, but grade_num is a number in its OWN system:
--    5.12 is 12, V12 is 12, WI5 is 5, M8 is 8. So on the All board a V12 scored the same as a 5.12
--    (V12 is about 5.14b) and every ice and mixed climb scored like a 5.5. rank_grade() converts each
--    system to one rock-equivalent scale first (5.10a = 10.0, a letter grade = 0.25), as theCrag's
--    CPR runs every system through one internal scale. The tables are approximate by nature; the
--    same tables live in lib/rankGrade.js for the signed-out demo board -- keep the two equal.
--    Class, snow and aid grades still weigh 0 (a send there scores the base 8).
-- 2. TOP-ROPE AND FOLLOW score one letter grade lower, as 8a.nu takes a grade step off a toprope.
--    A route's points are now the BEST single log on it (style and backing together), not the
--    best backing paired with the route's grade.
-- 3. CONDITIONS REPORTS ARE NOT CLIMBS. A tick of 'Conditions' (a scouting report) counted toward
--    Logged, Days and Vert, and an onsight after one stopped being the first log on the route.
-- 4. VERT COUNTS CLIMBS YOU FINISHED, and crag climbs count their height. Every attempt added the
--    route's full gain, and a crag route (no gain_ft) added nothing, so sport and bouldering boards
--    were all zeros. Now: gain_ft, else the route's length, for sent logs.
-- 5. EVERY BOARD READS ITS DISCIPLINE. Logged, Days, Vert, Classics and Peaks were career totals
--    on every discipline board (the Bouldering board's Days counted alpine days). stats.<v>.by.<k>
--    carries them per discipline key (sport and trad also under rock), alongside the totals.
-- 6. Tick types compare case-insensitively ('lead' and 'Lead' are one tick).
-- Unchanged: which logs count and how they are backed (rankable_logs, 0203/0208), the scopes,
-- the 500-row cap, and the returned columns.

begin;

create or replace function rank_grade(p_system text, p_num numeric) returns numeric
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  t numeric[]; i int; f numeric; x numeric;
begin
  if p_num is null then return 0; end if;
  if p_system = 'yds' then return greatest(0, least(20, p_num)); end if;
  -- index 1 holds the lowest grade of each table: VB (-1), WI0, M0
  if p_system = 'v' then
    t := array[9.5,10,10.75,11.25,11.75,12.25,12.5,12.75,13.25,13.5,13.75,14,14.25,14.5,14.75,15,15.25,15.5,15.75]; x := p_num + 1;
  elsif p_system = 'wi' then
    t := array[3,5,6,7.5,9,10.25,11.25,12.25,13]; x := p_num;
  elsif p_system = 'm' then
    t := array[4,6,7,8,9,10,10.75,11.5,12.25,12.75,13.25,13.75,14.25,14.75,15.25]; x := p_num;
  else
    return 0;
  end if;
  x := greatest(0, least(array_length(t, 1) - 1, x));
  i := floor(x)::int; f := x - i;
  if i + 2 > array_length(t, 1) then return t[i + 1]; end if;
  return t[i + 1] + (t[i + 2] - t[i + 1]) * f;
end $$;
grant execute on function rank_grade(text, numeric) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.leaderboard(p_scope text, p_area_id text DEFAULT NULL::text, p_radius_mi integer DEFAULT 120)
 RETURNS TABLE(user_id uuid, is_me boolean, name text, username text, show_name boolean, avatar text, location text, disciplines jsonb, dist_mi integer, no_origin boolean, trust integer, catches integer, vouches integer, contribs integer, stats jsonb)
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
  -- WHICH logs count and how well each is backed is rankable_logs (0203), shared with the trust
  -- score. A conditions report is not a climb, so it is dropped here, before the first-log order.
  counted0 as (
    select rl.id, rl.user_id, rl.route_id, rl.date_climbed, lower(coalesce(rl.tick_type, '')) as tt, rl.tier,
           rl.created_at, coalesce(ro.classic, false) as classic, ro.area_id, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc,
           case when coalesce(ro.gain_ft, 0) > 0 then ro.gain_ft
                when coalesce(ro.length_m, 0) > 0 then round(ro.length_m * 3.28084) else 0 end as climb_ft,
           case rl.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (rl.date_climbed >= current_date - 365) as recent,
           rank_grade(ro.grade_system, ro.grade_num) as g
      from rankable_logs(array(select sc.id from scoped sc)) rl
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
     where vl.tt = 'summit' and vl.raw_disc in ('mountaineering', 'alpine', 'scrambling')
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
                   count(distinct vk.area_id) filter (where vk.tt = 'summit' and vk.raw_disc in ('mountaineering', 'alpine', 'scrambling')) as pk_life,
                   count(distinct vk.area_id) filter (where vk.tt = 'summit' and vk.raw_disc in ('mountaineering', 'alpine', 'scrambling') and vk.recent) as pk_yr
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
         compute_trust_score(s.id),
         counted_catch_count(s.id),
         (select count(distinct vo.from_id)::integer from vouches vo where vo.to_id = s.id and vo.from_id <> s.id),
         (select count(*)::integer from (
            select distinct 'f|' || coalesce(c.route_id, c.area_id, '') || '|' || coalesce(c.field, '') as k
              from contributions c
             where c.contributor = s.id::text and c.kind = 'field'
               and (c.status = 'approved' or exists (
                     select 1 from contributions c2
                      where c2.kind = 'field' and c2.field is not distinct from c.field
                        and c2.route_id is not distinct from c.route_id and c2.area_id is not distinct from c.area_id
                        and c2.value = c.value and c2.contributor <> c.contributor
                        and c2.contributor is not null and c2.contributor not in ('anon', '')))
            union all
            select 'r|' || c.id::text from contributions c
             where c.contributor = s.id::text and (c.kind = 'photo' or (c.kind <> 'field' and c.status = 'approved'))) x),
         st.st
    from scoped s
    left join stats st on st.user_id = s.id
   where p_scope <> 'area' or st.st is not null
   order by s.is_me desc, coalesce((st.st -> 'all' ->> 'logged')::integer, 0) desc, s.id
   limit 500;
end $function$;

revoke all on function leaderboard(text, text, integer) from public;
revoke all on function leaderboard(text, text, integer) from anon;
grant execute on function leaderboard(text, text, integer) to authenticated;

commit;
