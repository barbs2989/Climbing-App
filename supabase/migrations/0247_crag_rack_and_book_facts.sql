-- What a crag climber needs that the routes table could not hold, and the crag's own walk-in.
--
-- rack_items: the route's OWN rack as items with quantities, e.g.
--   [{"item":"quickdraws","qty":12},{"item":"cams","sizes":"#0.5–#3","qty":1},{"item":"nuts","qty":1,"sizes":"1 set"}]
--   It replaces the generic per-discipline rack on sport/trad/boulder pages: no rack stated, no rack shown.
-- sun:          when the wall gets sun or shade ("shade after 2 pm"), as stated — not computed from aspect.
-- wet:          how it behaves after rain ("seeps through spring", "dries within an hour").
-- rock_quality: loose blocks, friable holds, polish.
-- fixed_gear:   old pitons, a bolt ladder, a fixed nut — what is already in place.
-- All five are ROUTE FACTS rows on crag routes.
alter table public.routes add column if not exists rack_items jsonb;
alter table public.routes add column if not exists sun text;
alter table public.routes add column if not exists wet text;
alter table public.routes add column if not exists rock_quality text;
alter table public.routes add column if not exists fixed_gear text;
alter table public.routes drop constraint if exists routes_rack_items_array;
alter table public.routes add constraint routes_rack_items_array check (rack_items is null or jsonb_typeof(rack_items) = 'array');
alter table public.routes drop constraint if exists routes_sun_len;
alter table public.routes add constraint routes_sun_len check (sun is null or char_length(sun) between 1 and 160);
alter table public.routes drop constraint if exists routes_wet_len;
alter table public.routes add constraint routes_wet_len check (wet is null or char_length(wet) between 1 and 160);
alter table public.routes drop constraint if exists routes_rock_quality_len;
alter table public.routes add constraint routes_rock_quality_len check (rock_quality is null or char_length(rock_quality) between 1 and 160);
alter table public.routes drop constraint if exists routes_fixed_gear_len;
alter table public.routes add constraint routes_fixed_gear_len check (fixed_gear is null or char_length(fixed_gear) between 1 and 160);

-- The walk from the crag's trail to the base, ONCE per crag, shown on every route there.
-- Never roads, parking, permits or closures — those change and are kept elsewhere.
alter table public.areas add column if not exists approach text;
alter table public.areas add column if not exists approach_min integer;
alter table public.areas drop constraint if exists areas_approach_len;
alter table public.areas add constraint areas_approach_len check (approach is null or char_length(approach) between 1 and 600);
alter table public.areas drop constraint if exists areas_approach_min_range;
alter table public.areas add constraint areas_approach_min_range check (approach_min is null or approach_min between 0 and 600);
