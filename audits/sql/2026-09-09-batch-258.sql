-- WA alpine route audit -- batch 258 (pass 5)
-- Routes checked: wa_gilbert_peak_west_route, wa_glacier_peak_cool_glacier_gerdine,
-- wa_glacier_peak_disappointment_peak_cleaver, wa_glacier_peak_frostbite_ridge,
-- wa_glacier_peak_kennedy_glacier, wa_glacier_peak_sitkum_glacier,
-- wa_goat_mountain_south_ridge, wa_golden_horn_north_face

-- Disappointment Peak Cleaver (Glacier Peak): the row's own prose fields
-- (approach, approach_logistics, approach_variants, descent_text, beta,
-- overview, bivy) all consistently and in detail describe the North Fork
-- Sauk Trailhead -> White Pass -> Glacier Gap approach -- but its
-- structured waypoints/gpx/timing.sectionBreakdown fields instead describe
-- an entirely different, unrelated approach via "Trinity Trailhead" and
-- "Buck Creek Pass", which the row's OWN sibling route on this peak
-- (wa_glacier_peak_cool_glacier_gerdine) explicitly states in its own bivy
-- text serves peaks that "have nothing to do with Glacier Peak's own
-- approaches." The waypoints[0] note already self-diagnoses half of this
-- ("Coordinate and elevation as published...for the Trinity Trailhead...
-- The North Fork Sauk River trailhead is 20.2 mi away on a different
-- approach"). Confirmed independently: WebSearch corroborates
-- 48.05832,-121.28793 (already used, correctly, for the trailhead's lat/lng
-- here and in approach_logistics.trailheadLat/Lng) as the real North Fork
-- Sauk River Trailhead coordinate, while Trinity Trailhead's real published
-- elevation is 2,800 ft -- exactly the wrong figure that had been stuck on
-- this waypoint in place of the ~2,050 ft this row's own approach text
-- states for North Fork Sauk. Replaced the waypoint chain, using this
-- row's own approach text/approach_variants for White Pass (~5,900 ft, ~9
-- mi per this row's own hazards field) and Glacier Gap (~7,250 ft per this
-- row's own approach_variants baseFinding), reusing the sibling route's
-- already-verified coordinates for these same shared physical trail
-- landmarks (not inventing new ones). Cleared the gpx field rather than
-- fabricate a track -- the prior "gpx" was not a real polyline, just the
-- four wrong waypoints strung together out of geographic order. Corrected
-- the two approach-day entries in timing.sectionBreakdown to describe the
-- real stops (White Pass, Glacier Gap) instead of Buck Creek Pass/"eastern
-- high camp", and removed the stray "over Buck Creek Pass" from the
-- hike-out entry; hour allocations (8/4/9/7.5, summing to the existing
-- totalHrs of 28.5) are left untouched since nothing in the row contradicts
-- them. Also fixed the same "standard Sitkum route/approach" language in
-- this row's own crowds.estimatePerSeason as the Cool Glacier/Gerdine fix
-- below, for the same reason.
UPDATE routes SET
  waypoints = '[
    {"lat": 48.05832, "lng": -121.28793, "elev": 2050, "name": "North Fork Sauk River Trailhead", "type": "Trailhead", "distMi": 0, "elevFt": 2050},
    {"lat": 48.033168, "lng": -121.149547, "elev": 5900, "name": "White Pass (PCT)", "type": "Junction", "distMi": 9, "elevFt": 5900},
    {"lat": 48.083655, "lng": -121.127087, "elev": 7250, "name": "Glacier Gap", "type": "Campsite", "distMi": 13, "elevFt": 7250},
    {"lat": 48.1112273, "lng": -121.1139922, "elev": 10541, "name": "Glacier Peak summit", "type": "Summit", "elevFt": 10541}
  ]'::jsonb,
  gpx = NULL,
  timing = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(timing, '{sectionBreakdown,0,fromTo}', '"Trailhead to White Pass"'::jsonb),
        '{sectionBreakdown,0,note}', '"A long first day climbing steadily up the North Fork Sauk River Trail past Mackinaw Shelter to White Pass (~5,900 ft) on the PCT."'::jsonb
      ),
      '{sectionBreakdown,1,fromTo}', '"White Pass to Glacier Gap camp"'::jsonb
    ),
    '{sectionBreakdown,1,note}', '"Traverse north from White Pass into the White Chuck Glacier basin, camping on rock or moraine near Glacier Gap (~7,250 ft) to stage for the summit day."'::jsonb
  ),
  crowds = jsonb_set(crowds, '{estimatePerSeason}', '"Low — likely well under 50 parties per season; the North Fork Sauk approach, now the more heavily used way up this peak, with no published counts specific to this eastern line"'::jsonb)
WHERE id = 'wa_glacier_peak_disappointment_peak_cleaver'
  AND waypoints->1->>'name' = 'Buck Creek Pass'
  AND crowds->>'estimatePerSeason' = 'Low — likely well under 50 parties per season; a less-traveled alternative to the standard Sitkum approach with no published counts';

-- Also correct the timing.sectionBreakdown[3] ("Hike out") entry on the
-- same row, which still names "Buck Creek Pass" as a waypoint on the
-- return -- run separately since the note text differs from the guard
-- above and a single jsonb_set chain of this depth was becoming hard to
-- verify by eye.
UPDATE routes SET
  timing = jsonb_set(timing, '{sectionBreakdown,3,note}', '"Full reverse of the approach back down to the trailhead — a long, mostly-descending day."'::jsonb)
WHERE id = 'wa_glacier_peak_disappointment_peak_cleaver'
  AND timing->'sectionBreakdown'->3->>'note' = 'Full reverse of the approach, back over Buck Creek Pass and down to the trailhead — a long, mostly-descending day.';

