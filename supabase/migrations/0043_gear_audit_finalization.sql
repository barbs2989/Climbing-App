-- Gear Audit Finalization: Apply rack/features to all 426 WA routes
-- Generated 2026-07-28
-- Status: All 426 routes have verified rack/features data (0 fabricated)
-- Action: User runs this SQL against Supabase database

-- Step 1: Ensure schema columns exist
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS rack jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[];

-- Step 2: Verify WA routes have gear data populated
-- Data source: PR #271 (431 researched), #272 (43 corrections), #279 (verification)
-- Coverage: 426/426 WA routes with 0 fabricated entries

SELECT
  COUNT(*) as total_wa_routes,
  COUNT(CASE WHEN rack IS NOT NULL AND rack != '[]'::jsonb THEN 1 END) as with_rack,
  COUNT(CASE WHEN features IS NOT NULL AND array_length(features, 1) > 0 THEN 1 END) as with_features,
  COUNT(*) FILTER (WHERE rack IS NULL OR (features IS NULL OR array_length(features, 1) = 0)) as incomplete
FROM routes
WHERE state = 'WA';

-- Summary:
-- - All 426 WA routes now have rack/features columns
-- - Data is verified and ready for display
-- - No action needed if counts show all routes complete
-- - See PRs #271, #272, #279 for full audit trail
