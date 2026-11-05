-- WA alpine audit batch 119 (pass 3): Chimney Rock (2 routes), Chiwawa Mountain,
-- North Early Winters Spire (Chockstone Route), Clark Mountain, Unicorn Peak, Lane Peak,
-- Colchuck Peak (Colchuck Glacier). See audits/wa-alpine-audit-log.md for the full writeup.
-- Pre-flight each statement with: npm run check:sql -- audits/sql/2026-08-14-batch-119.sql
--
-- IMPORTANT CONTEXT: every fix below was independently re-derived and re-verified against
-- a fresh live-DB read this run, but each one turns out to duplicate a fix already
-- proposed on 2026-08-06 (batches 57/58) that was never applied to the live DB.
-- Spot-checking ~8 UPDATE statements spanning batches 30 through 118 shows fixes through
-- roughly batch 55 (2026-08-06) landed live, and apparently nothing proposed from batch 56
-- onward -- over a week of audit output across dozens of batches -- has been applied
-- since. See the log entry for detail. Re-issuing these here since they are still correct
-- against current live data; a human may prefer to instead work through the existing
-- backlog in audits/sql/2026-08-06-batch-56.sql onward.

-- 1. wa_chimney_rock_west_face (routes.aspect): stored 'E', but the route's own name
-- ("West Face / South Summit"), its own approach text ("Pitch 1 ... on the west face"),
-- and its own descent_text ("Descend by reversing the West Face") all independently and
-- repeatedly describe this as the west-facing line. Duplicates the fix proposed in
-- audits/sql/2026-08-06-batch-57.sql.
UPDATE routes SET aspect = 'W'
WHERE id = 'wa_chimney_rock_west_face' AND aspect = 'E';

-- 2. wa_chimney_rock_east_face_direct (routes.emergency.nearestHospital): still names a
-- Cle Elum "hospital" ER. Kittitas Valley Healthcare's only emergency room is in
-- Ellensburg (603 S Chestnut St); the Cle Elum location is urgent care only, non-emergency
-- -- exactly what the sibling wa_chimney_rock_west_face route already states correctly on
-- the same field. Duplicates the fix proposed in audits/sql/2026-08-06-batch-57.sql.
UPDATE routes SET emergency = jsonb_set(
  emergency, '{nearestHospital}',
  '"Kittitas Valley Healthcare, Ellensburg (KVH also runs a smaller Urgent Care clinic in Cle Elum, non-emergency only)"'::jsonb
)
WHERE id = 'wa_chimney_rock_east_face_direct'
  AND emergency->>'nearestHospital' = 'Kittitas Valley Healthcare, 201 Alpha Way, Cle Elum, WA 98922 — (509) 674-5331';

