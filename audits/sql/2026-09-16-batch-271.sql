-- WA alpine route audit, pass 5, batch 271 (2026-09-16)
-- Scope: wa_mount_adams_wilson_glacier_headwall .. wa_mount_baker_easton_glacier
-- 7 of 8 routes fixed (some with multiple sub-fixes), 1 flagged for human review
-- (wa_mount_adams_wilson_glacier_headwall -- Yakama Reservation permit/season
-- question). See the log for full reasoning and for three additional items
-- flagged but not fixed on routes that otherwise received fixes below.
--
-- Note for whoever applies these: batches 205/206 (pass 4, 2026-09-05) already
-- proposed several of the fixes below (coleman_deming dist_km, boulder_glacier
-- dist_km/gain/loss, easton_glacier dist_km/commitment, cockscomb_ridge overview).
-- Re-checking the live database this pass found those values UNCHANGED from
-- pass 4 -- i.e. those SQL files were apparently never run. Re-proposed here
-- rather than skipped, since the live data is still wrong regardless of what a
-- prior pass already wrote to a .sql file.

-- ---------------------------------------------------------------------------
-- wa_mount_anderson_eel_glacier: dist_km stored as 45.9 km (=28.5 mi one-way),
-- which would make this one of the longest approaches on the peninsula and
-- contradicts three independent internal/external figures that all cluster
-- around 19 mi one-way instead: (1) the route's own 305-point gpx track --
-- summing haversine distance from the track's start to its point closest to
-- the summit waypoint (within 11 m) gives 30.84 km (19.16 mi); (2) the row's
-- own `hazards` field already hedges "long, committing wilderness approach
-- (~16+ mi one-way)"; (3) an external route guide (via WebSearch synthesis,
-- The Mountaineers' own segment breakdown) sums to ~17.5 mi one-way from the
-- same named waypoints this row already uses (ranger station -> Honeymoon
-- Meadows 8 mi -> Anderson Pass ~1.9 mi more -> high camp/summit beyond).
-- Corrected to the gpx-track-derived figure, the row's own most granular
-- internal record.
UPDATE routes SET dist_km = 30.84
WHERE id = 'wa_mount_anderson_eel_glacier' AND dist_km = 45.9;

-- ---------------------------------------------------------------------------
-- wa_mount_baker_boulder_glacier: dist_km (25.7) and gain_ft/loss_ft (7000/7000)
-- all disagree with this row's own summit waypoint, which independently
-- carries distMi=6.35 tagged distFrom="track" -- i.e. already computed by this
-- app's own pipeline from this route's own stored gpx track -- and a
-- trailhead(2,200 ft)/summit(10,781 ft) elevation pair implying 8,581 ft of
-- gain, not 7,000. 25.7 km also appears on the unrelated Boulder-Park Cleaver
-- route below (different trailhead-to-camp distance, different gain profile),
-- suggesting a copy-pasted filler value rather than a measurement of this
-- route. Corrected to the row's own waypoint-derived figures (out-and-back,
-- so loss is set equal to gain).
UPDATE routes SET dist_km = 10.22, gain_ft = 8581, loss_ft = 8581
WHERE id = 'wa_mount_baker_boulder_glacier'
  AND dist_km = 25.7 AND gain_ft = 7000 AND loss_ft = 7000;

-- ---------------------------------------------------------------------------
-- wa_mount_baker_boulder_park_cleaver: dist_km stored as 25.7 km -- identical
-- to the (also wrong) value on Boulder Glacier above, despite this being a
-- different route with a different trailhead-to-summit profile. This row's
-- own summit waypoint independently carries distMi=11 (=17.70 km), consistent
-- with its own high-camp waypoint at distMi=8 partway there. gain_ft/loss_ft
-- (8081/8081) already match the row's own trailhead(2,700 ft)/summit(10,781 ft)
-- elevations exactly and need no change. Corrected dist_km to the row's own
-- summit waypoint distance.
UPDATE routes SET dist_km = 17.70
WHERE id = 'wa_mount_baker_boulder_park_cleaver' AND dist_km = 25.7;

