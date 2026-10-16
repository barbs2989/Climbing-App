-- Rollback for all-states-tier8-applied.sql: clears ONLY the areas that pass wrote, and only while they still
-- hold the lot it wrote (a later hand correction is left alone). Earlier batches are untouched.
begin;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_morbid_mound' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_snake_bend_wall_the_skreetching_halt_the' and parking_lat = 36.478525 and parking_lng = -121.183846;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ky_dunkan_rock' and parking_lat = 37.84514 and parking_lng = -83.643243;
commit;
