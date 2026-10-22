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
--   - a list OUTSIDE parentheses ("Bull Market and Satellite Wall"): see check:area-duplicates' notes in
--     docs/guards/database-and-history.md for what was measured.
--
-- The compact key gets its own expression index, so the second lookup stays an index probe.

begin;

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
