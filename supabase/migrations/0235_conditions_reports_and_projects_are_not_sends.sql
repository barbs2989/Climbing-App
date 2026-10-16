-- 0235 — A conditions report is not a climb, and a boulder PROJECT is not a send.
--
-- The log form files "Conditions only" (a road, snow or crowd report from someone who may not
-- have climbed) as a climb_logs row with tick_type 'Conditions', and a boulderer's unsent problem
-- as tick_type 'Project'. leaderboard()'s `sent` test excluded only Attempt / Turned around / Fell
-- / Hung, so both earned SEND points and peaks; and compute_trust_score() counted every rankable
-- log as a "logged climb", so a conditions report raised the LOGGED CLIMBS factor too.
--
-- Fixed where the rule lives, and nowhere wider:
--   * leaderboard(): 'Project' and 'Conditions' join the non-send ticks.
--   * compute_trust_score() and my_trust_counts(): LOGGED CLIMBS no longer counts 'Conditions'.
--     my_trust_counts feeds the on-screen breakdown, so the two change together — the factors
--     must keep summing to the headline (check:trust-breakdown).
--   * rankable_logs() is UNCHANGED on purpose: a public conditions report still earns REPORT
--     credit (is_report) on Ranks and in trust. That is the contribution it is.
--
-- Bodies are the LIVE definitions (pg_get_functiondef, 2026-10-01), changed only on the lines
-- above. create or replace keeps every grant. Measured before applying: production held 2 climb
-- logs (Summit, lead), neither affected, so this moves no one's score today.

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
  -- score. Only the area scope and the route facts are added here.
  counted as (
    select rl.id, rl.user_id, rl.route_id, rl.date_climbed, rl.tick_type, rl.tier,
           rl.nth_on_route, ro.grade_num, ro.grade_system, coalesce(ro.classic, false) as classic,
           ro.gain_ft, ro.area_id, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc,
           case rl.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (rl.date_climbed >= current_date - 365) as recent,
           (coalesce(rl.tick_type, '') not in ('Attempt', 'Turned around', 'Fell', 'Hung', 'Project', 'Conditions')) as sent,
           greatest(0, least(20, case when ro.grade_system in ('yds', 'v', 'wi', 'm') then coalesce(ro.grade_num, 0) else 0 end))::numeric as g
      from rankable_logs(array(select sc.id from scoped sc)) rl
      join routes ro on ro.id = rl.route_id
      join areas ra on ra.id = ro.area_id
     where p_scope <> 'area' or ra.path <@ a_path
  ),
  vlogs as (
    select c.*, va.v from counted c
    cross join (values ('all'), ('backed')) as va(v)
     where va.v = 'all' or c.tier <> 'self'
  ),
  per_route as (
    select vl.user_id, vl.v, vl.route_id, max(vl.disc) as disc, max(vl.g) as g, max(vl.w) as w,
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
                   round(sum((8 + g * g * 0.35) * w)) as pts
              from route_keys group by user_id, v, k) rk
     group by rk.user_id, rk.v
  ),
  totals as (
    select pr.user_id, pr.v, round(sum((8 + pr.g * pr.g * 0.35) * pr.w)) as pts_all,
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
             where vl.tick_type in ('Onsight', 'Flash') and vl.nth_on_route = 1
             group by vl.user_id, vl.v, k) o
     group by o.user_id, o.v
  ),
  peaks as (
    select vl.user_id, vl.v, count(distinct vl.area_id) as life,
           count(distinct vl.area_id) filter (where vl.recent) as yr
      from vlogs vl
     where vl.tick_type = 'Summit' and vl.raw_disc in ('mountaineering', 'alpine', 'scrambling')
     group by vl.user_id, vl.v
  ),
  base as (
    select vl.user_id, vl.v, count(*) as logged, count(*) filter (where vl.tier <> 'self') as backed,
           count(distinct vl.date_climbed) filter (where vl.recent) as days_yr,
           coalesce(sum(vl.gain_ft) filter (where vl.recent), 0) as vert_yr
      from vlogs vl group by vl.user_id, vl.v
  ),
  stats_v as (
    select b.user_id, b.v, jsonb_build_object(
             'logged', b.logged, 'backed', b.backed, 'daysYr', b.days_yr, 'vertYr', b.vert_yr,
             'classics', coalesce(t.classics, 0),
             'sends', coalesce(s.sends, '{}'::jsonb),
             'points', coalesce(s.points, '{}'::jsonb) || jsonb_build_object('all', coalesce(t.pts_all, 0)),
             'onsights', coalesce(o.onsights, '{}'::jsonb),
             'onsightPts', coalesce(o.onsight_pts, '{}'::jsonb),
             'peaks', jsonb_build_object('life', coalesce(pk.life, 0), 'yr', coalesce(pk.yr, 0))) as st
      from base b
      left join sends s on s.user_id = b.user_id and s.v = b.v
      left join totals t on t.user_id = b.user_id and t.v = b.v
      left join onsights o on o.user_id = b.user_id and o.v = b.v
      left join peaks pk on pk.user_id = b.user_id and pk.v = b.v
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

CREATE OR REPLACE FUNCTION public.compute_trust_score(user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  base_score int := 0;
  vouch_count int;
  log_count int;
  report_count int;
  catch_count int;
  tenure_days int;
  verified_count int;
begin
  if exists(select 1 from verification_records where verification_records.user_id = compute_trust_score.user_id and status = 'verified' and verification_type = 'email') then
    base_score := base_score + 5;
  end if;

  if exists(select 1 from verification_records where verification_records.user_id = compute_trust_score.user_id and status = 'verified' and verification_type = 'id') then
    base_score := base_score + 10;
  end if;

  select count(*) into verified_count
  from verification_records
  where verification_records.user_id = compute_trust_score.user_id
    and status = 'verified'
    and verification_type in ('member_club', 'guide_certified');
  base_score := base_score + least(verified_count * 5, 10);

  select extract(day from (now() - profiles.created_at)) into tenure_days
  from profiles where profiles.id = compute_trust_score.user_id;
  base_score := base_score + least(tenure_days / 30, 20);

  -- Vouches: 1 point per unique vouch, capped at 20
  select count(distinct from_id) into vouch_count
  from vouches where vouches.to_id = compute_trust_score.user_id and vouches.from_id <> compute_trust_score.user_id;
  base_score := base_score + least(vouch_count, 20);

  select count(*) filter (where rl.tick_type is distinct from 'Conditions'), count(*) filter (where rl.is_report)
    into log_count, report_count
  from rankable_logs(array[compute_trust_score.user_id]) rl;
  base_score := base_score + least(log_count / 5, 15);
  base_score := base_score + least(report_count / 3, 14);

  catch_count := counted_catch_count(compute_trust_score.user_id);
  base_score := base_score + least(catch_count * 2, 10);

  return least(base_score, 99);
end $function$;

CREATE OR REPLACE FUNCTION public.my_trust_counts()
 RETURNS TABLE(logs integer, reports integer, catches integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in to see your trust score'; end if;
  return query
  select (count(*) filter (where rl.tick_type is distinct from 'Conditions'))::integer,
         (count(*) filter (where rl.is_report))::integer,
         counted_catch_count(me)
    from rankable_logs(array[me]) rl;
end $function$;
