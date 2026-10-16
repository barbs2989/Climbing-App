-- Rollback for research-batch9 (5 areas set 2026-10-08). Clears only those ids,
-- and only while they still hold one of the batch's lots.
begin;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id in ('ma_alien_boulder','ma_concord_st_entrance','ma_driven_boulder_the','ma_easter_boulder','ma_john_s_boulder')
  and (parking_lat, parking_lng) in ((42.625009, -70.710216));
commit;
