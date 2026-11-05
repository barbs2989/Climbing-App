-- Batch 263 (pass 5): wa_kimtah_peak_scramble, wa_king_kong_gorillas_direct_direct,
--   wa_klawatti_peak_southeast_face, wa_klawatti_peak_sw_buttress, wa_koala_krack,
--   wa_kololo_peaks_standard, wa_kyes_peak_glaciated_scramble, wa_kyes_peak_northeast_ridge
--
-- Several fixes below re-propose findings from batch-70 (2026-08-07, pass 3) and
-- batch-197 (2026-09-04, pass 4) that were never applied to the live database -- the
-- live row still holds the pre-fix value in every case, confirmed by reading the current
-- data before writing anything here. Each is independently re-verified against an
-- external source and/or the row's own other fields in this session (not just copied
-- forward), and one (wa_king_kong's FA) corrects a batch-197 fix that was itself wrong --
-- see Fix 6 below.

-- Fix 1: wa_kimtah_peak_scramble -- dist_km (23.17, implying a 28.8 mi round trip under
-- this app's distKm*2 rendering convention) is the ROUND-TRIP distance stored where the
-- app expects one-way. The row's own waypoints give a one-way trailhead-to-summit
-- distance of 7.2 mi (waypoints[7].distMi), matching the approach text's own explicit
-- "3.5-3.6 miles" to Easy Pass at waypoints[1] and the itinerary's own "roughly 15
-- miles... round-trip" totalNote (7.2 mi x 2 = 14.4 mi =~ 15 mi). 23.17 km = 14.4 mi,
-- i.e. the round trip, not the one-way distance this column is meant to hold. Corrected
-- to 7.2 mi one-way = 11.59 km so that distKm*2 renders the correct ~14.4 mi round trip.
UPDATE routes SET dist_km = 11.59 WHERE id = 'wa_kimtah_peak_scramble' AND dist_km = 23.17;

-- Fix 2: wa_kimtah_peak_scramble -- road.driveNote says Easy Pass Trailhead is "about 20
-- miles east of Marblemount, WA." Confirmed wrong via WTA/Forest Service sourcing: the
-- trailhead (SR-20 near milepost 151-152) is 45-46 miles east of Marblemount, not 20.
-- (Re-verified independently this session; matches the unapplied batch-70 finding.)
UPDATE routes
SET road = jsonb_set(road, '{driveNote}',
  '"Easy Pass Trailhead is on the south side of SR 20 near milepost 151, about 45 miles east of Marblemount, WA."')
WHERE id = 'wa_kimtah_peak_scramble'
  AND road->>'driveNote' = 'Easy Pass Trailhead is on the south side of SR 20 near milepost 151, about 20 miles east of Marblemount, WA.';

-- Fix 3: wa_kimtah_peak_scramble -- itinerary.days[].miles are internally inconsistent
-- with this same row's own waypoints and with the itinerary's own totalNote. Day 1/3
-- (trailhead <-> "Ragged Ridge Camp") are stored as 7.5 mi each, but waypoints[3]
-- ("Ragged Ridge Camp") gives distMi=5.3 from the trailhead. Day 2 (camp <-> summit
-- round trip) is stored as 5 mi, but waypoints[3]/[7] give 2*(7.2-5.3)=3.8 mi. The
-- corrected total (5.3+3.8+5.3=14.4 mi) matches the itinerary's own "roughly 15
-- miles... round-trip" totalNote; the current stored total (7.5+5+7.5=20 mi) does not.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,miles}', '5.3')
WHERE id = 'wa_kimtah_peak_scramble' AND itinerary->'days'->0->>'miles' = '7.5';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,1,miles}', '3.8')
WHERE id = 'wa_kimtah_peak_scramble' AND itinerary->'days'->1->>'miles' = '5';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,2,miles}', '5.3')
WHERE id = 'wa_kimtah_peak_scramble' AND itinerary->'days'->2->>'miles' = '7.5';

