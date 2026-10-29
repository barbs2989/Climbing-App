-- OFTEN CLIMBED ON THE SAME TRIP: the other summits a party takes in from this route's trip.
--
-- The owner's note (2026-10-28): "when on a route page, there should be a section of also paired
-- with another peaks or peaks during the same trip. Research online and add that section for each
-- trip." Sahale from Boston Basin, Dorado Needle from the Eldorado high camp, Hinman from the
-- Daniel camp: the combinations a guidebook names when it describes a route's approach or camp.
-- Peakbagger lists the other peaks logged on one trip; SummitPost pages carry "link-ups"; neither
-- says which way in or which camp makes the pairing work, and that is what this stores.
--
-- One jsonb array per route, shaped like `bivy` and `climbing_route` (0120): each entry is
--   {"area_id": <the other peak's areas.id>, "route_id": <optional: the route usually taken on it>,
--    "name": <the peak's display name>, "note": <one sentence, our own words: from where, how much more>}
-- An empty array (the default) means nothing is researched, and the section does not render.
-- Researched data only: written by enrich:apply from batches whose entries name an area_id that
-- exists, so a pairing can never point at a peak the catalog does not hold.

begin;

alter table public.routes add column if not exists same_trip jsonb not null default '[]'::jsonb;

alter table public.routes drop constraint if exists routes_same_trip_is_array;
alter table public.routes add constraint routes_same_trip_is_array check (jsonb_typeof(same_trip) = 'array');


commit;
