-- 0496: a log can say how many pitches of a multipitch climb were climbed.
--
-- WHY (owner 2026-11-23, "If they climb a 5 pitch route, does that count as 5 pitches? It
-- should."): Challenges' pitch count adds a route's own pitch count for every finished climb, so
-- a 5-pitch route logged as Lead or Follow already counts 5. A climb abandoned part way -- an
-- Attempt or Turned around after three of five pitches -- counted 0, because nothing recorded how
-- far the party got. The owner chose to ASK on those logs.
--
-- WHAT CHANGES: one nullable column. The log form offers it only on an Attempt, Turned around,
-- Fell or Hung log of a route with two or more pitches; null means "not stated" and counts as
-- before (0 for Attempt / Turned around, the whole route for Fell / Hung). The app caps a stated
-- value at the route's own pitch count; the check only refuses nonsense.

begin;

alter table public.climb_logs
  add column if not exists pitches_climbed integer
  constraint climb_logs_pitches_climbed_range check (pitches_climbed between 1 and 99);

comment on column public.climb_logs.pitches_climbed is
  'Pitches of a multipitch route climbed on a log that did not finish it (Attempt, Turned around, Fell, Hung). Null = not stated.';

commit;
