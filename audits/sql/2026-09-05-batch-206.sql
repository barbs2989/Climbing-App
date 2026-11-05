-- WA alpine route audit, pass 4, batch 206 (2026-09-05)
-- Scope: wa_mount_baker_easton_glacier .. wa_mount_challenger_challenger_glacier

-- wa_mount_baker_easton_glacier: dist_km stored as 6.4 km (=3.98 mi). This is
-- physically impossible as a trailhead-to-summit distance -- it is shorter than
-- the straight-line chord between the route's own trailhead (48.70681,-121.81225)
-- and summit (48.777,-121.813) waypoints (7.82 km). It is in fact almost exactly
-- this route's own trailhead-to-CAMP distance: the row's own `approach` text states
-- "High camp options are at established sites around 5,600 ft (roughly 3.75 miles
-- from the trailhead) or at Sandy Camp... near 5,900-6,000 ft", and the route's own
-- Sandy Camp waypoint independently records distMi=4 -- both match 6.4 km almost
-- exactly. dist_km is meant to be the one-way distance to the route's endpoint (the
-- app doubles it for round-trip display), not to camp. The route's own summit
-- waypoint records distMi=8.8 (=14.16 km), corroborated externally (multiple
-- independent route descriptions cite "around 8 miles" / "16 miles round trip" to
-- the summit via this route). Corrected to the summit distance.
UPDATE routes SET dist_km = 14.16
WHERE id = 'wa_mount_baker_easton_glacier' AND dist_km = 6.4;

-- wa_mount_baker_easton_glacier: the grade field already states "Grade II glacier
-- climb" but the separate commitment column stored "I". Guide-service descriptions
-- of this route consistently describe a full-day glacier push from high camp
-- (~5,000 ft of climbing from Sandy Camp to the summit and back), which is squarely
-- NCCS Grade II (half a day to a full day), not Grade I (a few hours). Fixing
-- commitment to agree with the row's own stated grade.
UPDATE routes SET commitment = 'II'
WHERE id = 'wa_mount_baker_easton_glacier' AND commitment = 'I';

-- wa_mount_baker_squak_glacier: dist_km stored as 5.5 km (=3.42 mi), which is
-- almost exactly this route's own trailhead-to-CAMP distance -- the row's own
-- `approach` text states "Crag View camp (~6,500 ft, about 3.5 mi from the
-- trailhead)", and the row's own Crag View Camp waypoint independently records
-- distMi=3.5, both matching 5.5 km almost exactly. Same defect as the Easton
-- Glacier fix above: dist_km is meant to be the one-way distance to the summit, not
-- to camp. The route's own summit waypoint records distMi=9 (=14.48 km); this is
-- physically consistent (above the 4.86-mile straight-line chord from trailhead to
-- summit) and consistent with the camp-to-summit gain implied by the row's own
-- elevations. Corrected to the summit distance.
UPDATE routes SET dist_km = 14.48
WHERE id = 'wa_mount_baker_squak_glacier' AND dist_km = 5.5;

-- wa_mount_baker_north_ridge: dist_km stored as 4 km (=2.49 mi). Physically
-- impossible as a trailhead-to-summit distance -- shorter than the straight-line
-- chord between the route's own trailhead (48.80201,-121.89597) and summit
-- (48.777,-121.813) waypoints (6.70 km). It matches this route's own
-- trailhead-to-high-camp distance instead: the row's own `approach` text states
-- "up the Hogsback moraine to the standard high camp at ~6,000 ft (about 2.5 mi and
-- 2,800 ft of gain...)", and the row's own Heliotrope Ridge Camp waypoint
-- independently records distMi=3 -- both close to the stored 2.49 mi. Same
-- to-camp-instead-of-to-summit defect as the two Baker routes above. The route's
-- own summit waypoint records distMi=12 (=19.31 km) after continuing across the
-- Coleman Glacier and up the ridge past the high camp. Corrected to the summit
-- distance.
UPDATE routes SET dist_km = 19.31
WHERE id = 'wa_mount_baker_north_ridge' AND dist_km = 4;

