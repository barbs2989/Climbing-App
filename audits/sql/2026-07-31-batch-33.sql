-- WA Alpine Audit — Pass 1, Batch 33 — 2026-07-31
-- Peaks: Mount Stuart (The Gendarme, West Ridge), Mount Teneriffe (Kamikaze
--        Trail, Standard Route), Mount Terror (North Face, East Ridge,
--        Stoddard Buttress, West Ridge), Mount Thomson (West Ridge),
--        Mount Tom (Glacier/Scramble Route)

-- =========================================================================
-- Mount Stuart
-- =========================================================================

-- wa_mount_stuart_west_ridge: approach text gives the Esmeralda/Ingalls Way
-- trailhead elevation as "~5,500 ft" -- wrong, and self-contradicted by the
-- very next sentence in the same field ("Longs Pass, 5 mi, ~2,100 ft gain
-- from the trailhead, cresting around 6,400 ft": 6,400 - 2,100 = ~4,300 ft,
-- not 5,500). External sources agree: the North Fork Teanaway Road end/
-- Esmeralda trailhead sits at 4,243 ft (mountainwerks.org's Mount Stuart
-- West Ridge route page; corroborated by AllTrails/other trip reports
-- showing the same road-end figure). Fixed to match both the internal math
-- and the external figure -- a targeted substring replace rather than
-- retyping the full field, both to avoid transcription risk and because the
-- field's own prose contains semicolons that a full-literal rewrite would
-- need to paste as one unbroken statement.
UPDATE routes
SET approach = replace(approach, 'North Fork Teanaway Road, ~5,500 ft', 'North Fork Teanaway Road, ~4,243 ft')
WHERE id = 'wa_mount_stuart_west_ridge'
  AND approach LIKE '%North Fork Teanaway Road, ~5,500 ft%';

-- wa_mount_stuart_west_ridge: the first waypoint ("Esmeralda Basin
-- Trailhead") stores lat/lng ~2.5 miles east of the real trailhead with an
-- elevation (3,200 ft) that matches neither that displaced point nor the
-- real trailhead -- the same "correct coordinate copied onto the wrong
-- point" bug found repeatedly in prior batches (Mount Index/Lago/Larrabee,
-- batch 27). This row's own approach_logistics field already has the
-- correct trailhead coordinates (47.43656, -120.93697); used those plus the
-- externally-confirmed 4,243 ft elevation to fix both the waypoint and the
-- matching first gpx point.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0}', '{"lat": 47.43656, "lng": -120.93697, "elev": 4243, "name": "Esmeralda Basin Trailhead", "type": "Trailhead", "distMi": 0}'::jsonb, false),
    gpx = jsonb_set(gpx, '{0}', '[47.43656, -120.93697]'::jsonb, false)
WHERE id = 'wa_mount_stuart_west_ridge'
  AND waypoints->0->>'name' = 'Esmeralda Basin Trailhead'
  AND (waypoints->0->>'lat')::numeric = 47.427
  AND (waypoints->0->>'elev')::numeric = 3200
  AND gpx->0 = '[47.427, -120.892]'::jsonb;

-- =========================================================================
-- Mount Terror
-- =========================================================================

-- wa_mount_terror_west_ridge and wa_mount_terror_stoddard_buttress: both
-- had a null top-level `grade` despite already having verified, mutually
-- consistent alpine_grade/rock_grade/commitment sub-fields on file -- the
-- same recurring enrichment-gap bug fixed in many prior batches (6, 10, 17,
-- 19, 26, 30, 31 among others). Filled using the exact "Grade <NCCS>,
-- <YDS>" format already used by this same peak's other two routes
-- (North Face: "Grade III, 5.7"; East Ridge: "Grade III-IV, 5.6"). Unlike
-- the West Ridge route on neighboring Mount Stuart (flagged below), both of
-- these rows have alpine_grade and commitment agreeing with each other, so
-- there is no internal conflict to resolve first.
UPDATE routes
SET grade = 'Grade II, 5.6'
WHERE id = 'wa_mount_terror_west_ridge'
  AND grade IS NULL
  AND alpine_grade = 'II'
  AND commitment = 'II'
  AND rock_grade = '5.6';

