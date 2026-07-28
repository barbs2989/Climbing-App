-- 0052_route_classic_flag.sql
-- "Regional Classic" flag per route, mirroring the `lists` column added in
-- 0011_route_lists.sql for named tick-lists (Bulgers, Colorado 14ers, etc).
-- The app's Challenges tab surfaces routes with classic = true under
-- "Regional Classics" and counts them toward the "Classic hunter" badge.
-- Until this is populated, both features silently fall back to the local
-- seed catalog's `classic` field (see ClimbMatch.jsx Challenges()).
alter table routes add column if not exists classic boolean not null default false;
create index if not exists routes_classic_idx on routes (classic) where classic;