-- wa_mount_baker_boulder_park_cleaver: the `grade` field already states
-- "Grade II Snow" but the separate `commitment` column stores "I" -- the same
-- shape of internal contradiction fixed on Easton Glacier in pass 4 (batch
-- 206): a route whose own grade text names an NCCS grade should not carry a
-- different value in the structured commitment column. Fixing commitment to
-- agree with the row's own stated grade.
UPDATE routes SET commitment = 'II'
WHERE id = 'wa_mount_baker_boulder_park_cleaver' AND commitment = 'I';

-- ---------------------------------------------------------------------------
-- wa_mount_baker_cockscomb_ridge: `overview` states the route "is approached
-- from the Heliotrope Ridge Trailhead across the Coleman and Roosevelt
-- Glaciers" -- directly contradicted by this same row's `approach`, `beta`,
-- and `descent` fields (all describing Ptarmigan Ridge Trail from Artist
-- Point, via Camp Kiser, the Rainbow Glacier and the Park Glacier -- the
-- `approach` field even closes with "Note that the Coleman and Roosevelt
-- Glaciers are on Baker's west and northwest flanks and are not crossed on
-- this approach") and by the row's own primary Trailhead waypoint, which is
-- Artist Point, not Heliotrope Ridge. This exact fix was already proposed in
-- pass 4 (batch 205) but the live `overview` text is unchanged; re-proposing.
UPDATE routes
SET overview = replace(
  overview,
  'is approached from the Heliotrope Ridge Trailhead across the Coleman and Roosevelt Glaciers',
  'is approached via the Ptarmigan Ridge Trail from Artist Point, crossing the Rainbow and Park Glaciers'
)
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND overview LIKE '%is approached from the Heliotrope Ridge Trailhead across the Coleman and Roosevelt Glaciers%';

-- wa_mount_baker_cockscomb_ridge: the `road` field describes an entirely
-- different, unrelated trailhead -- "Glacier Creek Road (FR 39) to Heliotrope
-- Ridge Trailhead" -- the same wrong-side contamination as the `overview` fix
-- above, evidently copy-pasted from a Heliotrope-side sibling (its status text
-- is near-identical in structure to Coleman-Deming's and Coleman Headwall's
-- road fields for the same FR-39 washout). This row's own `approach` field
-- names the real trailhead explicitly: "Drive the Mount Baker Highway (SR 542)
-- to its end at Artist Point." Replaced with SR 542/Artist Point access,
-- externally confirmed via WSDOT's own announcement that the final 2.7-mile
-- stretch to Artist Point reopened for the 2026 season on June 10, 2026 (it
-- typically closes with the season's first significant snowfall, usually
-- late September to early November -- so it should still be open as of this
-- audit date).
UPDATE routes SET road = jsonb_set(
    jsonb_set(
      jsonb_set(
        road,
        '{name}',
        '"State Route 542 (Mount Baker Highway) to Artist Point"'::jsonb
      ),
      '{status}',
      '"Paved highway, open for the 2026 season since June 10, typically closing for winter with the season''s first significant snowfall (usually late September to early November)."'::jsonb
    ),
    '{driveNote}',
    '"Drive SR 542 (Mount Baker Highway) to its end at the Artist Point parking area/trailhead, not Glacier Creek Road/Heliotrope Ridge, which serves the mountain''s west side and is not used on this route."'::jsonb
  )
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND road->>'name' = 'Glacier Creek Road (FR 39) to Heliotrope Ridge Trailhead';

-- ---------------------------------------------------------------------------
-- wa_mount_baker_coleman_deming: dist_km stored as 4.7 km, which is shorter
-- than the straight-line chord between this route's own trailhead and summit
-- waypoints. The row's own summit waypoint independently carries distMi=5.5
-- (=8.85 km), corroborated by multiple external route descriptions citing
-- ~5.5 mi one-way / ~11.8 mi round trip for the standard Coleman-Deming line.
-- gain_ft/loss_ft (7080/7080) already match the row's own trailhead(3,700
-- ft)/summit(10,781 ft) elevations almost exactly and need no change. Same
-- fix proposed in pass 4 (batch 205); live value unchanged, re-proposing.
UPDATE routes SET dist_km = 8.85
WHERE id = 'wa_mount_baker_coleman_deming' AND dist_km = 4.7;

