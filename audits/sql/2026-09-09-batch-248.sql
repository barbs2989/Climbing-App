-- WA alpine audit — batch 248 (2026-09-09, pass 5)
-- Routes: wa_classic_route_2 (Unicorn Peak), wa_classic_route_3 (Lane Peak),
-- wa_colchuck_peak_colchuck_glacier, wa_colchuck_peak_east_ridge,
-- wa_colchuck_peak_holsten_hilden, wa_colchuck_peak_north_buttress_couloir,
-- wa_colchuck_peak_northeast_couloir (Colchuck Peak),
-- wa_colfax_peak_cosley_houston (Colfax Peak).
-- All WHERE clauses include the current (wrong) value, or a distinctive
-- prefix of it, as a safety check per project convention. Run
-- `npm run check:sql -- audits/sql/2026-09-09-batch-248.sql` before pasting
-- into the SQL Editor. New replacement text below avoids literal ";" and
-- "--" (the SQL Editor precheck's naive line/semicolon splitter does not
-- respect string-literal boundaries, so those characters inside a value
-- fragment the statement); a few WHERE-clause matches on old values that
-- legitimately contain ";" use a LIKE prefix ending just before it instead
-- of full-string equality, for the same reason.

-- =========================================================================
-- NOTE ON RE-PROPOSED FIXES: three of these (the wa_classic_route_2 rappel
-- anchor propagation, and the wa_colchuck_peak_east_ridge /
-- wa_colchuck_peak_north_buttress_couloir gain_ft corrections) were already
-- correctly diagnosed and proposed as SQL in prior batches: the
-- classic_route_2 fix originally in a 2026-08-06 batch, re-proposed
-- 2026-08-14 (batch 119); the two gain_ft fixes in 2026-08-19 (batch 120).
-- Live-queried today (2026-09-09), the database still shows the original,
-- unfixed values, meaning those proposed .sql files were never run against
-- the live database. Re-verified against the same reasoning (each row's own
-- waypoint/corrections-field internal consistency, unchanged since) and
-- re-proposed here, since the underlying facts have not changed and the
-- defects are still live. A human should confirm whether earlier batches'
-- SQL files are being run at all.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Unicorn Peak (wa_unicorn_peak) — wa_classic_route_2
-- -------------------------------------------------------------------------

-- Safety-relevant, still live: rappels, watch_out[0], and pitch_detail[0].notes
-- all still send climbers to the deprecated "bleached snag" rappel anchor,
-- contradicted by this row's own descent_text, which documents that anchor
-- is no longer sound and the current, trip-report-corroborated anchor is a
-- rock horn. Duplicates a fix first proposed 2026-08-06 and re-proposed
-- 2026-08-14 (batch 119) that was never applied.
UPDATE routes
SET rappels = 'One rappel of about 40-50 ft (12-15 m) from the rock horn anchor on the south side of the summit block (backed with slings/webbing, sometimes rappel rings). The bleached/dead snag mentioned in older reports is no longer sound and should not be trusted. A 30m rope is generally enough to lead and rappel, though at least one report found a 30m rope fell just short and recommended 37-40m to be safe. There are effectively two rappel lines from the top (one to the notch/ground below the horn, one onto the glacier/snow-patch side), so confirm which station and its exact length before committing. Some parties downclimb the easier east side of the block instead and skip the rappel entirely.'
WHERE id = 'wa_classic_route_2'
  AND rappels LIKE 'One rappel of about 50 ft (15 m) from the bleached snag on top of the summit block. A 30 m rope is reported sufficient%';

UPDATE routes
SET pitch_detail = jsonb_set(
  pitch_detail, '{0,notes}',
  '"Blocky low-5th-class climbing up the south-southeast face of the summit block to the belay. The rappel anchor is a rock horn on the south side (the old bleached snag once used here is no longer sound and should not be trusted). One fixed piton mid-pitch."'
)
WHERE id = 'wa_classic_route_2'
  AND pitch_detail->0->>'notes' LIKE 'Blocky low-5th-class climbing up the south-southeast face of the summit block to the belay/rappel anchor (old bleached snag)%';

UPDATE routes
SET watch_out = jsonb_set(
  watch_out, '{0}',
  '"The old wooden-snag rappel anchor is no longer sound. Do not use it. The current anchor is a rock horn on the south side of the summit block."'
)
WHERE id = 'wa_classic_route_2'
  AND watch_out->>0 = 'Aging wooden-snag rappel anchor - inspect before trusting it';

