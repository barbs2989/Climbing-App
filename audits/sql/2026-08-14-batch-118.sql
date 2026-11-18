-- WA alpine audit batch 118 (pass 3): Chair Peak (5 routes), Chalangin Peak, Chelan Butte,
-- Chianti Spire. See audits/wa-alpine-audit-log.md for the full batch writeup.
-- Pre-flight each statement with: npm run check:sql -- audits/sql/2026-08-14-batch-118.sql

-- 1. wa_chair_peak_north_face (routes.dist_km): stored 10.78 km, but the route's own
-- approach text says "~2.5-3 mi one-way" to the base and its own waypoint list gives the
-- summit at distMi 3.3 (= 5.31 km). 10.78 is ~2x that (10.78/2 = 5.39, within 1.5% of
-- 5.31) -- looks like a round-trip figure got stored where dist_km must be one-way (the
-- app doubles it itself). Corrected to the route's own waypoint-derived one-way distance.
UPDATE routes SET dist_km = 5.31
WHERE id = 'wa_chair_peak_north_face' AND dist_km = 10.78;

-- 2. wa_chair_peak_northeast_buttress (routes.dist_km): same defect as #1. Approach text
-- says "2-2.5 mi" one-way; own waypoints give the summit at distMi 3.2 (= 5.15 km).
-- 10.46 is ~2x that (10.46/2 = 5.23, within 1.6% of 5.15). Corrected to match.
UPDATE routes SET dist_km = 5.15
WHERE id = 'wa_chair_peak_northeast_buttress' AND dist_km = 10.46;

-- 3. wa_chair_peak_north_face (routes.commitment, routes.grade): stored 'III', but this
-- is the classic moderate North Face (rock_grade 5.4, ice_grade AI2, max_angle 70), which
-- the row's own season note distinguishes from the harder "North Face Direct (5.9)"
-- variant. The Mountaineers' route page, American Alpine Institute's route profile, and
-- independent trip reports all describe the standard line as a "Grade II ice climb"; none
-- call it III. 'II' matches this catalog's standard bare-roman-numeral format (279 WA
-- routes). Fixed both columns, which duplicated the same wrong value.
UPDATE routes SET commitment = 'II', grade = 'II'
WHERE id = 'wa_chair_peak_north_face' AND commitment = 'III' AND grade = 'III';

-- 4. wa_chair_peak_northeast_buttress (routes.commitment): stored 'III'. Same class of
-- route as #3 (rock_grade 5.4, ice_grade AI2-3, max_angle 70); independent sources
-- describe it as "a Grade II ice climb with water ice up to 60°" -- same finding as its
-- sibling on the same peak/trailhead/era. NOT touching `grade`, which correctly holds the
-- separate summer-scramble rating 'Class 5.6'.
UPDATE routes SET commitment = 'II'
WHERE id = 'wa_chair_peak_northeast_buttress' AND commitment = 'III';

-- 5. wa_chelan_butte (areas.elevation_ft): stored 3812 ft, but this peak's own route
-- (wa_chelan_butte_chelan_butte_trail) already stores its summit waypoint at 3835 ft, and
-- three outside sources (SummitPost, willhiteweb.com, a hang-gliding site guide) agree on
-- 3,835 ft. Corrected the area row to match.
UPDATE areas SET elevation_ft = 3835
WHERE id = 'wa_chelan_butte' AND elevation_ft = 3812;

-- 6. wa_chelan_butte_chelan_butte_trail (routes.permit): scalar `permit` says "Northwest
-- Forest Pass" but this route's OWN `access` jsonb correctly identifies the land manager
-- as WDFW (Chelan Butte Wildlife Area) -- state land, not National Forest -- requiring a
-- Discover Pass / WDFW Vehicle Access Pass instead. A Northwest Forest Pass is a USFS
-- pass and doesn't apply. WDFW's own site confirms a Discover Pass is required on WDFW
-- land. Corrected permit to agree with this row's own access column.
UPDATE routes SET permit = 'No climbing or wilderness permit required. A Discover Pass or WDFW Vehicle Access Pass is required to park at the WDFW trailhead (this is Washington Dept of Fish & Wildlife land, not National Forest -- a Northwest Forest Pass does not apply here).'
WHERE id = 'wa_chelan_butte_chelan_butte_trail'
  AND permit = 'No climbing or wilderness permit required; Northwest Forest Pass (or day fee) to park at developed trailheads.';
