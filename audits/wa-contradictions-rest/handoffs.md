# Contradictions left for other owners

## For the camping clean-up (bivy[] is theirs)
- wa_mount_angeles_standard: bivy note says "close to 1,000 ft in under a mile" on the Switchback Trail; sourced figure is 700 ft in 0.6 mi (r481).
- Mount Duckabush: Marmot Lake camp card says 1.1 mi above Upper Duckabush; trail is ~3.5 mi (r621).
- Mount Adams north-side routes (5): the High Camp camp card claims a parking pass at Killen Creek; the FS trailhead page says no fees required (r661).
- Monument Peak standard scramble: bivy[0].permit claims a parking pass; FS + WTA say no fee / no NWFP at this trailhead (r444).
- wa_mount_arriva_scramble: bivy[1] has the dogs rule at Easy Pass wrong; access.rules is correct (r242).
- East Twin Needle South Route: camp card says Crescent Creek Basin is north of the crest (it is south) (r041).
- A Blue Lake trailhead route (r245): bivy[0].notes says the trailhead is half a mile from Washington Pass; sourced figure is ~1 mile.
- wa_mount_larrabee*: permit column now 'no wilderness permit required' (sourced, r342); bivy[0] and bivy[1] still say a self-issue permit is needed.

## discipline column (not writable by this pipeline; needs an owner decision)
- Clast from the Past, Sidewinder: discipline should be sport (r701).
- wa_lefty, wa_friction_therapy: discipline trad, but listing + every protection field say Sport (r282, 2 sources).
- wa_on_the_prowl: trad vs Sport (r143).
- Iceman (Ice Box): sport vs should-be trad (r142).
- Cougar Divide route to Mount Hadley: bivy[0] says the route goes 'east' to Hadley; route fields now say south then southeast (r321).

## Route filed on the wrong area (needs area_id/name move, not a text patch)
- wa_mount_mathias_scramble: mixes a Hoh out-and-back with a Sol Duc traverse; choose one and move the trailhead pin (r485).
- wa_mount_fairchild_standard: itinerary/timing describe the Whiskey Bend / Long Ridge / Fitzhenry approach; the rest of the row is Sol Duc. Needs an itinerary rewrite; Appleton Pass pins need moving (r484).
- wa_mount_dana_scramble: the 6-day itinerary and timing use the Sol Duc trailhead; the rest of the row uses Whiskey Bend. No source describes a Dana approach to rewrite from (r502).
- wa_lost_peak_pasayten_scramble: mixes a Monument Creek out-and-back, a 5-day Robinson Creek loop and a Pistol Pass line; peak has two real routes (SW slope Cl3, NW ridge Cl2). Needs a rewrite around one (r443).
- wa_mount_ballard_south: mixes the south slopes from Mill Creek with the East Ridge from Slate Creek (beta/breakdown/face/rack are the East Ridge). Rewrite or split (r445).
- wa_mount_rainier_kautz_glacier: 'Kautz Headwall' names both the Kautz route's ice chute and a separate ski line; decide which this row is (line, grade, length unresolved) (r662).
- wa_mount_claywood_standard: mixes three approach lines (Hayden Pass, Dose Meadows/Lost Pass, Obstruction Pt/Grand Pass); Grand Pass-to-summit prose heads the wrong direction. Needs a rewrite around one line (r585).
- wa_gilbert_peak_meade_glacier: mixes the Klickton Divide ridge line (no glacier) with the true Meade Glacier line; decide which line the row is (r641).
- wa_pernod_spire_standard: mixed from three routes (approach = Direct West Face, itinerary = South Face, rappel_detail = South Face descent); face/aspect NE are right per the 1952 FA. Its beta also credits a guidebook (citation rule) (r263).
- wa_little_sister_south_couloir: pitch_detail, ice_grade, max_angle and hazards[0] describe the 2007 traverse crux near South Twin, not this line; no source gives replacements (r324).
- wa_himmelhorn_southeast_route: no source names a 'Southeast Route' or gives it Grade IV 5.8; the 1961 FA was class 4 via a ledge onto the north face. Identity review (r061).
- wa_half_moon_southwest_slopes: row is framed as a Class 3-4 scramble; sources say Half Moon has no easy route (easiest line class 5+). Needs re-authoring (r160).
- wa_mount_hardy_snow_scramble: breakdown/beta follow the short Swamp Creek south ridge; the rest of the row is the long Rainy Pass / Methow Pass approach. Pick one line or split into two routes (r243).
- East Twin Needle South Route: grade/FA/face/beta are the 2003 east arete (II 5.10a); overview/itinerary/pro tips describe a 5.7 line from the Eye Col. Owner decides which climb (r041).
- wa_ottohorn_west_ridge: name/overview/hazards describe the 2017 West Ridge (Bring The Noise, to 5.9); most other fields describe the 1961 east ridge. Owner decides which climb the row is (r083).
- Lexington Tower 'South Face' is Concord Tower's South Face (r181, 2 sources).

