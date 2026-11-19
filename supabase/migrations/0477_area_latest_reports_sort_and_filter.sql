-- 0477: LATEST FROM THIS AREA can show more than four, sorted and filtered.
--
-- WHY (owner, 2026-11-19: "have a dropdown to see more after a certain amount and allow people to sort
-- and filter by date, discipline, etc."): the card showed the four newest public reports and stopped.
-- The function capped `lim` at 20 and knew one order, so the app could neither page past them nor ask
-- for "trad reports from the last 90 days" over the WHOLE area (filtering twenty loaded rows in the
-- browser would call an area quiet that is not).
--
-- New arguments, all optional, so a call from an app built before this (aid, lim, days) answers as before:
--   disc   only reports on climbs whose primary discipline is this ('trad', 'sport', 'alpine', ...)
--   since  only reports climbed on or after this date
--   sort   'newest' (default) or 'oldest', by the day climbed
--   kind   'report' = has a write-up; 'log' = a logged climb with condition tags and no write-up
-- `lim` now reaches 100. New keys in the answer:
--   latest_refs[].discipline / .kind   so a row is labelled before its report has loaded
--   total       how many reports match the filters (the "See N more" count)
--   total_all   how many there are with no filter (decides whether the sort and filter controls show)
--   discs       {"trad": 12, "sport": 3}: reports per primary discipline, unfiltered (the filter's options)
--
-- NOTHING NEW IS EXPOSED. `latest` is still only trip_report_visibility = 'public', moderation =
-- 'visible' reports with something written or tagged: rows the app already reads, author and climb
-- included, through climb_logs' own policies. The counts count those same rows. recent_tags is
-- unchanged and unfiltered: the hazard badge speaks for the area, not for the filter.
--
-- The argument list changes, so the old three-argument function is dropped: two overloads would make a
-- three-argument call ambiguous.

begin;

drop function if exists public.area_latest_reports(text, integer, integer);

create or replace function public.area_latest_reports(
  aid text,
  lim integer default 4,
  days integer default 45,
  disc text default null,
  since date default null,
  sort text default 'newest',
  kind text default null
)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  under as (
    select l.id, l.route_id, l.user_id, l.date_climbed, l.created_at, l.cond_tags, l.notes,
           l.trip_report_visibility, r.discipline
      from climb_logs l
      join routes r on r.id = l.route_id
      join areas ra on ra.id = r.area_id
      cross join root
     where ra.path <@ root.path
       and l.moderation = 'visible'
  ),
  pub as (
    select id, route_id, user_id, date_climbed, created_at, discipline,
           case when coalesce(btrim(notes), '') <> '' then 'report' else 'log' end as kind
      from under
     where trip_report_visibility = 'public'
       and (coalesce(btrim(notes), '') <> '' or coalesce(array_length(cond_tags, 1), 0) > 0)
  ),
  matched as (
    select * from pub p
     -- Every argument is written with the function's name: `pub` has a column called `kind`, and a bare
     -- `kind` here is that COLUMN, so `p.kind = kind` was true of every row and the filter did nothing.
     where (area_latest_reports.disc is null or p.discipline = area_latest_reports.disc)
       and (area_latest_reports.since is null or p.date_climbed >= area_latest_reports.since)
       and (area_latest_reports.kind is null or p.kind = area_latest_reports.kind)
  ),
  latest as (
    select m.*,
           row_number() over (order by
             case when area_latest_reports.sort = 'oldest' then m.date_climbed end asc nulls last,
             case when area_latest_reports.sort = 'oldest' then m.created_at end asc,
             m.date_climbed desc nulls last, m.created_at desc, m.id) as rn
      from matched m
  ),
  page as (
    select * from latest where rn <= greatest(1, least(coalesce(area_latest_reports.lim, 4), 100))
  )
  select jsonb_build_object(
    'latest', coalesce((select jsonb_agg(x.id order by x.rn) from page x), '[]'::jsonb),
    'latest_refs', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'route_id', x.route_id, 'user_id', x.user_id,
                                          'discipline', x.discipline, 'kind', x.kind)
                       order by x.rn)
        from page x
    ), '[]'::jsonb),
    'total', (select count(*) from matched),
    'total_all', (select count(*) from pub),
    'discs', coalesce((
      select jsonb_object_agg(d.discipline, d.n)
        from (select discipline, count(*) as n from pub where discipline is not null group by discipline) d
    ), '{}'::jsonb),
    'recent_tags', coalesce((
      select jsonb_agg(to_jsonb(cond_tags))
        from under
       where date_climbed >= current_date - greatest(1, least(coalesce(days, 45), 365))
         and coalesce(array_length(cond_tags, 1), 0) > 0
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.area_latest_reports(text, integer, integer, text, date, text, text) from public;
grant execute on function public.area_latest_reports(text, integer, integer, text, date, text, text) to anon, authenticated;
comment on function public.area_latest_reports(text, integer, integer, text, date, text, text) is
  'Latest from this area (0414, 0428, 0477): ids of the public reports under an area''s subtree, optionally '
  'only one discipline, since a date, or only write-ups / only logged climbs, newest or oldest first; the '
  'same reports'' climb, author, discipline and kind (latest_refs); how many match (total), how many there '
  'are (total_all) and per discipline (discs); and the condition tags of every visible log there in the '
  'last N days (no author, no climb).';

commit;
