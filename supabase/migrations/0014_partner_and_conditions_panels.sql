-- 0014: structured fields for the route-detail Details/Plan/Safety panels that have
-- no existing backend equivalent (elevation/prominence/fa/best_season already exist —
-- see areas.elevation_ft/prominence_ft and routes.fa/best_season).
-- All idempotent (add column if not exists), so it's safe to re-run.

alter table routes
  add column if not exists crowds               jsonb,  -- { estimatePerSeason, peakTraffic, solitudeRating (1-5) }
  add column if not exists partner_requirements  jsonb,  -- { experienceLevel, fitnessSpec: {hiking, packWeight}, requiredSkills[], approachTime }
  add column if not exists seasonal_guidance     jsonb,  -- { optimalWindow, monthBreakdown: {Month: {status, reason}} } -- richer than best_season prose
  add column if not exists seasonal_hazards      jsonb,  -- { avalanche: {zone, byMonth: {Month: level}}, weather: {typical, probability}, crevasses, exposure }
  add column if not exists data_quality          jsonb;  -- { confidence: HIGH|MEDIUM|LOW, lastVerified, gaps[] }
