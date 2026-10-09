-- WA alpine audit -- batch 220 (2026-09-06, pass 4)
-- Routes: wa_north_face_3 (Lexington Tower), wa_north_face_left_buttress
-- (Castle Peak, Pasayten), wa_north_face_var_right_directisimo (Concord
-- Tower), wa_north_gardner_mountain_nw_couloir, wa_north_ridge_2 (Whatcom
-- Peak), wa_north_ridge_3 (Cutthroat Peak), wa_north_ridge_4 (Primus Peak),
-- wa_northeast_buttress_4 (Colchuck Peak), wa_northeast_face_direct (Mount
-- Formidable).
-- Each WHERE clause includes the current (wrong) value as a safety check.
-- Apply each UPDATE individually.

-- Colchuck Peak Northeast Buttress: watch_out was a single raw string (every
-- sibling route in this batch stores this column as a JSON array) describing
-- an entirely different climb -- "mixed climbing (M4)", a "Steep ice bulge
-- (A2-3 rating)", a "Heavily corniced rappel descent", and "wind-loaded
-- terrain near Snoqualmie Pass". This route is a dry summer granite climb at
-- the Enchantments/Icicle Creek (season "Jul (best); serviceable Jun-Aug"),
-- roughly 100 miles from Snoqualmie Pass, with no ice grade set and no ice
-- tools in its gear/rack fields beyond the glacier-crossing axe/crampons
-- already covered elsewhere on the row -- externally corroborated (Mountain
-- Project, SummitPost trip reports): this is an 14-18 pitch 5.8+/5.9 rock
-- route with no reported ice or mixed climbing of any kind. The contaminating
-- text describes an unrelated winter ice/mixed route and does not belong on
-- this row at all. Replaced by re-homing this same row's own already-correct
-- hazard information (from hazards, obj_haz, pitch_detail and climbing_route,
-- all populated and consistent with external sources) into a proper JSON
-- array -- nothing researched or invented.
UPDATE routes
SET watch_out = '["Difficult routefinding — the expected left-facing dihedral pitch is frequently reported missing or hard to locate — mixing up the Kearney and Beckey start variations is the most common error.", "The moat where the Colchuck Glacier meets the buttress base is conditions-dependent — a step across a snow bridge in a good year, the technical crux of the day in a lean one.", "Loose and occasionally mossy rock throughout, worst on the pitch into the main dihedral (moss, loose gravel, old fixed pins).", "The crux left-facing corner pitch requires placing a cam blind into a horizontal crack from steep, smooth climbing.", "A very long day (17–21 hours car-to-car) that often finishes the Colchuck Glacier descent by headlamp — benighted parties are common; the length, not the grade, is what catches people."]'::jsonb
WHERE id = 'wa_northeast_buttress_4'
  AND watch_out = 'Highly conditions-dependent difficulty; mixed climbing (M4) pitches vary from easy snow/ice to sustained steep sections based on current conditions
Steep ice bulge (A2-3 rating) on pitch 3 with notoriously difficult anchor placement; anchors unreliable and sparingly available above pitch 3
Heavily corniced rappel descent; cornice collapse risk during warm spells; potential for rappel line being cut by cornices
S-shaped gully on pitch 1 with variable mixed climbing up to M4; conditions-dependent route difficulty affects protection options
Long pitch to base of ice bulge (70-80m) on easy terrain, but terrain becomes avalanche-prone on wider snow slopes
Exposed approach traverse; wind-loaded terrain near Snoqualmie Pass; rapid weather changes common
Multiple rappel anchors required for descent; deteriorating conditions during descent can create urgent retreat scenarios'::jsonb;

-- North Face Var. Right (Directisimo), Concord Tower: waypoints[0] (Blue Lake
-- Trailhead) stored elev 5200, contradicting three other fields on this same
-- row -- road.driveNote ("Blue Lake Trailhead (~5,400 ft)..."),
-- approach_logistics.trailheadDirection ("...5,400 ft..."), and approach
-- ("Drive Highway 20 to the Blue Lake Trailhead (~5,400 ft)...") -- and its own
-- sibling wa_north_face_3's waypoint at the identical coordinate
-- (48.518965,-120.67436), which stores 5400. Externally corroborated (WTA,
-- The Mountaineers): Blue Lake Trailhead sits at 5,400 ft. Corrected to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_north_face_var_right_directisimo'
  AND waypoints->0->>'name' = 'Blue Lake Trailhead'
  AND waypoints->0->'elev' = '5200'::jsonb;

-- North Face, Lexington Tower: waypoints[0] (Blue Lake Trailhead) stores
-- elev 5400 (correct -- see above), but the same waypoint's own nested
-- "directions" text says "at roughly 5,200 feet", contradicting its own
-- sibling elev field on the identical waypoint object. Corrected the prose to
-- match this row's own elev value and the external sources cited above.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,directions}', '"Park at the signed Blue Lake Trailhead on SR-20, a small pullout about 1.5 miles west of Washington Pass at roughly 5,400 feet. A self-issue wilderness permit and a Northwest Forest Pass are required at the trailhead kiosk. SR-20 is gated over Washington Pass each winter, typically closing in late November or early December and reopening between mid-April and early May, so there is no vehicle access until the highway reopens."'::jsonb)
WHERE id = 'wa_north_face_3'
  AND waypoints->0->>'name' = 'Blue Lake Trailhead'
  AND waypoints->0->'directions' = 'Park at the signed Blue Lake Trailhead on SR-20, a small pullout about 1.5 miles west of Washington Pass at roughly 5,200 feet. A self-issue wilderness permit and a Northwest Forest Pass are required at the trailhead kiosk. SR-20 is gated over Washington Pass each winter, typically closing in late November or early December and reopening between mid-April and early May, so there is no vehicle access until the highway reopens.'::jsonb;

-- This session checked FA facts, discipline/route-shape facts, and summit
-- elevations for all nine routes in this batch against external sources
-- (Wikipedia, SummitPost, Mountain Project, cascadeclimbers.com via search
-- synthesis, AAC Publications, WTA/Mountaineers). Confirmed clean, no
-- corrections needed: Lexington Tower North Face FA (Kelley/McGowan, 7/5/1954)
-- and summit elevation (7,560 ft); Castle Peak's "Fight or Flight" FA
-- (Herrington/Hirst, 8/3/2008, matching grade/length/line description exactly)
-- and Castle Peak's elevation (8,343 ft); Whatcom Peak's elevation (7,574 ft,
-- exact match); Cutthroat Peak's elevation (8,065 ft vs. 8,066 ft externally --
-- a 1 ft rounding difference, not a conflict); North Gardner Mountain's
-- elevation (8,956 ft, exact match); Mount Formidable's Direct NE Face FA
-- (Klubberud/Campbell, 2002) and its documented 2013 second ascent (matching
-- this row's own "two large blocks" hazard note almost verbatim). Stamping
-- access_checked_at on all nine.
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_face_3';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_face_left_buttress';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_face_var_right_directisimo';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_gardner_mountain_nw_couloir';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_ridge_2';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_ridge_3';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_north_ridge_4';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_northeast_buttress_4';
UPDATE routes SET access_checked_at = '2026-09-06' WHERE id = 'wa_northeast_face_direct';
