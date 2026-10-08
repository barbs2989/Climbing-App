-- Rollback for all-states-tier6-applied.sql: clears ONLY the areas that pass wrote, and only while they still
-- hold the lot it wrote (a later hand correction is left alone). Earlier batches are untouched.
begin;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'az_bikini_wall' and parking_lat = 34.887458 and parking_lng = -111.731592;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_as_gold_rush_area' and parking_lat = 37.723874 and parking_lng = -119.712204;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_ba_the_rostrum' and parking_lat = 37.723874 and parking_lng = -119.712204;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_dark_shadows_rock' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_feudal_boulder' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_indian_palisades_corridor' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_n00b_rock' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_picnic_boulder' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_the_rats_ass' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_tiburcio_s_x' and parking_lat = 36.478525 and parking_lng = -121.183846;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_upper_crust' and parking_lat = 36.478525 and parking_lng = -121.183846;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'ca_willit_pillar' and parking_lat = 34.092467 and parking_lng = -116.153018;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'co_pop_rock' and parking_lat = 39.99728 and parking_lng = -105.416471;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'co_realm_of_the_venusian_love_goddess' and parking_lat = 39.329826 and parking_lng = -104.738749;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'co_wendell_spire' and parking_lat = 39.329826 and parking_lng = -104.738749;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'il_i_bee_wall' and parking_lat = 42.127261 and parking_lng = -90.156692;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id = 'va_mile_9_9_boulder' and parking_lat = 37.941252 and parking_lng = -78.936519;
commit;
