-- Where a route STARTS on its wall ("20 ft right of the big chimney, below the square roof"): how a climber
-- finds the line at the base. Drawn as the LOCATION row of ROUTE FACTS on crag routes.
alter table public.routes add column if not exists location text;
alter table public.routes drop constraint if exists routes_location_len;
alter table public.routes add constraint routes_location_len check (location is null or char_length(location) between 1 and 160);
