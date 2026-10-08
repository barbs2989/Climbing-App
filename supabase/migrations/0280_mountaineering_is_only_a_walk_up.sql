-- Mountaineering is ONLY a walk-up (owner, 2026-10-08): a route with rock-climbing pitches, i.e. a YDS 5.x
-- in its own grade, is ALPINE. Eldorado's East Ridge (5.7 at the top) was filed mountaineering.
--
-- The one-off relabel (scripts/oneoff/fix-mountaineering-with-fifth-class.mjs) fixed the rows that exist;
-- this trigger keeps every later insert or grade edit honest, as catOf does on read. It looks ONLY at the grade
-- columns (a stray pitch-level 5.x on a Class 3-4 row is usually another route's pitch); prose is never parsed here ("5.2 miles" is a distance). It only ever turns
-- mountaineering INTO alpine, and keeps the other disciplines on the row.

create or replace function routes_mountaineering_with_rock_is_alpine() returns trigger language plpgsql
set search_path = public, pg_temp as $$
declare
  yds constant text := '(^|[^0-9.])5\.([0-9]|1[0-5])[abcd]?[+-]?([^0-9]|$)(?!\s*(mi|miles?|km|hrs?|hours?)\M)';
  hit boolean;
begin
  if new.discipline is distinct from 'mountaineering' then return new; end if;
  hit := coalesce(new.grade, '') ~* yds or coalesce(new.rock_grade, '') ~* yds or coalesce(new.alpine_grade, '') ~* yds;
  if hit then
    new.discipline := 'alpine';
    new.disciplines := to_jsonb('alpine'::text) || coalesce((select jsonb_agg(d) from jsonb_array_elements(
      case when jsonb_typeof(new.disciplines) = 'array' then new.disciplines else '[]'::jsonb end) d
      where d <> to_jsonb('alpine'::text)), '[]'::jsonb);
  end if;
  return new;
end
$$;

drop trigger if exists trg_routes_mountaineering_rock on routes;
create trigger trg_routes_mountaineering_rock
  before insert or update of discipline, grade, rock_grade, alpine_grade on routes
  for each row execute function routes_mountaineering_with_rock_is_alpine();
