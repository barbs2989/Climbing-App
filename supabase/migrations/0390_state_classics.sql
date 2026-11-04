-- STATE CLASSICS: a state's top climbs, as a tick list on Logbook › Challenges (owner note on classic climbs,
-- 2026-10-29: "do all states, all areas").
--
-- scripts/pipeline/flag-classics.mjs tags at most 100 routes a state with the list slug `state_classics` (and sets
-- `classic`). The Challenges card asks for the ones under the climber's home state. PostgREST cannot filter a
-- route by its area's ltree path, so this is the one read: routes carrying the slug, joined to an area under the
-- given state path. `lists @> '{state_classics}'` stays on the partial `lists is not null` index (0132), a few
-- thousand rows at most; the join is by primary key. Invoker rights: it reads only what the caller's role can.

create or replace function public.state_classics(p_state_path text)
returns table (id text, name text, area_id text, grade text, discipline text, pitches integer, stars numeric, lists text[], classic boolean)
language sql
stable
as $$
  select r.id, r.name, r.area_id, r.grade, r.discipline, r.pitches, r.stars, r.lists, r.classic
    from routes r
    join areas a on a.id = r.area_id
   where r.lists is not null
     and r.lists @> array['state_classics']
     and a.path <@ p_state_path::ltree
   order by r.name
   limit 150
$$;

grant execute on function public.state_classics(text) to anon, authenticated;

-- AREA CLASSICS: "Classic climbs here" on every area page above a wall (a crag of walls, a region, a state) — owner,
-- 2026-10-29: "add the classics climbs to the area pages". The classic routes anywhere under the area, best first:
-- a state classic, then guidebook stars, then our climbers' stars, then name. Reads through the partial
-- `routes_classic_idx` (0052), so it touches classic rows only; the area join is by primary key.
create or replace function public.area_classics(p_area_id text, p_limit integer default 10)
returns table (id text, name text, area_id text, area_name text, grade text, grade_system text, rock_grade text, ice_grade text,
               alpine_grade text, commitment text, discipline text, pitches integer, stars numeric, guide_stars integer, classic boolean)
language sql
stable
as $$
  select r.id, r.name, r.area_id, a.name, r.grade, r.grade_system, r.rock_grade, r.ice_grade, r.alpine_grade, r.commitment, r.discipline,
         r.pitches, r.stars, r.guide_stars, r.classic
    from routes r
    join areas a on a.id = r.area_id
   where r.classic
     and a.path <@ (select path from areas where id = p_area_id)
   order by (r.lists is not null and r.lists @> array['state_classics']) desc,
            r.guide_stars desc nulls last, r.stars desc nulls last, r.name
   limit least(greatest(p_limit, 1), 50)
$$;

grant execute on function public.area_classics(text, integer) to anon, authenticated;
