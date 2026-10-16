begin;
create temp table _had_parking on commit drop as select id from public.areas where parking_lat is not null;
update public.areas set parking_lat=40.228949, parking_lng=-105.341724, parking_name='Gravel lot at the gate at the end of Longmont Dam Road' where path <@ (select path from public.areas where id='co_longmont_reservoir_area_aka_buttonrock') and id not in (select id from _had_parking) and (lat is null or lng is null or 12742 * asin(sqrt(power(sin(radians(lat - 40.228949) / 2), 2) + cos(radians(40.228949)) * cos(radians(lat)) * power(sin(radians(lng - -105.341724) / 2), 2))) <= 4);
commit;
