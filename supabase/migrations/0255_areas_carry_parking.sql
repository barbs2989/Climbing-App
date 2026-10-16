-- Where climbers PARK for a crag, held on the area so every route on it inherits one answer. Read by
-- trailheadPoint() as the last fallback, after the route's own trailhead pin and approach_logistics:
-- it drives the crag card's PARKING coordinate and its Google / Apple Maps directions.
--   parking_lat / parking_lng  the lot or pullout itself, researched per crag (a named lot matched to
--                              its mapped feature), never computed from the crag coordinate.
--   parking_name               what climbers read: a plain place description ("Gravel lot at the end
--                              of 5th St"), never a source.
-- A lot serves a crag and everything under it, so it is written on the crag area AND copied to each
-- descendant that has no closer assignment of its own; the app reads only the route's own area.
alter table public.areas add column if not exists parking_lat double precision;
alter table public.areas add column if not exists parking_lng double precision;
alter table public.areas add column if not exists parking_name text;
alter table public.areas drop constraint if exists areas_parking_check;
alter table public.areas add constraint areas_parking_check check (
  (parking_lat is null and parking_lng is null and parking_name is null)
  or (parking_lat between -90 and 90 and parking_lng between -180 and 180 and parking_lat <> 0 and parking_lng <> 0)
);
