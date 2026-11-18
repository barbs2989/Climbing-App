-- WA alpine audit, batch 141 (pass 3), 2026-08-21
-- Scope: wa_mix_up_peak_east_face, wa_mojo_rising, wa_mount_adams_adams_glacier,
-- wa_mount_adams_lava_glacier_headwall, wa_mount_adams_lyman_glacier,
-- wa_mount_adams_mazama_glacier_headwall, wa_mount_adams_north_ridge,
-- wa_mount_adams_northwest_ridge, wa_mount_adams_south_climb,
-- wa_mount_adams_wilson_glacier_headwall
--
-- Four confirmed errors below. FA credits (Mix-up Peak East Face: Wesley Grande &
-- Jack Kendrick 1947; Adams Glacier: Fred Beckey/Dave Lind/Robert Mulhall, July
-- 1945; Mojo Rising: Mark Allen/Joel Kauffman/Tom Smith, Oct 13-14 2006; Mount
-- Adams's 1854 first ascent) were all independently cross-checked and confirmed
-- correct -- no fix needed. Elevations and coordinates for Mix-up Peak (7,440 ft),
-- South Early Winters Spire (7,807 ft) and Mount Adams (12,276 ft) also confirmed.
-- The dist_km figures on the Mount Adams glacier/headwall routes (26-37 km,
-- one-way per app convention) look implausibly long against the ~4-mile
-- Killen-Creek-to-High-Camp approach documented in these same rows' own approach
-- text, but this smells like the known dist_km one-way-vs-round-trip convention
-- split CLAUDE.md already documents for this column -- flagged for human review
-- rather than guessed at, since no authoritative source gives an exact trail
-- mileage to cross-check against.

-- wa_mount_adams_lava_glacier_headwall: `descent` says to descend "retracing the
-- ascent when possible" (boilerplate text also found verbatim on the Lyman
-- Glacier row). This route's own, more detailed `descent_text` says the opposite:
-- the standard descent is via the North Ridge walk-off used by the neighboring
-- Adams Glacier and Lyman Glacier routes, explicitly NOT a reversal of the
-- headwall -- consistent with normal alpine practice of never downclimbing a
-- serac/rockfall-exposed ice headwall you just climbed.
UPDATE routes
SET descent = 'Descend the North Ridge back to High Camp — the same scree/boulder walk-off used for the Adams Glacier and Lyman Glacier routes — rather than reversing the headwall itself. No rappelling is required on the standard line. Watch for loose rock and rockfall risk onto other parties below.'
WHERE id = 'wa_mount_adams_lava_glacier_headwall'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible. Be aware of loose rock and snow bridge hazards. Maintain group cohesion on exposed sections.';

-- wa_mount_adams_lyman_glacier: identical defect and identical boilerplate
-- `descent` text ("retracing the ascent when possible"), again contradicted by
-- this row's own `descent_text`, which explicitly states the standard descent is
-- the North Ridge/adjacent snowfield walk-off and is "not a rappel route" and not
-- a reversal of the glacier climb.
UPDATE routes
SET descent = 'Descend via the North Ridge (North Cleaver) or the adjacent snowfield back to High Camp — a walk-off/downclimb, not a reversal of the glacier ascent, and not a rappel route. Watch for loose, rotten volcanic scree and rockfall risk onto parties below.'
WHERE id = 'wa_mount_adams_lyman_glacier'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible. Be aware of loose rock and snow bridge hazards. Maintain group cohesion on exposed sections.';

-- wa_mount_adams_wilson_glacier_headwall: `season` stores 'Jul-Sep' (the short
-- window rendered in the route header strap), which directly contradicts this
-- same row's own `best_season` ('May to June') and its own `hazards` text
-- ("Rockfall increases sharply as the headwall warms -- early-season, cold
-- conditions are essential"). Jul-Sep is exactly the warm-season window the
-- row's own hazard advice warns against climbing in. Corrected to match the
-- row's own best_season/hazards, and to match the analogous early-season windows
-- already stored on the sibling Adams Glacier / Lava Glacier Headwall routes.
UPDATE routes
SET season = 'May-Jun'
WHERE id = 'wa_mount_adams_wilson_glacier_headwall'
  AND season = 'Jul-Sep';

-- wa_mount_adams_mazama_glacier_headwall: `permit` field stores only the generic
-- Gifford Pinchot NF "Mt. Adams Climbing Pass" boilerplate copied onto every
-- other Mount Adams route in this batch. This route's own `approach` field says
-- it starts from "the Bird Creek Road trailhead ... on the Yakama Reservation
-- side," and its own `watch_out` field separately flags "Requires a Yakama Nation
-- Tract-D tribal-use permit" -- but the `permit` field itself, the one a climber
-- would check for definitive access requirements, never mentions it and instead
-- names a Forest-Service pass that does not govern tribal land. Confirmed via
-- Yakama Nation / Gifford Pinchot sources: Bird Creek Meadows / Tract D is Yakama
-- Nation land requiring a separate tribal-use day permit at the Mirror Lake gate,
-- open to non-tribal-member visitors only part of the year. Exact fee and open
-- dates change year to year and are deliberately not hardcoded here -- see
-- CLAUDE.md's standing warning against writing a transient closure/fee into a
-- permanent field.
UPDATE routes
SET permit = 'This route approaches via Bird Creek Meadows on the Yakama Nation''s Tract D lands, not Gifford Pinchot National Forest — a separate Yakama Nation Tract-D tribal-use day permit (purchased at the access gate) is required and is not covered by the Forest Service''s Mt. Adams Climbing Pass. The Yakama Nation Mount Adams Recreation Area is open to non-tribal-member visitors only part of the year — confirm current access dates and fees with Yakama Nation Tribal Forestry before planning a trip. Pack out human waste.'
WHERE id = 'wa_mount_adams_mazama_glacier_headwall'
  AND permit = 'Mt. Adams Climbing Pass (Cascade Volcano Pass) required above 7,000 ft May 1-Sep 30, sold per trip on Recreation.gov; free self-issue wilderness permit at the trailhead otherwise. Pack out human waste.';
