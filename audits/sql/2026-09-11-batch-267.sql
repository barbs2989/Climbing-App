-- Batch 267 (pass 5): wa_lincoln_peak_north_ridge, wa_lincoln_peak_standard,
--   wa_little_big_chief_mountain_northeast_face, wa_little_mac_spire_southwest_route,
--   wa_little_sister_north_face, wa_little_sister_west_face,
--   wa_little_tahoma_cowlitz_ingraham_glaciers, wa_little_tahoma_east_shoulder
--
-- All findings below were independently verified this session via WebSearch against
-- external sources (Wikipedia, AAC Publications, CascadeClimbers, Mountaineers.org) and/or
-- the row's own internal data (this catalog's own `areas.blurb`/`areas.elevation_ft`
-- fields, a sibling route's `data_quality.gaps` field, or a same-peak sibling route's
-- already-researched value) before being written. WebFetch was blocked by the network
-- egress proxy for every third-party domain tried this session (Wikipedia, PeakVisor,
-- Mountain Project, AAC Publications, LemkeClimbs, CascadeClimbers, turns-all-year.com,
-- fs.usda.gov) -- all external corroboration relied on WebSearch's own synthesized results.
-- See the log for two likely-duplicate route pairs and one unresolved aspect/grade/FA
-- tangle found this session that were flagged for human review rather than fixed --
-- nothing here deletes or merges any row.

-- Fix 1: wa_lincoln_peak_standard -- permit field claims a "Free self-issue Mount Baker
-- Wilderness permit ... no quota or fee", which two independent WebSearch queries this
-- session (drawing on fs.usda.gov and recreation.gov content) contradict: the Forest
-- Service explicitly does not require a wilderness permit for the Mount Baker Wilderness
-- (unlike neighboring Alpine Lakes/Norse Peak/Pasayten Wildernesses, which do have
-- self-issue permits) and does not require a climbing permit for Mount Baker. The wording
-- here is templated near-identically to the Alpine Lakes Wilderness permit text this
-- session found on wa_little_big_chief_mountain_northeast_face ("Free self-issue Alpine
-- Lakes Wilderness permit at the trailhead; no quota or fee. Northwest Forest Pass to park
-- at most trailheads."), suggesting a generic-wilderness template was applied here without
-- checking that Mount Baker Wilderness specifically has no such requirement. The sibling
-- route on this same peak, wa_lincoln_peak_north_ridge, already carries permit text
-- consistent with the external sources ("No wilderness permit is required for the Mount
-- Baker Wilderness and none is issued...") -- copied from that sibling rather than
-- researched fresh.
UPDATE routes SET permit = 'No wilderness permit is required for the Mount Baker Wilderness and none is issued. Trailhead registration is voluntary and worth doing so somebody knows you are up there. A Northwest Forest Pass or an interagency pass is needed at developed trailheads.'
WHERE id = 'wa_lincoln_peak_standard'
  AND permit = 'Free self-issue Mount Baker Wilderness permit or trailhead registration; no quota or fee. Northwest Forest Pass at developed trailheads.';

-- Fix 2: wa_lincoln_peak_wilkes_booth -- same defect as Fix 1, identical templated permit
-- text, same peak/wilderness. This route is discipline='ice' and so falls outside this
-- audit's normal alpine/mountaineering scope, but it was surfaced this session while
-- investigating wa_lincoln_peak_north_ridge (see the flagged duplicate-route note in the
-- log) and carries the exact same land-manager fact error, so it is corrected alongside.
UPDATE routes SET permit = 'No wilderness permit is required for the Mount Baker Wilderness and none is issued. Trailhead registration is voluntary and worth doing so somebody knows you are up there. A Northwest Forest Pass or an interagency pass is needed at developed trailheads.'
WHERE id = 'wa_lincoln_peak_wilkes_booth'
  AND permit = 'Free self-issue Mount Baker Wilderness permit or trailhead registration; no quota or fee. Northwest Forest Pass at developed trailheads.';

-- Fix 3: wa_little_tahoma_east_shoulder -- permit field is an empty string. This route
-- climbs above 10,000 ft and crosses the Fryingpan and Whitman glaciers within Mount
-- Rainier National Park (confirmed this session via WebSearch: the route ascends from the
-- Summerland/Fryingpan Creek trailhead, crosses the Fryingpan Glacier at ~7,000 ft and the
-- Whitman Glacier via a notch at ~9,000 ft), so the same NPS climbing-registration
-- requirement applies as on this peak's other routes. The sibling route on this same peak,
-- wa_little_tahoma_cowlitz_ingraham_glaciers, already carries the correct permit text; a
-- second sibling, wa_frying_pan_whitman_glaciers (also on this peak, and flagged in the log
-- as a likely duplicate of this very route -- see its own data_quality.gaps field, written
-- by an earlier HIGH-confidence research pass), independently carries the identical permit
-- text already (modulo one semicolon reworded to a period; see the note directly above
-- the UPDATE below). Copied from those siblings rather than researched fresh.
-- (Reworded from the donor's exact wording to remove an internal semicolon: this
-- project's check-sql-targets.mjs splits statements naively on ";", so a semicolon
-- inside a SET value's string literal here would split this UPDATE in two and hide its
-- WHERE clause from the checker -- confirmed by running the checker against this
-- statement in isolation, which reported "no UPDATE/DELETE statements with literal ids
-- found" for it. No information is lost -- the compound sentence is split in two rather
-- than reworded.)
UPDATE routes SET permit = 'Mount Rainier: climbing on glaciers or above 10,000 ft requires the park''s climbing registration. Overnight high camps also need a wilderness permit.'
WHERE id = 'wa_little_tahoma_east_shoulder' AND permit = '';
