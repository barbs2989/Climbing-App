-- 0356: the 18 areas named with the source's id suffix ("Carter Lake | 5876"). Most are a place's own climb list
-- split off as a child of the same name. They were left by an import that kept the "| 1234" the source appends to a
-- duplicated name.
--   * 13 renamed: the suffix off. Where that leaves the parent's own name, the list is "<Place> Routes", as
--     elsewhere; a bare generic name takes its place's name ("Bouldering | 6504" under White Oak Canyon is
--     "White Oak Canyon Bouldering").
--   * 3 were a same-named middle layer ("Sacred Land | 8781" under Sacred Land): their sub-areas step up onto the
--     parent and the layer, which holds no climbs, goes.
--   * 2 beside its own "<Place> Routes" twin: its climbs join the twin, and it goes.
-- The path trigger rewrites only the row it touches, so a lifted sub-area's descendants are re-pathed here.
do $$
declare n int; old_path ltree;
begin
  if not exists (select 1 from areas where id in ('ca_painted_savage_boulders_8759', 'ca_school_bus_area_3832', 'ca_sacred_land_8781', 'ca_western_wall_area_7286', 'co_rock_garden_boulder_area_4013', 'ca_geology_tour_road_east_9282', 'ca_the_land_that_time_forgot_3019', 'ca_yuba_gap_0416', 'mt_the_west_side_8133', 'on_thunder_bay_region_ice_and_mixed_5817', 'va_bouldering_6504', 'co_area_071_boulders_6321', 'co_carter_lake_5876', 'co_colorado_national_monument_2331', 'co_golden_gate_canyon_sp_5795', 'wi_grandad_bluff_2050', 'wy_squaw_rock_and_the_cooney_hills_2157', 'wy_laramie_range_2097')) then
    raise notice '0356: none of these areas here (an empty database)'; return;
  end if;
  select count(*) into n from areas where (id, name) in (('ca_painted_savage_boulders_8759', 'Painted Savage Boulders | 8759'), ('ca_school_bus_area_3832', 'School Bus Area | 3832'), ('ca_sacred_land_8781', 'Sacred Land | 8781'), ('ca_western_wall_area_7286', 'Western Wall Area | 7286'), ('co_rock_garden_boulder_area_4013', 'Rock Garden Boulder Area | 4013'), ('ca_geology_tour_road_east_9282', 'Geology Tour Road East | 9282'), ('ca_the_land_that_time_forgot_3019', 'The Land That Time Forgot | 3019'), ('ca_yuba_gap_0416', 'Yuba Gap | 0416'), ('mt_the_west_side_8133', 'The West Side | 8133'), ('on_thunder_bay_region_ice_and_mixed_5817', 'Thunder Bay Region Ice and Mixed | 5817'), ('va_bouldering_6504', 'Bouldering | 6504'), ('co_area_071_boulders_6321', 'Area 071 Boulders | 6321'), ('co_carter_lake_5876', 'Carter Lake | 5876'), ('co_colorado_national_monument_2331', 'Colorado National Monument | 2331'), ('co_golden_gate_canyon_sp_5795', 'Golden Gate Canyon SP | 5795'), ('wi_grandad_bluff_2050', 'Grandad Bluff | 2050'), ('wy_squaw_rock_and_the_cooney_hills_2157', 'Squaw Rock and the Cooney Hills | 2157'), ('wy_laramie_range_2097', 'Laramie Range | 2097'));
  if n <> 18 then raise exception '0356: % of the 18 areas carry the names this migration read', n; end if;
  -- lift ca_sacred_land_8781
  if exists (select 1 from routes where area_id = 'ca_sacred_land_8781') then raise exception '0356: ca_sacred_land_8781 holds climbs'; end if;
  if (select count(*) from areas where parent_id = 'ca_sacred_land_8781') <> 1 then raise exception '0356: ca_sacred_land_8781 has other sub-areas than read'; end if;
  select path into old_path from areas where id = 'ca_painted_savage_boulders_8759';
  update areas set parent_id = 'ca_sacred_land' where id = 'ca_painted_savage_boulders_8759' and parent_id = 'ca_sacred_land_8781';
  update areas d set path = (select path from areas where id = 'ca_painted_savage_boulders_8759') || subpath(d.path, nlevel(old_path))
   where d.path <@ old_path and d.id <> 'ca_painted_savage_boulders_8759';
  if (select count(*) from contributions where area_id = 'ca_sacred_land_8781') + (select count(*) from topos where area_id = 'ca_sacred_land_8781')
     + (select count(*) from partner_areas where area_id = 'ca_sacred_land_8781') + (select count(*) from crews where area_id = 'ca_sacred_land_8781') <> 0 then
    raise exception '0356: climber rows hang on ca_sacred_land_8781'; end if;
  delete from areas where id = 'ca_sacred_land_8781';
  -- lift ca_geology_tour_road_east_9282
  if exists (select 1 from routes where area_id = 'ca_geology_tour_road_east_9282') then raise exception '0356: ca_geology_tour_road_east_9282 holds climbs'; end if;
  if (select count(*) from areas where parent_id = 'ca_geology_tour_road_east_9282') <> 1 then raise exception '0356: ca_geology_tour_road_east_9282 has other sub-areas than read'; end if;
  select path into old_path from areas where id = 'ca_cabo_dome';
  update areas set parent_id = 'ca_geology_tour_road_east' where id = 'ca_cabo_dome' and parent_id = 'ca_geology_tour_road_east_9282';
  update areas d set path = (select path from areas where id = 'ca_cabo_dome') || subpath(d.path, nlevel(old_path))
   where d.path <@ old_path and d.id <> 'ca_cabo_dome';
  if (select count(*) from contributions where area_id = 'ca_geology_tour_road_east_9282') + (select count(*) from topos where area_id = 'ca_geology_tour_road_east_9282')
     + (select count(*) from partner_areas where area_id = 'ca_geology_tour_road_east_9282') + (select count(*) from crews where area_id = 'ca_geology_tour_road_east_9282') <> 0 then
    raise exception '0356: climber rows hang on ca_geology_tour_road_east_9282'; end if;
  delete from areas where id = 'ca_geology_tour_road_east_9282';
  -- lift wy_laramie_range_2097
  if exists (select 1 from routes where area_id = 'wy_laramie_range_2097') then raise exception '0356: wy_laramie_range_2097 holds climbs'; end if;
  if (select count(*) from areas where parent_id = 'wy_laramie_range_2097') <> 1 then raise exception '0356: wy_laramie_range_2097 has other sub-areas than read'; end if;
  select path into old_path from areas where id = 'wy_squaw_rock_and_the_cooney_hills_2157';
  update areas set parent_id = 'wy_laramie_range' where id = 'wy_squaw_rock_and_the_cooney_hills_2157' and parent_id = 'wy_laramie_range_2097';
  update areas d set path = (select path from areas where id = 'wy_squaw_rock_and_the_cooney_hills_2157') || subpath(d.path, nlevel(old_path))
   where d.path <@ old_path and d.id <> 'wy_squaw_rock_and_the_cooney_hills_2157';
  if (select count(*) from contributions where area_id = 'wy_laramie_range_2097') + (select count(*) from topos where area_id = 'wy_laramie_range_2097')
     + (select count(*) from partner_areas where area_id = 'wy_laramie_range_2097') + (select count(*) from crews where area_id = 'wy_laramie_range_2097') <> 0 then
    raise exception '0356: climber rows hang on wy_laramie_range_2097'; end if;
  delete from areas where id = 'wy_laramie_range_2097';
  -- fold ca_painted_savage_boulders_8759 into ca_painted_savage_boulder
  if (select count(*) from areas where parent_id = 'ca_painted_savage_boulder') <> 0 then raise exception '0356: ca_painted_savage_boulder is not a leaf'; end if;
  if (select count(*) from contributions where area_id = 'ca_painted_savage_boulders_8759') + (select count(*) from topos where area_id = 'ca_painted_savage_boulders_8759')
     + (select count(*) from partner_areas where area_id = 'ca_painted_savage_boulders_8759') + (select count(*) from crews where area_id = 'ca_painted_savage_boulders_8759') <> 0 then
    raise exception '0356: climber rows hang on ca_painted_savage_boulders_8759'; end if;
  update routes set area_id = 'ca_painted_savage_boulder' where area_id = 'ca_painted_savage_boulders_8759' and id in ('ca_painted_savage_boulders_8759_painted_savage_boulder', 'ca_painted_savage_boulders_8759_savage_right');
  get diagnostics n = row_count;
  if n <> 2 then raise exception '0356: % of 2 climbs moved from ca_painted_savage_boulders_8759', n; end if;
  if exists (select 1 from routes where area_id = 'ca_painted_savage_boulders_8759') then raise exception '0356: ca_painted_savage_boulders_8759 still holds climbs'; end if;
  delete from areas where id = 'ca_painted_savage_boulders_8759';
  -- fold co_colorado_national_monument_2331 into co_other_areas
  if (select count(*) from areas where parent_id = 'co_other_areas') <> 0 then raise exception '0356: co_other_areas is not a leaf'; end if;
  if (select count(*) from contributions where area_id = 'co_colorado_national_monument_2331') + (select count(*) from topos where area_id = 'co_colorado_national_monument_2331')
     + (select count(*) from partner_areas where area_id = 'co_colorado_national_monument_2331') + (select count(*) from crews where area_id = 'co_colorado_national_monument_2331') <> 0 then
    raise exception '0356: climber rows hang on co_colorado_national_monument_2331'; end if;
  update routes set area_id = 'co_other_areas' where area_id = 'co_colorado_national_monument_2331' and id in ('co_colorado_national_monument_2331_squaw_fingers');
  get diagnostics n = row_count;
  if n <> 1 then raise exception '0356: % of 1 climbs moved from co_colorado_national_monument_2331', n; end if;
  if exists (select 1 from routes where area_id = 'co_colorado_national_monument_2331') then raise exception '0356: co_colorado_national_monument_2331 still holds climbs'; end if;
  delete from areas where id = 'co_colorado_national_monument_2331';
  update areas set name = 'School Bus Area Routes' where id = 'ca_school_bus_area_3832' and name = 'School Bus Area | 3832';
  update areas set name = 'Western Wall Area Routes' where id = 'ca_western_wall_area_7286' and name = 'Western Wall Area | 7286';
  update areas set name = 'Rock Garden Boulder Area Routes' where id = 'co_rock_garden_boulder_area_4013' and name = 'Rock Garden Boulder Area | 4013';
  update areas set name = 'The Land That Time Forgot Routes' where id = 'ca_the_land_that_time_forgot_3019' and name = 'The Land That Time Forgot | 3019';
  update areas set name = 'Yuba Gap Routes' where id = 'ca_yuba_gap_0416' and name = 'Yuba Gap | 0416';
  update areas set name = 'The West Side Routes' where id = 'mt_the_west_side_8133' and name = 'The West Side | 8133';
  update areas set name = 'Thunder Bay Region Ice and Mixed Routes' where id = 'on_thunder_bay_region_ice_and_mixed_5817' and name = 'Thunder Bay Region Ice and Mixed | 5817';
  update areas set name = 'White Oak Canyon Bouldering' where id = 'va_bouldering_6504' and name = 'Bouldering | 6504';
  update areas set name = 'Area 071 Boulders' where id = 'co_area_071_boulders_6321' and name = 'Area 071 Boulders | 6321';
  update areas set name = 'Carter Lake Routes' where id = 'co_carter_lake_5876' and name = 'Carter Lake | 5876';
  update areas set name = 'Golden Gate Canyon SP Routes' where id = 'co_golden_gate_canyon_sp_5795' and name = 'Golden Gate Canyon SP | 5795';
  update areas set name = 'Grandad Bluff Routes' where id = 'wi_grandad_bluff_2050' and name = 'Grandad Bluff | 2050';
  update areas set name = 'Squaw Rock and the Cooney Hills' where id = 'wy_squaw_rock_and_the_cooney_hills_2157' and name = 'Squaw Rock and the Cooney Hills | 2157';
  select count(*) into n from areas where (id, name) in (('ca_school_bus_area_3832', 'School Bus Area Routes'), ('ca_western_wall_area_7286', 'Western Wall Area Routes'), ('co_rock_garden_boulder_area_4013', 'Rock Garden Boulder Area Routes'), ('ca_the_land_that_time_forgot_3019', 'The Land That Time Forgot Routes'), ('ca_yuba_gap_0416', 'Yuba Gap Routes'), ('mt_the_west_side_8133', 'The West Side Routes'), ('on_thunder_bay_region_ice_and_mixed_5817', 'Thunder Bay Region Ice and Mixed Routes'), ('va_bouldering_6504', 'White Oak Canyon Bouldering'), ('co_area_071_boulders_6321', 'Area 071 Boulders'), ('co_carter_lake_5876', 'Carter Lake Routes'), ('co_golden_gate_canyon_sp_5795', 'Golden Gate Canyon SP Routes'), ('wi_grandad_bluff_2050', 'Grandad Bluff Routes'), ('wy_squaw_rock_and_the_cooney_hills_2157', 'Squaw Rock and the Cooney Hills'));
  if n <> 13 then raise exception '0356: % of the 13 renames landed', n; end if;
  if exists (select 1 from areas where name ~ '\|\s*\d+\s*$' and id in ('ca_painted_savage_boulders_8759', 'ca_school_bus_area_3832', 'ca_sacred_land_8781', 'ca_western_wall_area_7286', 'co_rock_garden_boulder_area_4013', 'ca_geology_tour_road_east_9282', 'ca_the_land_that_time_forgot_3019', 'ca_yuba_gap_0416', 'mt_the_west_side_8133', 'on_thunder_bay_region_ice_and_mixed_5817', 'va_bouldering_6504', 'co_area_071_boulders_6321', 'co_carter_lake_5876', 'co_colorado_national_monument_2331', 'co_golden_gate_canyon_sp_5795', 'wi_grandad_bluff_2050', 'wy_squaw_rock_and_the_cooney_hills_2157', 'wy_laramie_range_2097')) then raise exception '0356: a suffix is left'; end if;
  -- subtree counts on every area these touched
  update areas a set route_count = (select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ a.path)
   where a.id in (select unnest(string_to_array(ltree2text(path), '.')) from areas where id in ('ca_sacred_land', 'ca_geology_tour_road_east', 'wy_laramie_range', 'ca_painted_savage_boulder', 'co_other_areas'));
end $$;
