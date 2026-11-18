-- Research batch fixes (2026-11-18): enrich:apply cannot write — areas. Old value in every WHERE.
begin;

-- Area has no parking pin; OSM park lot and the WA Parks directions point agree (14 m).
update areas set parking_lat = 47.539612, parking_lng = -120.520081 where id = 'wa_west_side_4' and parking_lat is null and parking_lng is null;

-- Same park lot as West Side.
update areas set parking_lat = 47.539612, parking_lng = -120.520081 where id = 'wa_northwest_side' and parking_lat is null and parking_lng is null;

commit;
