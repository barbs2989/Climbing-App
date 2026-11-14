-- 0341: refuse_bucket_copy_area (0340) also matches a listed name with its spaces taken out, so
-- "Cascade River (El Dorado, Johannes Burg)" finds Eldorado Peak and Johannesburg Mountain.
--
-- The owner, after 0340: "keep trying for the others" — the gaps 0340 recorded. This closes the
-- spelling one. Measured over every area on 2026-10-21: no stored bucket depended on it, so it refuses
-- nothing that already exists; check:area-duplicates' bucket pass applies the same rule daily.
-- Measured and NOT built, so nobody re-derives them:
--   - a list naming only ONE place we already hold: 8 in the catalog, all a generic word matching a
--     different place across the state ("The Lookout (main wall and shield)" against Castleview's Main
--     Wall). As a rule it would refuse real names and catch no copy.
--   - a list OUTSIDE parentheses ("Bull Market and Satellite Wall") is too often a real place to refuse at
--     insert: 12 such names list two areas filed near them, and 9 are different places with climbs of
--     their own (the Red River Gorge routes between Solar Collector and Gold Coast, three Red Rocks sport
--     routes, ice-vs-rock splits). check:area-duplicates now asks about them daily against a READ list.
--
-- The 3 of those 12 that ARE copies fold here, each a second parent beside the tree that holds the place:
--   Arizona  "Courthouse Butte & Bell Rock" (no coordinate) › Bell Rock Boulder (Ufta V1)
--            beside Bell Rock / Courthouse Butte › Bell Rock, Courthouse Butte. The boulder joins them as a
--            sibling (Bell Rock holds climbs, so it cannot take a sub-area).
--   Pennsylvania  "Devils Den, Gettysburg" › Plum Run (10 problems) beside Gettysburg › Devils Den. Plum
--            Run moves under Gettysburg.
--   Washington  Icicle Creek "The Fist/Rob's Corral" holding one problem, The Fist, at the very coordinate
--            of Trail Boulders › The Fist. The problem moves onto that boulder.
--
-- The compact key gets its own expression index, so the second lookup stays an index probe.

begin;

update areas set parent_id = 'az_bell_rock_courthouse_butte'
 where id = 'az_bell_rock_boulder' and parent_id = 'az_courthouse_butte_bell_rock';
update areas set parent_id = 'pa_gettysburg'
 where id = 'pa_plum_run' and parent_id = 'pa_devils_den_gettysburg';
update routes set area_id = 'wa_the_fist'
 where id = 'wa_the_fist' and area_id = 'wa_the_fist_rob_s_corral';

delete from areas where id in ('az_courthouse_butte_bell_rock', 'pa_devils_den_gettysburg', 'wa_the_fist_rob_s_corral')
   and not exists (select 1 from areas c where c.parent_id = areas.id)
   and not exists (select 1 from routes r where r.area_id = areas.id);

update areas a set route_count = (
  select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ a.path
) where exists (select 1 from areas t where t.id in ('az_bell_rock_courthouse_butte', 'pa_gettysburg', 'wa_the_fist') and a.path @> t.path);

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from areas where id = 'pa_plum_run') then return; end if;
  select count(*) into n from areas where id in ('az_courthouse_butte_bell_rock', 'pa_devils_den_gettysburg', 'wa_the_fist_rob_s_corral');
  if n > 0 then raise exception '0341: % copy area(s) survived', n; end if;
  select count(*) into n from areas where (id, parent_id) in (('az_bell_rock_boulder', 'az_bell_rock_courthouse_butte'), ('pa_plum_run', 'pa_gettysburg'));
  if n <> 2 then raise exception '0341: % of 2 areas re-parented', n; end if;
  select count(*) into n from routes where id = 'wa_the_fist' and area_id = 'wa_the_fist';
  if n <> 1 then raise exception '0341: The Fist did not move onto its boulder'; end if;
end $$;

create index if not exists areas_catalog_compact_key_idx on areas (replace(public.catalog_key(name), ' ', ''));

create or replace function refuse_bucket_copy_area() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare st ltree; item text; k text; twin text; hits text[] := '{}';
begin
  if coalesce(current_setting('catalog.allow_duplicate', true), '') = 'on' then return new; end if;
  if tg_op = 'UPDATE' and new.name is not distinct from old.name
                      and new.parent_id is not distinct from old.parent_id then return new; end if;
  if new.name !~ '\(' then return new; end if;
  select subpath(path, 0, 2) into st from areas where id = new.parent_id;
  if st is null or nlevel(st) < 2 then return new; end if;

  for item in select btrim(x) from regexp_split_to_table(substring(new.name from '\(([^)]*)\)'), '\s*(?:,|/|&|\mand\M)\s*', 'i') x loop
    continue when item ~* '^etc\.?$';
    continue when not exists (
      select 1 from unnest(string_to_array(search_canon(item), ' ')) w
       where w <> '' and w not in ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west',
                                   'northeast', 'northwest', 'southeast', 'southwest', 'face', 'faces', 'side',
                                   'sides', 'wall', 'walls', 'end', 'upper', 'lower'));
    k := catalog_key(item);
    continue when length(k) < 4;
    twin := null;
    select a.id into twin from areas a
     where catalog_key(a.name) = k
       and a.path <@ st and a.id <> new.id and (new.path is null or not a.path <@ new.path)
     limit 1;
    if twin is null then
      select a.id into twin from areas a
       where replace(catalog_key(a.name), ' ', '') = replace(k, ' ', '')
         and a.path <@ st and a.id <> new.id and (new.path is null or not a.path <@ new.path)
       limit 1;
    end if;
    if twin is not null then hits := hits || (item || ' = ' || twin); end if;
  end loop;

  if cardinality(hits) >= 2 then
    raise exception 'area "%" (under %) lists places already filed in this state: %',
      new.name, new.parent_id, array_to_string(hits, ', ')
      using hint = 'File its climbs under those areas instead. If this really is a different place: set local catalog.allow_duplicate = ''on''.';
  end if;
  return new;
end $$;

commit;
