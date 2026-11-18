-- WA alpine audit — batch 185 (pass 4)
-- Routes: wa_concord_tower_north_face, wa_copper_peak_south_route,
-- wa_corteo_peak_southwest_ridge, wa_crater_mountain_standard_route,
-- wa_crooked_thumb_peak_east_face, wa_crooked_thumb_peak_south_route,
-- wa_cutthroat_peak_cauthorn_wilson_couloir, wa_cutthroat_peak_northeast_face,
-- wa_cutthroat_peak_southeast_buttress, wa_cutthroat_south_buttress

-- ============================================================================
-- wa_copper_peak_south_route: `corrections` was a stale peak-identity-ambiguity
-- flag left by a prior pass, asking whether this route is Olympics' Copper
-- Mountain (Class 2-3, non-technical) or the Entiat Mountains' Copper Peak
-- (glaciated SE route). Now independently confirmed: Wikipedia/search give
-- Copper Peak at 8,965 ft in the Entiat Mountains, first ascended August 1937
-- by Franklin Bennet, Edgar Courtwright and Toivo Hagman -- exact matches for
-- this row's high_point_ft (8965) and fa field. The area's own coordinates
-- (48.1745741, -120.803989, path ...wa_chiwawa_entiat_region...) also place it
-- in the Entiat Mountains near Holden Village/Railroad Creek, not the Olympics
-- (~47.8N/-123.7W). The row's own grade ("Class 3-4"), face ("Southeast
-- Glacier/Face") and overview text already correctly describe the glaciated
-- Entiat peak, not the non-technical Olympics one the stale note worried about.
-- Ambiguity resolved; note no longer describes anything true about this row.
UPDATE routes
SET corrections = NULL
WHERE id = 'wa_copper_peak_south_route'
  AND corrections = 'Search results were ambiguous between multiple Washington peaks named ''Copper'' (Olympics Copper Mountain Class 2-3 vs. North Cascades Copper Peak SE Glacier route, which is glaciated and roped). Given the route name and Class 2-3 grade matching the Olympics Copper Mountain, treated as non-technical; flagging peak-identity ambiguity for verification against the DB''s area coordinates.';

-- ============================================================================
-- wa_crater_mountain_standard_route: `grade`/`grade_num`/`grade_system` were
-- all null despite Crater Mountain's Southeast Ridge/Jackita Ridge route being
-- a well-documented named difficulty. Multiple independent trip-report sources
-- describe a "300'-400' vertical step in the ridge a short distance below the
-- summit" marked with painted arrows as "class 2-3 (with exposure)", one
-- calling it "no more than exposed class 3" -- the rest of the route is a
-- maintained trail. Elevation (8,132 ft) and gain_ft (6400, close to the
-- trailhead-to-summit net rise of 6,232 ft from the row's own Canyon Creek
-- Trailhead waypoint at 1,900 ft) are already correct and unchanged.
UPDATE routes
SET grade = 'Class 2-3', grade_num = 3, grade_system = 'class'
WHERE id = 'wa_crater_mountain_standard_route'
  AND grade IS NULL AND grade_num IS NULL AND grade_system IS NULL;

-- ============================================================================
-- wa_crooked_thumb_peak_east_face: `grade`/`grade_num`/`grade_system` were all
-- null even though the row's OWN `beta` field already quotes the source
-- verbatim -- "climbed directly up the east face from the glacier (class
-- 3-4)" -- attributed to the July 31, 1963 Mountaineers first ascent
-- (Jackson, Jensen, Marts, Schmechel), which independent search confirms from
-- the AAC Publications Northern Pickets account of that same climb. The grade
-- was documented in prose but never populated into the structured field.
UPDATE routes
SET grade = 'Class 3-4', grade_num = 4, grade_system = 'class'
WHERE id = 'wa_crooked_thumb_peak_east_face'
  AND grade IS NULL AND grade_num IS NULL AND grade_system IS NULL;

