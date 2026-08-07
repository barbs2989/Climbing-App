-- WA audit: the statements the REST applier could not evaluate, plus three that
-- carry a defect that would have made them fail or silently match nothing.
-- Everything else from batches 27-46 is already applied and verified.
--
-- THREE REPAIRS APPLIED HERE (each marked >>> below):
--  1. length_m = 182.9 -> 183. length_m is an INTEGER column; 182.9 raises
--     'invalid input syntax for type integer'. 600 ft = 182.88 m, so 183.
--  2. LIKE -> ILIKE on the Spectre Peak guard. The pattern says 'on-file' but the
--     stored text begins 'On-file'; LIKE is case-sensitive, so it matched 0 rows.
--  3. Dropped `group_limit = 12,` from two batch-40 statements. routes has NO
--     group_limit column, so those statements error outright. Elsewhere (batches
--     42/43) group_limit is a key INSIDE access jsonb -- these two look like the
--     same intent written as a top-level column. The rest of each statement is
--     preserved; decide separately whether to record the limit inside access.

-- ============================================================
-- from batch-34
-- ============================================================
-- wa_news_nw_corner: the `hazards` entry describing the 2025 Early Winter
-- Couloir anchor-failure fatalities dates the accident "May 11, 2025". The
-- event, cause, toll, and location are all independently well-corroborated
-- (Spokesman-Review, NBC News, CNN, Methow Valley News, an official
-- investigative report), but every source consistently dates the fall
-- itself to the evening of Saturday, May 10, 2025 -- the survivor reached
-- help and called 911 around 11:30am Sunday, May 11, which is the likely
-- source of the one-day discrepancy on file. Corrected to May 10.
UPDATE routes
SET hazards[3] = replace(hazards[3], 'on May 11, 2025,', 'on May 10, 2025,')
WHERE id = 'wa_news_nw_corner'
  AND hazards[3] LIKE '%on May 11, 2025,%';

-- ============================================================
-- from batch-35
-- ============================================================
-- wa_north_gardner_mountain_nw_couloir: the Cedar Creek Trailhead waypoint
-- was missing lat/lng entirely (stored as null), the only trailhead in this
-- batch lacking coordinates. A real, signed Cedar Creek Trailhead (USFS
-- Trail #476) exists off SR-20 between mileposts 175-176 near Winthrop, and
-- two independent sources (WTA, Trailforks) agree on its coordinates:
-- 48.5792, -120.4787. Filling the gap with this corroborated value. Not
-- touching `elevFt` (stored 2961): WTA/USFS give this trailhead's elevation
-- as ~3,040-3,075 ft, a real but unresolved ~100 ft discrepancy -- flagged
-- below rather than picked at random.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints, '{0}',
  '{"lat": 48.5792, "lng": -120.4787, "name": "Cedar Creek Trailhead", "type": "trailhead", "distMi": 0, "elevFt": 2961, "note": "Coordinates added 2026-07-31 (previously null on both lat/lng) — USFS Trail #476 trailhead off SR-20 near milepost 175-176, west of Winthrop; corroborated by WTA and Trailforks."}'::jsonb,
  false
)
WHERE id = 'wa_north_gardner_mountain_nw_couloir'
  AND waypoints->0->>'name' = 'Cedar Creek Trailhead'
  AND waypoints->0->'lat' = 'null'::jsonb;

