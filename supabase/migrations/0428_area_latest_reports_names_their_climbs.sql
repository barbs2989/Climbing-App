-- 0428: LATEST FROM THIS AREA loads in two round trips, not three.
--
-- WHY (owner, 2026-11-14: "anything else we can speed up?" → "do it"): the area page's Latest-from-this-
-- area card made three requests one after another — area_latest_reports (0414) for the report ids, then
-- the reports themselves (fetchSharedLogs), and only then the climbs' names and the authors' profiles,
-- because those ids were known only once the reports had arrived.
--
-- The function now also returns, for each id in `latest`, the report's climb and author:
--   latest_refs: [{"id": <log id>, "route_id": <text>, "user_id": <uuid>}, ...]   (same order as latest)
-- so the app starts the report, climb and profile reads together. `latest` and `recent_tags` are
-- unchanged, so an app built before this keeps working.
--
-- NOTHING NEW IS EXPOSED. `latest` holds only trip_report_visibility = 'public', moderation = 'visible'
-- reports with something written or tagged; the app already reads exactly those rows, author and climb
-- included, through climb_logs' own policies (fetchSharedLogs selects user_id and route_id). Private,
-- crew and friends reports never enter `latest`, so their authors never enter `latest_refs` (0425's
-- concern). recent_tags stays anonymous: tags only, no author, no climb.

begin;

create or replace function public.area_latest_reports(aid text, lim integer default 4, days integer default 45)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  under as (
    select l.id, l.route_id, l.user_id, l.date_climbed, l.created_at, l.cond_tags, l.notes, l.trip_report_visibility
      from climb_logs l
      join routes r on r.id = l.route_id
      join areas ra on ra.id = r.area_id
      cross join root
     where ra.path <@ root.path
       and l.moderation = 'visible'
  ),
  latest as (
    select id, route_id, user_id, date_climbed, created_at from under
     where trip_report_visibility = 'public'
       and (coalesce(btrim(notes), '') <> '' or coalesce(array_length(cond_tags, 1), 0) > 0)
     order by date_climbed desc nulls last, created_at desc
     limit greatest(1, least(coalesce(lim, 4), 20))
  )
  select jsonb_build_object(
    'latest', coalesce((
      select jsonb_agg(x.id order by x.date_climbed desc nulls last, x.created_at desc) from latest x
    ), '[]'::jsonb),
    'latest_refs', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'route_id', x.route_id, 'user_id', x.user_id)
                       order by x.date_climbed desc nulls last, x.created_at desc)
        from latest x
    ), '[]'::jsonb),
    'recent_tags', coalesce((
      select jsonb_agg(to_jsonb(cond_tags))
        from under
       where date_climbed >= current_date - greatest(1, least(coalesce(days, 45), 365))
         and coalesce(array_length(cond_tags, 1), 0) > 0
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.area_latest_reports(text, integer, integer) from public;
grant execute on function public.area_latest_reports(text, integer, integer) to anon, authenticated;
comment on function public.area_latest_reports(text, integer, integer) is
  'Latest from this area (0414, 0428): ids of the newest public reports under an area''s subtree, the same '
  'reports'' climb and author ids (latest_refs, so the app reads reports, climbs and profiles at once), and '
  'the condition tags of every visible log there in the last N days (no author, no climb).';

commit;
