-- Area coordinates, 50-100 km band, 2026-11-18. Research coords/d-out-1..4.json. Two independent published pages within
-- 1 km (10 km for a park/region); value = the official/most precise page. Guarded on the stored value read 2026-11-18.
begin;
create temp table fx(id text, olat float8, olng float8, lat float8, lng float8) on commit drop;
insert into fx values
 ('az_the_dragon', 36.21118, -112.17375, 36.233645, -112.174253),
 ('ak_mount_blackburn_2', 61.73537, -142.8253, 61.73167, -143.43917),
 ('ak_mt_hayes', 63.65297, -146.70756, 63.62083, -146.71528),
 ('ak_rime_peak_2', 61.85997, -143.13291, 61.746665, -143.306431),
 ('ak_mt_regal_2', 61.85997, -143.13291, 61.74417, -142.86528),
 ('ak_mount_jarvis', 61.85997, -143.13291, 62.0233333, -143.6163889),
 ('ar_buffalo_point', 36.20046, -92.69482, 36.07806, -92.56833),
 ('ca_housekeeping', 37.42674, -119.100598571429, 37.741417, -119.580083),
 ('wy_string_lake_boulders', 43.9291066666667, -109.88042, 43.78838, -110.73721),
 ('az_angels_gate', 35.5562796061478, -111.918273543435, 36.0938645, -111.9900718),
 ('va_crabtree_falls', 38.05671, -78.46161, 37.850833, -79.078333),
 ('nh_pawtuckaway_2', 43.57887, -71.150165, 43.10194, -71.18111),
 ('ma_cape_pond_boulders', 42.147722, -70.723208, 42.63705, -70.63559);
do $$ declare a int; begin
  select count(*) into a from areas x join fx on fx.id = x.id where abs(x.lat - fx.olat) < 1e-6 and abs(x.lng - fx.olng) < 1e-6;
  if a <> (select count(*) from fx) then raise exception 'coordinate guards matched % of %', a, (select count(*) from fx); end if;
end $$;
update areas x set lat = fx.lat, lng = fx.lng, coords_approx = false from fx where x.id = fx.id;
select x.id, x.lat, x.lng from areas x where x.id in (select id from fx) order by 1;
commit;
