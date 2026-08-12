-- Make "which routes are on a named list?" a question the app can actually ask.
--
-- The Challenges screen builds each list from the routes the CLIMBER HAS ALREADY LOGGED, so
-- the Fifty Classics card could only ever show you your own ticks — never the fifty as
-- objectives — and the card is hidden entirely until you have done one. Fixing that means
-- querying the tagged routes directly, and that query currently dies:
--
--   GET /routes?select=…&lists=not.is.null   ->  500  57014 statement timeout  (anon, 4.0s)
--
-- 205,492 rows, unindexed `lists text[]`, against the anon role's 3s statement_timeout. It
-- succeeds on the service key, which has a longer one — so this is exactly the class of bug
-- that looks fine from a script and fails for every real user. audit:distances and
-- audit-waypoints both record the same trap on other columns.
--
-- Only 64 routes carry any list value today, so the answer is tiny; it is finding them that
-- is expensive.
--
-- TWO INDEXES, because the two shapes need different ones:
--
--   * A PARTIAL index for `lists is not null`. A GIN index cannot serve IS NOT NULL — that is
--     a nullability test, not a containment one — so the gin index below would not have helped
--     the query that actually broke. The partial index covers 64 rows and nothing else.
--
--   * A GIN index for containment and overlap (`lists @> '{fifty_classics}'`,
--     `lists && '{…}'`), which is what routeTags and the audits use. Measured before writing:
--     `lists=cs.{fifty_classics}` takes 1164ms on anon today — under the timeout, but only
--     just, and it degrades as the catalog grows.
--
-- Both are `if not exists`, so re-running is safe.

begin;

create index if not exists routes_has_lists_idx
  on routes (id)
  where lists is not null;

create index if not exists routes_lists_gin_idx
  on routes using gin (lists);

commit;