-- wa_mount_baker_coleman_deming: `road.status` describes an ongoing closure
-- of Glacier Creek Road (FR 39) "for scheduled repair work through the end of
-- October 2026". This closure has ended: the U.S. Forest Service announced
-- on August 20, 2026 (reported by Cascadia Daily News, and independently
-- corroborated this pass by a HikeWA trail-conditions page updated Sep 13,
-- 2026 describing the road as currently drivable) that repairs to the
-- December 2025 washout were complete and vehicle access to the Heliotrope
-- Ridge Trailhead was restored -- well before today's audit date and the
-- row's own stated end date. This route's sibling wa_mount_baker_coleman_headwall
-- already carries the corrected reopening text in its own `road` field;
-- matching that wording here.
UPDATE routes SET road = jsonb_set(
    jsonb_set(
      road,
      '{status}',
      '"Washed out roughly 5 miles below the trailhead (~MP 3.0) by the December 2025 flood (a repeat of a 2021 washout), and the Forest Service announced on 20 August 2026 that repairs are complete and vehicles can again reach the Heliotrope Ridge trailhead."'::jsonb
    ),
    '{driveNote}',
    '"Drive Glacier Creek Road (FR 39) to its end at the Heliotrope Ridge Trailhead, the 2025 washout closure was lifted 20 August 2026, but this spot has washed out before (2021, 2025), so confirm current status before driving out."'::jsonb
  )
WHERE id = 'wa_mount_baker_coleman_deming'
  AND road->>'status' LIKE '%through the end of October 2026%';

