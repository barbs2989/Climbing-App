-- WA alpine audit batch 241 (pass 5, first batch of the new pass)
-- Routes: wa_a_servant_to_liberty, wa_abernathy_peak_south_ridge, wa_action_potential,
-- wa_agnes_mountain_west_route, wa_alpine_lookout_round_mountain_trail,
-- wa_american_border_peak_northeast_face, wa_american_border_peak_southeast_face,
-- wa_amphitheater_mountain_finger_of_fatwa

-- wa_a_servant_to_liberty (Liberty Bell, East Face, "A Servant To Liberty" /
-- "A Slave to Liberty"): the `fa` field and pro_tips[0] both claim the August 2016 first
-- free ascent was rope-soloed. Two independent external sources (Climbing.com's "The Dark
-- Side of Liberty" and an AAC Publications summary, both found via search) confirm Mikey
-- Schaefer rope-soloed the 2015 EXPLORATION/EQUIPPING of the line, but the actual first free
-- ascent on August 6, 2016 was led with Shanjean Lee belaying/supporting -- not rope-solo.
-- This row's own `overview` field already says "...with Shanjean Lee's support" and its own
-- data_quality.gaps note flags exactly this discrepancy as "worth a follow-up review" (the FA
-- credit lists Schaefer only). This audit is that follow-up: fa and pro_tips corrected to match
-- overview and the external sources; data_quality.gaps left as-is (still an accurate record
-- that the on-file FA credit needed fixing).
UPDATE routes
SET fa = 'Mikey Schaefer, leading every pitch, with Shanjean Lee belaying, August 6, 2016 (Schaefer rope-soloed the exploration/equipping of the line in 2015; originally documented as ''A Slave to Liberty'')'
WHERE id = 'wa_a_servant_to_liberty'
  AND fa = 'Mikey Schaefer, August 2016 (rope-solo; originally documented as ''A Slave to Liberty'')';

UPDATE routes
SET pro_tips = jsonb_set(
    pro_tips, '{0}',
    '"Mikey Schaefer rope-soloed the exploration and equipping of the line in 2015, but the actual first free ascent in August 2016 was led with Shanjean Lee belaying -- still a serious, committing outing given the sustained 5.12-5.13 climbing"'
  )
WHERE id = 'wa_a_servant_to_liberty'
  AND pro_tips->>0 = 'Mikey Schaefer rope-soloed the FA specifically to make it more challenging — expect a serious, committing outing';

-- Same route: dist_km stored as 8.05 (5.00 mi), which the app doubles for a displayed
-- round trip of 10.0 mi. The row's own itinerary.days[0].miles is ALSO 5 -- i.e. the
-- itinerary's round-trip total was stored where the app expects the one-way distance it
-- doubles for display (the same doubling bug documented repeatedly elsewhere in this
-- catalog). Corrected to half (5.00 mi / 2 = 2.50 mi = 4.03 km), which the app will then
-- double back to ~5.0 mi, matching itinerary.miles and this route's short, roadside-pullout
-- East Face approach (partner_requirements.approachTime states "~1.5-2.5 hrs" one-way to
-- the base, consistent with ~2.5 mi of steep talus/forest).
UPDATE routes SET dist_km = 4.03
WHERE id = 'wa_a_servant_to_liberty' AND dist_km = 8.05;


-- wa_abernathy_peak_south_ridge ("South Ridge (Scatter Lake)"): the `bivy` array lists
-- 8 camps but only the first ("Scatter Lake basin") is for Abernathy Peak -- its own note
-- says outright "This is the camp for Abernathy Peak and it sits directly under both of its
-- routes." The remaining 7 entries are, by their OWN note text, camps for entirely different
-- Sawtooth-range summits reached from different trailheads: "Reynolds Creek upper basin" is
-- "the obvious camp for the Reynolds Peak scramble"; "Oval Lakes basin" is "the base for Oval
-- Peak"; "Libby Lake" is "the camp for both Raven Ridge routes and ... Hoodoo Peak"; "Upper
-- Eagle Lake and Horsehead Pass" is "the practical base for Switchback Mountain"; "Boiling Lake
-- basin" is "the high camp for Star Peak and Courtney Peak"; "Prince Creek Campground" is "the
-- lake-side gateway to Star, Courtney and the southern crest"; "Bird Creek Camp" is "the camp
-- for Devore Peak and Tupshin Peak" and explicitly says those two "are not a Sawtooth trip."
-- This is a whole-region camping guide attached wholesale to one route's bivy column. Trimmed
-- to the one entry that is actually this route's own camp; the route's own approach text
-- (Scatter Creek Trail to Scatter Lake) is unaffected and elevation/gain/distance were
-- independently confirmed (Wikipedia-cited 8,321 ft summit; ~11 mi/5,200 ft round trip matches
-- this row's own itinerary text and waypoint-derived gain almost exactly), so no other change.
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' IN ('Scatter Lake basin')
)
WHERE id = 'wa_abernathy_peak_south_ridge'
  AND bivy @> '[{"name": "Reynolds Creek upper basin"}]'::jsonb;


-- wa_action_potential (Burgundy Spire, East Face, "Action Potential"): dist_km stored as
-- 10.62 (6.6 mi), matching itinerary.days[0].miles=6.6 exactly and exactly double this
-- route's own waypoint-derived one-way distance to the summit (waypoints[5].distMi = 3.3).
-- Same doubling-bug shape already fixed with these EXACT numbers (10.62 -> 5.31) on the
-- sibling route wa_ultramega_ok, which shares this same Burgundy Col approach. Corrected to
-- half (3.3 mi = 5.31 km).
UPDATE routes SET dist_km = 5.31
WHERE id = 'wa_action_potential' AND dist_km = 10.62;

-- Same route: waypoints[5] ("Burgundy Spire Summit") elev stored as 8483 ft, but this row's
-- own high_point_ft is already 8492 -- an internal disagreement. 8,492 ft is the figure
-- independently confirmed on listsofjohn.com ("Burgundy Spire - 8,492' Washington") and
-- general web consensus, and is the same figure already applied to sibling route
-- wa_ultramega_ok's identical summit waypoint in a prior batch. Corrected to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{5,elev}', '8492'::jsonb)
WHERE id = 'wa_action_potential'
  AND waypoints->5->>'name' = 'Burgundy Spire Summit'
  AND waypoints->5->>'elev' = '8483';