-- ============================================================
-- from batch-40
-- >>> REPAIR 3: dropped `group_limit = 12` -- routes has no such column
-- ============================================================
-- ------------------------------------- Sahale Mountain, both routes (camp elev + group limit)
-- access._raw.altitude_restrictions said Sahale Glacier Camp sits at 7,400 ft on both Sahale
-- routes, contradicted by WTA's "Sahale Glacier" page (12 mi RT, 3,940 ft gain to camp --
-- matching this row's own gainFt) and several independent trip-report sources, all citing
-- 7,600 ft; also contradicted by each route's own waypoints/approach text (already 7,600 ft).
-- Also correcting access.rules/group_limit: NPS's cross-country-zones page names Boston
-- Basin (plus Eldorado and Sulphide Glacier) as a 12-person high-occupancy zone, not the
-- 6-person limit that applies to other cross-country zones -- confirmed via the same NPS
-- source while auditing the sibling Sharkfin Tower route (same batch, also Boston Basin).
-- wa_sahale_mountain_sahale_glacier approaches via the maintained Cascade Pass Trail, which
-- this row's own (uncorrected) rules text already carves out as a 12-person on-trail corridor.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(access,
                '{_raw,altitude_restrictions}', '"Sahale Glacier Camp at 7,600 feet (one of highest elevation campsites in park)"'::jsonb, false),
                '{rules}', '"Group size capped at 12 in the Boston Basin/Eldorado/Sulphide Glacier high-occupancy cross-country zones and on-trail corridors (6 in other cross-country zones). Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones — free loaners at permit offices."'::jsonb, false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access._raw.altitude_restrictions corrected — Sahale Glacier Camp elevation was 7,400 ft, contradicting WTA and this row''s own waypoints/approach text (7,600 ft). access.rules/group_limit corrected from a 6-person limit to 12, matching NPS''s designation of Boston Basin as a high-occupancy cross-country zone / this route''s on-trail corridor.'
WHERE id IN ('wa_sahale_mountain_r1', 'wa_sahale_mountain_sahale_glacier')
  AND access->'_raw'->>'altitude_restrictions' = 'Sahale Glacier Camp at 7,400 feet (one of highest elevation campsites in park)';

-- ============================================================
-- from batch-40
-- >>> REPAIR 3: dropped `group_limit = 12` -- routes has no such column
-- ============================================================
-- --------------------------------------------------- Sharkfin Tower, Southeast Ridge (access)
-- access._raw.permit_pickup_hours embedded the wrong NCNP Wilderness Information Center phone
-- number ((360) 873-4500); the real WIC number, confirmed across multiple NPS-derived listings
-- (and already stored correctly elsewhere in this database, e.g. Sentinel Peak's access.permit
-- field), is (360) 854-7245.
-- access.passRequired/_raw.parking_pass_required gave the annual Northwest Forest Pass price
-- as $35; USFS and retail sources (REI) confirm $30 (day price of $5 was already correct).
-- access.rules/group_limit said Boston Basin is a 6-person cross-country zone, but NPS's own
-- cross-country-zones page names Boston Basin (with Eldorado and Sulphide Glacier) as a
-- 12-person high-occupancy zone, same as on-trail corridors -- the 6-person limit applies only
-- to other cross-country zones.
UPDATE routes
SET access = jsonb_set(
              jsonb_set(
              jsonb_set(
              jsonb_set(access,
                '{_raw,permit_pickup_hours}', to_jsonb(replace(access->'_raw'->>'permit_pickup_hours', '(360) 873-4500', '(360) 854-7245')), false),
                '{passRequired}', to_jsonb(replace(access->>'passRequired', '$35 annual', '$30 annual')), false),
                '{_raw,parking_pass_required}', to_jsonb(replace(access->'_raw'->>'parking_pass_required', '$35 annual', '$30 annual')), false),
                '{rules}', '"Group size capped at 12 in the Boston Basin/Eldorado/Sulphide Glacier high-occupancy cross-country zones and on-trail corridors (6 in other cross-country zones). Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones — free loaners at permit offices."'::jsonb, false),
    corrections = COALESCE(corrections, '') || ' 2026-07-31: access._raw.permit_pickup_hours phone number corrected to the real NCNP Wilderness Information Center number (360) 854-7245 (was 873-4500, unattributable to any NCNP office). access.passRequired/_raw.parking_pass_required annual Northwest Forest Pass price corrected from $35 to $30 (USFS/REI). access.rules/group_limit corrected — NPS designates Boston Basin (along with Eldorado and Sulphide Glacier) a high-occupancy cross-country zone with a 12-person party limit, not the 6-person limit that applies to other cross-country zones.'
WHERE id = 'wa_sharkfin_tower_southeast_ridge'
  AND access->'_raw'->>'permit_pickup_hours' LIKE '%(360) 873-4500%';

