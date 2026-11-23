-- Bugaboo Spire (Bugaboo Provincial Park, BC, 5 routes) is filed alone under "Purcell Mountains" while its 11 neighbour
-- spires (Crescent, Pigeon, Snowpatch, Howser, Eastpost, Brenta...) are filed under "Bugaboos". Move it in with them
-- (2026-11-18, owner "do what you recommend"). Coordinates unchanged; the path follows parent_id; recount both trees.
begin;
do $$ begin
  if (select parent_id from areas where id = 'bc_bugaboo_spire') <> 'bc_purcells' then raise exception 'Bugaboo Spire parent changed'; end if;
  if not exists (select 1 from areas where id = 'bc_bugaboos') then raise exception 'bc_bugaboos missing'; end if;
end $$;
update areas set parent_id = 'bc_bugaboos' where id = 'bc_bugaboo_spire' and parent_id = 'bc_purcells';
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('bc', 'canada', 'bc_purcells', 'bc_columbia_shushwap', 'bc_bugaboos', 'bc_bugaboo_spire');
do $$ begin
  if (select path::text from areas where id = 'bc_bugaboo_spire') <> 'canada.bc.bc_columbia_shushwap.bc_bugaboos.bc_bugaboo_spire'
  then raise exception 'path did not follow the move: %', (select path::text from areas where id = 'bc_bugaboo_spire'); end if;
end $$;
select id, parent_id, path::text, route_count from areas where id in ('bc_bugaboo_spire', 'bc_bugaboos', 'bc_purcells') order by 1;
commit;
