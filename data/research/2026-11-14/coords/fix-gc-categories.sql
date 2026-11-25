-- Six Grand Canyon grouping areas (Castles, Temples, Unconventionals, Canyons, Colorado River, Bright Angel Walls) carry the
-- old bad park point 35.5562796,-111.9182735 (south of the canyon). They are categories, not places: no page prints a
-- point for them. Give them the park's corrected point (Wikipedia/GNIS 36.0552608,-112.1218355, applied 2026-11-18),
-- marked approximate. (2026-11-23, owner "do what you recommend based on online research")
begin;
do $$ declare n int; begin
  select count(*) into n from areas where id in ('az_castles','az_temples','az_unconventionals','az_canyons','az_colorado_river','az_bright_angel_walls')
     and abs(lat - 35.5562796061478) < 1e-6 and abs(lng + 111.918273543435) < 1e-6;
  if n <> 6 then raise exception 'expected 6 grouping areas at the old point, found %', n; end if;
end $$;
update areas set lat = 36.0552608, lng = -112.1218355, coords_approx = true
 where id in ('az_castles','az_temples','az_unconventionals','az_canyons','az_colorado_river','az_bright_angel_walls')
   and abs(lat - 35.5562796061478) < 1e-6 and abs(lng + 111.918273543435) < 1e-6;
select id, lat, lng, coords_approx from areas where id in ('az_castles','az_temples','az_unconventionals','az_canyons','az_colorado_river','az_bright_angel_walls') order by 1;
commit;
