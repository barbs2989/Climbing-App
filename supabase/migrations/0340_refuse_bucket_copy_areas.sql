-- 0340: the North Cascades' "Cascade River Drainage (Eldorado, Forbidden, …)" bucket folds, and an area
-- NAMED by a list of places the state already files is refused at insert.
--
-- The owner (2026-10-21): "North cascades area, this keeps happening where areas get duplicated ie cascade
-- river drainage el dorado, forbidden, johanassburg, Sahale, torment is duplicated. We already have those
-- in north cascades core. We need to have guards from this to keep happening."
--
-- Mountain Project files its Cascade River peaks under one bucket area named by a list, and its import
-- re-created that bucket beside our own tree:
--   North Cascades › Cascade River Drainage (Eldorado, Forbidden, Johannesburg, Sahale, Torment, etc.)
--                     › Boston Basin Peaks (Forbidden, Johannesburg, etc.)        (empty)
--                     › Hidden lake lookout boulder field                         (1 climb)
-- while North Cascades Core already holds Eldorado Peak, Johannesburg Mountain and Boston Basin › Forbidden
-- Peak / Sahale Mountain / Mount Torment. Neither 0216's trigger nor check:area-duplicates could pair it: no
-- coordinate, and no name key folds "Cascade River Drainage (…)" onto any one peak.
--
-- 1. The fold. The buckets held no climbs of their own; only the boulder field (Bad Idea In Approach
--    Shoes, V1) sits under one. It moves into North Cascades Core beside Eldorado Peak — Hidden Lake
--    Lookout is on the same Cascade River Road — and both buckets go. Nothing else referenced them
--    (crews, contributions, topos, saved_areas, partner_areas all 0, read live 2026-10-21).
-- 2. The guard. refuse_bucket_copy_area(): an area whose name carries a parenthesised list in which TWO OR
--    MORE names are already filed as areas elsewhere in the same state (outside this one) is refused,
--    naming them. Compass and face words do not count ("Sport Boulder (E and NE Face)", "Sunset Slab
--    (N & S)"). check:area-duplicates' third pass applies the same rule daily to what is already there.
--    Bypass for one transaction, after READING the named areas: set local catalog.allow_duplicate = 'on'.

begin;

update areas set parent_id = 'wa_north_cascades_core'
 where id = 'wa_hidden_lake_lookout_boulder_field'
   and parent_id = 'wa_cascade_river_drainage_eldorado_forbidden_johannesburg_';

delete from areas where id = 'wa_boston_basin_peaks_forbidden_johannesburg_etc'
   and not exists (select 1 from areas c where c.parent_id = 'wa_boston_basin_peaks_forbidden_johannesburg_etc')
   and not exists (select 1 from routes r where r.area_id = 'wa_boston_basin_peaks_forbidden_johannesburg_etc');
delete from areas where id = 'wa_cascade_river_drainage_eldorado_forbidden_johannesburg_'
   and not exists (select 1 from areas c where c.parent_id = 'wa_cascade_river_drainage_eldorado_forbidden_johannesburg_')
   and not exists (select 1 from routes r where r.area_id = 'wa_cascade_river_drainage_eldorado_forbidden_johannesburg_');

update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_north_cascades_core', 'wa_north_cascades');

do $$ declare n int; begin
  -- the empty preview database: nothing was there to fold
  if not exists (select 1 from areas where id = 'wa_hidden_lake_lookout_boulder_field') then return; end if;
  select count(*) into n from areas where id in ('wa_cascade_river_drainage_eldorado_forbidden_johannesburg_', 'wa_boston_basin_peaks_forbidden_johannesburg_etc');
  if n > 0 then raise exception '0340: % bucket area(s) survived', n; end if;
  select count(*) into n from areas where id = 'wa_hidden_lake_lookout_boulder_field' and parent_id = 'wa_north_cascades_core'
     and path = 'usa.washington.wa_northwest.wa_hwy20_ncnp.wa_north_cascades.wa_north_cascades_core.wa_hidden_lake_lookout_boulder_field';
  if n <> 1 then raise exception '0340: the boulder field is not under North Cascades Core'; end if;
end $$;

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
    select a.id into twin from areas a
     where catalog_key(a.name) = k
       and a.path <@ st
       and a.id <> new.id
       and (new.path is null or not a.path <@ new.path)
     limit 1;
    if twin is not null then hits := hits || (item || ' = ' || twin); end if;
  end loop;

  if cardinality(hits) >= 2 then
    raise exception 'area "%" (under %) lists places already filed in this state: %',
      new.name, new.parent_id, array_to_string(hits, ', ')
      using hint = 'File its climbs under those areas instead. If this really is a different place: set local catalog.allow_duplicate = ''on''.';
  end if;
  return new;
end $$;

drop trigger if exists trg_refuse_bucket_copy_area on areas;
create trigger trg_refuse_bucket_copy_area before insert or update of name, parent_id on areas
  for each row execute function refuse_bucket_copy_area();

commit;