## Totals that are provably wrong but no source states the right figure (left as is)
- wa_mount_baker_boulder_glacier gain_ft/loss_ft 7,000: below the ~8,080 ft trailhead-to-summit rise (r340).
- Silver Star East Ridge gain 4,400 and Glacier gain 4,000: below trailhead-to-summit rise; sources disagree (r281).
- Skyline Divide (Hadley) gain 2,818: below its own pins' 3,265 ft rise (r321).
- wa_liberty_bell_east_face: no evidence a 4-pitch 5.6 'East Face' exists on Liberty Bell; row's own corrections note says its facts came from Lexington Tower. Needs identity review (r182).
- wa_the_rake_traverse_route: summit-day gain 1,600 ft is impossible from the ~6,050 ft camp to the 7,869 ft summit; no source states the day or total gain, so gain_ft 7,700 and day-2 1,600 were left (a computed 2,000/8,100 was reverted, r104).

## Pins that need moving (coordinates are out of scope here)
- wa_mount_skokomish_standard: waypoints sit on the Mildred Lakes trail; route now uses Putvin / Lake of the Angels (r624).
- wa_blue_s_buttress: trailhead pin at Blue Lake TH, ~2.5 km west of the SR-20 hairpin the approach now uses (r244).
- Mount Terror North Face waypoints[5] "Terror Glacier crossing": pinned on the Terror Glacier south of the summit; the crossing to the north-face base is on the Mustard Glacier (r082).
- Cinderella (North Face): an "Elbow Lake" waypoint the route never reaches (lake is ~3.5 mi in) (r303).
- Independence Route (East Face): 3 waypoints (stream crossing, climbers path junction, west face bench) copied from a west-face route (r200).
- wa_east_face_3: trailhead waypoint renamed to the pond pullout, coords still on Blue Lake TH lot (r201).
- Cockscomb Ridge (Baker): approach now Heliotrope Ridge, trailhead coords still at Artist Point (r340).
- Easton Sandy Camp, Squak Crag View, Boulder-Park Cleaver high camp: camp pins on the wrong side of the mountain (r340).
- Thin Red Line: waypoints 1-3 describe the Blue Lake west-face approach (r182).
- wa_whistler_mountain_scramble: trailhead pin is the Rainy Pass PCT lot; itinerary now starts at the SR-20 turnout 3.1 mi east (r306).

## Route NAME now disagrees with its sourced fields (name is out of scope)
- Mount Carrie SE route: climbs the southwest ridge; name/aspect say SE. Standard route: SW aspect vs northeast-cirque glacier content (r483).
- wa_ives_peak_r1: route line is the NW ridge + south face (2 sources; beta/face patched); name "Northeast Slopes" and aspect NE still say otherwise. Its beta also names a website as its source (r642).
- wa_whistler_mountain_scramble: aspect/face now SW / 'South Ridge / Southwest Slope' (2 sources); name still says 'Southeast Slopes' (r306).

## Area records / other rows
- Mount Duckabush area elevation_ft 6,232 should be 6,254 (r621).
- wa_mount_hopper_standard: park trail-conditions page (14 Sep 2026) lists Home Sweet Home trail closed as well as Staircase-First Divide, so every trail approach is currently closed. How to present that is an owner decision (r622).
- Vasiliki Tower summit 7,663 ft is below its own col; sources give 7,940 / 7,920 / lidar ~8,060. Needs the ground (DEM) pass (r283).
- Plan 9 from Outer Space (The Rake / The Blob): summit waypoint now 7,840 ft (matches high_point_ft); the Junction pin at the same coordinate and possibly the area's elevation_ft still read 7,337 (r042).

## Prose that still names a source (no-sources rule)
- wa_mount_duckabush_standard approach: 'per NPS', 'in the regional climbers guide' (r621).
- wa_ives_peak_r1 beta names a website (r642); Standard Rock Route beta credits a guidebook (r263).

## Guard noise seen at the end (not caused by this branch)
- check:trailhead-direction-shape --live fails on 4 rows (burnt_boot north route, glacier_peak_kennedy_glacier, poltergeist_pinnacle, white_mountain_olympics_scramble); none of their trailheadDirection values were written by this branch.
