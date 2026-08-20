-- You could vouch for yourself, and log a belay catch where you caught yourself.
--
-- Both tables record a relationship between TWO people, and neither said the two had to be
-- different. RLS binds only the acting side — `vouches` checks `auth.uid() = from_id`,
-- `belay_catches` checks `auth.uid() = belayer_id or auth.uid() = climber_id` — so the other
-- side was free, including free to be you.
--
-- MEASURED before this migration (scripts/oneoff/probe-self-counterparty.mjs), all 201, all rows
-- landed:
--
--   A vouches for A                        201   from_id = to_id
--   A logs a belay catch of A, by A        201   belayer_id = climber_id
--
-- Neither is a labelling nit. `useClimberVouches` selects every row with `to_id = <climber>` and
-- its own comment calls them "trust signals from others" — a self-vouch sits in that list and is
-- counted as one. UNIQUE (from_id, to_id) caps it at exactly one, which is why this is small
-- rather than unbounded. A self-belay has no such cap, and is also just false: you cannot belay
-- yourself.
--
-- WHAT THIS DELIBERATELY DOES NOT DECIDE. The same probe showed a third thing: A can log a catch
-- with belayer_id = A and climber_id = <any stranger>, crediting itself with catches for someone
-- it has never climbed with, unbounded. That is NOT fixed here, because the fix is a product
-- decision rather than a constraint — requiring the other party to confirm changes what the
-- ledger means, and the UI already speaks of "partners confirmed", which suggests an intended
-- model. Pinning it to `auth.uid() = belayer_id` only, or requiring mutual consent, are different
-- products. Left for that decision; recorded so it is not mistaken for something nobody noticed.
--
-- Both tables are EMPTY on the live project (measured: 0 rows each, 0 self-rows), so these
-- constraints validate against nothing and cannot fail on existing data. That will not stay true
-- once the app is used, so they are added now rather than later.

alter table vouches
  add constraint vouches_not_self check (from_id <> to_id);

alter table belay_catches
  add constraint belay_catches_not_self check (belayer_id <> climber_id);

comment on constraint vouches_not_self on vouches is
  'A vouch is a trust signal FROM SOMEONE ELSE (0167). useClimberVouches counts every row with '
  'to_id = the climber, so a self-vouch would be counted as one.';

comment on constraint belay_catches_not_self on belay_catches is
  'You cannot belay yourself (0167). Separate from the open question of whether the other party '
  'must confirm a catch — see the migration header.';