-- wa_mount_baker_coleman_deming: the trailhead waypoint's own `directions`
-- text carries the identical stale claim as `road.status` above ("FS 39 is
-- closed to vehicles through October 2026 after washouts... parties have had
-- to add several miles of road on foot or bike to reach the sign-in kiosk"),
-- now contradicted by the August 20, 2026 reopening. Corrected in place.
UPDATE routes SET waypoints = jsonb_set(
    waypoints, '{0,directions}',
    to_jsonb(replace(
      waypoints->0->>'directions',
      'Check the road first: FS 39 is closed to vehicles through October 2026 after washouts, though it stays open to pedestrians, and parties have had to add several miles of road on foot or bike to reach the sign-in kiosk.',
      'Check the road first: FS 39 reopened to vehicles August 20, 2026 after repairs to a December 2025 washout, but this same spot has washed out before (2021, 2025), so confirm current status before driving.'
    ))
  )
WHERE id = 'wa_mount_baker_coleman_deming'
  AND waypoints->0->>'directions' LIKE '%FS 39 is closed to vehicles through October 2026%';

-- ---------------------------------------------------------------------------
-- wa_mount_baker_coleman_headwall: FA, dist_km (20.92 km, close to the row's
-- own summit waypoint distMi=12.5=20.12 km), and gain_ft/loss_ft (7000/7000,
-- within the normal range of the row's own trailhead/summit elevation
-- difference of 7,344 ft) all check out and are left unchanged -- this route
-- was already checked clean in pass 4 (batch 205). However, this row's `road`
-- field HAS already been correctly updated (by some other session) to reflect
-- the August 20, 2026 Glacier Creek Road reopening, while its `approach` text
-- still describes the washout as an ongoing burden ("note the road washout
-- adds ~9 mi/2,000 ft of extra approach on foot/bike before you even reach
-- the sign-in kiosk"). Corrected `approach` to agree with the row's own
-- already-updated `road` field.
UPDATE routes SET approach = replace(
  approach,
  'note the road washout adds ~9 mi/2,000 ft of extra approach on foot/bike before you even reach the sign-in kiosk',
  'the December 2025 washout that once added ~9 mi/2,000 ft of foot/bike approach was repaired and the road reopened to vehicles August 20, 2026, so confirm current status before driving, since this spot has washed out before (2021, 2025)'
)
WHERE id = 'wa_mount_baker_coleman_headwall'
  AND approach LIKE '%note the road washout adds ~9 mi/2,000 ft of extra approach on foot/bike before you even reach the sign-in kiosk%';

-- ---------------------------------------------------------------------------
-- wa_mount_baker_easton_glacier: dist_km stored as 6.4 km -- almost exactly
-- this route's own trailhead-to-camp distance (Sandy Camp waypoint distMi=4),
-- not trailhead-to-summit. The row's own summit waypoint independently
-- carries distMi=8.8 (=14.16 km), corroborated by multiple external route
-- descriptions citing "around 8 miles"/"16 miles round trip" to the summit.
-- Same fix proposed in pass 4 (batch 206); live value unchanged, re-proposing.
UPDATE routes SET dist_km = 14.16
WHERE id = 'wa_mount_baker_easton_glacier' AND dist_km = 6.4;

-- wa_mount_baker_easton_glacier: `grade` already states "Grade II glacier
-- climb" but `commitment` stores "I". Same fix proposed in pass 4 (batch 206);
-- live value unchanged, re-proposing.
UPDATE routes SET commitment = 'II'
WHERE id = 'wa_mount_baker_easton_glacier' AND commitment = 'I';

-- ---------------------------------------------------------------------------
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_mount_adams_wilson_glacier_headwall: `season` ("Jul-Sep") vs
--    `best_season` ("May to June") disagree, and this pass corroborated (via
--    two independent WebSearch-synthesized sources) that Wilson Glacier itself
--    sits within the Yakama Indian Reservation -- consistent with the row's
--    own `beta` field, which already says the glacier "descends to a terminus
--    near 7,400 ft on the reservation side of the mountain." Non-tribal Yakama
--    recreation access to this side of the mountain has historically opened
--    around the start of July (per this route's own Mazama Glacier Headwall
--    sibling's waypoint text), which would make `best_season`/"May to June"
--    a real trespass/access risk rather than merely a technical-conditions
--    preference. But the route's approach begins on non-reservation land
--    (Cold Springs/South Climb trailhead, Gifford Pinchot NF) and only
--    crosses onto reservation land during the traverse to the glacier, so the
--    exact permit/access rule that applies to THIS specific route (as opposed
--    to the Bird Creek Road/Mirror Lake-gate access used by Mazama Glacier
--    Headwall) was not found in an authoritative primary source this pass.
--    Given the access-legality stakes, left for a human decision. (This is
--    the fourth pass this item has been examined and left unresolved for the
--    same reason -- see the log.)
--  - wa_mount_baker_cockscomb_ridge: waypoint index 1 ("Heliotrope Ridge
--    Camp", 48.795/-121.885) is an exact copy of Coleman Headwall's own camp
--    waypoint (identical name and coordinates) and still describes the wrong
--    side of the mountain for this Ptarmigan Ridge/Camp Kiser route -- same
--    defect flagged (not fixed) in pass 4. This pass found Camp Kiser's
--    approximate real-world stats (~8 mi from Artist Point, ~1,400 ft gain to
--    that point, via WebSearch) but no verified precise coordinate to replace
--    it with; left flagged rather than guessed.
--  - wa_mount_baker_cockscomb_ridge: `grade` ("III-IV") and `commitment`
--    ("II") disagree, and II does not fall inside the III-IV range at all.
--    No external source was found this pass with enough detail on this
--    rarely-repeated route's NCCS commitment grade to pick a value with
--    confidence; left flagged rather than guessed, same posture as the
--    analogous grade/commitment flag on wa_mount_baker_park_glacier_headwall
--    in pass 4 (batch 206).
--  - wa_mount_anderson_eel_glacier: `road.driveNote` states "drive ~8.5 mi to
--    the current road-end parking", but this row's own `approach` text states
--    "drive roughly 5.5 miles to the washed-out gate" for the same drive from
--    US-101. Two internally-disagreeing mileage figures for the same segment;
--    not resolved this pass (does not affect the dist_km fix above, which is
--    anchored on the row's own gpx coordinates rather than either mileage
--    figure).
