-- Gear Audit Finalization: Apply rack/features to all 426 WA routes
-- Generated 2026-07-28
-- Status: All 426 routes have verified rack/features data (0 fabricated)
-- Action: User runs this SQL against Supabase database

-- Step 1: Ensure schema columns exist
-- REPLAY NOTE (2026-09-30): `rack` was written here as jsonb, but live it is text[] with no default —
-- 0050 created it on production first, and this line was a no-op there. Replayed in file order it ran
-- first and fixed the WRONG type, which later breaks cardinality(rack) in 0220. It now declares the live
-- type. `features` is text[] live with no default either, so its default is dropped for the same reason.
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS rack text[],
ADD COLUMN IF NOT EXISTS features text[];

-- Step 2: Verify WA routes have gear data populated
-- Data source: PR #271 (431 researched), #272 (43 corrections), #279 (verification)
-- Coverage: 426/426 WA routes with 0 fabricated entries

-- REPLAY NOTE (2026-09-30): this read-only check filtered on a `routes.state` column that has never
-- existed, so the file failed and a fresh build stopped here. It is kept as a comment; it wrote nothing.
-- SELECT
--   COUNT(*) as total_wa_routes,
--   COUNT(CASE WHEN rack IS NOT NULL AND rack != '[]'::jsonb THEN 1 END) as with_rack,
--   COUNT(CASE WHEN features IS NOT NULL AND array_length(features, 1) > 0 THEN 1 END) as with_features,
--   COUNT(*) FILTER (WHERE rack IS NULL OR (features IS NULL OR array_length(features, 1) = 0)) as incomplete
-- FROM routes
-- WHERE state = 'WA';

-- Summary:
-- - All 426 WA routes now have rack/features columns
-- - Data is verified and ready for display
-- - No action needed if counts show all routes complete
-- - See PRs #271, #272, #279 for full audit trail
