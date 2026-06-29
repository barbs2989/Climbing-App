-- 0012: rich per-route fields from the comprehensive alpine pull (Washington and beyond).
-- These hold the deep route beta the importer was previously dropping on the floor.
-- All idempotent (add column if not exists), so it's safe to re-run.

alter table routes
  add column if not exists timing        jsonb,  -- { recommendedStart, approachTimeHrs, summitTimeHrs, descentTimeHrs, totalHrs, sectionBreakdown[] }
  add column if not exists detailed_rack text,   -- prose rack description (e.g. "2-4 pickets, 1 screw late season...")
  add column if not exists what_to_bring jsonb,  -- string[] packing list beyond the climbing rack
  add column if not exists pro_tips      jsonb,  -- string[] insider tips
  add column if not exists watch_out     jsonb,  -- string[] hazard call-outs (distinct from the obj_haz tag list)
  add column if not exists pro_needs     text,   -- prose protection summary
  add column if not exists best_season   text;   -- prose "when to go" (richer than the short season field)

-- NOTE: knownHazards (string[] of full hazard descriptions) maps onto the EXISTING
-- routes.hazards column (text[]) — that's wired in the loader, no column needed here.