-- ============================================================
-- from batch-41
-- ============================================================
-- --------------------------------------------- Sherpa Peak East Ridge waypoint/gpx order
-- The corrected Esmeralda Basin/Ingalls Way Trailhead waypoint (fixed in an earlier pass,
-- per its own note) sits at array index 3 -- AFTER "East end of ridge" (7,800 ft, index 2)
-- and BEFORE the summit -- instead of first, and is missing distMi (every sibling waypoint
-- has one). Because this route's gpx track is built directly from this same ordered list,
-- the rendered path currently climbs to 7,800 ft, drops back to the 3,500 ft trailhead, then
-- jumps to the 8,630 ft summit. Reordered to Trailhead -> Long's Pass -> Stuart basin bivy ->
-- East end of ridge -> Summit (distMi 0 added to the trailhead); no coordinates changed.
UPDATE routes
SET waypoints = '[
      {"lat": 47.4366, "lng": -120.937, "name": "Esmeralda Basin / Ingalls Way Trailhead (North Fork Teanaway Rd, FR-9737) via Longs Pass", "note": "Shared trailhead for Longs Pass Trail and Esmeralda Basin/Ingalls Way Trail; route drops from Longs Pass into Ingalls Creek drainage before climbing to Sherpa''s east basin. Existing DB coordinate (47.4569,-120.9389) is ~2-2.5km north of this real trailhead location.", "type": "Trailhead", "elevFt": 3500, "distMi": 0},
      {"lat": 47.4561, "lng": -120.9136, "name": "Long''s Pass", "type": "Junction", "distMi": 2.5, "elevFt": 6250},
      {"lat": 47.465, "lng": -120.895, "name": "Stuart basin bivy", "type": "Campsite", "distMi": 4.5, "elevFt": 6300},
      {"lat": 47.4718, "lng": -120.8855, "name": "East end of ridge", "type": "Junction", "distMi": 5.6, "elevFt": 7800},
      {"lat": 47.471845, "lng": -120.888871, "name": "Sherpa Peak summit", "type": "Summit", "elevFt": 8630}
    ]'::jsonb,
    gpx = '[
      [47.4366, -120.937],
      [47.4561, -120.9136],
      [47.465, -120.895],
      [47.4718, -120.8855],
      [47.471845, -120.888871]
    ]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-07-31: waypoints/gpx reordered — the trailhead waypoint sat after "East end of ridge" instead of first, producing a nonsensical elevation profile (climb to 7,800 ft, drop to 3,500 ft, jump to summit); reordered to match the actual approach sequence and gave the trailhead distMi 0. No coordinates changed.'
WHERE id = 'wa_sherpa_peak_east_ridge'
  AND jsonb_array_length(waypoints) = 5
  AND waypoints->3->>'name' LIKE 'Esmeralda Basin%';