-- length_m (122, ~400 ft) is wildly inconsistent with this row's own single
-- 15m pitch (pitch_detail[0].lengthM = 15) and its own 40-50 ft rappel
-- description. Duplicates the same unapplied 2026-08-14 proposal.
UPDATE routes SET length_m = 15 WHERE id = 'wa_classic_route_2' AND length_m = 122;

-- -------------------------------------------------------------------------
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_east_ridge
-- -------------------------------------------------------------------------

-- gain_ft (2800) does not reconcile with this row's own trailhead waypoint
-- (Stuart Lake Trailhead, 3400 ft) and summit waypoint (Colchuck Peak,
-- 8705 ft): 5305 ft net. All sibling Colchuck Peak routes sharing this
-- identical trailhead/summit pair already carry ~5300-5305
-- (wa_colchuck_peak_colchuck_glacier: 5300, wa_colchuck_peak_northeast_
-- couloir: 5305). Duplicates the 2026-08-19 (batch 120) proposal for
-- gain_ft, which was never applied. loss_ft was not included in that
-- batch's fix and is corrected here too, since this route is an
-- out-and-back with no separate descent, so it should equal gain_ft
-- exactly as it does on every sibling.
UPDATE routes SET gain_ft = 5305 WHERE id = 'wa_colchuck_peak_east_ridge' AND gain_ft = 2800;
UPDATE routes SET loss_ft = 5305 WHERE id = 'wa_colchuck_peak_east_ridge' AND loss_ft = 2800;

-- -------------------------------------------------------------------------
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_holsten_hilden
-- -------------------------------------------------------------------------

-- grade ("Grade IV, M6, AI3+") is the opposite of what this row's own
-- corrections field documents as the decided value: "Kept Mountain
-- Project's III/WI3 as the primary listed value since it reflects current
-- guidebook consensus, with the AAC account's IV/AI3+ noted here as the FA
-- party's own grading." The stored grade is the rejected alternative, not
-- the documented decision. Duplicates the 2026-08-19 (batch 120) proposal,
-- never applied.
UPDATE routes SET grade = 'Grade III, WI3, M6'
WHERE id = 'wa_colchuck_peak_holsten_hilden' AND grade = 'Grade IV, M6, AI3+';

-- -------------------------------------------------------------------------
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_north_buttress_couloir
-- -------------------------------------------------------------------------

-- gain_ft (6600) is an outlier against the same trailhead/summit pair
-- (5305 ft net, matching every other Colchuck Peak sibling route). No
-- elevation loss/regain is described in the approach that would explain
-- the extra ~1,300 ft. A Wenatchee Outdoors trip report's "3,300 ft
-- tent-to-tent" from a camp near Colchuck Lake (5574 ft) corroborates a
-- total closer to 5,300-5,500 ft. Duplicates the 2026-08-19 (batch 120)
-- proposal for gain_ft, never applied. loss_ft (also 6600) was not
-- included in that batch's fix and is corrected here too, matching every
-- sibling's gain_ft = loss_ft pattern for this out-and-back peak.
UPDATE routes SET gain_ft = 5305 WHERE id = 'wa_colchuck_peak_north_buttress_couloir' AND gain_ft = 6600;
UPDATE routes SET loss_ft = 5305 WHERE id = 'wa_colchuck_peak_north_buttress_couloir' AND loss_ft = 6600;

-- -------------------------------------------------------------------------
-- Colchuck Peak (wa_colchuck_peak) — wa_colchuck_peak_northeast_couloir
-- -------------------------------------------------------------------------

