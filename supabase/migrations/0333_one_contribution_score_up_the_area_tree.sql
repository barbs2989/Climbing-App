-- 0333 — ONE contribution score, read by every board that ranks contributors.
--
-- Audit 2026-10-21 (owner: "it should be counted for every field they add ... fed up the hierarchy
-- tree"). Three readers scored contributions, and no two agreed:
--   * area_top_contributors (0317) — the TOP CONTRIBUTORS panel on a route, a crag, a state. Counted a
--     PENDING or REJECTED add-a-climb proposal (any non-field row counted, whatever its status), and
--     one point per photo, so 30 photos of one route outranked a climber who fixed 29 facts.
--   * leaderboard().contribs (0323) — the Ranks › Contributions board. Counted sun votes, start
--     locations and pairings as NOTHING (they are never 'approved'; they are live when filed), and in
--     the By-area scope it showed each climber's WORLDWIDE total, and left out anyone who had
--     contributed there but logged no climb there.
--   * user_top_contributor_areas (0222) — the profile badge — read the first, so inherited both.
-- None counted topos (their own table, `topos`), or a route line drawn on one (`topo_lines`).
--
-- Now contribution_points() is the one ledger: one row per thing that counts, keyed so the same
-- thing cannot count twice, with the area it sits in. Every reader sums `pts` over the rows whose
-- area is the board's area OR ANY PLACE INSIDE IT (`path <@`), so a correction to a route counts on
-- that route's crag, its area, its state and its country at once.
--
-- The weights follow Mountain Project's (area 15 · route 10 · photo 5 · comment 1): adding to the
-- catalog weighs more than correcting it, and a report weighs least. And, as theCrag does with karma,
-- each KIND counts ONCE per place: a second photo of the same route, a second sun vote on it, a
-- fifth refinement of one field add nothing. Only work that is live counts: an edit or a new climb
-- an admin (or the 0325 vote) approved, a photo/report nobody rejected, a topo moderation left up.
--
--   new climb approved ........................ 10  per climb
--   photo of a route .......................... 5   once per route
--   topo of a crag/wall ....................... 5   once per area
--   route line drawn on a topo ................ 2   once per route
--   correction or detail that went live ....... 2   once per (route or area, field)
--   sun vote · start location · pairing ....... 1   once per route (a pairing: per pair)
--
-- SECURITY DEFINER throughout, so a signed-out visitor and the leaderboard (already definer) read the
-- SAME rows, whatever RLS lets each of them see. The helper itself is not callable from the API.
-- Trip reports (climb_logs) still do not count: they are private to their author (see 0148).

create or replace function contribution_points()
returns table(contributor text, k text, pts int, area_path ltree)
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct on (x.contributor, x.k) x.contributor, x.k, x.pts, a.path
  from (
    select c.contributor, coalesce(c.area_id, r.area_id) as aid,
           case
             when c.kind = 'field' then 'f|' || coalesce(c.route_id, 'a:' || c.area_id, '') || '|' || coalesce(c.field, '')
             when c.kind = 'new_route' then 'n|' || c.id::text
             when c.kind = 'photo' then 'p|' || coalesce(c.route_id, 'a:' || c.area_id, '')
             when c.kind = 'pair' then 'pair|' || coalesce(c.route_id, '') || '|' || coalesce(c.value ->> 'with', c.id::text)
             else c.kind || '|' || coalesce(c.route_id, 'a:' || c.area_id, '')
           end as k,
           case c.kind when 'new_route' then 10 when 'photo' then 5 when 'field' then 2 else 1 end as pts
      from contributions c
      left join routes r on r.id = c.route_id
     where c.contributor is not null and c.contributor not in ('anon', '')
       and case when c.kind in ('field', 'new_route') then c.status = 'approved'
                else c.status is distinct from 'rejected' end
    union all
    select t.created_by::text, t.area_id, 't|' || t.area_id, 5
      from topos t
     where t.created_by is not null and t.moderation = 'visible'
    union all
    select l.created_by::text, coalesce(r.area_id, t.area_id), 'l|' || coalesce(l.route_id, l.id::text), 2
      from topo_lines l
      join topos t on t.id = l.topo_id and t.moderation = 'visible'
      left join routes r on r.id = l.route_id
     where l.created_by is not null
  ) x
  join areas a on a.id = x.aid
  order by x.contributor, x.k, x.pts desc;
$$;

revoke all on function contribution_points() from public, anon, authenticated;

-- The area board: everything contributed in this area or anywhere inside it. Same signature as
-- before (0005), so lib/db.js and user_top_contributor_areas read it unchanged; `n` is now POINTS.
create or replace function area_top_contributors(aid text, lim int default 3)
returns table(contributor text, n bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select cp.contributor, sum(cp.pts)::bigint as n
  from contribution_points() cp
  join areas pa on pa.id = aid
  where cp.area_path <@ pa.path
  group by cp.contributor
  order by n desc, cp.contributor
  limit lim;
$$;

grant execute on function area_top_contributors(text, int) to anon, authenticated, service_role;

-- The profile badge: #1 (among more than one contributor) in an area they contributed to, or any
-- place above it. `mine` now reads the same ledger, so a topo or a report can earn it too.
create or replace function user_top_contributor_areas(p_uid text)
returns table(area_id text, name text)
language sql stable security definer set search_path = public, pg_temp as $$
  with mine as (
    select distinct cp.area_path as path from contribution_points() cp where cp.contributor = p_uid
  ),
  anc as (
    select distinct pa.id, pa.name, nlevel(pa.path) as lv
    from areas pa join mine m on pa.path @> m.path
  ),
  ranked as (
    select a.id, a.name, a.lv, t.contributor,
           row_number() over (partition by a.id order by t.n desc, t.contributor) as rk,
           count(*) over (partition by a.id) as k
    from anc a cross join lateral area_top_contributors(a.id, 2) t
  )
  select id, name from ranked
  where rk = 1 and k > 1 and contributor = p_uid
  order by lv desc, name;
$$;

grant execute on function user_top_contributor_areas(text) to anon, authenticated, service_role;

-- The Ranks › Contributions board: the same points, and in the By-area scope only that area's —
-- and a climber who contributed there without logging a climb there is listed. The rest of the body
-- is 0323's, unchanged (read from pg_proc before this edit).
create or replace function leaderboard(p_scope text, p_area_id text DEFAULT NULL::text, p_radius_mi integer DEFAULT 120)
 RETURNS TABLE(user_id uuid, is_me boolean, name text, username text, show_name boolean, avatar text, location text, disciplines jsonb, dist_mi integer, no_origin boolean, trust integer, catches integer, vouches integer, contribs integer, stats jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
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
end $$;
