-- 0275: fold "VT Ice and Mixed" again — the same pre-#2265 snow import that re-created "CO Ice & Mixed"
-- (0268) reached Vermont too.
--
-- check:generic-area-names went red again after #2288 merged (2026-10-08): the import added ONE climb —
-- Hourglass Chute (Mod. Snow) on "Mansfield - the Chin" — and, finding no "VT Ice and Mixed" (0259 had
-- folded it), re-created it under its old id to hold that area:
--     Vermont > VT Ice and Mixed > Mansfield - the Chin > Hourglass Chute
-- The Chin is Mount Mansfield's summit; our Northern Vermont > Mt Mansfield (which holds Cantilever Rock)
-- sits 1.3 km off. "Mansfield - the Chin" moves under Mt Mansfield — KEEPING its name, so the importer's
-- same-name-nearby match finds it next time instead of creating it again — and the bucket is deleted.
-- No import or crawl process is running (checked 2026-10-08); anything run from today's main steps
-- through a discipline-only level (scripts/lib/generic-area-name.mjs).
-- ABORTS if the tree is not as read or if any climber row points at the deleted area.

begin;

do $$ declare k int; begin
  -- An EMPTY database (a Supabase preview) has no catalog; a re-run finds the bucket already gone.
  if not exists (select 1 from areas where id = 'vt_vt_ice_and_mixed') then raise notice '0275: nothing to fold'; return; end if;
  if (select parent_id from areas where id = 'vt_mansfield_the_chin') is distinct from 'vt_vt_ice_and_mixed'
     or (select parent_id from areas where id = 'vt_mt_mansfield') is distinct from 'vt_1_northern_vermont'
     or exists (select 1 from routes where area_id = 'vt_mt_mansfield') then
    raise exception '0275: the tree is not as read'; end if;
  select count(*) into k from areas where parent_id = 'vt_vt_ice_and_mixed' and id <> 'vt_mansfield_the_chin';
  if k > 0 then raise exception '0275: % more sub-areas arrived under the re-created bucket', k; end if;
  if exists (select 1 from routes where area_id = 'vt_vt_ice_and_mixed') then raise exception '0275: the bucket holds climbs'; end if;
  select (select count(*) from topos where area_id = 'vt_vt_ice_and_mixed')
       + (select count(*) from contributions where area_id = 'vt_vt_ice_and_mixed') into k;
  if k > 0 then raise exception '0275: % climber rows point at the bucket this deletes', k; end if;

  update areas set parent_id = 'vt_mt_mansfield' where id = 'vt_mansfield_the_chin' and parent_id = 'vt_vt_ice_and_mixed';
  if not found then raise exception '0275: Mansfield - the Chin did not move'; end if;
  delete from areas where id = 'vt_vt_ice_and_mixed';

  update areas c set path = p.path || text2ltree(c.id) from areas p where c.id = 'vt_mansfield_the_chin' and p.id = c.parent_id;
  update areas set route_count = (select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path)
   where id in ('vermont', 'vt_1_northern_vermont', 'vt_mt_mansfield', 'vt_mansfield_the_chin');
end $$;

commit;