-- ============================================================
-- from batch-43
-- ============================================================
-- wa_south_face_2: waypoints[4] ("SR-20 Burgundy Col / Wine Spires pullout") and the matching
-- gpx[4] point are a leaked internal-research-session artifact, not real trail beta -- the
-- note text ("Confirms existing DB entry's location/description; minor coordinate refinement
-- based on Cutthroat Lake Rd junction cross-reference.") reads as a research agent's internal
-- reasoning that leaked into the data, and unlike every other waypoint on this row it carries
-- no elev/distMi. Its coordinates sit ~0.6 km from the row's own legitimate "Early Winters
-- Creek crossing" waypoint (index 0), reinforcing it's a stray duplicate rather than new
-- information. Removed both array entries.
UPDATE routes
SET waypoints = waypoints - 4,
    gpx = gpx - 4,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: removed waypoints[4]/gpx[4] ("SR-20 Burgundy Col / Wine Spires pullout") — a leaked internal-research-session artifact (its note text is an AI research agent''s internal reasoning, not trail beta), missing elev/distMi unlike every other waypoint on this row.'
WHERE id = 'wa_south_face_2'
  AND waypoints->4->>'name' = 'SR-20 Burgundy Col / Wine Spires pullout'
  AND jsonb_array_length(waypoints) = 6;

-- ============================================================
-- from batch-43
-- ============================================================
-- wa_south_face_2: the summit waypoint (index 4 after the removal above) had no elev field,
-- unlike every other Summit-type waypoint in this dataset. Filled from this row's own
-- already-verified high_point_ft/areas.elevation_ft (8507 ft, both already agree).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{4,elev}', '8507', true),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: filled waypoints[4] (Pernod Spire summit) elev = 8507, matching this row''s own high_point_ft and the parent area''s elevation_ft (both already 8507).'
WHERE id = 'wa_south_face_2'
  AND waypoints->4->>'name' = 'Pernod Spire summit'
  AND NOT (waypoints->4 ? 'elev');

-- ============================================================
-- from batch-43
-- ============================================================
-- wa_south_headwall: watch_out was stored as one newline-joined string instead of a JSON
-- array (same rendering bug found and fixed repeatedly elsewhere in this DB -- lib/db.js's
-- toArr() only splits on commas, not newlines, so the app renders all items as a single
-- run-on bullet). Converted to a proper array. Also dropped "Descent involves multiple
-- rappels" -- contradicted by this same row's own descent/descent_text fields (a walk-down via
-- the Cascadian Couloir) and rappels field (null); no rappelling is documented anywhere else
-- on this row.
UPDATE routes
SET watch_out = '["Sustained 5.7 climbing on south-facing vertical terrain", "Weather exposure creates hazard; sun exposure can accelerate ice melt", "Route-finding complexity on headwall", "Mixed terrain with loose rock throughout"]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: watch_out converted from a newline-joined string to a proper JSON array (rendering bug — lib/db.js''s toArr() only splits on commas). Also dropped "Descent involves multiple rappels," contradicted by this row''s own descent/descent_text (walk-down via Cascadian Couloir) and null rappels field.'
WHERE id = 'wa_south_headwall'
  AND watch_out = '"Sustained 5.7 climbing on south-facing vertical terrain\nWeather exposure creates hazard; sun exposure can accelerate ice melt\nRoute-finding complexity on headwall\nMixed terrain with loose rock throughout\nDescent involves multiple rappels"'::jsonb;

-- ============================================================
-- from batch-45
-- >>> REPAIR 2: LIKE -> ILIKE (stored text is 'On-file', LIKE is case-sensitive)
-- ============================================================
-- wa_spectre_peak_south_route: data_quality.gaps[2] is a stale research-session
-- artifact referencing an "on-file FA year of '1980'" that no longer exists --
-- this row's own fa field already correctly reads "Sam Boyce and Joe Manning,
-- July 2022."
UPDATE routes
SET data_quality = data_quality #- '{gaps,2}',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: removed stale data_quality.gaps entry referencing an "on-file FA year of 1980" — this row''s own fa field already correctly reads Sam Boyce and Joe Manning, July 2022; the note was a leftover research-session artifact.'
WHERE id = 'wa_spectre_peak_south_route'
  AND data_quality->'gaps'->2 IS NOT NULL
  AND data_quality->'gaps'->>2 ILIKE '%on-file FA year of%1980%';

-- ============================================================
-- from batch-45
-- >>> REPAIR 1: 182.9 -> 183 (length_m is an integer column)
-- ============================================================
-- wa_stanley_burgner: length_m (152m / ~500ft) conflicts with multiple
-- corroborating external sources (climbing.com, Mountain Project,
-- Mountaineers.org) that consistently describe this as a "600-foot route"
-- (600 ft = 182.9 m). NOTE: this row's own pitch_detail pitch lengths sum to
-- 237m (777ft), which does not fully reconcile with either figure -- flagged
-- separately in the audit log as a residual inconsistency, not resolved here.
UPDATE routes
SET length_m = 183,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: length_m corrected from 152 to 183 (600ft) — multiple external sources (climbing.com, Mountain Project, Mountaineers.org) consistently describe this as a 600-foot route. Note: this row''s own pitch_detail lengths sum to 237m, which still does not fully reconcile — flagged for further review.'
WHERE id = 'wa_stanley_burgner'
  AND length_m = 152;