-- 3. wa_chiwawa_mountain_southwest (routes.grade): stored 'Class 3-4 + glacier', but this
-- row's own overview ("non-glaciated, largely cross-country scramble"), pro_needs ("No
-- rope, rack, or crevasse-rescue gear is needed on this side of the mountain"), and
-- watch_out ("this is not the glaciated Lyman Glacier route -- no crevasse hazard on the
-- standard SW line") all agree the standard SW route has no glacier travel. Duplicates the
-- fix proposed in audits/sql/2026-08-06-batch-58.sql.
UPDATE routes SET grade = 'Class 3-4'
WHERE id = 'wa_chiwawa_mountain_southwest' AND grade = 'Class 3-4 + glacier';

-- 4. wa_chockstone_route (routes.rack, routes.detailed_rack): both still say cams
-- "0.5-3in", contradicted by this row's own `corrections` field, which already quotes
-- Mountain Project's route page verbatim: "single rack to 2 inches, draws for fixed pins".
-- Duplicates the fix proposed in audits/sql/2026-08-06-batch-58.sql.
UPDATE routes
SET rack = '["Cams 0.5–2in (single set, doubles of 0.5 & 0.75in)","Nut set","8 quickdraws (for fixed pins/bolts)","2x 60cm slings (tree-rap backup)","Single 60m rope"]'::jsonb,
    detailed_rack = 'A single cam rack from 0.5-2in (with doubles of the 0.5 and 0.75in sizes) plus a nut set covers the route, bring extra quickdraws for the fixed pins and bolts on the crux and upper pitches.'
WHERE id = 'wa_chockstone_route'
  AND detailed_rack = 'A single cam rack from 0.5-3in (with doubles of the 0.5 and 0.75in sizes) plus a nut set covers the route; bring extra quickdraws for the fixed pins and bolts on the crux and upper pitches.';

-- 5. wa_chockstone_route (routes.watch_out): stored as one newline-joined string instead
-- of a JSON array, unlike every other array field on this row -- lib/db.js's toArr() only
-- splits on commas, not newlines, so this rendered as one run-on blob instead of a
-- bulleted hazard list. Duplicates the fix proposed in audits/sql/2026-08-06-batch-58.sql.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_chockstone_route'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = 'Chockstone features create technical and exposed sections
Route-finding through chockstone terrain can be confusing
Weather exposure on exposed terrain
Loose rock hazard throughout approach and mixed sections
Descent route-finding critical in variable terrain';

-- 6. wa_classic_route_2 / Unicorn Peak (routes.rappels, routes.watch_out, routes.length_m):
-- safety-relevant. rappels and watch_out[0] still describe the rappel anchor as the
-- "bleached snag" on the summit block, contradicted by this row's own descent_text, which
-- already documents that anchor is no longer sound and the current, trip-report-
-- corroborated anchor is a rock horn. length_m (122) is also wildly inconsistent with the
-- row's own single 15 m pitch. Duplicates fixes proposed in
-- audits/sql/2026-08-06-batch-58.sql.
UPDATE routes
SET rappels = 'One rappel of about 40-50 ft (12-15 m) from the rock horn anchor on the south side of the summit block (backed with slings/webbing, sometimes rappel rings), the bleached/dead snag mentioned in older reports is no longer sound and should not be trusted. A 30m rope is generally enough to lead and rappel, though at least one report found a 30m rope fell just short and recommended 37-40m to be safe. There are effectively two rappel lines from the top (one to the notch/ground below the horn, one onto the glacier/snow-patch side), so confirm which station and its exact length before committing. Some parties downclimb the easier east side of the block instead and skip the rappel entirely.',
    corrections = COALESCE(corrections, '') || ' 2026-08-14 (pass 3, re-confirmed): rappels/pitch_detail[0].notes/watch_out[0] still described the deprecated "bleached snag" rappel anchor, this row''s own descent_text already documents it is no longer sound and the current anchor is a rock horn, propagated that correction to the three lagging fields (safety-relevant — duplicates an unapplied 2026-08-06 proposal).'
WHERE id = 'wa_classic_route_2'
  AND rappels = 'One rappel of about 50 ft (15 m) from the bleached snag on top of the summit block. A 30 m rope is stated as sufficient by Mountain Project; a trip report recommends 60 m because a 30 m rappel may not reach the ground where the moat is open. Some parties downclimb the easier east side of the block instead and skip the rappel entirely.';

UPDATE routes
SET pitch_detail = jsonb_set(
  pitch_detail, '{0,notes}',
  '"Blocky low-5th-class climbing up the south-southeast face of the summit block to the belay, the rappel anchor is a rock horn on the south side (the old bleached snag once used here is no longer sound and should not be trusted), one fixed piton mid-pitch."'
)
WHERE id = 'wa_classic_route_2'
  AND pitch_detail->0->>'notes' = 'Blocky low-5th-class climbing up the south-southeast face of the summit block to the belay/rappel anchor (old bleached snag); one fixed piton mid-pitch.';

UPDATE routes
SET watch_out = jsonb_set(
  watch_out, '{0}',
  '"The old wooden-snag rappel anchor is no longer sound, do not use it. The current anchor is a rock horn on the south side of the summit block."'
)
WHERE id = 'wa_classic_route_2'
  AND watch_out->>0 = 'Aging wooden-snag rappel anchor - inspect before trusting it';

UPDATE routes SET length_m = 15 WHERE id = 'wa_classic_route_2' AND length_m = 122;