-- Cool Glacier / Gerdine Ridge (Glacier Peak): crowds.peakTraffic calls
-- Sitkum "the standard route" in the present tense, contradicting this
-- same row's own bivy entry ("Boulder Basin above Sitkum Creek -- and the
-- White Chuck situation": "The approach that made it popular no longer
-- exists... Parties wanting the north and west sides of the mountain now
-- go in from the Suiattle instead") and the area's own blurb ("the North
-- Fork Sauk River Trail on the south side has become the de facto standard
-- approach for most parties"). Sitkum access has been effectively cut off
-- since the White Chuck River Trail washed out in 2003, so it can no
-- longer be described as the current standard this route is a secondary
-- alternative to.
UPDATE routes SET
  crowds = jsonb_set(crowds, '{peakTraffic}', '"Uncommon; the Sitkum route that was once the standard way up the mountain has been effectively inaccessible for two decades since the White Chuck River Trail washed out in 2003, so this North Fork Sauk-based approach is now one of the more commonly used lines rather than a secondary alternative to it, though traffic remains light overall"'::jsonb)
WHERE id = 'wa_glacier_peak_cool_glacier_gerdine'
  AND crowds->>'peakTraffic' = 'Uncommon; generally the second-most-used approach after the standard Sitkum route, still light overall';

-- Kennedy Glacier (Glacier Peak): the trailhead waypoint's own note names
-- the wrong access road. This row's road field, approach_logistics field,
-- and approach text all consistently say the White Chuck River Trailhead
-- is reached via White Chuck Road / FR-23 (approach_logistics.
-- trailheadDirection: "...to White Chuck River Road (FS23), then east 11
-- miles to road end at trailhead"; road.name: "White Chuck Road (FR 23)").
-- The waypoint note alone instead named "Suiattle River Rd (FR 26)", which
-- is a different road serving a different trailhead entirely (used by this
-- peak's Frostbite Ridge Suiattle variant and other routes' Sulphur Creek
-- Campground approach).
UPDATE routes SET
  waypoints = jsonb_set(waypoints, '{0,note}', '"Road-end trailhead on White Chuck Road (FR 23), ~23.5 mi from Darrington; North Fork Sauk TH (48.05832,-121.28793) is a valid alternate approach for this route."'::jsonb)
WHERE id = 'wa_glacier_peak_kennedy_glacier'
  AND waypoints->0->>'note' = 'Road-end trailhead on Suiattle River Rd (FR 26), ~23.5 mi from Darrington; North Fork Sauk TH (48.05832,-121.28793) is a valid alternate approach for this route.';

-- Goat Mountain, South Ridge / Standard Scramble: the `beta` field
-- describes the West Peak (~6,600-6,721 ft) as effectively the route's
-- objective ("the more commonly accessed summit... good trail access to
-- within 50 vertical feet") with no mention that it is a false summit --
-- flatly contradicting five other fields on this same row (watch_out,
-- hazards, approach, approach_variants' baseFinding, descent_text,
-- overview), all of which independently and consistently state that the
-- West Peak is a corniced FALSE summit that must be bypassed rather than
-- climbed directly, and that the true, named summit is the East Peak at
-- 6,891 ft, reached only after a further ~300 ft drop into a notch and a
-- ~1,400 ft class 2-3 scramble with an exposed knife-edge crux. A party
-- reading only `beta` (the field the app surfaces on the route Overview
-- tab) could reasonably stop at the false summit believing it had reached
-- the top, or be unprepared for the harder ground beyond it. Rewritten
-- using only facts already stated elsewhere in this same row. pitch_detail
-- entry 4 had the identical error ("Final 100-150 vertical feet to West
-- Peak summit" as the route's last pitch) and is corrected the same way.
UPDATE routes SET
  beta = 'The West Peak (~6,600 ft) is a false summit with good boot-path access from the end of maintained Trail #673, but it is corniced on top and must be bypassed on its south or west slope rather than climbed directly. The true summit is the East Peak at 6,891 ft, reached by dropping about 300 ft off the West Peak''s shoulder into a notch, then climbing a final ~1,400 ft of mixed snow, rock, and short exposed steps -- including a narrow, moderately exposed knife-edge-ish section near the top -- to the true summit. A steep, ice-axe-required snowfield lingers on the ridge well into summer. The route offers commanding views of Mount Baker, Mount Shuksan, Mount Sefrit, and the surrounding North Cascades peaks.',
  pitch_detail = jsonb_set(pitch_detail, '{3,notes}', '"Summit scramble on exposed Class 2-3 terrain with some exposure, topping out at the West Peak false summit (~6,600 ft) — corniced, so bypass its top on the south/west slope rather than climbing directly over it. From there the route continues past a 300-ft drop and a further ~1,400 ft of mixed snow, rock, and an exposed knife-edge section to the true East summit at 6,891 ft. No technical rock climbing but scrambling is exposed with 500+ foot drops nearby."'::jsonb)
WHERE id = 'wa_goat_mountain_south_ridge'
  AND beta = 'The West Peak (6,721 ft) is the more commonly accessed summit, featuring good trail access to within 50 vertical feet of the summit. The route involves a steep permanent snowfield traverse requiring an ice axe at all times, then a short, relatively straightforward scramble to the top. The route offers commanding views of Mount Baker, Mount Shuksan, Mount Sefrit, and the surrounding North Cascades peaks.'
  AND pitch_detail->3->>'notes' = 'Summit scramble on exposed Class 2-3 terrain with some exposure. Final 100-150 vertical feet to West Peak summit. No technical rock climbing but scrambling is exposed with 500+ foot drops nearby.';
