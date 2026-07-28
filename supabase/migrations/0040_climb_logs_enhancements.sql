-- Enhance climb_logs with FA credits, developed flag, extended beta fields
alter table climb_logs
  add column if not exists fa_ascent boolean default false,
  add column if not exists developed boolean default false,
  add column if not exists beta text,                          -- move-by-move beta / guidance
  add column if not exists gear_beta text,                    -- trad-specific protection notes
  add column if not exists sun_vote text,                     -- "sunny" | "shady" | null
  add column if not exists sun_note text,
  add column if not exists outcome_reasons text[] default '{}', -- ["exhausted", "bad weather", ...] only if non-completion
  add column if not exists outcome_note text,
  add column if not exists gpx_track jsonb,                  -- parsed GeoJSON FeatureCollection
  add column if not exists itinerary jsonb;                  -- day-by-day plan
