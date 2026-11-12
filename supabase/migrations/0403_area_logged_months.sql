-- "Most logged months" on the area page (competitor review item 15, owner 2026-11-04).
--
-- Mountain Project draws a "Prime Climbing Season" J–D row computed from ticks. Ours has the
-- researched Season strip (areas.season_months); this puts beside it when climbers ACTUALLY log
-- climbs here: one count per calendar month over the area's whole subtree.
--
-- Counts only, nobody named. It reads every log — public, crew-only and private alike — the way
-- the conditions consensus does (0329: a private report feeds conditions anonymously), because a
-- month total over a crag identifies nobody, and counting only public logs would make a popular
-- month look dead. Held or removed logs are left out. SECURITY DEFINER so the caller's own RLS
-- (own logs + public + crew) does not thin the count; pinned to public, pg_temp.
--
-- Shape: twelve integers, January first: {0,0,3,12,40,61,88,95,52,18,2,0}.

begin;

create or replace function public.area_logged_months(aid text) returns int[]
language sql stable security definer set search_path = public, pg_temp as $$
  with root as (
    select path from areas where id = aid
  ),
  m as (
    select extract(month from l.date_climbed)::int as mo, count(*)::int as n
      from climb_logs l
      join routes r on r.id = l.route_id
      join areas ra on ra.id = r.area_id
      cross join root
     where ra.path <@ root.path
       and l.moderation = 'visible'
       and l.date_climbed is not null
     group by 1
  )
  select array(
    select coalesce((select n from m where m.mo = g.mo), 0)
      from generate_series(1, 12) as g(mo)
     order by g.mo
  );
$$;

revoke all on function public.area_logged_months(text) from public;
grant execute on function public.area_logged_months(text) to anon, authenticated;
comment on function public.area_logged_months(text) is
  'Logged climbs under an area by calendar month, January first (0403): twelve counts over the whole '
  'subtree, every visible log regardless of its visibility setting (counts only, nobody named). Backs '
  'MOST LOGGED HERE beside Season on the area page.';

commit;