-- Fix 4: wa_kimtah_peak_scramble -- top-level gain_ft AND loss_ft (both currently 4950)
-- disagree with this same row's own itinerary.days[].gainFt/lossFt, which sum to 4650
-- each (day1 2600/0, day2 2050/2050, day3 0/2600) -- an out-and-back route on the same
-- path, as descent_text confirms ("Reverse the ascent line"). The itinerary's own
-- totalNote independently states "~4,600 ft round-trip gain overall", matching 4650 and
-- not 4950. (loss_ft previously matched this 4650 figure per the unapplied batch-70
-- finding but has since drifted to 4950 to match gain_ft -- both are corrected here to
-- the value the row's own day-by-day breakdown and totalNote agree on.)
UPDATE routes SET gain_ft = 4650, loss_ft = 4650
WHERE id = 'wa_kimtah_peak_scramble' AND gain_ft = 4950 AND loss_ft = 4950;

-- Fix 5: wa_kimtah_peak_scramble -- data_quality.gaps lists two items directly
-- contradicted by this same row's own populated fields: "No confirmed GPS waypoints for
-- the gully/gendarme sections" (waypoints[5]/[6] name and place exactly those features --
-- "Grotesque Gendarmes cliff band", "Water-filled summit gully") and "No verified
-- first-ascent date or party found" (the row's own fa field states a specific FA: John
-- Roper and Jerry Swanson, June 1970).
UPDATE routes SET data_quality = jsonb_set(data_quality, '{gaps}',
  '["Route description drawn from trip reports rather than a directly consulted guidebook (e.g., Beckey''s Cascade Alpine Guide)", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]'::jsonb)
WHERE id = 'wa_kimtah_peak_scramble'
  AND data_quality->'gaps' ? 'No verified first-ascent date or party found';

-- Fix 6: wa_king_kong_gorillas_direct_direct -- fa/beta conflate two separate 2016
-- events. Sol Wertkin's own first-hand account (solclimbs.blogspot.com, Oct 2016,
-- "First Ascent: King Kong") states: Wertkin and Tyree Johnson "finally completed the
-- 60m headwall crack" in early September 2016 (the actual first ascent, with a fall);
-- Wertkin returned about a week later with Jon Gleason and led it clean on Sept 9, 2016
-- (the first FREE ascent). This row's beta field already states "First ascent:
-- September 9, 2016 by Sol Wertkin and Jon Gleason" -- mislabeling the FFA as the FA and
-- omitting the actual first ascent entirely. (A batch-197 fix, since unapplied,
-- "corrected" fa to just match this same mistaken beta wording -- re-verified against
-- the primary source this session and that is not what happened; both fields need the
-- FA/FFA distinction, not a match-the-other-field harmonization.)
UPDATE routes
SET fa = 'Sol Wertkin & Tyree Johnson, early Sept 2016 (FA, with a fall on the headwall crack); FFA by Sol Wertkin & Jon Gleason, Sept 9, 2016'
WHERE id = 'wa_king_kong_gorillas_direct_direct'
  AND fa = 'Sol Wertkin & Tyree Johnson, 2016 (freed by Sol Wertkin)';
UPDATE routes
SET beta = replace(beta,
  'First ascent: September 9, 2016 by Sol Wertkin and Jon Gleason.',
  'First free ascent: September 9, 2016 by Sol Wertkin and Jon Gleason (the first ascent, with a fall on the headwall crack, was made about a week earlier by Sol Wertkin and Tyree Johnson).')
WHERE id = 'wa_king_kong_gorillas_direct_direct'
  AND beta LIKE '%First ascent: September 9, 2016 by Sol Wertkin and Jon Gleason.%';

-- Fix 7: wa_king_kong_gorillas_direct_direct -- commitment ("III") contradicts this same
-- row's own beta field ("Grade: IV 5.11+ alpine rock climb"). Independently confirmed via
-- WebSearch: multiple sources describe King Kong as "IV 5.11+".
UPDATE routes SET commitment = 'IV'
WHERE id = 'wa_king_kong_gorillas_direct_direct' AND commitment = 'III';

