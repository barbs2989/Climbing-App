-- WA alpine route audit, pass 4, batch 208 (2026-09-05)
-- Scope: wa_mount_cruiser_nw_face_corner .. wa_mount_despair_east_route

-- wa_mount_cruiser_nw_face_corner: road.status/access.closures describe FR-24
-- (Lake Cushman Rd/North Fork Skokomish Rd) and the Staircase entrance as
-- CLOSED under a Bear Gulch Fire closure order, with access.closures citing a
-- USFS order "through at least Oct 1, 2026". This is stale: Olympic National
-- Forest and Olympic National Park jointly announced FS-24, the Lake Cushman
-- recreation sites, and the Staircase developed area reopened to vehicles on
-- July 8, 2026 (confirmed via WebSearch -- Forest Service newsroom release,
-- King5, Yahoo/AP, Chronline coverage of the reopening), well before today's
-- audit date. This route's own sibling on the same peak sharing the identical
-- approach, wa_mount_cruiser_south_corner, already carries the corrected,
-- current text ("Open -- FS-24 reopened 8 July 2026 ... The road is open, but
-- the North Fork Skokomish trail out of Staircase remains CLOSED with no
-- stated reopening date"), which matches the Forest Service's own caveat that
-- wilderness trails beyond the Staircase developed area remain closed for
-- backcountry-infrastructure repair. Bringing this route's road/access.closures
-- into agreement with its already-corrected, currently-accurate sibling rather
-- than re-researching from scratch.
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

-- wa_mount_cruiser_south_corner and wa_mount_cruiser_nw_face_corner: both
-- store dist_km = 12.4 km (7.7 mi), which matches this route's own approach
-- text almost exactly as the ONE-WAY distance to Flapjack Lakes camp (3.8 mi
-- old roadbed + 4.1 mi Flapjack Lakes Trail = 7.9 mi), not to the summit --
-- the approach continues well past the lakes (1.5 mi more to Gladys
-- Divide/Needle Pass, then ridge scrambling to the summit). Two independent
-- authoritative sources confirm the true round trip: SummitPost states "18
-- miles round-trip with 5500 feet of accumulative gain," and a Jim Brisbine
-- trip report (trailcatjim.com) for this exact route logs "approximately 18.0
-- miles traveled; 5700 feet gained & lost." The app doubles dist_km for
-- round-trip display, so the one-way figure should be 9.0 mi = 14.48 km.
-- Applying the same corrected one-way distance to both routes, since
-- wa_mount_cruiser_nw_face_corner's own approach text says it follows "Same
-- approach as the South Corner" before continuing slightly further along the
-- ridge crest.
UPDATE routes SET dist_km = 14.48
WHERE id = 'wa_mount_cruiser_south_corner' AND dist_km = 12.4;

UPDATE routes SET dist_km = 14.48
WHERE id = 'wa_mount_cruiser_nw_face_corner' AND dist_km = 12.4;

-- wa_mount_custer_standard: dist_km stored as 31.4 km (19.5 mi), which does
-- not correspond to any distance in this route's own approach text and is
-- roughly double what an authoritative source gives for reaching this exact
-- summit. SummitPost's Mount Custer page states "Time from car to summit by
-- direct route = 6-7 hours; Distance = 8-9 miles ... Gain = ~6,100 ft" (a
-- related, slightly more direct line to the same summit than this route's
-- Lake Ouzel/Redoubt Glacier line, so a marginally longer one-way distance is
-- expected for this route). Directly corroborating this, the route's OWN
-- summit waypoint independently records distMi=8.2 (=13.2 km), which was not
-- being used to derive dist_km. Corrected to match the route's own summit
-- waypoint, which is also consistent with the external "8-9 miles" figure.
UPDATE routes SET dist_km = 13.2
WHERE id = 'wa_mount_custer_standard' AND dist_km = 31.4;

-- wa_mount_deception_standard: dist_km stored as 32.2 km (20.0 mi). This
-- route's own approach text gives ~7-8 mi one-way to Upper Royal Basin camp,
-- with more distance beyond that to the summit -- so 20.0 mi cannot be the
-- one-way distance (it would double to a 40-mile round trip). Multiple
-- independent sources instead confirm this figure as the ROUND TRIP: a
-- Mountaineers/WTA-sourced summary states "a 20+ mile round-trip," and two
-- other sources report "19 miles round trip with 6,000 feet of elevation
-- gain" and "22 miles traveled with 6,900 feet gained and lost" for this
-- route via Royal Basin. All three cluster tightly around the stored 32.2 km
-- (20.0 mi) value, indicating it was populated as the round-trip figure
-- rather than the one-way figure the app expects (it doubles dist_km for
-- display). Halved to the one-way distance so the app's own round-trip
-- calculation reproduces the externally-confirmed ~20-mile round trip.
UPDATE routes SET dist_km = 16.1
WHERE id = 'wa_mount_deception_standard' AND dist_km = 32.2;

-- wa_mount_despair_east_route: dist_km stored as 38.62 km (24.0 mi). The
-- route's own approach text states in as many words: "trip reports covering
-- the full round trip (trailhead to summit and back) log roughly 24 miles and
-- 12,000+ ft of cumulative gain and loss, consistent with this route's ~38.6
-- km on-file distance" -- i.e. the enrichment pass that wrote this prose
-- already understood 38.6 km to represent the ROUND TRIP, not the one-way
-- distance the app's display logic (dist_km * 2) expects. Independently
-- confirmed externally: a Jim Brisbine trip report for this exact route
-- (Thornton Creek/Ridge/Pass, Triumph Pass, Lake Regret, Upper Despair Lake)
-- states "approximately 24 miles traveled and 12,000 feet of elevation gained
-- and lost" -- matching both the stored gain_ft/loss_ft (12000/12000, left
-- unchanged, already correct) and the round-trip mileage exactly. Halved to
-- the one-way distance so the app's doubling reproduces the confirmed 24-mile
-- round trip instead of overstating it at 48 miles.
UPDATE routes SET dist_km = 19.31
WHERE id = 'wa_mount_despair_east_route' AND dist_km = 38.62;