-- Same route: two of six `bivy` entries are, by their own note text, explicitly NOT for this
-- route: "Upper Silver Star Creek basin camp" and "Lower Silver Star Creek basin" are each
-- labelled "EAST side, Silver Star only" and the first says outright "it is no use for the
-- Wine Spires on the west side" (Burgundy Spire is one of the Wine Spires; this route's own
-- approach is the west-side Burgundy Col line). Removing those two; the four remaining entries
-- (Burgundy Col high camp, Burgundy Creek bench camp, Upper scree benches below Burgundy Col,
-- Lone Fir Campground) are all west-side or general roadside camps consistent with this route's
-- own approach/waypoints.
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' NOT IN (
    'Upper Silver Star Creek basin camp — EAST side, Silver Star only',
    'Lower Silver Star Creek basin — EAST side, Silver Star only'
  )
)
WHERE id = 'wa_action_potential'
  AND bivy @> '[{"name": "Upper Silver Star Creek basin camp — EAST side, Silver Star only"}]'::jsonb;


-- wa_agnes_mountain_west_route ("West Route"): waypoints[1] ("Agnes Mountain summit") elev/
-- elevFt stored as 8131 ft, disagreeing with this row's own high_point_ft (8119 ft) and with
-- this route's own data_quality.gaps note, which already flags "Published elevation varies by
-- source (8,115-8,133 ft); area elevation left unchanged pending an authoritative figure."
-- Wikipedia gives the official NAVD88 elevation as 8,119 ft, matching this row's own
-- high_point_ft exactly -- so high_point_ft was already correct and the waypoint was the
-- outlier. Corrected to match.
UPDATE routes
SET waypoints = jsonb_set(
    jsonb_set(waypoints, '{1,elev}', '8119'::jsonb),
    '{1,elevFt}', '8119'::jsonb
  )
