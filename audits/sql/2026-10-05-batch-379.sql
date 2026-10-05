-- WA alpine audit — batch 379 (2026-10-05, pass 7 — first batch of the new pass)
-- Routes checked: wa_a_servant_to_liberty; wa_abernathy_peak_south_ridge;
-- wa_accendo_lunae_lib_west_face_var; wa_action_potential;
-- wa_agnes_mountain_south_ridge; wa_alpine_lookout_round_mountain_trail;
-- wa_american_border_peak_northeast_face; wa_american_border_peak_southeast_face.
-- WHERE clauses include the current (wrong) value as a safety check, so each
-- statement is a no-op if the row has already changed.
-- Paste size >4KB soft limit -- split at the blank lines between fixes.

-- Abernathy Peak South Ridge: stored "Class 2" contradicts the route's own
-- prose ("gendarmes on loose rock", "downclimb the gendarme band") and
-- Lemke Climbs / Scott Kranz's WA100 page / WTA trip reports, all Class 3.
UPDATE routes SET grade = 'Class 3', grade_num = 3
WHERE id = 'wa_abernathy_peak_south_ridge' AND grade = 'Class 2' AND grade_num = 2;

-- Accendo Lunae West Face Var: FA party correct, date off by a month+.
-- CascadeClimbers.com TR and the AAJ/AAC Publications entry both date the
-- FA to September 5, 2012, not "late July".
UPDATE routes SET fa = 'Blake Herrington, Scott Bennett and Graham Zimmerman, September 5, 2012'
WHERE id = 'wa_accendo_lunae_lib_west_face_var'
  AND fa = 'Blake Herrington, Scott Bennett and Graham Zimmerman, late July 2012';

-- Action Potential (Burgundy Spire): high_point_ft (8492) disagrees with
-- this row's own summit waypoint (elev 8483) and the parent area row
-- (wa_burgundy_spire.elevation_ft = 8483). Peakbagger also gives 8483.
UPDATE routes SET high_point_ft = 8483
WHERE id = 'wa_action_potential' AND high_point_ft = 8492;

-- American Border Peak SE Face: access->land_manager (snake_case) claims
-- some upper routes cross into North Cascades National Park. Every named
-- feature (Twin Lakes, High Pass, Gargett Mine, Larrabee's west flank, the
-- South AmBo Saddle, the Great Chimney) sits in Mount Baker Wilderness,
-- ~40 miles from the NCNP boundary -- boilerplate bleed from another
-- Baker-area route. The separate camelCase `landManager` key is already
-- correct and untouched.
UPDATE routes
SET access = jsonb_set(access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness"')
WHERE id = 'wa_american_border_peak_southeast_face'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park';

-- verify: each of the 4 rows above should now show the corrected value
select id, grade, grade_num from routes where id = 'wa_abernathy_peak_south_ridge';
select id, fa from routes where id = 'wa_accendo_lunae_lib_west_face_var';
select id, high_point_ft from routes where id = 'wa_action_potential';
select id, access->>'land_manager' as land_manager from routes where id = 'wa_american_border_peak_southeast_face';
