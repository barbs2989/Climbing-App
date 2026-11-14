-- A SCRAMBLE with a YDS 5.x in its own grade is ALPINE too, and a row's `disciplines` list always holds its own
-- primary `discipline` (owner, 2026-10-24: "Most people don't scramble a 5.6 graded route").
--
-- Monte Cristo's "Standard Scramble" was re-filed alpine by the walk-up audit (#1854), but its `disciplines` list
-- still read ["scrambling"], and the route page drew its badges from that list, so it showed "Scrambling 5.6".
-- 83 rows carried a list that did not contain their own primary: each audit corrected one column and not the
-- other. 0280's trigger already turned mountaineering + 5.x into alpine; this widens it to scrambling (dropping
-- the "scrambling" tag, since a 5.x route is not a scramble) and makes every write keep the primary in the list.
-- The Mountaineers file the same line as a "Basic Alpine Climb", and their scrambles are unroped by definition.

create or replace function routes_mountaineering_with_rock_is_alpine() returns trigger language plpgsql
set search_path = public, pg_temp as $$
declare
  yds constant text := '(^|[^0-9.])5\.([0-9]|1[0-5])[abcd]?[+-]?([^0-9]|$)(?!\s*(mi|miles?|km|hrs?|hours?)\M)';
  hit boolean;
  ds jsonb;
begin
  ds := case when jsonb_typeof(new.disciplines) = 'array' then new.disciplines else null end;
  if new.discipline in ('mountaineering', 'scrambling') then
    hit := coalesce(new.grade, '') ~* yds or coalesce(new.rock_grade, '') ~* yds or coalesce(new.alpine_grade, '') ~* yds;
    if hit then
      new.discipline := 'alpine';
      if ds is not null then
        ds := coalesce((select jsonb_agg(d) from jsonb_array_elements(ds) d
          where d not in (to_jsonb('alpine'::text), to_jsonb('scrambling'::text), to_jsonb('scramble'::text))), '[]'::jsonb);
        ds := to_jsonb('alpine'::text) || ds;
      end if;
    end if;
  end if;
  -- The list is what the route page's badges and the discipline filters read, so it must name the primary.
  if ds is not null and jsonb_array_length(ds) > 0 and new.discipline is not null and not ds ? new.discipline then
    ds := to_jsonb(new.discipline) || ds;
  end if;
  if ds is not null then new.disciplines := ds; end if;
  return new;
end
$$;

drop trigger if exists trg_routes_mountaineering_rock on routes;
create trigger trg_routes_mountaineering_rock
  before insert or update of discipline, disciplines, grade, rock_grade, alpine_grade on routes
  for each row execute function routes_mountaineering_with_rock_is_alpine();
