-- Rollback for rollback.sql (4 areas set 2026-10-08). Clears only those ids,
-- and only while they still hold one of the batch's lots.
begin;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id in ('wa_karma_crags','wa_midnight_and_noontime','wa_midnight_rock','wa_noontime_rock')
  and (parking_lat, parking_lng) in ((47.599736, -120.713852), (47.587331, -120.707621));
commit;
