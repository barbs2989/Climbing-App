-- "Latest from this area" on the area page (seed-vs-real audit, 2026-11-11). The seed area page showed
-- the four newest reports under an area, with a red "N hazard reports · last 45 days" badge; the real
-- one had nothing like it, because reports are stored per ROUTE and the area page reads by area.
--
-- One read over the area's whole subtree (ltree, as 0403 area_logged_months does), two answers:
--   latest      — ids of the newest PUBLIC reports (a report is a log with notes or condition tags),
--                 newest first, at most `lim`. Only ids: the app reads the rows through its usual
--                 trip-report read, so climb_logs' own policy, visibility and the reporter's shown
--                 name apply exactly as on the route page.
--   recent_tags — the condition tags of every visible log in the last `days` days, regardless of its
--                 visibility setting, with nothing that says who or which climb. The app counts the
--                 hazard reports with its own isHazardTag rule. Counts only, as 0329 lets a private
--                 report feed the conditions anonymously and 0403 counts every log by month.
-- Held or removed logs are left out of both. SECURITY DEFINER so the caller's own RLS does not thin
-- the hazard count; pinned to public, pg_temp.

begin;

create or replace function public.area_latest_reports(aid text, lim integer default 4, days integer default 45)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  under as (
    select l.id, l.date_climbed, l.created_at, l.cond_tags, l.notes, l.trip_report_visibility
      from climb_logs l
      join routes r on r.id = l.route_id
      join areas ra on ra.id = r.area_id
      cross join root
     where ra.path <@ root.path
       and l.moderation = 'visible'
  )
  select jsonb_build_object(
    'latest', coalesce((
      select jsonb_agg(x.id order by x.date_climbed desc nulls last, x.created_at desc)
        from (
          select id, date_climbed, created_at from under
           where trip_report_visibility = 'public'
             and (coalesce(btrim(notes), '') <> '' or coalesce(array_length(cond_tags, 1), 0) > 0)
           order by date_climbed desc nulls last, created_at desc
           limit greatest(1, least(coalesce(lim, 4), 20))
        ) x
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
  'Latest from this area (0414): ids of the newest public reports under an area''s subtree, and the '
  'condition tags of every visible log there in the last N days (no author, no climb), for the area '
  'page''s report list and hazard badge.';

commit;
