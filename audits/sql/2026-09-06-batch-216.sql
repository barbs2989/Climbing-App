-- Batch 216 (pass 4): Mount Shuksan (North Face, Northeast Ridge, Northwest Arete,
-- Price Glacier, Sulphide Glacier, White Salmon Glacier), Mount Spickard (Silver
-- Glacier, Southwest Route/Silver Lake).
--
-- Verified against: WebSearch corroboration (Britannica/multiple sources for Mount
-- Shuksan's 9,131 ft summit elevation; Wikipedia/PeakVisor for Mount Spickard's
-- 8,979-8,980 ft elevation, 4,779 ft prominence, and 1904 Reaburn first ascent;
-- Alpinist/American Alpine Institute/CascadeClimbers for the 2007 Berdinka/Alford
-- "Northwest Arayete" FA, confirming this project's own beta text is accurate; NPS
-- fee-schedule search confirming the $10/person + $6 reservation backcountry permit
-- fee is current; Mountaineers.org/AllTrails/mountainproject-adjacent search results
-- for the White Salmon Glacier's actual approach), plus each row's own other fields
-- (sibling routes on the same peak, and this project's own approach_variants/
-- descent_text/road fields, which is how the White Salmon Glacier trailhead error
-- below was first spotted -- its own approach_variants text explicitly flags the
-- approach column as wrong).
--
-- NOT fixed, flagged for human review instead (sources conflict or can't be pinned
-- down, so no SQL written per audit instructions):
--   * wa_mount_spickard_southwest.overview says the peak was renamed in 1963 for
--     "Warren J. Spickard Jr."; the AAC's own 1961/1962 obituary of him is titled
--     "Warren B. Spickard, 1918-1961" (no "Jr."), and other secondary sources repeat
--     "Warren J. Spickard Jr." and give the renaming year as 1963 or 1964
--     inconsistently. Genuinely conflicting sources on a person's own name -- left
--     alone.
--   * wa_mount_shuksan_price_glacier.road.status describes "FR 32 has a longstanding
--     washout roughly 2.3 miles in, near Ruth Creek ... travel beyond that point is
--     on foot." A completed USFS "Hannegan Pass Washout Bypass" project (decision
--     signed 2024-09-24) reconstructed vehicle access around a washout on this same
--     road system, but it's not clear from available sources whether that project
--     addressed this exact washout (vs. one further up FR 32 toward the separate
--     Hannegan Pass Trailhead) or what today's drivable distance actually is. Not
--     confident enough to write a specific replacement distance/status.
--
-- NOTE: string/jsonb literals below deliberately avoid embedded semicolons -- the
-- checker (scripts/check-sql-targets.mjs) splits statements on bare ";".

-- wa_mount_shuksan_northwest_arete: the summit waypoint ("Mount Shuksan summit
-- pyramid") stores elev/elevFt 9127, four feet off Mount Shuksan's externally
-- confirmed 9,131 ft summit elevation (Britannica and other sources). Four of this
-- same peak's five other routes in this batch agree on 9131 in both their
-- high_point_ft column and their own summit waypoint (North Face, Northeast Ridge,
-- Price Glacier, Sulphide Glacier all store 9131 both places). Corrected to match.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{1,elev}', '9131'::jsonb),
      '{1,elevFt}', '9131'::jsonb
    )
WHERE id = 'wa_mount_shuksan_northwest_arete'
  AND waypoints->1->>'name' = 'Mount Shuksan summit pyramid'
  AND (waypoints->1->>'elev')::numeric = 9127
  AND (waypoints->1->>'elevFt')::numeric = 9127;

-- wa_mount_shuksan_white_salmon_glacier: two separate defects on this row.
--
-- (1) Its own summit waypoint ("Mount Shuksan") stores elev 9127, the same four-foot
-- discrepancy as above, while this row's own high_point_ft column already correctly
-- stores 9131 -- i.e. the row disagrees with itself. Corrected the waypoint to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{4,elev}', '9131'::jsonb)
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND high_point_ft = 9131
  AND waypoints->4->>'name' = 'Mount Shuksan'
  AND waypoints->4->>'type' = 'Summit'
  AND (waypoints->4->>'elev')::numeric = 9127;

