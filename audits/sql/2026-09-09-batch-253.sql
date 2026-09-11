-- WA alpine route audit -- batch 253 (pass 5)
-- Routes: wa_e_se_face, wa_east_face, wa_east_face_6,
-- wa_east_mcmillan_spire_west_ridge, wa_east_ridge_2, wa_east_ridge_3,
-- wa_east_ridge_4, wa_east_ridge_6

-- wa_east_ridge_2 (Snowking Mountain, East Ridge): the top-level permit field
-- is North Cascades National Park backcountry-permit boilerplate ("no permit
-- for day climbs; all overnight backcountry stays require a backcountry
-- permit... Marblemount Wilderness Information Center") -- but this row is
-- NOT in North Cascades National Park. Snowking Mountain is in the Glacier
-- Peak Wilderness, Mount Baker-Snoqualmie National Forest (confirmed via web
-- search: multiple sources -- Mountaineers.org, USFS -- give the land manager
-- as Mt. Baker-Snoqualmie NF, not NPS), which matches this row's OWN access
-- jsonb field: landManager/land_manager both say "Mount Baker-Snoqualmie
-- National Forest" and access.permit already correctly says "No climbing
-- permit required, but a free self-issued wilderness travel permit must be
-- filled out at the trailhead register when entering the Glacier Peak
-- Wilderness." The top-level permit column contradicts the row's own access
-- block and misstates which agency/land manager applies. Corrected to match
-- the row's own (correct) access.permit content.
UPDATE routes
SET permit = 'No climbing or wilderness permit required for day trips in the Glacier Peak Wilderness; a free self-issued wilderness travel permit must be filled out at the trailhead register on entry. Overnight camping along the route (e.g. Cyclone Lake basin) is dispersed/undesignated, with no quota system. Northwest Forest Pass (or $8 day-use fee) recommended for trailhead parking.'
WHERE id = 'wa_east_ridge_2'
  AND permit = 'North Cascades NP complex: no permit for day climbs; all overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).';

-- wa_east_face (Middle Peak / "Middle Gunsight", East Face): the top-level
-- permit field is NULL, while this row's own access.permit already states
-- "Free self-issued wilderness permit required for Glacier Peak Wilderness"
-- and access.parking_pass/passRequired note a recommended Northwest Forest
-- Pass. The fact is already present in the row; it was simply never copied
-- into the permit column that the app renders as the primary permit summary.
-- Populated from the row's own access block rather than researched fresh.
UPDATE routes
SET permit = 'Free self-issued Glacier Peak Wilderness permit required at the trailhead for day and overnight entry; no quota or fee. Recreation/Northwest Forest Pass ($5/day or $30/annual) recommended for trailhead parking.'
WHERE id = 'wa_east_face' AND permit IS NULL;

-- wa_e_se_face (Witches Tower, E/SE Face): dist_km is stored as 24.14 (15.00
-- mi one-way, which the app doubles to a displayed 30 mi round trip). This
-- row's own waypoint chain gives the one-way distance to its own Summit
-- waypoint as distMi=5.7 (Stuart Lake Trailhead -> Colchuck Lake at distMi=4
-- -> Aasgard Pass at distMi=5 -> Witches Tower Summit at distMi=5.7; 5.7 mi =
-- 9.17 km). This is independently corroborated externally: multiple sources
-- (e.g. Wenatcheeoutdoors.org's Witches Tower trip report) describe the
-- standard approach as Lake Stuart Trail (2.5 mi) to the Colchuck Lake Trail
-- turnoff, reaching Colchuck Lake (8.0 mi round trip = 4.0 mi one-way,
-- matching this row's own Colchuck Lake waypoint distMi=4 exactly), then a
-- steep climb of under a mile to Aasgard Pass, then a short traverse south to
-- the tower -- consistent with a ~5.7 mi one-way total and nowhere near the
-- stored 15 mi. There is no established alternate/loop return for this
-- climb (parties descend the way they came), so 24.14 km does not correspond
-- to any real feature of this route. Corrected to the row's own
-- waypoint-derived one-way distance.
UPDATE routes SET dist_km = 9.17
WHERE id = 'wa_e_se_face' AND dist_km = 24.14;

-- Flagged for human review, NOT auto-fixed (no confident, precisely-sourced
-- replacement value available):
--
-- wa_east_face (Middle Peak / "Middle Gunsight", East Face): three-way
-- elevation disagreement. areas.elevation_ft = 8185, this route's
-- high_point_ft = 8200 (a 15 ft gap between the area record and the route
-- record for the same summit), and the route's own Summit waypoint states
-- elev = 8000 (185-200 ft below both other records, at the very bottom edge
-- of the only external range found: multiple sources describe "Middle
-- Gunsight" only vaguely as "one of the Gunsight peaks located between
-- 8,000' and 8,200'," which is not precise enough to confidently pick a
-- single correct figure between the three stored values, or confirm any of
-- them exactly. WebFetch access to primary sources (Wikipedia, SummitPost,
-- CascadeClimbers, Beckey's guide) was blocked in this run's environment, so
-- this could not be resolved further; recommend a human check a primary
-- topo/guidebook source directly.
--
-- wa_east_face_6 (Chimney Rock, East Face): the row's own climbing_route
-- pitch-by-pitch narrative (step 4, "Summit pitches") explicitly states
-- "the hardest moves around 5.4 to 5.6 -- Grade II overall" -- directly
-- contradicting this row's own header fields (alpine_grade = "Grade IV",
-- commitment = "IV", rock_grade/grade = "5.3"), its own pitch_detail array
-- (three pitches graded 5.3 / 4th / 5.3, max 5.3), and its own corrections
-- field, which states "None -- grade matches the standard (non-Direct) East
-- Face route in available sources." So two DB-internal signals (pitch_detail
-- and corrections) support the current 5.3/Grade IV header, and a third
-- (climbing_route's own prose) contradicts it. External web search
-- attributes "Grade II, 5.6" to a Chimney Rock East Face route (Mountaineers.
-- org) whose structural details closely match this row (3 pitches, a 60 m
-- rope needed for the rappel descent, Chimney Glacier/moat approach, ~16-19
-- mi round trip, ~4,900-6,000 ft gain) -- but the same search also attributes
-- "Grade II, 5.6" to a separately-named "East Face Direct" variant, and
-- WebFetch access to the primary Mountaineers.org pages was blocked, so it
-- could not be determined with confidence whether the externally-sourced
-- "Grade II, 5.6" description is for this exact (non-Direct) line or is
-- being conflated with the Direct variant by the search summary. Given the
-- conflicting internal signals and the inability to directly verify the
-- external source, no change is made to alpine_grade/commitment/rock_grade;
-- recommend a human check Beckey's Cascade Alpine Guide or the
-- Mountaineers.org route pages directly to resolve which of the row's own
-- three internal accounts (header+pitch_detail+corrections vs.
-- climbing_route) is correct.
