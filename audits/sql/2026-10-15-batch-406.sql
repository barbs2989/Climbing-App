-- Batch 406 (Pass 7) -- Mount Goode (3 routes), Mount Stuart's Gorillas Direct,
-- Gray Wolf Ridge SE Slopes, Gunnshy Peak Standard Route.
-- Run `npm run check:sql -- fix.sql` against this file before applying, per
-- docs/codebase/hand-written-sql.md.

-- 1. Mount Goode / Southwest Couloir: the FA party's `fa` text misspells one climber's
-- surname as "Dickert". Wikipedia's Goode Mountain article (and its mirrors) consistently
-- give "Philip Dickett" for this July 5, 1936 first-ascent party. Everything else in the
-- FA line (Wolf Bauer, Joe Halwax, Jack Hossack, George MacGowan, the date) is correct.
UPDATE routes
SET fa = replace(fa, 'Dickert', 'Dickett')
WHERE id = 'wa_goode_mountain_southwest_couloir'
  AND fa LIKE '%Dickert%';

-- 2. Mount Goode's area-level blurb repeats the same FA party and the same misspelling.
UPDATE areas
SET blurb = replace(blurb, 'Dickert', 'Dickett')
WHERE id = 'wa_mount_goode'
  AND blurb LIKE '%Dickert%';

-- 3. Incidental: the same real climber's surname is independently misspelled "Dickert" on
-- a different peak's FA row, found via the same name search rather than a full audit of
-- this route this pass (Mount Challenger was not otherwise checked in batch 406).
UPDATE routes
SET fa = replace(fa, 'Dickert', 'Dickett')
WHERE id = 'wa_mount_challenger_challenger_glacier'
  AND fa LIKE '%Dickert%';

-- 4. Gunnshy Peak Standard Route: the route's own `access` JSON has a `notes` field
-- claiming "Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit
-- outside designated wilderness -- administratively unrestricted despite serious
-- technical terrain." This directly contradicts the SAME row's `permit` field (and
-- SummitPost + Wikipedia's Wild Sky Wilderness article, which name Gunn Peak -- 0.7 mi
-- from Gunnshy on the same massif -- as the wilderness's own highest point). Removing
-- the confirmed-false claim rather than inventing replacement prose; a human should
-- write a corrected `notes` value if one is wanted.
UPDATE routes
SET access = access - 'notes'
WHERE id = 'wa_gunnshy_peak_standard_route';
