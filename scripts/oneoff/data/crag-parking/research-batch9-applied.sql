begin;
create temp table _had_parking on commit drop as select id from public.areas where parking_lat is not null;
update public.areas set parking_lat=42.625009, parking_lng=-70.710216, parking_name='Small lot on Concord Street by the Tompson Street Reservation entrance' where path <@ (select path from public.areas where id='ma_concord_st_entrance') and id not in (select id from _had_parking) and (lat is null or lng is null or 12742 * asin(sqrt(power(sin(radians(lat - 42.625009) / 2), 2) + cos(radians(42.625009)) * cos(radians(lat)) * power(sin(radians(lng - -70.710216) / 2), 2))) <= 4);
commit;
