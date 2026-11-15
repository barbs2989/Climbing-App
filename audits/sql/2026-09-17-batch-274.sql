-- WA alpine audit batch 274 (pass 5)
-- Routes checked: wa_mount_cruiser_south_corner, wa_mount_custer_standard,
-- wa_mount_daniel_daniel_glacier, wa_mount_daniel_lynch_glacier,
-- wa_mount_deception_standard, wa_mount_degenhardt_southwest_route,
-- wa_mount_despair_east_route, wa_mount_fairchild_standard

-- wa_mount_cruiser_south_corner: dist_km=12.4 (7.7mi) matches this route's own
-- approach text as the one-way distance to Flapjack Lakes CAMP only (3.8mi old
-- roadbed + 4.1mi Flapjack Lakes Trail), not the summit (which continues another
-- 1.5mi to Needle Pass plus ridge scrambling to the South Corner start). This is
-- the pass-4 (batch 208, 2026-09-05) finding for this exact route, re-verified
-- fresh this session via WebSearch: summitpost.org gives "18 miles round-trip,
-- 5500 ft gain" for the Flapjack Lakes/Needle Pass approach, and a Jim Brisbine/
-- trailcatjim trip report for this exact route ("Mt Cruiser via Flapjack Lakes—
-- Needle Pass—South Corner") independently gives "approximately 18.0 miles
-- traveled." The batch-208 fix was proposed but never applied to the live DB
-- (confirmed by direct query immediately before writing this: dist_km is still
-- 12.4). Its sibling wa_mount_cruiser_nw_face_corner, which explicitly shares
-- "Same approach as the South Corner," already got this identical fix in batch
-- 273 (2026-09-16) after the same discovery — that batch deferred fixing this
-- row because it fell outside its own route list. Corrected to 14.48 (9.0mi
-- one-way, so the app's dist_km*2 display reproduces the confirmed 18-mile
-- round trip instead of understating it at ~15.4mi).
UPDATE routes SET dist_km = 14.48
WHERE id = 'wa_mount_cruiser_south_corner' AND dist_km = 12.4;

-- wa_mount_custer_standard: dist_km=31.4 (19.5mi) matches nothing in the
-- approach text and is roughly double an authoritative figure. This is the
-- pass-4 (batch 208) finding, re-verified fresh this session: summitpost.org's
-- Mount Custer page states, for the direct South Side route this row describes,
-- "Time from car to summit by direct route = 6-7 hours; Distance = 8-9 miles
-- depending on where you park; Gain = ~6,100 ft" — matching this row's own
-- gain_ft (6480) closely and its own summit waypoint, which independently
-- records distMi=8.2 (13.2km), not consulted when dist_km was first populated.
-- The batch-208 fix was proposed but never applied to the live DB (confirmed by
-- direct query immediately before writing this: dist_km is still 31.4).
-- Corrected to 13.2.
UPDATE routes SET dist_km = 13.2
WHERE id = 'wa_mount_custer_standard' AND dist_km = 31.4;

-- wa_mount_custer_standard: the `road` field is internally inconsistent with
-- the rest of this same row. It reads name "Remote approach (Silver Lake /
-- border ridge)" and driveNote "No direct road access; long approach from
-- trailheads or the border area" -- "Silver Lake" appears nowhere else on this
-- row or anywhere near Mount Custer, and confirmed by querying the live DB that
-- no other route in the catalog carries that road name either (so this is not a
-- copy-paste-from-a-sibling contamination, just generic placeholder text that
-- was never reconciled with this route's own, much more specific approach
-- data). This row's own trailhead waypoint (already present, unchanged) gives a
-- precise coordinate and driving directions: "Drive Chilliwack Lake Road in BC
-- and park at the large turnout about 0.1 mi before the yellow steel bridge
-- over Depot Creek ... Depot Creek Road leaves here as an unsigned dirt spur.
-- High-clearance vehicles can continue up it ... to a major washout." So there
-- IS a real, specific, driveable road to a trailhead -- the existing field's
-- "No direct road access" claim is simply wrong, contradicted by data already
-- on the same row. Independently corroborated via WebSearch this session as
-- the standard approach for this whole peak cluster (Mountaineers.org "The
-- Chilliwacks Peaks"; onehikeaweek.com and Gaia GPS both describe reaching
-- Ouzel Lake via the Depot Creek trail off Chilliwack Lake Road, BC). Rewrote
-- `road` from this row's own waypoint text -- no new coordinate or fact
-- introduced -- keeping the existing, uncontradicted seasonalGate note.
UPDATE routes SET road = jsonb_build_object(
    'name', 'Chilliwack Lake Road (BC) / Depot Creek Road spur',
    'status', 'Drivable in Canada to the Depot Creek Road turnout, where the spur beyond is a rough 4WD track ending at a washout a short way in, then foot travel on the old logging-road grade and, past the border, cross-country to Ouzel Lake.',
    'driveNote', 'From Chilliwack Lake Road (BC), park at the large turnout about 0.1 mi before the yellow steel bridge over Depot Creek (~2,040 ft). Depot Creek Road leaves here as an unsigned dirt spur, driveable by high-clearance vehicles to a major washout ~1.7 mi in.',
    'seasonalGate', 'Seasonal snow blocks the approach into early summer.'
  )
WHERE id = 'wa_mount_custer_standard'
  AND road->>'name' = 'Remote approach (Silver Lake / border ridge)';

-- wa_mount_despair_east_route: dist_km=38.62 (24.0mi) does not fit as a
-- one-way figure -- this route's own approach text already says trip reports
-- log "roughly 24 miles and 12,000+ ft of cumulative gain and loss," i.e. the
-- writer understood 38.62km to BE the round trip, not the one-way figure the
-- app's display doubles. This is the pass-4 (batch 208) finding, re-verified
-- fresh this session via WebSearch: a Jim Brisbine/trailcatjim trip report for
-- this exact route (Thornton Pass/Triumph Pass/Despair Lakes/Southeast Face)
-- independently states "approximately 24 miles traveled with 12,000 feet of
-- elevation gained and lost" -- matching both the round-trip mileage and this
-- row's own (unchanged, correct) gain_ft/loss_ft of 12000/12000 exactly. The
-- batch-208 fix was proposed but never applied to the live DB (confirmed by
-- direct query immediately before writing this: dist_km is still 38.62).
-- Halved to 19.31 (one-way) so the app's dist_km*2 display reproduces the
-- confirmed 24-mile round trip instead of overstating it at 48.
UPDATE routes SET dist_km = 19.31
WHERE id = 'wa_mount_despair_east_route' AND dist_km = 38.62;