-- Fix 8: wa_king_kong_gorillas_direct_direct -- approach names "Longs Pass (6,200 ft)"
-- at mile 2.5, but this same row's own waypoints[1] entry at that same distance (2.5 mi)
-- is named "Ingalls Pass" (elev 6,457 ft), and the approach text's own next clause
-- ("continue past Ingalls Lake toward Stuart Pass") only makes sense via Ingalls Pass /
-- the Ingalls Way Trail -- Longs Pass is reached via a separate trail branch that does
-- not pass Ingalls Lake. Longs Pass's actual elevation (~6,300 ft, confirmed via
-- WebSearch) is also a worse match for the stored "6,200 ft" than Ingalls Pass's ~6,450-
-- 6,500 ft commonly cited elevation is for the row's own 6,457 ft waypoint.
UPDATE routes SET approach = replace(approach, 'Longs Pass (6,200 ft)', 'Ingalls Pass (~6,450-6,500 ft)')
WHERE id = 'wa_king_kong_gorillas_direct_direct' AND approach LIKE '%Longs Pass (6,200 ft)%';

-- Fix 9: wa_kyes_peak_northeast_ridge -- approach/descent_text/road name the trail as
-- "Quartz Creek Trail" reached from a "North Fork Sauk River / Quartz Creek Trailhead",
-- but this conflates two distinct, real trails on opposite sides of the range that both
-- happen to meet at Curry Gap: Quartz Creek Trail #1050 is reached from the SKYKOMISH
-- side (Beckler Rd/FR-65/FR-63 near Index -- the same side as this peak's standard
-- route, which this row's own road.driveNote already says this route is NOT on).
-- The Sauk-side trail that actually reaches Curry Gap from FR-49/Sloan Creek Road near
-- Darrington is Bald Eagle (Curry Gap) Trail #650, confirmed via USFS/WTA/Mountaineers
-- sourcing (Bald Eagle Trailhead, elev. ~2,400 ft, ~2.5 mi to Curry Gap -- not the ~4 mi
-- this row states, which is actually the Quartz Creek side's distance to Curry Gap).
-- Beckey's own guide description of this route ("an extended logging road on the north
-- fork of the Sauk River... good trail two miles to Curry Gap") matches Bald Eagle Trail,
-- not Quartz Creek Trail. At Curry Gap the junction met is therefore with the Quartz
-- Creek Trail (coming the other way), not "the Bald Eagle Mountain Trail junction" as
-- currently stated -- that is the trail being walked in on.
UPDATE routes
SET approach = 'From the Bald Eagle Trailhead (elev. ~2,400 ft) on Sloan Creek Road (FR 49) off the Mountain Loop Highway south of Darrington, follow the Bald Eagle (Curry Gap) Trail #650 about 2.5 miles, gaining roughly 1,600 ft, to Curry Gap (~4,000 ft) at the Quartz Creek Trail junction. From Curry Gap head west/southwest along an up-and-down ridge toward Kyes, leaving the ridge where feasible to cross the Pride Glacier west-northwest toward the cliffs below Monte Cristo Peak, reaching the northeast base of Kyes around 6,000 ft.'
WHERE id = 'wa_kyes_peak_northeast_ridge'
  AND approach = 'From the North Fork Sauk River / Quartz Creek Trailhead (Mt. Baker-Snoqualmie NF, Darrington Ranger District), follow the Quartz Creek Trail about 4 miles, gaining roughly 1,450 ft, to Curry Gap (~4,000 ft) at the Bald Eagle Mountain Trail junction. From Curry Gap head west/southwest along an up-and-down ridge toward Kyes, leaving the ridge where feasible to cross the Pride Glacier west-northwest toward the cliffs below Monte Cristo Peak, reaching the northeast base of Kyes around 6,000 ft.';

UPDATE routes SET descent_text = replace(descent_text, 'descend the Quartz Creek Trail to the trailhead', 'descend the Bald Eagle (Curry Gap) Trail back to the trailhead')
WHERE id = 'wa_kyes_peak_northeast_ridge' AND descent_text LIKE '%descend the Quartz Creek Trail to the trailhead%';

UPDATE routes
SET road = jsonb_set(jsonb_set(road,
  '{name}', '"Sloan Creek Road (FR 49) to the Bald Eagle Trailhead, off the Mountain Loop Highway (Darrington Ranger District)"'),
  '{driveNote}', '"Approached via the Bald Eagle (Curry Gap) Trail #650 from the Bald Eagle Trailhead on Sloan Creek Road (FR 49), on the Darrington (east) side of the range, rather than the Skykomish/Blanca Lake side used by the standard route."')
WHERE id = 'wa_kyes_peak_northeast_ridge'
  AND road->>'name' = 'North Fork Sauk River Rd / Quartz Creek Trailhead access (Darrington Ranger District)';
