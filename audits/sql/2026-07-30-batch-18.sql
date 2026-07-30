-- WA Alpine Audit — Pass 1, Batch 18 — 2026-07-30
-- Peaks: Le Conte Mountain (Northern Aspect), Lemah Mountain (East Route) + Lemah Two
--        (Goatshead Spire), Mount Stone (Lena Lake to Mt Stone traverse), Gunn Peak
--        (Lewis Creek Route), Lexington Tower (East Face), Liberty Bell Mountain
--        (Liberty and Injustice for All, Beckey Route, East Face, Independence Route)

-- =========================================================================
-- Le Conte Mountain — Northern Aspect
-- =========================================================================

-- wa_le_conte_mountain_northern_aspect: access.land_manager named "Mt. Baker-Snoqualmie
-- National Forest (Darrington Ranger District)" -- Darrington RD administers the
-- Suiattle River Road/Downey Creek corridor (Dome Peak's approach), not Cascade River
-- Road/Marblemount, which is this route's actual approach corridor and falls under the
-- Mt. Baker Ranger District. Corroborated internally: this row's own
-- emergency.rangerStation already correctly names the NPS Marblemount Wilderness
-- Information Center, not a Darrington RD office. access.parking_pass and
-- access.passRequired separately named "Mountain Loop Highway trailheads" and a
-- "southern Downey Creek Trailhead" -- both belong to the same unrelated Darrington/
-- Suiattle corridor and never appear in this row's own approach/road/waypoints fields.
-- Same contamination family as batch 8's Dome Peak fix and batch 15's "Mount Tom area"
-- boilerplate. climate.forecastZone named "Washington Pass East Slopes zone", an
-- unrelated east-of-the-crest location (Methow River drainage); Le Conte/Cascade Pass
-- drain to the Skagit River on the west side of the crest (NWAC West Slopes North zone).
UPDATE routes
SET access = jsonb_set(
      jsonb_set(
        jsonb_set(access, '{land_manager}',
          '"North Cascades National Park Service Complex (Wilderness Information Center, Marblemount); the lower Cascade River Road approach outside the park boundary is Mt. Baker-Snoqualmie National Forest, Mt. Baker Ranger District."'::jsonb),
        '{parking_pass}',
        '"None required - Cascade Pass Trailhead lies within North Cascades National Park, a fee-free park; no Northwest Forest Pass needed."'::jsonb),
      '{passRequired}',
      '"None - this route approaches via the Cascade Pass Trailhead (North Cascades National Park), not the Downey Creek Trailhead; no pass is required."'::jsonb),
    climate = jsonb_set(climate, '{forecastZone}', '"North Cascades / West Slopes North zone (NWAC)"'::jsonb)
WHERE id = 'wa_le_conte_mountain_northern_aspect';

-- =========================================================================
-- Mount Stone — Lena Lake to Mt Stone traverse
-- =========================================================================

-- wa_lena_lake_to_mt_stone_traverse: access._raw.special_requirements said "5,000 ft
-- elevation gain" -- that figure belongs to the standard Putvin-only route to Mount
-- Stone (Wikipedia/Peakbagger cite ~5,000 ft / 11 mi RT for the standard Class 3
-- scramble). This route is the full Lena-Lake-to-Mt-Stone traverse, which the row's own
-- gain_ft (9000), Mountain Project's actual route page ("nearly 9000ft... in 16 miles"),
-- and an independent trip report all place at ~9,000 ft / 16 mi.
UPDATE routes
SET access = jsonb_set(access, '{_raw,special_requirements}',
  '"Class 3 scramble; ~9,000 ft cumulative elevation gain over the full Lena Lake-to-Mt Stone traverse (not the ~5,000 ft standard Putvin-only route); Lake of the Angels is primary camp site"'::jsonb)
WHERE id = 'wa_lena_lake_to_mt_stone_traverse';

-- wa_lena_lake_to_mt_stone_traverse: access.parking_pass and access._raw.
-- parking_pass_required omitted the Northwest Forest Pass required at the Lena Lake
-- Trailhead -- the route's actual start -- even though the row's own waypoint #1
-- already states this correctly. The access block instead foregrounded only the
-- Olympic NP entrance fee and a note about the Putvin Trailhead (the shuttle exit, not
-- the start). Confirmed via Mountaineers.org/USFS: "A valid Recreation Pass is required
-- at Lena Lake Trailhead."
UPDATE routes
SET access = jsonb_set(
      jsonb_set(access, '{parking_pass}',
        '"Lena Lake Trailhead (route start, Olympic National Forest FS-25): Northwest Forest Pass or Interagency/America the Beautiful pass required to park. Olympic NP entrance fee ($30/vehicle 7-day, $55 annual Olympic NP pass, or $80 interagency annual) applies once inside the park boundary for the Upper Lena Lake / Lake of the Angels portion."'::jsonb),
      '{_raw,parking_pass_required}',
      '"Lena Lake Trailhead (start): Northwest Forest Pass required. Putvin Trailhead (shuttle exit): forest pass requirement recently dropped."'::jsonb)
WHERE id = 'wa_lena_lake_to_mt_stone_traverse';

-- =========================================================================
-- Gunn Peak — Lewis Creek Route
-- =========================================================================

-- wa_lewis_creek_route: waypoints[0] (Barclay Lake Trailhead) elev said 2400, should be
-- 2200 -- contradicts this row's own approach text ("2,200 ft, end of FR-6024") and
-- road.driveNote ("Barclay Lake Trailhead (2,200 ft)"); confirmed 2,200 ft via The
-- Mountaineers' Barclay Lake route page.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '2200', false)
WHERE id = 'wa_lewis_creek_route';

-- wa_lewis_creek_route: waypoints[1] (Gunn Peak Summit) elev said 6240, should be 6244
-- -- contradicts this row's own high_point_ft (6244) and the parent area row's
-- elevation_ft (6244); confirmed 6,244 ft via Wikipedia/Wikidata.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '6244', false)
WHERE id = 'wa_lewis_creek_route';

