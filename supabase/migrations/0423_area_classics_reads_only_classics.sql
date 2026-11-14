-- 0423: CLASSIC CLIMBS on the area page reads only classic routes, and a state reads only its top list.
--
-- WHY (owner, 2026-11-14: "do this part now — the other area-page sections that count across the
-- whole area"): area_classics (0393) is the one area-page read that is slow. Measured on production
-- as anon, 2026-11-14 (the other two subtree reads are fine today: area_latest_reports 87-183 ms and
-- area_photo_feed 87-140 ms, i.e. one round trip, because climb_logs and topos are still small):
--   California (state)   HTTP 500 after 3.2 s — anon's statement timeout; the state page never
--                        listed its classics, and the timeout leaves a stuck API session (0416/0419)
--   Red River Gorge      659 ms
--   Yosemite Valley      510 ms
--   a 99-route crag      182 ms
--
-- The function found the subtree's areas, read EVERY route in them (49,225 for California) and
-- only then kept the classic ones; a state then kept only the ~100 on its `state_classics` list.
--
-- Two partial indexes hold exactly the rows each case keeps, keyed by area, so the read never
-- touches a route it will throw away:
--   routes_classic_area_idx         (area_id) where classic
--   routes_state_classics_area_idx  (area_id) where classic and lists @> '{state_classics}'
-- A partial index is used only when the query states its predicate as a LITERAL (0419's lesson),
-- so the function is plpgsql with one literal query per case instead of one query with a
-- parameter-dependent OR. Output (columns, rows, order, `total`) is unchanged.

begin;

create index if not exists routes_classic_area_idx on public.routes (area_id) where classic;
create index if not exists routes_state_classics_area_idx on public.routes (area_id)
  where classic and lists @> '{state_classics}'::text[];

create or replace function public.area_classics(p_area_id text, p_limit integer default 500)
returns table (id text, name text, area_id text, area_name text, grade text, grade_system text, rock_grade text, ice_grade text,
               alpine_grade text, commitment text, discipline text, pitches integer, stars numeric, guide_stars integer, classic boolean,
               total bigint)
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  root_path areas.path%type;
  root_type areas.area_type%type;
  lim integer := least(greatest(p_limit, 1), 1000);  -- 0393's clamp, as written there
begin
  select a.path, a.area_type into root_path, root_type from areas a where a.id = p_area_id;
  if root_path is null then return; end if;

  if coalesce(root_type, '') = 'state' then
    -- A STATE's page lists its top climbs (the `state_classics` slug, at most ~100), not its thousands of classics.
    return query
      select r.id, r.name, r.area_id, a.name, r.grade, r.grade_system, r.rock_grade, r.ice_grade, r.alpine_grade, r.commitment, r.discipline,
             r.pitches, r.stars, r.guide_stars, r.classic, count(*) over ()
        from routes r
        join areas a on a.id = r.area_id
       where r.classic
         and r.lists @> '{state_classics}'::text[]
         and a.path <@ root_path
       order by coalesce(r.classic_score, r.guide_stars, r.stars) desc nulls last,
                r.guide_stars desc nulls last, r.stars desc nulls last, r.name
       limit lim;
  else
    return query
      select r.id, r.name, r.area_id, a.name, r.grade, r.grade_system, r.rock_grade, r.ice_grade, r.alpine_grade, r.commitment, r.discipline,
             r.pitches, r.stars, r.guide_stars, r.classic, count(*) over ()
        from routes r
        join areas a on a.id = r.area_id
       where r.classic
         and a.path <@ root_path
       order by (r.lists is not null and r.lists @> '{state_classics}'::text[]) desc,
                coalesce(r.classic_score, r.guide_stars, r.stars) desc nulls last,
                r.guide_stars desc nulls last, r.stars desc nulls last, r.name
       limit lim;
  end if;
end $$;
grant execute on function public.area_classics(text, integer) to anon, authenticated;

commit;
