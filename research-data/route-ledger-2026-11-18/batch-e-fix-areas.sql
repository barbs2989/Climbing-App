-- Research batch fixes (2026-11-18): enrich:apply cannot write — areas. Old value in every WHERE.
begin;

-- Area point is 22 m from the USGS GNIS Prusik Peak summit point that the route summit pins (and the West Ridge lock) use; the 3DEP grid shows the GNIS point only 39 ft below the high point, so it st
update areas set lat = 47.4874957, lng = -120.7843035 where id = 'wa_prusik_peak' and lat = 47.487398 and lng = -120.784552;

-- Area point is 19 m from the USGS GNIS Colchuck Peak point that the route summit pins use.
update areas set lat = 47.4781887, lng = -120.8463606 where id = 'wa_colchuck_peak' and lat = 47.478348 and lng = -120.846468;

-- Area point is 28 m from the USGS GNIS Dragontail Peak point that the route summit pins use.
update areas set lat = 47.4788694, lng = -120.833106 where id = 'wa_dragontail_peak' and lat = 47.47873 and lng = -120.833421;

commit;
