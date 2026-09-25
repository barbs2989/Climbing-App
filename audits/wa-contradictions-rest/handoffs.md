# Contradictions left for other owners

## For the camping clean-up (bivy[] is theirs)
- wa_mount_larrabee*: permit column now 'no wilderness permit required' (sourced, r342); bivy[0] and bivy[1] still say a self-issue permit is needed.

## discipline column (not writable by this pipeline; needs an owner decision)
- wa_lefty, wa_friction_therapy: discipline trad, but listing + every protection field say Sport (r282, 2 sources).
- wa_on_the_prowl: trad vs Sport (r143).
- Iceman (Ice Box): sport vs should-be trad (r142).
- Cougar Divide route to Mount Hadley: bivy[0] says the route goes 'east' to Hadley; route fields now say south then southeast (r321).

## Route filed on the wrong area (needs area_id/name move, not a text patch)
- Lexington Tower 'South Face' is Concord Tower's South Face (r181, 2 sources).

## Totals that are provably wrong but no source states the right figure (left as is)
- wa_mount_baker_boulder_glacier gain_ft/loss_ft 7,000: below the ~8,080 ft trailhead-to-summit rise (r340).
- Silver Star East Ridge gain 4,400 and Glacier gain 4,000: below trailhead-to-summit rise; sources disagree (r281).
- Skyline Divide (Hadley) gain 2,818: below its own pins' 3,265 ft rise (r321).
- wa_liberty_bell_east_face: no evidence a 4-pitch 5.6 'East Face' exists on Liberty Bell; row's own corrections note says its facts came from Lexington Tower. Needs identity review (r182).
- wa_the_rake_traverse_route: summit-day gain 1,600 ft is impossible from the ~6,050 ft camp to the 7,869 ft summit; no source states the day or total gain, so gain_ft 7,700 and day-2 1,600 were left (a computed 2,000/8,100 was reverted, r104).

## Pins that need moving (coordinates are out of scope here)
- wa_east_face_3: trailhead waypoint renamed to the pond pullout, coords still on Blue Lake TH lot (r201).
- Cockscomb Ridge (Baker): approach now Heliotrope Ridge, trailhead coords still at Artist Point (r340).
- Easton Sandy Camp, Squak Crag View, Boulder-Park Cleaver high camp: camp pins on the wrong side of the mountain (r340).
- Thin Red Line: waypoints 1-3 describe the Blue Lake west-face approach (r182).
- wa_whistler_mountain_scramble: trailhead pin is the Rainy Pass PCT lot; itinerary now starts at the SR-20 turnout 3.1 mi east (r306).

## Route NAME now disagrees with its sourced fields (name is out of scope)
- wa_whistler_mountain_scramble: aspect/face now SW / 'South Ridge / Southwest Slope' (2 sources); name still says 'Southeast Slopes' (r306).
