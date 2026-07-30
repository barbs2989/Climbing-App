-- WA Alpine Audit — Pass 1, Batch 23 — 2026-07-30
-- Peaks: Mount Baker (Boulder-Park Cleaver, Cockscomb Ridge, Coleman-Deming
--        Glacier, Coleman Headwall, Easton Glacier, North Ridge, Park
--        Glacier Headwall, Squak Glacier), Mount Buckindy (Glacier/Scramble
--        Route), Mount Carrie (Standard Route / Carrie Glacier)

-- =========================================================================
-- Mount Baker — North Ridge
-- =========================================================================

-- wa_mount_baker_north_ridge: alpine_grade stored "Grade III" -- an NCCS-style
-- commitment-grade string, not the French adjectival scale the column is
-- defined to hold (migrations/0006_composite_grades.sql: F/PD/AD/D/TD/ED) --
-- same recurring bug found on Dragontail Peak Triple Couloirs (batch 9) and
-- McMillan Spire West Ridge (batch 21). Multiple independent guide sources
-- (RMI Expeditions, Mooney Mountain Guides) grade the North Ridge "AD, AI2-3."
UPDATE routes SET alpine_grade = 'AD' WHERE id = 'wa_mount_baker_north_ridge';

-- =========================================================================
-- Mount Baker — Park Glacier Headwall
-- =========================================================================

-- wa_mount_baker_park_glacier_headwall: top-level gain_ft (1840) contradicted
-- this same row's own itinerary day-by-day breakdown (day 1: 1,800 ft to the
-- Portals camp; day 2: 5,000 ft camp-to-summit) which sums to 6,800 ft --
-- 1840 looks like a stray digit-transposition of day 1's 1,800 ft alone.
-- Aligned to the row's own itinerary sum, matching the convention used by
-- every sibling Mount Baker route in this batch (top-level gain/loss tracks
-- the itinerary's own day sums to within normal rounding).
UPDATE routes SET gain_ft = 6800 WHERE id = 'wa_mount_baker_park_glacier_headwall';

-- =========================================================================
-- Mount Buckindy — Glacier/Scramble Route
-- =========================================================================

-- wa_mount_buckindy_scramble: access.land_manager said "National Park Service
-- -- North Cascades National Park (Stephen Mather Wilderness)", directly
-- contradicting this same row's own access.landManager field ("Mount
-- Baker-Snoqualmie National Forest ... within the Glacier Peak Wilderness"),
-- the parent area's own blurb ("a remote, glaciated group ... in Mount
-- Baker-Snoqualmie National Forest ... within the Glacier Peak Wilderness"),
-- and this row's own approach text (Green Mountain Trailhead / FR-1570 Kindy
-- Creek Road, both Mt. Baker-Snoqualmie NF roads -- not NPS). Mount Buckindy
-- is not within North Cascades National Park. Fixed to match.
UPDATE routes
SET access = jsonb_set(
  access,
  '{land_manager}',
  '"U.S. Forest Service -- Mount Baker-Snoqualmie National Forest (Glacier Peak Wilderness)"'
)
WHERE id = 'wa_mount_buckindy_scramble';

-- wa_mount_buckindy_scramble: access.notes described the NPS North Cascades
-- lottery/walk-up permit split for "Boston Basin/Eldorado/Sulphide
-- Glacier/etc." and the Marblemount Wilderness Information Center -- none of
-- which pertain to this Glacier Peak Wilderness peak (reached via Green
-- Mountain/Kindy Creek, not the NPS Cascade River Road corridor). This row's
-- own access.permit field already correctly describes a free USFS self-issue
-- permit with no quota. Replaced the contaminated NPS boilerplate.
UPDATE routes
SET access = jsonb_set(
  access,
  '{notes}',
  '"Free self-issue wilderness permit at the trailhead; no quota, reservation, or lottery system for this Glacier Peak Wilderness objective (unlike the NPS North Cascades permit zones farther north)."'
)
WHERE id = 'wa_mount_buckindy_scramble';

-- wa_mount_buckindy_scramble: access.rules and group_limit (6) described the
-- NPS North Cascades off-trail/on-trail group-size split (6 off-trail / 12
-- on-trail) and named designated Boston Basin campsites and bear-canister
-- zones -- all specific to the NPS permit zones this route is not in.
-- Confirmed externally (wilderness.net / USFS) that Glacier Peak Wilderness's
-- actual Forest Service group-size limit is a flat 12 people (any
-- combination of people and pack animals), matching the group_limit already
-- correctly stored on every other route in this batch. Fixed both fields.
UPDATE routes
SET access = jsonb_set(
  jsonb_set(access, '{rules}', '"Group size limited to 12 people (any combination of people and pack animals) per Forest Service Glacier Peak Wilderness regulations."'),
  '{group_limit}',
  '12'
)
WHERE id = 'wa_mount_buckindy_scramble';

-- wa_mount_buckindy_scramble: access.seasonal named "Cascade River Road" as
-- this route's access road with a "check current NPS road-conditions page"
-- pointer -- Cascade River Road is the NPS access corridor for a different
-- part of North Cascades NP (Boston Basin/Eldorado/Sahale), not this route's
-- actual access road. This row's own access.closures field already correctly
-- names the real access road (Suiattle River Road/FR 26 via FR 2680 to Green
-- Mountain Trailhead). Fixed seasonal to match the row's own closures field.
UPDATE routes
SET access = jsonb_set(
  access,
  '{seasonal}',
  '"Suiattle River Road (FR 26) and the FR 2680 spur to the Green Mountain Trailhead are the actual access road for this route -- see access.closures for the current washout/closure order; check Mt. Baker Ranger District alerts before a trip."'
)
WHERE id = 'wa_mount_buckindy_scramble';

-- =========================================================================
-- Mount Carrie — Standard Route (Carrie Glacier / High Divide)
-- =========================================================================

-- wa_mount_carrie_standard: top-level gain_ft/loss_ft (4995/9800) contradicted
-- this same row's own detailed 4-day itinerary, which sums to 7,450 ft gain /
-- 7,650 ft loss (day 1: +2800/-0; day 2: +1800/-600; day 3: +2650/-2650; day
-- 4: +200/-4400) -- a roughly symmetric out-and-back, as expected for a route
-- that returns to the same Sol Duc trailhead. The stored top-level figures
-- matched neither the itinerary sum nor each other in a way consistent with
-- an out-and-back (a ~4,800 ft gain/loss gap is far outside the normal
-- rounding seen elsewhere in this batch). Aligned both to the row's own
-- itinerary-day sums.
UPDATE routes SET gain_ft = 7450, loss_ft = 7650 WHERE id = 'wa_mount_carrie_standard';
