-- WA alpine audit batch 315 (pass 6)
-- Routes: wa_classic_route_3, wa_colchuck_peak_colchuck_glacier,
--         wa_colchuck_peak_east_ridge, wa_colchuck_peak_holsten_hilden,
--         wa_colchuck_peak_north_buttress_couloir,
--         wa_colchuck_peak_northeast_couloir, wa_colfax_peak_cosley_houston,
--         wa_colfax_peak_kimchi_suicide_volcano

-- =========================================================================
-- Colfax Peak, Cosley-Houston Couloir -- wa_colfax_peak_cosley_houston
-- =========================================================================
-- road.status/driveNote/seasonalGate and access.closures all described the
-- Glacier Creek Road (FR 39) washout closure as 'expected to last through
-- October 2026'. Confirmed via WebSearch (official USFS release 'Forest
-- Service Has Opened Glacier Creek Road', corroborated by Cascadia Daily
-- News reporting and independent Aug/Sep 2026 trail-conditions posts) that
-- the Forest Service completed repairs and reopened the road to vehicles on
-- August 20, 2026 -- a month ahead of the stored 'expected' date, and about
-- a month before this audit ran (2026-09-20). Kept the washout history for
-- context, updated only the current-status claim.
UPDATE routes SET road = jsonb_set(jsonb_set(jsonb_set(road,
    '{status}', '"Gravel, seasonal, and historically washout-prone. A 2021 washout at mile 3.8 was patched with a single-lane bypass reopened in November 2023. December 2025 flood damage caused fresh washouts and a closure to all vehicles at the Glacier Creek bridge (MP 3.0), but the Forest Service completed repairs and reopened the road to vehicles on August 20, 2026. Expect potholes and rough pavement for the first several miles. Check current MBS NF alerts before you drive, given the repeat history of washouts."'::jsonb, false),
    '{driveNote}', '"From the Glacier Public Service Center in Glacier, WA, go east on the Mt. Baker Highway (SR 542) about 1 mile to Forest Road 39 (Glacier Creek Road), turn right, and follow FR 39 for 8 miles to the Heliotrope Ridge trailhead (3,700 ft, parking on the left) -- the road reopened to vehicles in August 2026 after washout repairs, but expect potholes."'::jsonb, false),
    '{seasonalGate}', '"Typically drivable late spring through fall. Washouts and winter conditions can still force a longer walk-in, though the 2026 repair closure from the December 2025 flood damage ended when the Forest Service reopened the road to vehicles on August 20, 2026."'::jsonb, false)
  WHERE id = 'wa_colfax_peak_cosley_houston'
    AND road->>'status' = 'Gravel, seasonal, and historically washout-prone. A 2021 washout at mile 3.8 was patched with a single-lane bypass reopened in November 2023, but December 2025 flood damage caused fresh washouts: as of June 30, 2026 the road is closed to all vehicles at the Glacier Creek bridge (MP 3.0) to the Heliotrope Ridge trailhead for repairs, expected to last through October 2026, though pedestrians, bikes, and e-bikes are allowed through at Forest Service discretion. Check current MBS NF alerts before you drive.'
    AND road->>'driveNote' = 'From the Glacier Public Service Center in Glacier, WA, go east on the Mt. Baker Highway (SR 542) about 1 mile to Forest Road 39 (Glacier Creek Road); turn right and follow FR 39 for 8 miles to the Heliotrope Ridge trailhead (3,700 ft, parking on the left) -- note the road is currently closed to vehicles at MP 3.0, so budget extra time/distance to walk or bike in.'
    AND road->>'seasonalGate' = 'Typically drivable late spring through fall; washouts, winter conditions, and the current 2026 repair closure can force a longer walk-in.';

UPDATE routes SET access = jsonb_set(access, '{closures}',
    '"Glacier Creek Road (FR 39) has a history of washouts. December 2025 flood damage triggered a closure to all vehicles at MP 3.0 (Glacier Creek bridge) starting June 30, 2026. The Forest Service completed repairs and reopened the road to vehicles on August 20, 2026 -- check current Mt. Baker-Snoqualmie NF alerts before driving given the road''s repeat history of washouts."'::jsonb, false)
  WHERE id = 'wa_colfax_peak_cosley_houston'
    AND access->>'closures' = 'Glacier Creek Road (FR 39) has a history of washouts; December 2025 flood damage triggered a new closure to all vehicles at MP 3.0 (Glacier Creek bridge) to the Heliotrope Ridge Trailhead starting June 30, 2026, expected through October 2026, with pedestrian/bike access allowed at Forest Service discretion -- check current Mt. Baker-Snoqualmie NF alerts before driving.';

-- =========================================================================
-- Colfax Peak, Kimchi Suicide Volcano -- wa_colfax_peak_kimchi_suicide_volcano
-- =========================================================================
-- Same Glacier Creek Road (shared with Cosley-Houston/Polish Route, same
-- trailhead) carried the stale 'closed... as of July 2026' claim with no end
-- date. Same USFS-sourced correction as above: reopened to vehicles Aug 20,
-- 2026.
UPDATE routes SET road = jsonb_set(jsonb_set(road,
    '{status}', '"Reopened to vehicles August 20, 2026 after washout repairs (closed since December 2025 flood damage). Rough, potholed surface reported for the first several miles."'::jsonb, false),
    '{driveNote}', '"From Glacier, WA on SR 542, turn onto Glacier Creek Road (FS-39) toward the Heliotrope Ridge trailhead. The road reopened to vehicles in August 2026 after washout repairs, but check current Mt. Baker-Snoqualmie NF alerts before driving given its history of washouts."'::jsonb, false)
  WHERE id = 'wa_colfax_peak_kimchi_suicide_volcano'
    AND road->>'status' = 'Closed to vehicles at mile 3 for washout repairs (as of July 2026)'
    AND road->>'driveNote' = 'From Glacier, WA on SR 542, turn onto Glacier Creek Road (FS-39) toward the Heliotrope Ridge trailhead; check current Mt. Baker-Snoqualmie NF alerts before driving due to the active closure.';