-- ============================================================================
-- Four Cutthroat Peak routes -- South Buttress, Southeast Buttress, East Face
-- (id: northeast_face), and Cauthorn-Wilson Couloir -- all carry the IDENTICAL
-- `beta` string: "Grade II, 5.7 climbing. Short approach from highway. Rock
-- improves significantly higher on ridge. Fair granite in approach, improves
-- on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded
-- route." That text is a real, plausible description -- but not of any of
-- these four. It matches Cutthroat Peak's WEST RIDGE instead (Grade II, Class
-- 5+/5.5-5.7 crux, reached via a short gully off the same Blue Lake Trailhead
-- approach per SummitPost/Mountaineers) -- a route NOT in this batch, whose
-- own row also carries this exact text (left untouched; presumably its
-- rightful home, to be confirmed when wa_cutthroat_west_ridge comes up next
-- batch). On these four routes it is actively wrong: South Buttress is a
-- 12-pitch 5.7-5.8 buttress route, Southeast Buttress is Grade III 5.8,
-- East Face is Grade III 5.10 rock climbing established by Bard/Chouinard/
-- Cunningham in 1976, and Cauthorn-Wilson Couloir is a Grade III+ WI3-WI4 SNOW
-- AND ICE couloir -- the beta's claim of "fair granite" and "rock improves"
-- cannot describe an ice route at all. (The same string was also found, via a
-- catalog-wide search, duplicated onto two out-of-state, out-of-scope crag
-- routes -- az_cutthroat_trout and ar_cutthroat -- left untouched here as
-- outside this audit's WA alpine/mountaineering scope.) Nulled rather than
-- replaced with invented prose, per this repo's standing convention for
-- contamination that cannot be traced to a single correct source per row.
UPDATE routes
SET beta = NULL
WHERE id IN (
  'wa_cutthroat_south_buttress',
  'wa_cutthroat_peak_southeast_buttress',
  'wa_cutthroat_peak_northeast_face',
  'wa_cutthroat_peak_cauthorn_wilson_couloir'
)
AND beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.';

-- ============================================================================
-- wa_cutthroat_peak_northeast_face: `grade` was stored as bare "III" with no
-- YDS technical rating, and grade_num/grade_system were both null -- despite
-- this row's OWN `corrections` field already asserting "grade (III 5.10, 6
-- pitches) ... match the real, documented 'East Face'" (i.e. a prior pass
-- believed this was already fixed, but the correction note's claim and the
-- actual stored grade disagreed). Independently confirmed: this route (Bard,
-- Chouinard, Cunningham, 1976) is uniformly described as Grade III, 5.10, 6
-- pitches, two of which are 5.10 -- matching the row's own pitches=6.
UPDATE routes
SET grade = 'III 5.10', grade_num = 10, grade_system = 'yds'
WHERE id = 'wa_cutthroat_peak_northeast_face'
  AND grade = 'III' AND grade_num IS NULL AND grade_system IS NULL;

-- ============================================================================
-- wa_cutthroat_peak_southeast_buttress: `grade` was stored as bare "III" with
-- no YDS rating, grade_num/grade_system null. The Mountaineers' own route page
-- for Cutthroat Peak/Southeast Buttress gives it as Grade III, 5.8 (easy
-- scrambling to a short steep face, a large ledge, "Tarzan Jump," then mixed
-- 3rd/4th/5th class to the summit) -- consistent, single-sourced, unambiguous.
UPDATE routes
SET grade = 'III 5.8', grade_num = 8, grade_system = 'yds'
WHERE id = 'wa_cutthroat_peak_southeast_buttress'
  AND grade = 'III' AND grade_num IS NULL AND grade_system IS NULL;

-- verify
SELECT id, corrections FROM routes WHERE id = 'wa_copper_peak_south_route';
SELECT id, grade, grade_num, grade_system FROM routes WHERE id = 'wa_crater_mountain_standard_route';
SELECT id, grade, grade_num, grade_system FROM routes WHERE id = 'wa_crooked_thumb_peak_east_face';
SELECT id, beta FROM routes WHERE id IN (
  'wa_cutthroat_south_buttress','wa_cutthroat_peak_southeast_buttress',
  'wa_cutthroat_peak_northeast_face','wa_cutthroat_peak_cauthorn_wilson_couloir'
);
SELECT id, grade, grade_num, grade_system FROM routes WHERE id = 'wa_cutthroat_peak_northeast_face';
SELECT id, grade, grade_num, grade_system FROM routes WHERE id = 'wa_cutthroat_peak_southeast_buttress';
