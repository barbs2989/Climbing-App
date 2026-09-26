-- WA alpine audit batch 273 (pass 5)
-- Routes checked: wa_mount_constance_finger_traverse, wa_mount_constance_north_chimney,
-- wa_mount_constance_north_chute, wa_mount_constance_terrible_traverse,
-- wa_mount_constance_west_arete, wa_mount_crowder_northeast_ridge,
-- wa_mount_crowder_southwest_route, wa_mount_cruiser_nw_face_corner

-- wa_mount_cruiser_nw_face_corner: road.status/access.closures still describe the
-- 2025 Bear Gulch Fire closure of FR-24/Staircase as currently in effect. Re-verified
-- via WebSearch this session (Olympic National Forest newsroom release "Olympic
-- National Forest & Park to Reopen FS-24, Lake Cushman Recreation Sites, and
-- Staircase Area"; corroborated by King5, Yahoo/AP, and Chronline coverage -- the same
-- sources this fix was first proposed against in pass 4, batch 208, 2026-09-05):
-- FS-24, the Lake Cushman recreation sites, and the Staircase developed area reopened
-- to vehicles July 8, 2026 and remain open as of this audit's date (2026-09-16). A
-- first, broader search for "Staircase status September 2026" surfaced only an
-- OUTDATED nps.gov closure-order page describing the pre-reopening state (still
-- citing "through at least Oct 1, 2026"); that was cross-checked against the primary
-- USFS reopening release, which post-dates it, before trusting either. Forest Service
-- Road 2451, Copper Creek Trail, and wilderness trails beyond the Staircase developed
-- area -- which includes the North Fork Skokomish/Flapjack Lakes Trail this route's
-- approach uses -- remain closed while crews repair backcountry infrastructure, with
-- no stated reopening date. This route's sibling on the identical approach,
-- wa_mount_cruiser_south_corner, already carries this corrected text live (confirmed
-- by direct query before writing this); the batch-208 fix for this row specifically
-- was proposed but never applied to the live DB (also confirmed by direct query: this
-- row's road.status/access.closures are unchanged since 2026-09-05). Bringing this
-- row into agreement with its already-corrected sibling.
UPDATE routes SET road = '{"name": "Lake Cushman Rd / North Fork Skokomish Rd (becomes Forest Road 24)", "status": "Open — FS-24 reopened 8 July 2026 after the 2025 Bear Gulch Fire closure. Verify before driving out.", "driveNote": "When open: from US-101 in Hoodsport, follow Lake Cushman Rd/N. Fork Skokomish Rd about 15–16 miles to the Staircase Ranger Station (~850 ft) at the NW end of Lake Cushman."}'::jsonb
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND road->>'status' LIKE 'Closed as of 2026 due to the Bear Gulch Fire closure order%';

UPDATE routes SET access = jsonb_set(
    access,
    '{closures}',
    '"The road is open, but the North Fork Skokomish trail out of Staircase remains CLOSED with no stated reopening date after the 2025 Bear Gulch Fire — check current trail status before committing to this approach."'
  )
WHERE id = 'wa_mount_cruiser_nw_face_corner'
  AND access->>'closures' LIKE 'IMPORTANT (current as of mid-2026): the entire standard approach%';

-- wa_mount_cruiser_nw_face_corner: dist_km=12.4 (7.7mi) matches this route's own
-- approach text as the one-way distance to Flapjack Lakes CAMP only, not the summit
-- (the approach continues further via Needle Pass and ridge scrambling past the South
-- Corner start). Two independent sources -- SummitPost ("18 miles round-trip, 5500 ft
-- gain") and a Jim Brisbine/trailcatjim trip report for this exact shared approach
-- ("approximately 18.0 miles traveled; 5700 feet gained & lost") -- confirm an
-- 18-mile round trip for this Staircase/Flapjack Lakes/Needle Pass corridor. This is
-- the same pass-4 (batch 208) finding, made on the strength of this route's own text
-- explicitly stating "Same approach as the South Corner"; that fix was proposed but
-- never applied to the live DB (confirmed by direct query: both this route and its
-- sibling wa_mount_cruiser_south_corner still show dist_km=12.4 today). Corrected to
-- 14.48 (9.0mi one-way, so the app's dist_km*2 display reproduces the confirmed
-- 18-mile round trip instead of understating it at ~15.4mi). Not re-touching
-- wa_mount_cruiser_south_corner here since it falls outside this batch's route list
-- and will be reached in the next batch.
UPDATE routes SET dist_km = 14.48
WHERE id = 'wa_mount_cruiser_nw_face_corner' AND dist_km = 12.4;
