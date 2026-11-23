-- va_harpers_ferry ("Harpers Ferry", filed under Virginia > Shenandoah & NW VA) is an empty copy of wv_harpers_ferry
-- (West Virginia > Eastern WV, 39.3226,-77.7271), where Harpers Ferry actually is. No routes, no child areas.
-- Deleted 2026-11-23 (owner "do what you recommend" after being asked to confirm the permanent delete).
-- Aborts if ANY climber data points at it (cascading tables included). Restore: row in delete-va-harpers-ferry.backup.
begin;
do $$ begin
  if (select count(*) from areas where id = 'va_harpers_ferry' and parent_id = 'va_shenandoah_nw_va_region') <> 1 then raise exception 'row changed'; end if;
  if not exists (select 1 from areas where id = 'wv_harpers_ferry') then raise exception 'the WV copy is gone'; end if;
  if exists (select 1 from routes where area_id = 'va_harpers_ferry') or exists (select 1 from areas where parent_id = 'va_harpers_ferry')
     or exists (select 1 from crews where area_id = 'va_harpers_ferry') or exists (select 1 from contributions where area_id = 'va_harpers_ferry')
     or exists (select 1 from topos where area_id = 'va_harpers_ferry') or exists (select 1 from saved_areas where area_id = 'va_harpers_ferry')
     or exists (select 1 from partner_areas where area_id = 'va_harpers_ferry') or exists (select 1 from groups where area_id = 'va_harpers_ferry')
     or exists (select 1 from gps_submissions where area_id = 'va_harpers_ferry') or exists (select 1 from review_ai_verdicts where area_id = 'va_harpers_ferry')
  then raise exception 'something references va_harpers_ferry; not deleting'; end if;
end $$;
select to_jsonb(a) backup from areas a where id = 'va_harpers_ferry';
delete from areas where id = 'va_harpers_ferry' and exists (select 1 from areas t where t.id = 'wv_harpers_ferry');
select (select count(*) from areas where id = 'va_harpers_ferry') va_left, (select count(*) from areas where id = 'wv_harpers_ferry') wv_kept;
commit;
