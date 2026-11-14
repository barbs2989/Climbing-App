-- 0321: Pickledish's last holding bin, placed by its own pages.
--   "temp holding" > WW holds Crumbly Slab (5.2). The source's WW page: "eastern end of SMW formation" — Spring
--     Morning Wall, which we hold (nh_spring_morning_wall). The climb moves there; WW goes.
--   "temp holding" > BW > "Section 3 (edit later)" holds The Bad (5.6, 3 pitches). BW is its own formation (an
--     undeveloped buttress, a 1.5-hour bushwhack), so it stays, named as the source names it, directly under
--     Pickledish; The Bad sits on it. "Section 3 (edit later)" and "temp holding" are the source's placeholders and go.
-- Pickledish itself stays (owner, 0301: kept, it is shown publicly). Nothing a climber wrote hangs on the three
-- areas deleted (checked below: contributions, topos, partner_areas and crews reference none of them).
-- A climb attaches only to a LEAF (routes_require_leaf), and the path trigger rewrites only the row it touches, so:
-- park The Bad on WW, delete Section 3 (BW is now a leaf), The Bad onto BW, lift BW, Crumbly Slab onto Spring
-- Morning Wall, delete WW and temp holding, recount.
do $$
declare n int;
begin
  select count(*) into n from areas where
    (id = 'nh_temp_holding' and parent_id = 'nh_pickledish') or (id = 'nh_ww' and parent_id = 'nh_temp_holding')
    or (id = 'nh_bw' and parent_id = 'nh_temp_holding') or (id = 'nh_section_3_edit_later' and parent_id = 'nh_bw')
    or (id = 'nh_spring_morning_wall' and parent_id = 'nh_pickledish');
  if n = 0 and not exists (select 1 from areas where id = 'nh_pickledish') then
    raise notice '0321: no Pickledish here (an empty database) — nothing to place'; return;
  end if;
  if n <> 5 then raise exception '0321: % of the 5 areas are where this migration read them', n; end if;
  select count(*) into n from routes where (id = 'nh_crumbly_slab' and area_id = 'nh_ww') or (id = 'nh_the_bad' and area_id = 'nh_section_3_edit_later');
  if n <> 2 then raise exception '0321: % of the 2 climbs are where this migration read them', n; end if;
  select count(*) into n from routes where area_id in ('nh_ww', 'nh_section_3_edit_later', 'nh_bw', 'nh_temp_holding');
  if n <> 2 then raise exception '0321: the bin holds % climbs, not the 2 read', n; end if;
  select count(*) into n from areas where parent_id in ('nh_temp_holding', 'nh_bw', 'nh_ww', 'nh_section_3_edit_later');
  if n <> 3 then raise exception '0321: the bin has % sub-areas, not the 3 read', n; end if;
  select (select count(*) from contributions where area_id in ('nh_temp_holding', 'nh_ww', 'nh_section_3_edit_later'))
       + (select count(*) from topos where area_id in ('nh_temp_holding', 'nh_ww', 'nh_section_3_edit_later'))
       + (select count(*) from partner_areas where area_id in ('nh_temp_holding', 'nh_ww', 'nh_section_3_edit_later'))
       + (select count(*) from crews where area_id in ('nh_temp_holding', 'nh_ww', 'nh_section_3_edit_later')) into n;
  if n <> 0 then raise exception '0321: % climber rows hang on an area this would delete', n; end if;
  if exists (select 1 from routes where area_id = 'nh_spring_morning_wall' and lower(name) = 'crumbly slab') then
    raise exception '0321: Spring Morning Wall already holds a Crumbly Slab'; end if;

  update routes set area_id = 'nh_ww' where id = 'nh_the_bad' and area_id = 'nh_section_3_edit_later';
  delete from areas where id = 'nh_section_3_edit_later';
  update routes set area_id = 'nh_bw' where id = 'nh_the_bad' and area_id = 'nh_ww';
  update areas set parent_id = 'nh_pickledish', area_type = 'crag' where id = 'nh_bw' and parent_id = 'nh_temp_holding';
  update routes set area_id = 'nh_spring_morning_wall' where id = 'nh_crumbly_slab' and area_id = 'nh_ww';
  delete from areas where id = 'nh_ww';
  delete from areas where id = 'nh_temp_holding';

  update areas a set route_count = (select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ a.path)
   where a.id in ('nh_bw', 'nh_spring_morning_wall', 'nh_pickledish');
  select count(*) into n from areas where id = 'nh_bw' and parent_id = 'nh_pickledish' and path = (select path from areas where id = 'nh_pickledish') || 'nh_bw'::ltree;
  if n <> 1 then raise exception '0321: BW did not land under Pickledish'; end if;
  select count(*) into n from routes where (id = 'nh_crumbly_slab' and area_id = 'nh_spring_morning_wall') or (id = 'nh_the_bad' and area_id = 'nh_bw');
  if n <> 2 then raise exception '0321: % of the 2 climbs landed', n; end if;
end $$;
