-- Rollback for wa-batch1-applied.sql: before it ran, NO area had parking (0 of 68,237 on 2026-10-07),
-- so undoing batch 1 alone is clearing every area it wrote. After a later batch, restrict this by id.
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where parking_lat is not null;