-- (2) The `approach` column and the waypoints[0] Trailhead entry both describe
-- reaching this route via "Lake Ann Trail south over Austin Pass" -- but this row's
-- own approach_variants[0].notes field explicitly says this is wrong: "Note that the
-- record on file for this route describes going south past Lake Ann and over Austin
-- Pass. That is not the way parties reach the White Salmon Glacier; the drainage is
-- entered from the White Salmon side of the highway." That correction is itself
-- corroborated three more ways within this same row -- descent_text ends "...out
-- around the clearcut to the White Salmon pull-off" (not Lake Ann), and road.name/
-- road.driveNote both describe the White Salmon Road pull-off, not Lake Ann -- and
-- externally (WebSearch: "The White Salmon glacier route begins at the White Salmon
-- day lodge in the Mt. Baker ski area"; Lake Ann Trail is the separate Fisher
-- Chimneys approach to Shuksan's south side, only used here as one descent option).
-- This project's own sibling route on the same peak, wa_mount_shuksan_north_face,
-- already stores the correct, verified trailhead waypoint for this exact spot
-- (White Salmon Road hairpin TH, lat 48.8595 / lng -121.648 / elev 3500 ft) -- reused
-- here rather than inventing new coordinates. The replacement `approach` text is
-- re-homed from this row's own approach_variants[0].notes (condensed to match the
-- concise style of this route's siblings), preserving the on-file high-camp detail
-- that approach_variants doesn't mention.
UPDATE routes
SET approach = 'Park near the White Salmon day-lodge area on SR 542 (White Salmon Road, FS 3075), just before the White Salmon lodge in the Mount Baker Ski Area. Walk around the gate and follow the old road about a mile to where it ends at an old clearcut. With good snow cover, drop northeast into the White Salmon Creek valley and follow it toward the toe of the White Salmon Glacier. Without good cover, hold your elevation and contour around the clearcut instead, since the valley bottom turns to brush once the snow is gone. High camp/bivy sites sit at roughly 6,500 ft on the moraine above the glacier.',
    waypoints = jsonb_set(waypoints, '{0}', '{"lat": 48.8595, "lng": -121.648, "elev": 3500, "name": "White Salmon Road (hairpin) TH", "type": "Trailhead", "distMi": 0}'::jsonb)
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND approach = 'South to Lake Ann, then west to glacier camp. Hike Lake Ann Trail south over Austin Pass (4,700 ft). At ~2 miles cross small creek, hike up small stream and over ridge to Lake Ann. Continue to high camp at ~6,500 ft on moraine above White Salmon Glacier.'
  AND waypoints->0->>'name' = 'Lake Ann Trailhead (Austin Pass)';

-- wa_mount_spickard_southwest: two separate defects on this row.
--
-- (1) The row's own `corrections` field states: "...the first ascent of this specific
-- southwest line is not clearly established -- a 1941 Beckey brothers ascent 'from the
-- southwest' ... is mentioned in secondary sources but is not confirmed as this
-- route's first ascent, so 'fa' has been left null rather than guessed." But the `fa`
-- column is NOT null -- it stores exactly that unconfirmed 1941 Beckey claim
-- ("Fred Beckey and Helmi Beckey, June 21, 1941..."), contradicting the row's own
-- documented editorial decision. Nulled to match what `corrections` says was done.
UPDATE routes
SET fa = NULL
WHERE id = 'wa_mount_spickard_southwest'
  AND fa = 'Fred Beckey and Helmi Beckey, June 21, 1941 (first recorded ascent via the southwest side, made right after their first ascent of Northwest Mox)';

-- (2) The summit waypoint ("Mount Spickard") stores elev 8983, contradicting this same
-- row's own high_point_ft (8979) AND its own `corrections` field, which says
-- "Sources vary slightly on summit elevation (8,979-8,983 ft...) -- this page uses
-- 8,979 ft, the traditional Wikipedia figure (matches the given coordinates closely)."
-- The sibling wa_mount_spickard_silver_glacier route's summit waypoint already stores
-- 8979/8979 (elev/elevFt) at essentially the same coordinates. Corrected to 8979 to
-- match the row's own stated decision and its sibling.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{6,elev}', '8979'::jsonb)
WHERE id = 'wa_mount_spickard_southwest'
  AND high_point_ft = 8979
  AND waypoints->6->>'name' = 'Mount Spickard'
  AND waypoints->6->>'type' = 'Summit'
  AND (waypoints->6->>'elev')::numeric = 8983;

-- verify: should return the corrected values for all four rows touched above
SELECT id, high_point_ft, fa,
       waypoints->0->>'name' AS wp0_name,
       waypoints->0->>'elev' AS wp0_elev,
       jsonb_path_query_array(waypoints, '$[*] ? (@.type == "Summit").elev') AS summit_elevs
FROM routes
WHERE id IN (
  'wa_mount_shuksan_northwest_arete',
  'wa_mount_shuksan_white_salmon_glacier',
  'wa_mount_spickard_southwest'
)
ORDER BY id;