UPDATE routes
SET grade = 'Grade IV, 5.8'
WHERE id = 'wa_mount_terror_stoddard_buttress'
  AND grade IS NULL
  AND alpine_grade = 'IV'
  AND commitment = 'IV'
  AND rock_grade = '5.8';

-- =========================================================================
-- Flagged for human review (not auto-fixed)
-- =========================================================================
-- wa_mount_stuart_west_ridge: `itinerary`.days[0].schedule labels the start
--   point "Stuart Lake TH" and an early stop "Reach Stuart Pass" -- but this
--   route's own approach/approach_logistics/waypoints all consistently
--   describe the separate Esmeralda Basin/Ingalls Way trailhead, and the
--   approach text explicitly says the standard line stays "well short of"
--   Stuart Pass before cutting cross-country to the ridge. Looks like an
--   itinerary schedule contaminated from the North Ridge (or another Mount
--   Stuart route) entry, same family as prior batches' cross-route
--   contamination finds. Not rewritten -- correcting the schedule times
--   without a source for the Esmeralda-side timing would risk fabrication.
-- wa_mount_stuart_west_ridge: the row's own `grade` text leads with the
--   Roman numeral "III" (i.e. "III, 5.4-5.6") while `commitment` and
--   `alpine_grade` both separately store "II" -- an internal NCCS-grade
--   mismatch. No definitive external source found this pass giving the
--   route's grade (some cite II, others III depending on edition); needs a
--   human with guidebook access (Beckey's Cascade Alpine Guide) to settle
--   which is correct before touching either field.
-- wa_mount_terror_stoddard_buttress: `fa` splits this into two ascents --
--   "John Stoddard, solo, July 16, 1984" plus a separate "extended/left-side
--   finish variant... July 14-17, 1985" published in the AAJ as "North
--   Face, Left Side." Multiple secondary sources found this pass (search
--   engine summaries of AAC/NWMJ coverage) instead describe a single solo
--   push, July 14-17, dated to the 1984 season and reported in the AAJ's
--   1985 annual volume under that same "Left Side" title -- suggesting the
--   on-file two-ascent, two-year split may be a fabrication/conflation.
--   Every primary source (AAC Publications, alpenglow.org NWMJ, the
--   CascadeClimbers trip report, the AAJ 1985 PDF itself) returned 403 this
--   run, so this could not be confirmed directly against a primary account
--   -- left flagged rather than rewritten from indirect search-snippet
--   evidence alone.
-- wa_mount_terror_southeast_face (East Ridge): the row's own `corrections`
--   field already documents that its id ("southeast_face") doesn't match
--   its actual name/content ("East Ridge") -- re-confirmed still present
--   and unresolved this pass. Same long-running id/name-mismatch pattern as
--   Big Kangaroo, Colonial Peak, Corteo Peak, etc. in earlier batches --
--   needs a human rename decision, not a field patch.
-- wa_mount_thomson_west_ridge: `fa` credits "Fred Beckey, Helmy Beckey,
--   Robert Craig & William Ford, 1940." External sources independently
--   confirm Fred and Helmy Beckey climbed Mount Thomson's West Ridge in
--   1940 (matching year and 2 of 4 names), during the same multi-peak 1940
--   Cascades expedition that also bagged Forbidden Peak and several Picket
--   Range summits, but no source found this pass specifically places Robert
--   Craig or William Ford on this particular climb (as opposed to others on
--   the same trip). Not a contradiction, just an unconfirmed remainder --
--   noted for a future pass with guidebook/AAC-archive access rather than
--   flagged as wrong.
