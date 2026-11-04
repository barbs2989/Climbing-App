-- AREA CLASSICS, ALL OF THEM (owner, 2026-10-29: "i want to add all the classic climbs per area or wall, just have a
-- dropdown after 5 to show them all"). 0390 returned at most 50; the page now shows five and a dropdown with the rest.
-- Same rows and order as 0390, plus `total` (every classic under the area, whatever the limit), and a cap of 1000 so
-- a whole state cannot ask for its thousands in one read; the page says when it shows fewer than `total`.
-- The return type changes, so the function is dropped and recreated (nothing else calls it).

drop function if exists public.area_classics(text, integer);

create function public.area_classics(p_area_id text, p_limit integer default 500)
returns table (id text, name text, area_id text, area_name text, grade text, grade_system text, rock_grade text, ice_grade text,
               alpine_grade text, commitment text, discipline text, pitches integer, stars numeric, guide_stars integer, classic boolean,
               total bigint)
language sql
stable
as $$
  select r.id, r.name, r.area_id, a.name, r.grade, r.grade_system, r.rock_grade, r.ice_grade, r.alpine_grade, r.commitment, r.discipline,
         r.pitches, r.stars, r.guide_stars, r.classic, count(*) over ()
    from routes r
    join areas a on a.id = r.area_id
   where r.classic
     and a.path <@ (select path from areas where id = p_area_id)
     -- A STATE's page lists its top climbs (the `state_classics` slug, at most 100), not its thousands of
     -- classics (owner, 2026-10-29: "the state area page would show all 100 top classics").
     and (coalesce((select area_type from areas where id = p_area_id), '') <> 'state'
          or (r.lists is not null and r.lists @> array['state_classics']))
   order by (r.lists is not null and r.lists @> array['state_classics']) desc,
            r.guide_stars desc nulls last, r.stars desc nulls last, r.name
   limit least(greatest(p_limit, 1), 1000)
$$;

grant execute on function public.area_classics(text, integer) to anon, authenticated;
