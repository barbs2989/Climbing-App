-- Research batch B (2026-11-18) fixes enrich:apply cannot write — areas. Old value in every WHERE.
begin;

-- Area point is 41 m from the USGS GNIS Forbidden Peak summit point.
update areas set lat = 48.5116521, lng = -121.0584131 where id = 'wa_forbidden_peak' and lat = 48.5115 and lng = -121.0579;

-- Area point is 70 m from the USGS GNIS Mount Stuart summit point (3DEP high ground is within 25 m of the GNIS point).
update areas set lat = 47.4750106, lng = -120.9022286 where id = 'wa_mount_stuart' and lat = 47.475118 and lng = -120.903144;

-- same official figure; areas.elevation (metres) 2549 -> 2550
update areas set elevation_ft = 8365 where id = 'wa_mount_st_helens' and elevation_ft = 8363;

-- same figure (its blurb also says 8,873 ft; fix that number to 8,868)
update areas set elevation_ft = 8868 where id = 'wa_main_peak' and elevation_ft = 8872;

commit;
