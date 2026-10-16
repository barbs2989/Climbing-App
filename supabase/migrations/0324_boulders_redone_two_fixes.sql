-- 0324: two things 0320 got wrong, both from a climb whose source chain began at the STATE (17 of 1,284 moves;
-- the other 8 landed on areas we had).
--   AL: 7 climbs left "Horse Pens 40 Routes" (al_temp_hp40, named by 0297) for a NEW "Temp HP40" made directly under
--     Alabama: the source's holding bin, re-created. They go back; the bin goes.
--   CT: 2 climbs (Conqueror, Warmup Crack) were filed on a new Babyface/Warm-Up Slab under a new "Coney Rock Preserve"
--     under a new "CT Bouldering". We hold Coney Rock Preserve (ct_coney_rock_preserve, Eastern Highlands; its
--     boulders sit ~100 m from the slab's pin). The slab moves under ours; the copy and "CT Bouldering" go.
--     decide.mjs tested names for "generic" without their ancestors, so "CT Bouldering" passed; with them, it is the
--     only generic name among 0320's 256 new areas.
-- The three areas deleted were created by 0320 the same day; nothing a climber wrote hangs on them (checked below).
do $$
declare n int;
begin
  if not exists (select 1 from areas where id = 'temp_hp40') and not exists (select 1 from areas where id = 'ct_bouldering') then
    raise notice '0324: 0320 placed nothing here (an empty database) — nothing to fix'; return;
  end if;
  select count(*) into n from areas where (id = 'temp_hp40' and parent_id = 'alabama') or (id = 'al_temp_hp40' and parent_id = 'al_horse_pens_40')
    or (id = 'ct_bouldering' and parent_id = 'connecticut') or (id = 'coney_rock_preserve' and parent_id = 'ct_bouldering')
    or (id = 'babyface_warm_up_slab' and parent_id = 'coney_rock_preserve') or (id = 'ct_coney_rock_preserve' and parent_id = 'ct_eastern_highlands');
  if n <> 6 then raise exception '0324: % of the 6 areas are where this migration read them', n; end if;
  select count(*) into n from routes where area_id = 'temp_hp40' and id in ('al_air_cooper', 'al_bk_problem', 'al_dirty_deeds', 'al_indian_roof',
    'al_indian_roof_direct', 'al_indian_roof_right', 'al_world_below');
  if n <> 7 or (select count(*) from routes where area_id = 'temp_hp40') <> 7 then raise exception '0324: Temp HP40 holds not exactly the 7 read'; end if;
  if (select count(*) from areas where parent_id in ('temp_hp40', 'babyface_warm_up_slab')) <> 0
     or (select count(*) from areas where parent_id = 'coney_rock_preserve') <> 1 or (select count(*) from areas where parent_id = 'ct_bouldering') <> 1
     or (select count(*) from routes where area_id in ('ct_bouldering', 'coney_rock_preserve')) <> 0 then
    raise exception '0324: the copies have sub-areas or climbs this migration did not read'; end if;
  if exists (select 1 from routes r join routes o on lower(o.name) = lower(r.name) and o.area_id = 'al_temp_hp40' where r.area_id = 'temp_hp40') then
    raise exception '0324: Horse Pens 40 Routes already holds one of the 7'; end if;
  if exists (select 1 from areas where parent_id = 'ct_coney_rock_preserve' and lower(name) like 'babyface%') then
    raise exception '0324: our Coney Rock Preserve already has a Babyface slab'; end if;
  select (select count(*) from contributions where area_id in ('temp_hp40', 'ct_bouldering', 'coney_rock_preserve'))
       + (select count(*) from topos where area_id in ('temp_hp40', 'ct_bouldering', 'coney_rock_preserve'))
       + (select count(*) from partner_areas where area_id in ('temp_hp40', 'ct_bouldering', 'coney_rock_preserve'))
       + (select count(*) from crews where area_id in ('temp_hp40', 'ct_bouldering', 'coney_rock_preserve')) into n;
  if n <> 0 then raise exception '0324: % climber rows hang on an area this would delete', n; end if;

  update routes set area_id = 'al_temp_hp40' where area_id = 'temp_hp40';
  delete from areas where id = 'temp_hp40';
  update areas set parent_id = 'ct_coney_rock_preserve' where id = 'babyface_warm_up_slab' and parent_id = 'coney_rock_preserve';
  delete from areas where id = 'coney_rock_preserve';
  delete from areas where id = 'ct_bouldering';

  -- every area on the path of the two that gained climbs (subtree counts)
  update areas a set route_count = (select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ a.path)
   where a.id in (select unnest(string_to_array(ltree2text(path), '.')) from areas where id in ('al_temp_hp40', 'babyface_warm_up_slab'));

  select count(*) into n from routes where area_id = 'al_temp_hp40' and id in ('al_air_cooper', 'al_bk_problem', 'al_dirty_deeds', 'al_indian_roof',
    'al_indian_roof_direct', 'al_indian_roof_right', 'al_world_below');
  if n <> 7 then raise exception '0324: % of the 7 went back', n; end if;
  if (select path from areas where id = 'babyface_warm_up_slab') <> (select path from areas where id = 'ct_coney_rock_preserve') || 'babyface_warm_up_slab'::ltree then
    raise exception '0324: the slab did not land under our Coney Rock Preserve'; end if;
end $$;
