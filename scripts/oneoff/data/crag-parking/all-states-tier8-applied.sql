begin;
update public.areas set parking_lat=34.092467, parking_lng=-116.153018, parking_name='Indian Cove day-use lot at the east end of the Short Wall' where id='ca_morbid_mound' and parking_lat is null;
update public.areas set parking_lat=36.478525, parking_lng=-121.183846, parking_name='Moses Spring Parking Area' where id='ca_snake_bend_wall_the_skreetching_halt_the' and parking_lat is null;
update public.areas set parking_lat=37.84514, parking_lng=-83.643243, parking_name='Large pullout on the right below Phantasia, past the iron bridge' where id='ky_dunkan_rock' and parking_lat is null;
commit;
