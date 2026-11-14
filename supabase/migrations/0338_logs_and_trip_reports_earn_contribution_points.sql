-- 0338 — Logged climbs and trip reports earn contribution points (owner, 2026-10-21: "reward all").
--
-- contribution_points() (0333) is the one ledger behind Ranks › Contributions, every TOP CONTRIBUTORS
-- panel and the ★ Top Contributor badge. It left climb_logs out entirely. A log or report now earns:
--
--   logged climb or attempt on a route ............ 1   once per route
--   trip report: a write-up, conditions tags, beta,
--     or a Conditions-only report ................. 2   once per route per MONTH
--
-- A climb logged twice adds nothing; a fresh conditions report each month earns again, since a
-- report is worth most when it is recent (theCrag counts each kind once per node; MP gives a comment 1).
--
-- ONLY a report readable by EVERYONE counts (trip_report_visibility = 'public', moderation left it
-- 'visible'). These boards are public and name the climber per area, so counting a Friends/Crew/Just
-- me log would tell anyone where that climber has been — the choice their Settings made. Strava draws
-- the same line: only an activity visible to Everyone ranks on a public leaderboard. A private log
-- still counts toward the climber's own Challenges, and its conditions still feed the route (0329).
--
-- Body is the LIVE definition (pg_get_functiondef, 2026-10-21) with the climb_logs branch added.

CREATE OR REPLACE FUNCTION public.contribution_points()
 RETURNS TABLE(contributor text, k text, pts integer, area_path ltree)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    union all
    -- a logged climb or attempt: once per route (a Conditions-only report is not a climb)
    select cl.user_id::text, r.area_id, 'log|' || cl.route_id, 1
      from climb_logs cl
      join routes r on r.id = cl.route_id
     where cl.trip_report_visibility = 'public' and cl.moderation = 'visible'
       and cl.tick_type is distinct from 'Conditions'
    union all
    -- a trip report: once per route per month
    select cl.user_id::text, r.area_id,
           'rep|' || cl.route_id || '|' || to_char(coalesce(cl.date_climbed, cl.created_at::date), 'YYYY-MM'), 2
      from climb_logs cl
      join routes r on r.id = cl.route_id
     where cl.trip_report_visibility = 'public' and cl.moderation = 'visible'
       and (cl.tick_type = 'Conditions'
            or btrim(coalesce(cl.notes, '')) <> ''
            or cardinality(coalesce(cl.cond_tags, '{}')) > 0
            or btrim(coalesce(cl.beta, '')) <> '')
  ) x
  join areas a on a.id = x.aid
  order by x.contributor, x.k, x.pts desc;
$function$;

revoke all on function public.contribution_points() from public, anon, authenticated;
