-- A route's trip plan is DAY BY DAY or nothing (owner, 2026-11-11: "text only plans convert day by
-- day, make that a rule in the app when we do other routes and states").
--
-- `routes.itinerary` held a prose STRING on 310 rows; the Trip plan could only guess its days from
-- "Day 1:" markers and show no figures. All were converted to { days: [ … ] } by
-- scripts/oneoff/apply-trip-plans-2026-11-11-wave2.mjs. lib/itineraryShape.js is the full rule
-- (typed figures, titled days) and every loader and apply script calls it (check:itinerary-shape);
-- this constraint is the floor the database holds for every other path: the SQL Editor, a future
-- loader, an RPC.
--
-- BEFORE APPLYING: `npm run audit:itinerary-shape` must report 0 prose. A CHECK is re-tested on every
-- UPDATE of a row, even one added NOT VALID, so adding it over a prose row would make every later
-- edit of that row fail; added VALID it simply fails here, which is the safe direction.

alter table public.routes
  add constraint routes_itinerary_is_day_by_day
  check (
    itinerary is null
    or (
      jsonb_typeof(itinerary) = 'object'
      and jsonb_typeof(itinerary -> 'days') = 'array'
      and jsonb_array_length(itinerary -> 'days') > 0
    )
  );

comment on constraint routes_itinerary_is_day_by_day on public.routes is
  'A trip plan is { days: [ ... ] } or null, never prose (owner 2026-11-11). Full rule: lib/itineraryShape.js.';

-- Confirm -- expect 0 rows:
--   select id from public.routes where itinerary is not null
--     and not (jsonb_typeof(itinerary) = 'object' and jsonb_typeof(itinerary -> 'days') = 'array'
--              and jsonb_array_length(itinerary -> 'days') > 0);