WHERE id = 'wa_agnes_mountain_west_route'
  AND waypoints->1->>'name' = 'Agnes Mountain summit'
  AND waypoints->1->>'elev' = '8131';

-- Same route: gain_ft stored as 4000, but loss_ft (a round trip should have gain ~= loss) is
-- 6500, and this row's OWN 4-day itinerary sums to ~6,700 ft of gain across its four days
-- (3400+3200+100+0), matching itinerary.totalNote's own "~6,500 ft gain to the 8,131 ft
-- summit" and this route's own waypoint-derived trailhead(1,650 ft)-to-summit rise (~6,469 ft
-- using the corrected 8,119 ft summit). gain_ft was the outlier; corrected to match loss_ft
-- and the itinerary's own totals.
UPDATE routes SET gain_ft = 6500
WHERE id = 'wa_agnes_mountain_west_route' AND gain_ft = 4000;

-- Same route: dist_km stored as 13.7 (8.51 mi one-way), but this route's own waypoint chain
-- gives a TRACK-DERIVED one-way summit distance of 14.66 mi (waypoints[1].distMi, tagged
-- distFrom:"track"), and the row's own 4-day itinerary independently totals ~34 mi round trip
-- (9.7+5+10.7+8.8), consistent with a ~14.7 mi one-way distance rather than 8.5 mi. This is a
-- remote, seldom-climbed peak with a genuinely long multi-day off-trail approach (confirmed by
-- the itinerary's own day-by-day brush/creek-crossing narrative); the current 8.51 mi one-way
-- figure is inconsistent with that entire picture. Corrected to match the track-derived
-- waypoint distance (14.66 mi = 23.59 km).
UPDATE routes SET dist_km = 23.59
WHERE id = 'wa_agnes_mountain_west_route' AND dist_km = 13.7;

-- Same route: two of six `bivy` entries are, by their own note text, explicitly for different
-- peaks not reached from this route's own West Fork Agnes Creek approach: "Swamp Creek Camp"
-- is "the base for NEEDLE PEAK, MOUNT LYALL ... and the ridge between them"; "Company Creek and
-- Hilgard Pass" is explicitly "the lower-valley approach to FLORA MOUNTAIN," a peak the note
-- says "does not start at High Bridge" the way this route does. Removing those two; the
-- remaining four (Purple Point/Harlequin, High Bridge Camp, Fivemile Camp -- explicitly "the
-- departure point for AGNES MOUNTAIN" -- and West Fork Agnes Creek, explicitly "the working
-- bivy zone for AGNES MOUNTAIN") are all legitimate general Stehekin-valley logistics or
-- directly relevant to this route.
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' NOT IN (
    'Swamp Creek Camp — the base for Needle Peak, Mount Lyall and Lyall Ridge',
    'Company Creek and Hilgard Pass — the lower-valley approach to Flora Mountain'
  )
)
WHERE id = 'wa_agnes_mountain_west_route'
  AND bivy @> '[{"name": "Swamp Creek Camp — the base for Needle Peak, Mount Lyall and Lyall Ridge"}]'::jsonb;

-- Same route: NOT fixed, flagged for human review below. This row's own data_quality.gaps
-- already says "No source confirms a distinct 'West Route' name; the only well-documented line
-- is the Beckey-recommended South Ridge via Asa Peak's NE ridge." Independent search confirms
-- Beckey's guide describes the standard/documented line on Agnes Mountain as following Asa
-- Peak's northeast ridge, then traversing to Agnes's south ridge -- which reads more naturally
-- as a "South Ridge" route than a "West Route," though the FA approach itself did go up the
-- West Fork of Agnes Creek drainage (a valid basis for a west-side name). Whether this route's
-- `name` (and by extension its `id`, wa_agnes_mountain_west_route) should be renamed to match
-- the documented line is an identity/naming decision, not a field patch -- same class as the
-- wa_cascade_peak_east_ridge / wa_boston_peak_southwest_face flags in batch 4. Left unfixed.