-- wa_lewis_creek_route: gain_ft said 4900, loss_ft said 5200 -- an out-and-back route
-- (descent "retraces the ascent line") should show equal gain/loss, and the row's own
-- itinerary.days[0] already lists gainFt:5200/lossFt:5200. gain_ft was the outlier
-- against three matching internal values; corrected to match.
UPDATE routes SET gain_ft = 5200 WHERE id = 'wa_lewis_creek_route';

-- wa_lewis_creek_route: access.notes claimed "Gunn Peak... sit[s] outside designated
-- wilderness," directly contradicting this same row's own access._raw.
-- wilderness_zone_name ("Wild Sky Wilderness"), the route's own overview text, and the
-- parent area row's blurb -- all of which state Gunn Peak IS the highest point of the
-- Wild Sky Wilderness (confirmed via Wikipedia). Reads as boilerplate/contamination
-- from an unrelated "peaks outside wilderness" note.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"Gunn Peak lies within the Wild Sky Wilderness, of which it is the highest point; day-use alpine climbing requires no special backcountry permit beyond the standard trailhead parking pass."'::jsonb)
WHERE id = 'wa_lewis_creek_route';

-- =========================================================================
-- Lexington Tower — East Face
-- =========================================================================

-- wa_lexington_tower_east_face: alpine_grade/commitment said III, should be IV.
-- Multiple independent secondary sources describing this specific route
-- (Mountaineers.org, SummitPost, Mountain Project, chossclimbers, Mountain Madness)
-- consistently give "Grade IV 5.9+ or 5.9, A3, eight pitches... Marts & McPherson,
-- June 1966" -- also internally plausible: an 8-10 pitch 5.9+ route taking 8-10 hours
-- car-to-car (per this row's own timing/itinerary) is squarely Grade IV territory, not
-- a half-day Grade III.
UPDATE routes SET alpine_grade = 'IV', commitment = 'IV' WHERE id = 'wa_lexington_tower_east_face';

-- wa_lexington_tower_east_face: rappels field described the alternate 7-rap face
-- descent as if it were the standard descent, contradicting this row's own
-- descent_text, which explicitly states the face-rappel line "is not the recommended
-- standard descent, just a documented alternative" and that the normal walk-off
-- descent takes 0 rappels.
UPDATE routes SET rappels = '0 -- the standard descent is a walk-off (short 3rd-class gully from the notch, see descent_text); no rappels required. A ~7-rappel line straight down the face is a documented but non-standard alternative some parties use in bad weather.'
WHERE id = 'wa_lexington_tower_east_face';

-- wa_lexington_tower_east_face: data_quality.gaps[5] claimed the 1966 FA year was "not
-- currently on file" and unverified -- but the fa field already contains "(1966)", and
-- external sources (chossclimbers, Mountain Madness, and others) independently
-- corroborate June 1966. Stale note describing an already-resolved gap; removed.
UPDATE routes SET data_quality = jsonb_set(data_quality, '{gaps}', (data_quality->'gaps') - 5)
WHERE id = 'wa_lexington_tower_east_face';

-- wa_lexington_tower_east_face: access._raw.seasonal_closures said SR-20 is "typically
-- closed mid-November to mid-April," contradicting this same row's own access.seasonal
-- field ("closes gate-to-gate roughly early December-mid/late April"). WSDOT's own
-- historical closure data confirms typical closure is early December (2025 closure was
-- Dec. 4; earliest on record was the exceptional Oct. 17, 2007), not mid-November.
UPDATE routes SET access = jsonb_set(access, '{_raw,seasonal_closures}',
  '"Washington Pass (SR 20) typically closed early December through April/May; closing typically falls in early December per WSDOT, with the exact opening date varying year to year with snowpack (and, in some years, road-repair work)."'::jsonb)
WHERE id = 'wa_lexington_tower_east_face';

-- =========================================================================
-- Liberty Bell Mountain
-- =========================================================================

-- wa_liberty_bell_east_face: fa/pitches/length_m/rock_grade/grade_num/face/commitment
-- were all copied from Lexington Tower's East Face (Marts & McPherson, June 1966,
-- 5.9+, Grade III/IV, ~10 pitches -- confirmed via chossclimbers.com/mountaineers.org
-- as describing wa_lexington_tower, a different formation). This row's own face field
-- literally said "East Face (Lexington Tower)", but its own pitch_detail (4 pitches,
-- lengths summing to 125m, crux 5.6), descent_text ("this is a shorter (4-pitch) line"),
-- and itinerary ("climb the 4 pitches") all consistently describe a genuinely different,
-- easier route that stays on Liberty Bell. Corrected header fields to match this row's
-- own already-correct pitch_detail; fa left NULL (no source found for this specific
-- short line's actual first ascent) rather than guessed, with a corrections note and
-- data_quality gap explaining why.
UPDATE routes SET
  fa = NULL,
  pitches = 4,
  length_m = 125,
  rock_grade = '5.6',
  grade_num = 6,
  face = 'East Face',
  commitment = 'II',
  grade = 'Grade II, 5.6',
  corrections = 'This route''s header facts (FA: Steve Marts & Don McPherson, June 1966; 10 pitches; 5.9+) were copied from Lexington Tower''s East Face, a different nearby formation -- this row''s own pitch_detail/descent_text/itinerary consistently describe a shorter, easier 4-pitch 5.6 line that stays on Liberty Bell. Fixed pitches/length/grade to match the on-file pitch_detail; fa left blank pending a human source for this specific short line''s actual first ascent.',
  data_quality = jsonb_set(data_quality, '{gaps}', (data_quality->'gaps') || '["First ascent party/date for this specific 4-pitch East Face line is unknown -- the previously-stored FA (Marts & McPherson, June 1966) was Lexington Tower''s East Face FA, mistakenly copied onto this row; removed rather than left wrong."]'::jsonb)
WHERE id = 'wa_liberty_bell_east_face';

-- wa_liberty_bell_east_face / wa_liberty_bell_independence_route / wa_liberty_and_
-- injustice_for_all: county fields disagreed with each other and with the area row
-- (which correctly says the summit "straddles the Chelan-Okanogan county line," matching
-- wa_liberty_bell_beckey_route). East Face and Independence Route both said only
-- "Chelan" while their own emergency.notes admits the straddle; Liberty and Injustice
-- for All said only "Okanogan County, WA". Aligned all three to the confirmed straddle.
UPDATE routes SET emergency = jsonb_set(emergency, '{county}', '"Chelan County / Okanogan County (summit straddles the line)"'::jsonb)
WHERE id = 'wa_liberty_bell_east_face';

UPDATE routes SET emergency = jsonb_set(emergency, '{county}', '"Chelan County / Okanogan County (summit straddles the line)"'::jsonb)
WHERE id = 'wa_liberty_bell_independence_route';

UPDATE routes SET emergency = jsonb_set(emergency, '{county}', '"Chelan County / Okanogan County (summit straddles the line)"'::jsonb)
WHERE id = 'wa_liberty_and_injustice_for_all';

-- wa_liberty_bell_independence_route: itinerary.days[0].note and timing.
-- sectionBreakdown[0].note both said "climb the 12-pitch line up the west face,"
-- contradicting this row's own face ("East Face"), aspect ("E"), overview ("one of
-- Liberty Bell's three historic 1960s east-face aid lines"), and pitch 1's own notes
-- ("Climbs the right edge of the East Face...").
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,note}',
  '"Approach from Blue Lake TH into the basin (about 1.5-2 hr), climb the 12-pitch line up the East Face, then descend the standard Beckey Route rappels/downclimb on the southwest side."'::jsonb)