-- watch_out is stored as a single newline-joined string (8 hazard
-- sentences) instead of a JSON array, the same schema defect previously
-- found and fixed on wa_chockstone_route ("watch_out was a newline-joined
-- string instead of a JSON array (5 hazard sentences) — converted"). Split
-- into a proper array, one hazard per element. Content unchanged except
-- each internal "; " has been normalized to ", " so the fix file itself
-- stays parseable by the SQL precheck tool; no fact or clause was altered.
UPDATE routes
SET watch_out = jsonb_build_array(
  'CRITICAL AVALANCHE TERRAIN: Slope angle of 35-45 degrees with extensive vertical relief and frequent terrain traps, couloir is prime avalanche slope with multiple fatal accidents (3 deaths in Feb 2023), only climb in ideal snow conditions with confirmed low/minimal avalanche hazard',
  'Entry and exit of steep couloir can be technical with snow or ice up to 60 degrees, difficult down-climbing if route-finding error occurs, requires excellent snow/ice judgment',
  'Rock and ice fall from walls above couloir, stay alert and compact party, position out of direct fall line, watch for ice/rock loosening due to solar warming',
  'Bergschrund crossing at glacier base, may be significant obstacle early/mid-season with potential fall hazard, probe and belay crossing if uncertain',
  'Late-season glacier becomes bare ice (July+), surface becomes extremely difficult and icy, crampons and ice tools essential, increased rockfall risk from warming',
  'Crevasses in upper Colchuck Glacier approach (though fewer than on other glacier routes), travel roped, probe continuously',
  'Limited escape options once committed to upper couloir, retreat can be hazardous in poor conditions, plan to turn back early if conditions deteriorate',
  'Navigation difficulty in whiteout conditions, few visual landmarks, GPS/map essential, descending in low visibility is particularly risky'
)
WHERE id = 'wa_colchuck_peak_northeast_couloir'
  AND jsonb_typeof(watch_out) = 'string';

-- -------------------------------------------------------------------------
-- Colfax Peak (wa_colfax_peak) — wa_colfax_peak_cosley_houston
-- -------------------------------------------------------------------------

-- Stale closure claim, confirmed via WebSearch against Cascadia Daily News
-- (2026-08-20, "Glacier Creek Road reopens following washout repairs") and
-- an official USFS release ("Forest Service Has Opened Glacier Creek
-- Road"): Glacier Creek Road (FR 39) was closed to vehicles at MP 3.0 for
-- flood-damage repairs from June 30, 2026, but the Forest Service completed
-- repairs and reopened it to vehicle traffic on August 20, 2026, three
-- weeks before this audit. This row's access.closures, road.status,
-- road.driveNote, and road.seasonalGate all still state the road is
-- currently closed through October 2026, which is now false. Updated to
-- reflect the reopening while preserving the washout history and the
-- caution to check current conditions given the repeated pattern.
UPDATE routes
SET access = jsonb_set(
  access, '{closures}',
  '"Glacier Creek Road (FR 39) has a history of washouts. December 2025 flood damage closed it to all vehicles at MP 3.0 (Glacier Creek bridge) to the Heliotrope Ridge Trailhead from June 30, 2026, but the Forest Service completed repairs and reopened it to vehicle traffic on August 20, 2026. Given the repeated washout history, check current Mt. Baker-Snoqualmie NF alerts before driving."'
)
WHERE id = 'wa_colfax_peak_cosley_houston'
  AND access->>'closures' LIKE 'Glacier Creek Road (FR 39) has a history of washouts%';

UPDATE routes
SET road = jsonb_set(
  road, '{status}',
  '"Gravel, seasonal, and historically washout-prone. A 2021 washout at mile 3.8 was patched with a single-lane bypass reopened in November 2023. December 2025 flood damage caused fresh washouts and the road was closed to all vehicles at the Glacier Creek bridge (MP 3.0) to the Heliotrope Ridge trailhead from June 30, 2026, but the Forest Service completed repairs and reopened it to vehicles on August 20, 2026. Check current MBS NF alerts before you drive, given the repeated washout history."'
)
WHERE id = 'wa_colfax_peak_cosley_houston'
  AND road->>'status' LIKE 'Gravel, seasonal, and historically washout-prone. A 2021 washout at mile 3.8 was patched with a single-lane bypass reopened in November 2023%';

UPDATE routes
SET road = jsonb_set(
  road, '{driveNote}',
  '"From the Glacier Public Service Center in Glacier, WA, go east on the Mt. Baker Highway (SR 542) about 1 mile to Forest Road 39 (Glacier Creek Road). Turn right and follow FR 39 for 8 miles to the Heliotrope Ridge trailhead (3,700 ft, parking on the left). The road was closed to vehicles at MP 3.0 for flood-damage repairs from June 30 to August 20, 2026 and has since reopened. Check current conditions before driving given its washout history."'
)
WHERE id = 'wa_colfax_peak_cosley_houston'
  AND road->>'driveNote' LIKE 'From the Glacier Public Service Center in Glacier, WA, go east on the Mt. Baker Highway (SR 542) about 1 mile to Forest Road 39 (Glacier Creek Road)%';

UPDATE routes
SET road = jsonb_set(
  road, '{seasonalGate}',
  '"Typically drivable late spring through fall. Washouts and winter conditions have repeatedly forced a longer walk-in, most recently a Jun 30-Aug 20, 2026 vehicle closure for flood-damage repairs (now reopened)."'
)
WHERE id = 'wa_colfax_peak_cosley_houston'
  AND road->>'seasonalGate' LIKE 'Typically drivable late spring through fall%';
