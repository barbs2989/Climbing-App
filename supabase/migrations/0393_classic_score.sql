-- CLASSIC SCORE: the order the classics lists show their climbs in (owner, 2026-10-29: the lists are "best first").
-- 0390/0391 ordered by guidebook stars, then our climbers' stars, then NAME — and most classics carry neither, so a
-- state's top 100 read alphabetically. scripts/pipeline/flag-classics.mjs now writes `classic_score` on every route it
-- flags: the climbers' average stars pulled toward 3 by five phantom votes (0-4), so a few votes cannot outrank many.
-- It is a sort key only and renders nowhere. Numbered 0393, not 0392: an open draft (#3005) claimed 0391 too and will
-- move to the next free number.

alter table public.routes add column if not exists classic_score numeric(3,2)
  check (classic_score is null or (classic_score >= 0 and classic_score <= 4));

-- A row's quality for the lists: our score, else the guidebook's stars (a guidebook classic has no score), else ours.
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
   order by coalesce(r.classic_score, r.guide_stars, r.stars) desc nulls last, r.name
   limit 150
$$;

create or replace function public.area_classics(p_area_id text, p_limit integer default 500)
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
     -- A STATE's page lists its top climbs (the `state_classics` slug, at most 100), not its thousands of classics.
     and (coalesce((select area_type from areas where id = p_area_id), '') <> 'state'
          or (r.lists is not null and r.lists @> array['state_classics']))
   order by (r.lists is not null and r.lists @> array['state_classics']) desc,
            coalesce(r.classic_score, r.guide_stars, r.stars) desc nulls last,
            r.guide_stars desc nulls last, r.stars desc nulls last, r.name
   limit least(greatest(p_limit, 1), 1000)
$$;

grant execute on function public.state_classics(text) to anon, authenticated;
grant execute on function public.area_classics(text, integer) to anon, authenticated;