WHERE id = 'wa_liberty_bell_independence_route';

UPDATE routes SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}',
  '"Approach from Blue Lake TH into the basin (about 1.5-2 hr), climb the 12-pitch line up the East Face, then descend the standard Beckey Route rappels/downclimb on the southwest side."'::jsonb)
WHERE id = 'wa_liberty_bell_independence_route';

-- wa_liberty_and_injustice_for_all: itinerary.days[0].note and timing.
-- sectionBreakdown[0].note said "climb the 5 pitches then rappel/downclimb the Beckey
-- descent line back to the base" -- but this row's own descent/descent_text/
-- rappel_detail fields describe a specific two-rope rappel from the top of P3 (bypassing
-- the P2 anchor) to the P1 anchor, never the Beckey gully.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,note}',
  '"Approach via the East Face climbers'' path from the SR-20 hairpin pullout east of Washington Pass; climb the 5 pitches then rappel with two ropes from the top of P3, bypassing the P2 anchor, to reach the ground at the P1 anchor."'::jsonb)
WHERE id = 'wa_liberty_and_injustice_for_all';

UPDATE routes SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}',
  '"Approach via the East Face climbers'' path from the SR-20 hairpin pullout east of Washington Pass; climb the 5 pitches then rappel with two ropes from the top of P3, bypassing the P2 anchor, to reach the ground at the P1 anchor."'::jsonb)
