-- 0380: your row also says how many OTHER climbers the scope holds (stats.standing._others).
--
-- Since 0379, leaderboard() returns only climbers in some board's top 100, so a climber with
-- nothing on any board no longer comes back. The app decided "No climbing friends yet" and "No
-- climbers logged near you yet" by counting the rows that came back, so a Friends board whose
-- friends had logged nothing told you that you had no friends. The count is now sent, and the app
-- reads it. Everything else is 0379's, unchanged.

begin;

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
    select p.id, (p.id = me) as is_me, p.name, p.username, p.show_name, p.avatar, p.location, p.disciplines, coalesce(p.show_on_ranks, true) as ranks_ok,
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
         counted_catch_count(s.id) as catches,
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
    select r.uid, r.is_me, va.v, d.disc, b.board, x.s, x.bd, r.catches, r.vouches, r.contribs, r.disciplines
      from rows0 r
     cross join (values ('all'), ('backed')) as va(v)
     cross join (values ('all'), ('sport'), ('trad'), ('toprope'), ('bouldering'), ('alpine'), ('mountaineering'),
                        ('scrambling'), ('ice'), ('mixed'), ('aid')) as d(disc)
     cross join lateral (select coalesce(r.st -> va.v, '{}'::jsonb) as s,
                                case when d.disc = 'all' then null
                                     else coalesce(r.st -> va.v -> 'by' -> d.disc, '{}'::jsonb) end as bd) x
     cross join (values ('points'), ('onsight'), ('sendsYr'), ('sendsLife'), ('peaksYr'), ('peaksLife'), ('vert'),
                        ('days'), ('active'), ('classics_b'), ('catches'), ('vouched'), ('contribs')) as b(board)
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
             when 'catches' then coalesce(m.catches, 0)
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
         r.catches, r.vouches, r.contribs,
         case when r.is_me then coalesce(r.st, '{}'::jsonb) || jsonb_build_object('standing', coalesce((select sd.sd from standing sd), '{}'::jsonb)
                || jsonb_build_object('_others', (select count(*) from rows0 r2 where not r2.is_me and r2.ranks_ok)))
              else r.st end
    from rows0 r
   where r.is_me or r.uid in (select kp.uid from keep kp)
   order by r.is_me desc, coalesce((r.st -> 'all' ->> 'logged')::integer, 0) desc, r.uid;
end $function$;

comment on function public.leaderboard(text, text, integer) is
  'Ranks rows (0379): every climber in the top 100 of any board, plus the caller, whose stats.standing holds their rank and each board''s size, and _others, the other climbers in the scope (0380).';

commit;
