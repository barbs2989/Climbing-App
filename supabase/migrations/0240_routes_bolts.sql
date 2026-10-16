-- 0240: routes.bolts -- the bolt count a guidebook prints for a sport (or mixed-protection) line.
--
-- Until now a bolt count lived only inside pitch_detail entries' prose ("9 bolts to chains"), so
-- the route page could not state it as a fact and nothing could filter or check it. ROUTE FACTS
-- (RouteDetail's TechStats card on a crag discipline) renders it for sport, trad, toprope and aid
-- when it is present and > 0; a bare route shows nothing.
--
-- NULL is the honest default: the count is UNRECORDED, not zero. Do not backfill it by parsing
-- pitch prose -- a "5.8 raps" style misreading is exactly the class #2153 just fixed for rappels.
-- A route with genuinely no bolts (pure trad) is better left NULL than written 0, because 0 and
-- "nobody counted" would then read the same.

alter table public.routes add column if not exists bolts integer;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'routes_bolts_nonnegative' and conrelid = 'public.routes'::regclass
  ) then
    alter table public.routes add constraint routes_bolts_nonnegative check (bolts is null or (bolts >= 0 and bolts <= 500));
  end if;
end $$;

comment on column public.routes.bolts is
  'Bolt count for the whole route as a guidebook states it (protection bolts, not anchor bolts). NULL = not recorded; never derived from pitch prose.';
