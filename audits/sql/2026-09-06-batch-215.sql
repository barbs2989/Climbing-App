-- Batch 215 (pass 4): Mount Redoubt (South Face/Redoubt Glacier), Mount Seattle
-- (Noyes Basin, Seattle Creek Basin), Mount Sefrit (Bloody Head Couloir, Southeast
-- Ridge, Southwest Ridge), Mount Shuksan (Fisher Chimneys, Hanging Glacier).
--
-- Verified against: this project's own `areas` table (authoritative per-catalog peak
-- coordinate/elevation, queried directly), WebSearch corroboration (Wikipedia, WTA,
-- PeakVisor for Mount Sefrit's 7,191 ft elevation and 1930 FA; Wikipedia/cascadeclimbers
-- for the Hanging Glacier's 1939 first technical ascent being a spring ice line), and
-- each row's own other fields (re-homing on-file approach text into a truncated field,
-- never inventing new facts).
--
-- Two routes initially suspected of errors were checked in full and found CLEAN, so no
-- fix was written for them: wa_mount_seattle_noyes_basin and wa_mount_seattle_seattle_creek
-- both carry a large shared Olympic-interior `bivy` list (Graves Creek, Elwha camps,
-- Low Divide, Anderson Pass, etc.) that at first glance looks like camp-list
-- contamination from an unrelated Anderson's Thumb/Elwha route -- but the list's own
-- "Low Divide" entry explicitly names both of these routes ("Mount Seattle has three
-- established scramble lines from here, by Noyes Basin, by Seattle Creek Basin and by
-- the south slopes"), and the Low Divide/North Fork Quinault approach distance (16 mi)
-- matches this project's own `approach_logistics.trailheadDirection` and an external
-- WTA/ProTrails source (16.1 mi trailhead-to-Low-Divide) exactly. The list is a
-- legitimate shared Olympic-interior corridor camp list (the peak is reachable from
-- either the Quinault or Elwha side), not a foreign contamination -- so it was left
-- alone rather than cleared. wa_mount_shuksan_fisher_chimneys' first-ascent field
-- ("year not confirmed by available sources") was also checked and left as-is: WebSearch
-- only turned up the 1906 Curtis/Price first ascent of Shuksan overall via a different,
-- easier route, not the Fisher Chimneys line specifically, so the row's own disclosed
-- uncertainty is the honest state and was not touched.
--
-- NOTE: string/jsonb literals below deliberately avoid embedded semicolons -- the
-- checker (scripts/check-sql-targets.mjs) splits statements on bare ";".

-- wa_mount_sefrit_bloody_head_couloir: high_point_ft is stored NULL. Mount Sefrit's
-- summit elevation is 7,191 ft per this project's own `areas` row (wa_mount_sefrit,
-- elevation_ft=7191) and is externally corroborated (Wikipedia, WTA, PeakVisor all
-- give 7,191 ft). This route's own siblings on the same peak already carry the correct
-- value (wa_mount_sefrit_southeast_ridge and wa_mount_sefrit_southwest_ridge both store
-- high_point_ft=7191) -- this route was simply missed. Filled in to match.
UPDATE routes
SET high_point_ft = 7191
WHERE id = 'wa_mount_sefrit_bloody_head_couloir'
  AND high_point_ft IS NULL;

-- wa_mount_sefrit_southwest_ridge: approach_logistics.trailheadDirection is truncated
-- mid-sentence ("From Glacier, drive Mt."), cut off with no punctuation. This row's own
-- `approach` column already contains the complete text this field was clearly meant to
-- summarize (Nooksack Cirque Trailhead at the end of FR-34, ~2,140 ft, off Hannegan
-- Pass Road/FR-32 from SR-542; ford Ruth Creek; old roadbed/Trail #750 then an
-- ascending traverse onto the west/southwest ridge). Re-homed from that field rather
-- than researched, matching the concise style used by this route's own siblings'
-- trailheadDirection values.
UPDATE routes
SET approach_logistics = jsonb_set(
      approach_logistics,
      '{trailheadDirection}',
      '"From the Nooksack Cirque Trailhead at the end of FR-34 (~2,140 ft), reached via Hannegan Pass Road (FR-32) from the Mt. Baker Highway (SR-542) -- ford Ruth Creek at the trailhead and follow the old roadbed/Trail #750 before leaving it for an ascending traverse onto Sefrit''s west/southwest ridge."'::jsonb
    )
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND approach_logistics->>'trailheadDirection' = 'From Glacier, drive Mt.';

-- wa_mount_shuksan_hanging_glacier: top-level `season` stores "Jul-Aug", directly
-- contradicting this same row's own `best_season` ("May to June") and
-- `seasonal_guidance` (optimalWindow "May to June", monthBreakdown covering only May
-- and June -- no July/August entries at all). This is a steep-ice/serac route where the
-- hazard notes (obj_haz: "active icefall/serac release") and turnaround guidance
-- ("Be through the serac-threatened ground early") both argue for a cold, stable spring
-- ascent rather than a July-August one, consistent with the row's own best_season/
-- seasonal_guidance and with WebSearch background on Cascade serac/glacier ice routes
-- generally being climbed in spring before melt-out opens crevasses. "Jul-Aug" reads as
-- an unedited generic-template default that was never reconciled with the rest of this
-- row's seasonal data. Corrected to match the row's own best_season.
UPDATE routes
SET season = 'May-Jun'
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND season = 'Jul-Aug';
