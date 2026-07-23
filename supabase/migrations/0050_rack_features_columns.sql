-- Adds the two structured/tag columns `dbRouteToCamel` has always read (rack,
-- features -> camelCase rack/features) but that never had a backing column,
-- so they were always empty for every DB-backed route. Populated in a follow-up
-- data-only script (apply_rack_features.mjs) against the 431-route curated WA
-- gear-audit set once this migration is applied -- see that script for the
-- research/sourcing methodology.

alter table routes
  add column if not exists rack     text[], -- structured gear-rack summary (e.g. "Cams #0.3-#3, doubles finger-to-hand"); [] means "confirmed no rack needed" (bolted/unroped), not "unknown"
  add column if not exists features text[]; -- rock/terrain character tags, values drawn from the fixed ADDR_STYLE vocabulary in ClimbMatch.jsx