WHERE id = 'wa_liberty_and_injustice_for_all';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_lexington_tower (area): Wikipedia's infobox lists Lexington Tower's parent peak
--    as Early Winters Spires (7,807 ft), not Liberty Bell Mountain (currently stored
--    parent_peak). No "Early Winters Spires" area row was available to this batch to
--    confirm the correct id, and per this codebase's documented history of id-shaped
--    guesses causing damage, this needs a human to confirm the target id first:
--    SELECT id FROM areas WHERE name ILIKE '%Early Winter%Spire%';
--  - wa_le_conte_mountain_northern_aspect: waypoints array has two near-duplicate
--    "Cascade Pass" entries with no intermediate return-leg points between them
--    (Cache Col, Kool-Aid Lake, Middle Cascade Glacier, Yang Yang Lakes) -- looks
--    incomplete rather than simply wrong; needs a human to add the missing points.
--  - wa_lemah_mountain_east_route: two waypoints ("Snow gully and moat transition",
--    "Southeast ridge notch") appear geographically displaced ~5-6 miles east of the
--    actual route line, contradicting the row's own beta text. No confident replacement
--    coordinates found; the row's own data_quality.gaps cites a CalTopo source
--    (https://caltopo.com/m/UMHAP) a human could use to re-derive them.
--  - wa_lemah_two (area): coordinates (47.494048, -121.3009) sit ~0.2 mi north of
--    wa_lemah_mountain's summit, but multiple route descriptions place Lemah Two
--    south/southwest of Main Peak -- possibly a genuine GNIS mislabeling issue (this
--    massif's high point has a documented history of being mislabeled "Lemah Mtn" on
--    USGS quads). Needs a human with topo/GNIS access.
--  - wa_lena_lake_to_mt_stone_traverse: the "St. Peter's Gate -> Mount Stone summit"
--    waypoint leg's stored distMi (0.5 mi) is geometrically impossible -- a haversine
--    calc on the stored coordinates gives a straight-line distance of ~1.02 mi already,
--    and trail distance can't be shorter than straight-line. Summit coordinates are
--    independently confirmed correct, so the error is in St. Peter's Gate's coordinates
--    or the distMi figure; the cited source (https://caltopo.com/m/HGT9) was
--    inaccessible this pass. Needs a human with map access.
--  - wa_lewis_creek_route: this row's own verif.status/corrections/rope_note fields
--    already flag that "Lewis Creek Route" may not be a distinct, separately-documented
--    line from the modern standard approach to Gunn Peak -- possible name-derived
--    duplicate of an existing route, per this catalog's documented id-collision history.
--    Needs a human check. Also: even after the gain_ft/loss_ft internal-consistency fix
--    above (5200/5200), no external source found states gain that high (sourced reports
--    cluster ~3,937-4,380 ft RT) -- flagging the magnitude itself, not just the mismatch.
--  - wa_lexington_tower_east_face: notch waypoint elevFt (7621) exceeds the peak's
--    confirmed summit elevation (7560 ft) while the row's own text says the route tops
--    out at a notch BELOW the true summit -- geometrically impossible as stored. Three
--    internally-consistent fields (trailhead elev + gain_ft = notch elev) can't be used
--    to tell which one is the actual error without a topo source. Also: pitch count is
--    given as 10 in this row's own pitch_detail vs. "eight pitches" in most external
--    aggregator descriptions -- common grade-IV pitch-splitting variance, not flagged as
--    a hard error.
--  - wa_liberty_bell_east_face / wa_liberty_and_injustice_for_all: both routes'
--    approach/road/approach_logistics fields say the approach is from the SR-20
--    hairpin/pond pullout, while waypoints/gpx/partner_requirements.approachTime (and,
--    for East Face, sourceNote) point to a Blue Lake Trailhead approach. Evidence is
--    split within each row itself; this obscure pair of routes has no independently
--    documented approach beta online to arbitrate. Needs a human review.
--  - wa_liberty_bell_east_face: alpine_grade "PD" is a plausible but unverified
--    difficulty-tier judgment call (data_quality already flags "little indexed beta
--    found" for this obscure line).
--  - wa_liberty_bell_independence_route: length_m (366) doesn't quite match the sum of
--    this row's own pitch_detail lengths (~400m) -- likely per-pitch rounding noise, no
--    authoritative source gives an exact meter figure to adjudicate.
--  - wa_liberty_and_injustice_for_all: grade "5.12b" vs. the CascadeClimbers.com FA trip
--    report's "5.12-" -- within normal a/b-split grade-consensus variance, not a
--    confident error.
-- =========================================================================

-- Verify afterward:
SELECT id, access->>'land_manager' AS land_manager, access->>'parking_pass' AS parking_pass
FROM routes WHERE id = 'wa_le_conte_mountain_northern_aspect';

SELECT id, waypoints, gain_ft, loss_ft FROM routes WHERE id = 'wa_lewis_creek_route';

SELECT id, alpine_grade, commitment, rappels FROM routes WHERE id = 'wa_lexington_tower_east_face';

SELECT id, fa, pitches, length_m, rock_grade, grade_num, face, commitment, grade
FROM routes WHERE id = 'wa_liberty_bell_east_face';

SELECT id, emergency->>'county' AS county FROM routes
WHERE id IN ('wa_liberty_bell_east_face', 'wa_liberty_bell_independence_route', 'wa_liberty_and_injustice_for_all');
