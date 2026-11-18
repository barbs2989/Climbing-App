-- Area fix from the 2026-11-14 Disappointment Cleaver worked example.
-- Mount Rainier's peak coordinate was ~120 m from the USGS summit point (GNIS 1533614, "Mount
-- Rainier", 46.8528267, -121.7604408; USGS "Columbia Crest" agrees within 6 m).
begin;
update areas set lat = 46.8528267, lng = -121.7604408
 where id = 'wa_mount_rainier' and lat = 46.851731 and lng = -121.760395;
commit;
