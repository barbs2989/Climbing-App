-- The routes table has 94 columns and not one is a date. That is the root of the
-- expiring-closures class rather than a detail of it.
--
-- audit:expiring-closures reports ~118 values on ~90 WA routes that state something with a shelf
-- life -- "closed indefinitely", "as of mid-2026", "no reopening estimate". Its standing instruction
-- is "date it or drop the claim", and until now that instruction was UNFOLLOWABLE: every road
-- status, seasonal gate and closure note in the catalog is prose with no recorded date, so the app
-- cannot show a reader how old a claim is and nothing can rank the backlog by staleness.
--
-- probe-can-a-road-claim-be-dated.mjs is the measurement. Note the asymmetry it found: a
-- contributions row CAN be dated (created_at, since 0002), so a CLIMBER's correction is datable
-- while the enrichment pass that wrote the original is not. That runs the wrong way round.
--
-- WHAT THIS COLUMN MEANS, AND WHAT IT DELIBERATELY DOES NOT.
--   it means: somebody read this route's road/access claims against a primary source on this date.
--   it does NOT mean: the row was last written on this date.
-- Those are different facts and conflating them would make the column worthless -- a write
-- timestamp wearing a freshness label. So it is NOT defaulted, NOT touched by a trigger, and NOT
-- set automatically by patchRow(): a mechanical stamp on every write would date a typo fix as a
-- verification. It is set explicitly, by a script that did the checking.
--
-- "checked" rather than "verified" on purpose. Verified overclaims -- a Forest Service alert read
-- on a Tuesday can be superseded on the Wednesday, and the column records the reading, not a
-- guarantee about the world.
--
-- NULL IS THE HONEST BACKFILL AND IT IS THE WHOLE POINT. We do not know when the existing prose was
-- written, so stamping now() would assert that every stale claim in the catalog was checked today --
-- fabricating 205,492 verifications in one statement, which is the exact class of defect this
-- column exists to expose. Existing rows stay NULL and read as "age not recorded".

alter table public.routes
  add column if not exists access_checked_at timestamptz;

comment on column public.routes.access_checked_at is
  'When somebody last read this route''s road/access claims against a primary source. NOT a write timestamp: set explicitly by a script that did the checking, never by a trigger or a default. NULL means the age of those claims is unrecorded, which is the honest state for prose written before this column existed.';

-- Ranking the backlog by staleness is the point, and "never checked" must sort with the worst.
-- Partial index: only the rows carrying road/access prose can ever be asked this question, and that
-- is ~1,000 of 205,492 -- a full index would be maintained on every route write to serve nothing.
create index if not exists routes_access_checked_at_idx
  on public.routes (access_checked_at)
  where road is not null or access is not null;