-- wa_alpine_lookout_round_mountain_trail ("Round Mountain Trail (Standard Route)"): three of
-- six `bivy` entries are, by their own note text, camps for other Nason Ridge summits, not
-- Alpine Lookout: "Rock Lake" is "the camp for Rock Mountain"; "Crescent Lake" is "the base
-- camp for both Mount Howard and Mount Mastiff"; "Mount Howard summit-area bivouac" is
-- explicitly for a Howard/Mastiff/Rock Mountain traverse push. Removing those three; the
-- remaining three (Merritt Lake -- explicitly "roughly three miles east to Alpine Lookout";
-- Alpine Lookout itself, the objective; and Nason Creek Campground, explicitly "the drive-in
-- base for the whole ridge" / "all four summits") are relevant to this route. This route's own
-- gain/distance/elevation were independently confirmed as internally consistent (waypoint
-- distMi=5 matches dist_km exactly, high_point_ft=6237 matches the waypoint elevation, and the
-- bivy entry for Alpine Lookout itself independently states "roughly ten miles round trip with
-- about 2,600 feet of gain," matching gain_ft and 2x dist_km almost exactly), so no other
-- change on this route.
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' NOT IN (
    'Rock Lake',
    'Crescent Lake',
    'Mount Howard summit-area bivouac'
  )
)
WHERE id = 'wa_alpine_lookout_round_mountain_trail'
  AND bivy @> '[{"name": "Rock Lake"}]'::jsonb;


-- wa_american_border_peak_northeast_face: checked, clean. Very sparse row (no grade,
-- pitches, gain_ft, dist_km, waypoints, or approach populated), but nothing populated
-- contradicts anything else on the row or elsewhere; no changes.


-- wa_american_border_peak_southeast_face ("Southeast Face / South Ridge"): `beta` opens
-- "The standard/easiest line on the peak, first climbed by Baker, Beckey, and Dudra in 1952" --
-- directly contradicting this row's own `fa` field, which reads "Alec Dalgleish, Tom Fyles,
-- Stan Henderson, R. A. Fraser — Sept 14, 1930 (peak's first ascent, via this line)".
-- Independent search (two separate queries) confirms the 1930 Dalgleish/Fyles/Henderson/Fraser
-- ascent as American Border Peak's first ascent (Wikipedia-cited); the fa field is correct.
-- The 1952 Baker/Beckey/Dudra claim in `beta` is not the peak's first ascent and its presence
-- alongside a correctly-attributed fa field describing this same line as "the peak's first
-- ascent, via this line" is an internal contradiction. Corrected beta's opening clause to match
-- the confirmed 1930 FA; the rest of beta's route description is unaffected.
UPDATE routes
SET beta = replace(
    beta,
    'first climbed by Baker, Beckey, and Dudra in 1952',
    'first climbed in 1930 by Alec Dalgleish, Tom Fyles, Stan Henderson, and R. A. Fraser — the peak''s first ascent'
  )
WHERE id = 'wa_american_border_peak_southeast_face'
  AND beta LIKE '%first climbed by Baker, Beckey, and Dudra in 1952%';


-- wa_amphitheater_mountain_finger_of_fatwa ("Finger of Fatwa", Middle Finger Buttress):
-- checked, clean. FA (Scott Bennett and Blake Herrington, 2011) independently confirmed via
-- Blake Herrington's own trip report blog (posted August 2011) and an AAC Publications summary.
-- length_m (152) is close to the AAC-cited 160 m, within normal guidebook rounding. dist_km
-- (27.4 km = 17.0 mi one-way) looked implausibly large at first glance for a 5-pitch route, but
-- is independently corroborated: this route's own approach text says the trailhead is Andrews
-- Creek, and external sources (AllTrails, WTA) independently confirm the Andrews Creek
-- Trail-to-Cathedral-Lakes approach is genuinely ~18-19 mi one-way, so 17.0 mi one-way to the
-- Middle Finger Buttress just beyond Upper Cathedral Lake is consistent rather than a doubling
-- error. No changes. (Noted but not fixed: three of this row's five waypoints -- "Middle Finger
-- Buttress area, above Upper Cathedral Lake" / "Middle Finger Buttress" / "Middle Finger
-- Buttress area (Amphitheatre Mtn routes)" -- share an identical coordinate and largely
-- overlapping meaning; likely redundant rather than wrong, left for a human de-duplication
-- decision rather than removed outright.)
