-- Two discipline buckets the duplicate-area trigger would not let go of: each holds ONE place whose
-- name matches the bucket's own key ("Keechelus Lake Ice" > "Keechelus Lake Ice Ice Climbs";
-- "Provo Canyon Ice" > "Stairway to Heaven" > "Stairway to Heaven"), so moving or renaming the child
-- reads as a copy of the bucket it is leaving (or of its own child). Read 2026-11-26: the "twin" is the
-- bucket being dissolved, not another place, so the bypass is used for this one transaction.
begin;
set local catalog.allow_duplicate = 'on';
update areas set parent_id = 'ut_provo_canyon' where id = 'ut_stairway_to_heaven' and parent_id = 'ut_provo_canyon_ice';
update areas set parent_id = 'wa_snoqualmie_pass_area', name = 'Keechelus Lake'
 where id = 'wa_keechelus_lake_ice_climbs' and parent_id = 'wa_keechelus_lake_ice';
delete from areas a where a.id in ('ut_provo_canyon_ice', 'wa_keechelus_lake_ice')
  and not exists (select 1 from areas c where c.parent_id = a.id)
  and not exists (select 1 from routes x where x.area_id = a.id)
  and not exists (select 1 from contributions x where x.area_id = a.id)
  and not exists (select 1 from topos x where x.area_id = a.id)
  and not exists (select 1 from saved_areas x where x.area_id = a.id)
  and not exists (select 1 from partner_areas x where x.area_id = a.id)
  and not exists (select 1 from review_ai_verdicts x where x.area_id = a.id)
  and not exists (select 1 from review_worklist x where x.area_id = a.id)
  and not exists (select 1 from crews x where x.area_id = a.id)
  and not exists (select 1 from gps_submissions x where x.area_id = a.id)
  and not exists (select 1 from groups x where x.area_id = a.id);
select id, name, parent_id, path::text from areas where id in ('ut_stairway_to_heaven', 'wa_keechelus_lake_ice_climbs', 'ut_provo_canyon_ice', 'wa_keechelus_lake_ice');
commit;
