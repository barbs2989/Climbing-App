-- Area coordinate + filing fixes, 2026-11-18 (owner "do what you recommend" / "keep going"). Research: coords/c-out-1..8.json
-- (428 areas >100 km from their parent). Coordinates: two independent published pages within 1 km (10 km for region-sized
-- areas); value = GNIS/land manager where printed. Moves: Mountain Project files the area there and its own coordinate lies there.
-- Each statement is guarded on the value read 2026-11-18; the batch aborts unless every guard matched.
begin;
create temp table fx(id text, olat float8, olng float8, lat float8, lng float8, approx bool) on commit drop;
insert into fx values
 ('ut_gooseberry_mesa', 37.13842, 113.19652, 37.1347578, -113.2112004, false),
 ('wy_lamar_valley', 47.8117, -112.18276, 44.9128904, -110.2808522, false),
 ('ak_mount_drum_2', 61.25675, -149.82004, 62.1153861, -144.6395995, false),
 ('tx_spacefarm', 33.12693, -96.83886, 30.18651, -97.72233, false),
 ('co_colorado_national_monument_ice', 38.9936, -105.93, 39.0425, -108.68611, false),
 ('va_big_meadows_area', 36.79528, -76.17936, 38.529535, -78.4411963, false),
 ('co_unaweep_canyon_2', 38.9936, -105.93, 38.976244, -108.4547108, false),
 ('wy_laradise', 43.0046, -107.842, 41.3113669, -105.5911007, false),
 ('ca_selden_pass', 35.96713, -118.48372, 37.2896615, -118.8723387, false),
 ('co_parachute', 38.9936, -105.93, 39.4494426, -108.05266, true),
 ('id_riggins', 45.40157, -116.11719, 45.41373, -116.32571, false),
 ('co_fish_creek_falls_2', 38.9936, -105.93, 40.481351, -106.7712461, false),
 ('ca_sawtooth_canyon_njc_bouldering', 33.04859, -116.56724, 34.670107, -116.983935, false),
 ('ut_millville_canyon', 40.5618, -111.687, 41.66433, -111.79687, false),
 ('mn_tettegouche_sp_north_shore', 46.8498466666667, -92.32298, 47.33583, -91.19944, false),
 ('az_grand_canyon_national_park', 35.5562796061478, -111.918273543435, 36.0552608, -112.1218355, false);
create temp table mv(id text, frm text, dst text) on commit drop;
insert into mv values
 ('mt_buffalo_canyon_dark_canyon', 'mt_northwest_region', 'mt_great_falls_area'),
 ('mt_wolf_butte', 'mt_northwest_region', 'mt_great_falls_area'),
 ('mt_memorial_falls', 'mt_northwest_region', 'mt_great_falls_area'),
 ('mt_monarch_area_camp_rotary', 'mt_northwest_region', 'mt_great_falls_area'),
 ('mt_monarch_canyon', 'mt_northwest_region', 'mt_great_falls_area'),
 ('mt_sluice_boxes_state_park', 'mt_northwest_region', 'mt_great_falls_area'),
 ('or_leslie_gulch', 'or_northeast_oregon', 'or_southeast_oregon'),
 ('ca_point_mugu', 'ca_central_coast', 'ca_santa_monica_mountains'),
 ('az_tollgate_pass', 'az_southern_arizona', 'az_black_hills'),
 ('va_rawley_springs', 'va_dc_northern_va_region', 'va_shenandoah_nw_va_region'),
 ('ca_lover_s_leap_limestone', 'ca_northeast_california', 'ca_northwest_california'),
 ('mt_emigrant_gulch', 'mt_southwest_region', 'mt_paradise_valley'),
 ('id_riggins', 'id_central_idaho', 'id_west_idaho');
do $$ declare a int; b int; begin
  select count(*) into a from areas x join fx on fx.id = x.id where abs(x.lat - fx.olat) < 1e-6 and abs(x.lng - fx.olng) < 1e-6;
  select count(*) into b from areas x join mv on mv.id = x.id where x.parent_id = mv.frm and exists (select 1 from areas d where d.id = mv.dst);
  if a <> (select count(*) from fx) then raise exception 'coordinate guards matched % of %', a, (select count(*) from fx); end if;
  if b <> (select count(*) from mv) then raise exception 'move guards matched % of %', b, (select count(*) from mv); end if;
end $$;
create temp table touched on commit drop as select mv.frm id from mv union select mv.dst from mv;
update areas x set lat = fx.lat, lng = fx.lng, coords_approx = fx.approx from fx where x.id = fx.id;
update areas x set parent_id = mv.dst from mv where x.id = mv.id and x.parent_id = mv.frm;
update areas set route_count = (select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path)
 where exists (select 1 from touched t join areas ta on ta.id = t.id where areas.path @> ta.path);
do $$ begin
  if exists (select 1 from areas x join mv on mv.id = x.id join areas d on d.id = mv.dst where not (x.path <@ d.path)) then raise exception 'a path did not follow its move'; end if;
end $$;
select x.id, x.lat, x.lng, x.parent_id, x.path::text from areas x where x.id in (select id from fx union select id from mv) order by 1;
commit;