-- wa_mount_baker_north_ridge: road.status/road.driveNote describe an ongoing
-- closure of Glacier Creek Road (FR 39) at the Glacier Creek bridge "for scheduled
-- repair work through the end of October 2026". This closure has since ended: the
-- U.S. Forest Service announced on August 20, 2026 (reported by Cascadia Daily
-- News) that repairs to the December 2025 washout were complete and vehicle access
-- to the Heliotrope Ridge Trailhead was restored -- well before today's audit date
-- (2026-09-05) and well before the row's own stated end date. The stored text is a
-- stale transient-closure claim describing a condition that is no longer current.
-- Corrected to reflect the reopening while preserving the historical washout
-- context (this same spot also washed out in 2021).
UPDATE routes SET road = jsonb_set(
    jsonb_set(
      road,
      '{status}',
      '"Reopened to vehicles August 20, 2026 after Forest Service repairs to the December 2025 washout near the Glacier Creek bridge (roughly MP 3.0, about 5 miles below the trailhead). This same spot also washed out in 2021, so check current Mt. Baker Ranger District conditions before driving out."'
    ),
    '{driveNote}',
    '"Drive Glacier Creek Road (FR 39) to its end at the Heliotrope Ridge Trailhead. If a new washout has closed the road, the Forest Service has historically still allowed foot/bike access to the trailhead at its discretion."'
  )
WHERE id = 'wa_mount_baker_north_ridge'
  AND road->>'status' LIKE 'Closed to vehicles at the Glacier Creek bridge%through the end of October 2026%';

-- wa_mount_carrie_standard: dist_km stored as 20.9 km (=12.99 mi). The row's own
-- `approach` text states in as many words: "One-way distance from the trailhead to
-- Boston Charlie's Camp/Cat Basin is roughly 13 miles; most parties camp at Heart
-- Lake or Cat Basin and climb Carrie's summit as a long day from there" -- i.e. the
-- stored 12.99 mi is this route's own stated distance to CAMP, not to the summit,
-- the same to-camp-instead-of-to-summit defect as the Mount Baker routes fixed
-- above. The route's own summit waypoint records distMi=14.5 (=23.34 km), consistent
-- with "a long day" of further travel (Cat Peak ridge/Catwalk crossing + Carrie
-- Glacier crossing) beyond Boston Charlie's Camp. Corrected to the summit distance.
UPDATE routes SET dist_km = 23.34
WHERE id = 'wa_mount_carrie_standard' AND dist_km = 20.9;

-- wa_mount_buckindy_scramble: dist_km stored as 21.89 km (=13.60 mi one-way if
-- taken at face value). Exactly double (to within rounding) this route's own
-- summit waypoint, which records distMi=6.8 (=10.94 km): 6.8 mi x 2 = 13.6 mi =
-- 21.89 km. dist_km is meant to hold the one-way distance (the app doubles it for
-- round-trip display); this row instead has the round-trip figure stored directly
-- in the one-way field. Corrected to the one-way distance recorded by the route's
-- own waypoint chain.
UPDATE routes SET dist_km = 10.94
WHERE id = 'wa_mount_buckindy_scramble' AND dist_km = 21.89;

-- wa_mount_buckindy_scramble: permit field claims "North Cascades NP complex"
-- jurisdiction (no permit for day climbs; NPS backcountry permit for overnight
-- stays). Mount Buckindy is not within North Cascades National Park -- it sits in
-- the Glacier Peak Wilderness, managed by the Mount Baker-Snoqualmie National
-- Forest (confirmed via Wikipedia and the Forest Service's own Glacier Peak
-- Wilderness recreation page). This also contradicts the row's OWN trailhead
-- waypoint note, which correctly says "Northwest Forest Pass needed to park" -- a
-- Forest Service pass, not an NPS one. Corrected to the applicable USFS wilderness
-- permit framework, matching the phrasing this database already uses for other
-- Mount Baker-Snoqualmie National Forest wilderness routes.
UPDATE routes SET permit = 'Free self-issue Glacier Peak Wilderness permit at the trailhead register (Mount Baker-Snoqualmie National Forest), no quota or fee for day or overnight use. Northwest Forest Pass required to park at the Kindy Creek Road pullout.'
WHERE id = 'wa_mount_buckindy_scramble' AND permit LIKE 'North Cascades NP complex%';
