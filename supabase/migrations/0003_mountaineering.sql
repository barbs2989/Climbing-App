-- ClimbMatch Phase 2 — mountaineering enrichment columns.
-- Adds factual fields the mountaineering UI renders (peaks + objectives) so the
-- OpenBeta/Wikidata/USGS/OSM pull has somewhere to land. All nullable; idempotent.
-- Apply in the Supabase SQL editor.

alter table areas
  add column if not exists elevation_ft  integer,   -- summit elevation
  add column if not exists prominence_ft integer,   -- topographic prominence
  add column if not exists parent_peak   text;       -- id of the main peak this is a subpeak of

alter table routes
  add column if not exists gain_ft     integer,   -- approach/route elevation gain
  add column if not exists loss_ft     integer,   -- elevation loss (traverses/over-the-top)
  add column if not exists dist_km     numeric,   -- approach distance
  add column if not exists max_angle   integer,   -- max slope angle (degrees)
  add column if not exists rappels     integer,   -- number of rappels on descent
  add column if not exists commitment  text,      -- alpine commitment grade I-VI
  add column if not exists face        text,      -- named face/side/route-group on the peak
  add column if not exists permit      text,      -- required permit/pass
  add column if not exists comms       text,      -- factual cell/sat coverage note
  add column if not exists descent     text,      -- factual descent method/route
  add column if not exists obj_haz     jsonb,     -- objective hazards array
  add column if not exists waypoints   jsonb,     -- [{type,name,lat,lng,elev,distMi}]
  add column if not exists gpx         jsonb,     -- approach track [[lat,lng],...]
  add column if not exists elev_pts    jsonb;     -- elevation profile [ft,...]