UPDATE routes SET access = jsonb_set(access, '{closures}',
    '"Glacier Creek Road (FS-39) was closed to vehicles at mile 3 for washout repair from a December 2025 flood. The Forest Service reopened the road to vehicles on August 20, 2026 \u2014 verify current status with the Mt. Baker Ranger District before driving given the road''s repeat washout history."'::jsonb, false)
  WHERE id = 'wa_colfax_peak_kimchi_suicide_volcano'
    AND access->>'closures' = 'Glacier Creek Road (FS-39) closed to vehicles at mile 3 for washout repair as of July 2026 — verify current status with the Mt. Baker Ranger District before driving.';

-- =========================================================================
-- Colchuck Peak, Holsten-Hilden -- wa_colchuck_peak_holsten_hilden
-- =========================================================================
-- The row's own `corrections` field states a resolved grade conflict --
-- 'Kept Mountain Project's III/WI3 as the primary listed value ... with the
-- AAC account's IV/AI3+ noted here as the FA party's own grading' -- and
-- `alpine_grade` already reflects that decision ('Grade III (Alpine); FA
-- account graded Grade IV'). But `grade`, `commitment`, and `ice_grade` were
-- never updated and still show the AAC's IV/AI3+ values, contradicting the
-- row's own stated decision. Confirmed the decision is still current via
-- WebSearch (route is graded WI3 M6 Steep Snow on Mountain Project).
-- `alpine_grade` and `corrections` are already correct and untouched.
UPDATE routes SET grade = 'Grade III, WI3, M6', commitment = 'III', ice_grade = 'WI3'
  WHERE id = 'wa_colchuck_peak_holsten_hilden'
    AND grade = 'Grade IV, M6, AI3+'
    AND commitment = 'IV'
    AND ice_grade = 'AI3';

-- =========================================================================
-- Colchuck Peak, East Ridge (Non-Technical) -- wa_colchuck_peak_east_ridge
-- =========================================================================
-- NEEDS HUMAN VERIFICATION (not fixed here, see audit log): this route id
-- and wa_colchuck_peak_colchuck_glacier both describe Colchuck Peak's 1948
-- first-ascent line (identical FA party/date) under two different names,
-- with materially different gain_ft/dist_km/grade -- looks like a duplicate
-- route pair. Left both rows untouched pending a human merge decision
-- (guardrails here forbid deletes).
--
-- What IS fixed: this row's own `corrections` field already documents that
-- its given name is wrong and that it is actually the Colchuck Glacier /
-- Beckey 'East Route' -- and every other populated field on this row
-- (waypoints, pitch_detail, descent_text, gpx, approach, gear) already
-- describes that glacier ascent, not a rock ridge. Only `overview` and
-- `beta` were never updated and still describe a fictional 'east ridge'
-- rock scramble ('ridge crest', 'good friction' granite) found nowhere in
-- Mountain Project, SummitPost, or Wikipedia's descriptions of this route
-- (all confirmed via WebSearch), and contradicted by this row's own
-- pitch_detail/waypoints. Replaced with text re-homed from this row's own
-- already-verified approach/pitch_detail/descent_text fields -- no new
-- facts introduced.
UPDATE routes SET overview = 'Beckey''s "East Route," almost universally known today as the Colchuck Glacier Route -- Colchuck Peak''s original 1948 first-ascent line (Elvin R. Johnson, Norma Johnson, William A. Long, and Kathy Long) and its standard non-technical way to the summit. From Colchuck Lake, gain the lateral moraine and follow the Colchuck Glacier''s east lobe to the Colchuck-Dragontail col, then finish with a short Class 2-3 scramble to the summit. Ice axe and crampons are standard for the glacier.', beta = 'From Colchuck Lake''s north shore, cross the boulder field at the south end and gain the crest of the lateral moraine, then follow it to the toe of the Colchuck Glacier. Ascend the glacier''s east (left) lobe, staying climber''s right to reduce exposure to rockfall off Dragontail Peak, to the Colchuck-Dragontail col (Colchuck Col/Banshee Pass). From the col, a short Class 2-3 scramble on generally solid granite leads to the summit. Descend the same way.'
  WHERE id = 'wa_colchuck_peak_east_ridge'
    AND overview = 'Colchuck Peak is primarily known for its technical alpine routes and glaciated approaches, but the East Ridge provides a non-technical Class 2-3 scrambling alternative for parties seeking to reach the summit without technical climbing. This route is less traveled than the technical options.'
    AND beta = 'From Colchuck Lake, traverse south-west to the east ridge base. Follow the ridge crest, negotiating Class 2-3 scrambling terrain. Several sections require hands but no protection needed. The granite is generally solid with good friction. Descent retraces the ascent.';

