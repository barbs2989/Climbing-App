-- 0087: record how a party gets back, instead of assuming it.
--
-- RouteDetail renders "Round trip" as dist_km * 2, and dist_km is the APPROACH distance.
-- Whether that doubling is true depends on how the party exits, and nothing in this schema
-- records that. The app infers it from shapeOf(), which reads name + blurb + summary --
-- but `blurb` and `summary` have no column in `routes`, so for every DB-backed route it
-- sees the NAME alone and then DEFAULTS to "outback".
--
-- Measured against the live WA catalog on 2026-08-06: of 496 alpine routes carrying a
-- dist_km, 480 were labelled out-and-back that way, and the `loop` branch never fired once,
-- because no route in the catalog is named "loop".
--
-- Important: this is NOT a correction sweep, because the doubling is usually RIGHT. What
-- matters is whether the APPROACH is retraced, not whether the climb descends another line,
-- and almost every party walks out the way it came -- the car is at that trailhead. Black
-- Peak's Northeast Ridge descends the South Ridge scramble and still returns over Wing Lake
-- and out the same approach, car to car. A prose classifier over `descent` was built and
-- measured the same day; it misfired in both directions (keeping "Traverse east from the
-- ridge crest", dropping "Descend the same trail") and would have deleted 376 round-trip
-- figures, most of them correct. It was discarded.
--
-- This column exists so the minority that genuinely differ -- point-to-point traverses,
-- car shuttles, true loops -- can be recorded as fact rather than guessed from prose.
--
--   outback  the approach is retraced; round trip = 2 x dist_km
--   loop     returns to the same trailhead by a different line; 2 x dist_km is WRONG
--   point    ends at a different trailhead (car shuttle / thru-trip)
--   NULL     not established -- the app must keep its previous behaviour
--
-- NULL is the default and no row is populated here, so applying this migration changes
-- nothing a climber sees. Population is per-route and evidence-based, deliberately separate.
--
-- Note: `npm run check:sql` cannot validate this file -- it only inspects UPDATE/DELETE
-- statements carrying literal route ids, and will report "nothing to check", which is not
-- a pass. Verify by re-reading the column definition after applying.

alter table public.routes
  add column if not exists outing_shape text;

alter table public.routes
  drop constraint if exists routes_outing_shape_check;

alter table public.routes
  add constraint routes_outing_shape_check
  check (outing_shape is null or outing_shape in ('outback', 'loop', 'point'));

comment on column public.routes.outing_shape is
  'How the party returns to a road. outback = retraces the approach, so round trip = 2 x dist_km. loop = same trailhead by a different line, so doubling is wrong. point = ends at a different trailhead (car shuttle). NULL = not established; the app falls back to inferring it. See migration 0087.';
