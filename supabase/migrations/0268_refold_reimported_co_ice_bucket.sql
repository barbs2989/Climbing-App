-- 0268: fold "CO Ice & Mixed" again — an import re-created it the night 0259 removed it.
--
-- check:generic-area-names went red straight after #2265 merged (2026-10-08): the snow import, run with
-- the importer from BEFORE #2265 (which steps through a discipline-only level instead of creating it),
-- added ONE climb — North Couloir (Mod. Snow) on Potosi Peak — and, finding no "CO Ice & Mixed > Ouray
-- (Ice/Mixed)" (0259 had folded both), re-created the whole chain under their old ids:
--     Colorado > CO Ice & Mixed > Ouray (Ice/Mixed) > Potosi Peak > North Couloir
-- Potosi Peak (37.990, -107.749) is a Sneffels Range summit above Imogene Basin, beside Teakettle
-- Mountain, which is filed under San Juans > Northern San Juans; catalog_find_area finds no other Potosi
-- Peak in Colorado. So Potosi Peak moves there, and the two re-created buckets, emptied, are deleted.
-- ABORTS if the tree is not as read (2026-10-08) or if any climber row points at a deleted area.
-- NUMBERING: applied by hand on 2026-10-08 as "0267", whose record was already taken by
-- friend_requests_have_limits (#2292) — on conflict do nothing skipped it. Renumbered 0268 and recorded
-- under 0268; the body is unchanged and a re-run is a no-op (its first guard finds the bucket gone).

begin;

do $$ declare k int; begin
  -- An EMPTY database (a Supabase preview) has no catalog; a re-run finds the buckets already gone.
  if not exists (select 1 from areas where id = 'co_co_ice_mixed') then raise notice '0268: nothing to fold'; return; end if;
  if (select parent_id from areas where id = 'co_potosi_peak') is distinct from 'co_ouray_ice_mixed'
     or (select parent_id from areas where id = 'co_ouray_ice_mixed') is distinct from 'co_co_ice_mixed'
     or (select parent_id from areas where id = 'co_teakettle_mountain') is distinct from 'co_northern_san_juans' then
    raise exception '0268: the tree is not as read'; end if;
  select count(*) into k from areas where parent_id in ('co_co_ice_mixed', 'co_ouray_ice_mixed') and id <> 'co_ouray_ice_mixed' and id <> 'co_potosi_peak';
  if k > 0 then raise exception '0268: % more sub-areas arrived under the re-created buckets', k; end if;
  if exists (select 1 from routes where area_id in ('co_co_ice_mixed', 'co_ouray_ice_mixed')) then raise exception '0268: a bucket holds climbs'; end if;
  select (select count(*) from topos where area_id in ('co_co_ice_mixed', 'co_ouray_ice_mixed'))
       + (select count(*) from contributions where area_id in ('co_co_ice_mixed', 'co_ouray_ice_mixed')) into k;
  if k > 0 then raise exception '0268: % climber rows point at a bucket this deletes', k; end if;

  update areas set parent_id = 'co_northern_san_juans' where id = 'co_potosi_peak' and parent_id = 'co_ouray_ice_mixed';
  if not found then raise exception '0268: Potosi Peak did not move'; end if;
  delete from areas where id = 'co_ouray_ice_mixed';
  delete from areas where id = 'co_co_ice_mixed';

  -- path is set per row and does not cascade; Potosi Peak has no sub-areas, so one row
  update areas c set path = p.path || text2ltree(c.id) from areas p where c.id = 'co_potosi_peak' and p.id = c.parent_id;
  update areas set route_count = (select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path)
   where id in ('colorado', 'co_san_juans', 'co_northern_san_juans', 'co_potosi_peak');
end $$;

commit;
