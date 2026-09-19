-- WA alpine/mountaineering audit -- batch 295 (pass 5)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_south_arete, wa_south_early_winter_spire_direct_east_buttress,
--         wa_south_early_winter_spire_east_buttress, wa_south_early_winter_spire_passenger,
--         wa_south_early_winter_spire_southwest_couloir, wa_south_face_10, wa_south_face_12,
--         wa_south_face_2
-- All values below were re-read from the live DB immediately before this file was written;
-- every UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- South Early Winters Spire (area wa_south_early_winters_spire) -- Blue Lake
-- Trailhead elevation cluster fix
-- =========================================================================
-- Blue Lake Trailhead's real elevation is 5,400 ft (WTA: "the trailhead is located at 5,400
-- feet elevation ... from there the hike has only 1,050 feet of elevation gain to reach Blue
-- Lake, which sits at 6,254 feet"). Three of the five routes on this peak store a stale
-- ~5,200 ft figure in their own Trailhead waypoint despite their OWN approach_logistics.
-- trailheadDirection field already correctly saying "5,400 ft" for the identical coordinate --
-- and wa_south_arete's own gain_ft (2407, corrected in an earlier pass) only works out to
-- high_point_ft(7807) minus 5,400, not minus 5,200, so the 5,400 figure is what that earlier
-- correction actually used even though the waypoint's own `elev` field was never synced to
-- match it. Southwest Couloir's Trailhead waypoint has no elevation recorded at all, despite
-- this row's own approach_logistics and bivy fields already stating 5,400 ft for the same spot.

-- South Arete (wa_south_arete): waypoints[0].elev 5200 -> 5400.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_south_arete'
  AND waypoints #> '{0,elev}' = '5200'::jsonb;

-- South Arete (wa_south_arete): approach text's own "elev. ~5,200 ft" mention corrected to
-- match this row's own approach_logistics.trailheadDirection ("5,400 ft") and the WTA-sourced
-- figure above -- an internal contradiction within this one row.
UPDATE routes SET approach = replace(
  approach,
  'Blue Lake Trailhead (elev. ~5,200 ft)',
  'Blue Lake Trailhead (elev. ~5,400 ft)'
)
WHERE id = 'wa_south_arete'
  AND approach LIKE '%Blue Lake Trailhead (elev. ~5,200 ft)%';

-- East Buttress (wa_south_early_winter_spire_east_buttress): waypoints[0].elev 5204 -> 5400.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_south_early_winter_spire_east_buttress'
  AND waypoints #> '{0,elev}' = '5204'::jsonb;

-- Passenger (wa_south_early_winter_spire_passenger): waypoints[0].elev 5200 -> 5400.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400'::jsonb)
WHERE id = 'wa_south_early_winter_spire_passenger'
  AND waypoints #> '{0,elev}' = '5200'::jsonb;

-- Southwest Couloir (wa_south_early_winter_spire_southwest_couloir): waypoints[0].elevFt was
-- null; filled from this same row's own approach_logistics.trailheadDirection ("~1.5 miles
-- west of Washington Pass, 5,400 ft") and bivy[0] ("Blue Lake trailhead roadside bivy", elev
-- 5400) -- both already present on this row and now externally corroborated via WTA.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '5400'::jsonb)
WHERE id = 'wa_south_early_winter_spire_southwest_couloir'
  AND waypoints #> '{0,elevFt}' = 'null'::jsonb;

-- =========================================================================
-- South Early Winters Spire -- round-trip gain/loss physics
-- =========================================================================
-- East Buttress and Passenger both descend the standard South Arete gully/rappel line back to
-- Blue Lake Trailhead -- a genuine out-and-back to the same trailhead, so gain_ft must equal
-- loss_ft. With the corrected 5,400 ft trailhead, high_point_ft(7807) - 5400 = 2407, matching
-- East Buttress's already-correct gain_ft (2400) almost exactly; loss_ft (2200) is 200 ft short
-- and matches neither. Passenger's gain_ft/loss_ft (2200/2200, self-consistent with each other
-- but not with the corrected trailhead figure) share the identical 200 ft shortfall, and its own
-- itinerary schedule describes the same ~2 hr approach and same South-Arete descent as East
-- Buttress and Direct East Buttress. Corrected both to 2400/2400, syncing each row's own
-- itinerary.days[0] gainFt/lossFt to match so the row does not carry two disagreeing totals.

-- East Buttress (wa_south_early_winter_spire_east_buttress): loss_ft 2200 -> 2400.
UPDATE routes SET loss_ft = 2400
WHERE id = 'wa_south_early_winter_spire_east_buttress'
  AND gain_ft = 2400 AND loss_ft = 2200;

UPDATE routes SET itinerary = jsonb_set(
  jsonb_set(itinerary, '{days,0,gainFt}', '2400'::jsonb),
  '{days,0,lossFt}', '2400'::jsonb
)
WHERE id = 'wa_south_early_winter_spire_east_buttress'
  AND itinerary #> '{days,0,gainFt}' = '2200'::jsonb
  AND itinerary #> '{days,0,lossFt}' = '2200'::jsonb;

-- Passenger (wa_south_early_winter_spire_passenger): gain_ft/loss_ft 2200/2200 -> 2400/2400.
UPDATE routes SET gain_ft = 2400, loss_ft = 2400
WHERE id = 'wa_south_early_winter_spire_passenger'
  AND gain_ft = 2200 AND loss_ft = 2200;

UPDATE routes SET itinerary = jsonb_set(
  jsonb_set(itinerary, '{days,0,gainFt}', '2400'::jsonb),
  '{days,0,lossFt}', '2400'::jsonb
)
WHERE id = 'wa_south_early_winter_spire_passenger'
  AND itinerary #> '{days,0,gainFt}' = '2200'::jsonb
  AND itinerary #> '{days,0,lossFt}' = '2200'::jsonb;

-- =========================================================================
-- South Early Winters Spire -- outing_shape
-- =========================================================================
-- South Arete, Southwest Couloir, and (separately noted below) Direct East Buttress all have
-- outing_shape = null despite each one's own descent_text describing a single-trailhead,
-- car-to-car (or, for Southwest Couloir, same-couloir up-and-down) round trip -- the same
-- pattern already corrected on sibling East Buttress/Passenger (outing_shape = 'outback').

UPDATE routes SET outing_shape = 'outback'
WHERE id = 'wa_south_arete' AND outing_shape IS NULL;

UPDATE routes SET outing_shape = 'outback'
WHERE id = 'wa_south_early_winter_spire_southwest_couloir' AND outing_shape IS NULL;

-- Direct East Buttress (wa_south_early_winter_spire_direct_east_buttress): outing_shape set to
-- 'outback' -- its own itinerary.days[0].schedule explicitly frames the trip as "Leave Blue Lake
-- trailhead" / "Back at trailhead", a same-day round trip, regardless of which exact trailhead
-- applies (see flagged item below). gain_ft/loss_ft (2350/2350) are left untouched: they are
-- already internally equal, and this route's approach/waypoints describe starting from the
-- Hairpin Turn Pullout (5,150 ft) rather than Blue Lake Trailhead, so no external source was
-- available here to settle which trailhead's arithmetic the top-level figures should track.
UPDATE routes SET outing_shape = 'outback'
WHERE id = 'wa_south_early_winter_spire_direct_east_buttress' AND outing_shape IS NULL;

-- =========================================================================
-- South Arete -- schema shape
-- =========================================================================
-- watch_out was a single newline-delimited string instead of the JSON array of strings every
-- other route in this batch (and the app's own rendering convention) uses -- same schema-shape
-- defect documented repeatedly in prior batches. Converted via string_to_array on the existing
-- newlines; no content changed.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_south_arete'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = 'South Arete provides less technical but more exposed line up the peak
Sustained exposure on buttress terrain with serious consequences for falls
Weather exposure creates hazard; electrical activity on exposed terrain
Loose rock on mixed terrain sections creates rockfall hazard
Descent route-finding can be challenging in low visibility';

-- =========================================================================
-- Cathedral Peak (Pasayten) -- South Face (wa_south_face_10)
-- =========================================================================

-- gain_ft corrected 4700 -> 6700 to match loss_ft, on this genuine out-and-back
-- (outing_shape = 'outback') to the Andrews Creek Trailhead. External corroboration: AllTrails
-- gives 38.6 mi round trip / 6,522 ft of elevation gain for the Andrews Creek Trail to Cathedral
-- Lakes alone (not yet counting the further summit push from camp), closely matching this row's
-- own loss_ft (6700) once the additional camp-to-summit-and-back leg is folded in -- while
-- gain_ft (4700) does not correspond to any leg of the trip and reads as the same
-- partial-figure-saved-as-the-total bug documented on several other routes in this audit.
UPDATE routes SET gain_ft = 6700
WHERE id = 'wa_south_face_10' AND gain_ft = 4700 AND loss_ft = 6700;

-- itinerary converted from a bare narrative string to the standard {cal,days,totalNote} object
-- shape every other route in the catalog uses -- the existing narrative text is preserved
-- verbatim as totalNote, days is an honest empty array since no day-by-day breakdown was ever
-- recorded, no content invented.
UPDATE routes SET itinerary = '{"cal": "", "days": [], "totalNote": "Day 1: drive to trailhead and hike in toward Upper Cathedral Lake basin; Day 2: continue to basecamp if needed and rest/scout; Day 3: climb the South Face car-to-car from camp; Day 4: hike out."}'::jsonb
WHERE id = 'wa_south_face_10'
  AND jsonb_typeof(itinerary) = 'string'
  AND itinerary #>> '{}' = 'Day 1: drive to trailhead and hike in toward Upper Cathedral Lake basin; Day 2: continue to basecamp if needed and rest/scout; Day 3: climb the South Face car-to-car from camp; Day 4: hike out.';

-- watch_out[0] said "The 1969 FA account notes protection..." -- this same row's own
-- corrections/fa/overview fields already document a 2026-08-01 correction of the first-ascent
-- year from 1969 to 1968 (fa: "September 1968", confirmed via AAC Publications and Mountain
-- Project), but that pass missed this sibling mention of the same stale year.
UPDATE routes SET watch_out = jsonb_set(
    watch_out, '{0}',
    to_jsonb(replace(watch_out ->> 0, 'The 1969 FA account', 'The 1968 FA account'))
  ),
  corrections = corrections || ' 2026-09-18: watch_out[0] corrected from "The 1969 FA account..." to "The 1968 FA account..." -- this row''s own fa/overview/corrections fields already document the 1969->1968 first-ascent-year correction (2026-08-01); this sibling field was missed at the time.'
WHERE id = 'wa_south_face_10'
  AND watch_out ->> 0 = 'The 1969 FA account notes protection on ''assorted blocks and horns'' in places — inspect placements on the original aid pitches.';

-- bivy: removed "Tungsten Mine camp" (6 -> 5). This entry self-disqualifies in its own text:
-- "This sits on the LOOP leg between Apex Pass and the Chewuch drainage rather than on the
-- direct Andrews Creek line ... a party going in and out via Andrews Creek will never see it" --
-- and this route is a same-trailhead out-and-back via Andrews Creek. The other five bivy
-- entries (Upper Cathedral Lake basin, Cathedral Pass benches, Andrews Pass, Remmel Lake/Spanish
-- Camp meadows, Amphitheater Mountain upper basin) are left as-is; Remmel Lake explicitly names
-- itself as reachable en route to Cathedral via a signed spur, and Amphitheater Mountain's
-- basin -- while it names a different, adjacent peak -- is flagged rather than pruned below
-- since Upper Cathedral Lake basin is documented elsewhere on this same row as the shared camp
-- for both Cathedral's Southeast Buttress and Amphitheater's ridges, so multi-summit use of
-- this corridor is normal and this entry may still be a legitimate option for a combined trip.
UPDATE routes SET bivy = (
  SELECT jsonb_agg(elem) FROM jsonb_array_elements(bivy) elem
  WHERE elem ->> 'name' <> 'Tungsten Mine camp'
)
WHERE id = 'wa_south_face_10'
  AND jsonb_array_length(bivy) = 6
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(bivy) e WHERE e ->> 'name' = 'Tungsten Mine camp');

-- =========================================================================
-- Argonaut Peak -- South Face (wa_south_face_12)
-- =========================================================================

-- outing_shape set to 'outback' (was null) -- descent_text explicitly reverses the entire
-- approach back to the Beverly Turnpike Trailhead (same trailhead used to start).
UPDATE routes SET outing_shape = 'outback'
WHERE id = 'wa_south_face_12' AND outing_shape IS NULL;

-- bivy pruned 8 -> 2, removing six entries that are explicitly and solely for other peaks/
-- approaches reached from a different trailhead/side of the range than this route's own
-- Beverly Turnpike/Ingalls Creek south-side approach:
--   "Sherpa south basin camp" -- explicitly Sherpa Peak's East/West Ridge camp.
--   "Table Rock bivy, upper Sherpa basin" -- explicitly Sherpa's East Ridge start.
--   "Upper Mountaineer Creek bench" -- explicitly "the north-side base ... Argonaut's NORTH
--     approaches" (this route is a SOUTH approach), reached via the Stuart Lake trail, not
--     Beverly Turnpike.
--   "Argonaut north basin bivies, below the Colchuck-Argonaut col" -- explicitly "the high camp
--     for the Northeast Couloir and the Northwest Arete", different routes on this same peak
--     reached from the opposite (north) side.
--   "Lake Caroline and Little Caroline" -- explicitly Cashmere Mountain's approach via the
--     Eightmile Lake trailhead ("does not belong to the ... Teanaway approaches at all").
--   "Nada Lake" -- explicitly the base for Cannon Mountain/Enchantment Peak/Witches Tower via
--     the Snow Lakes trail off Icicle Creek Road.
-- Kept: "Ingalls Creek valley camps below the Sherpa and Argonaut south sides" (this route's
-- own approach text camps at the Fourth Creek/Ingalls Creek confluence, matching this entry
-- directly) and "Beverly and De Roux campgrounds and the North Fork Teanaway roadside camps"
-- (named for this route's own trailhead access road).
UPDATE routes SET bivy = (
  SELECT jsonb_agg(elem) FROM jsonb_array_elements(bivy) elem
  WHERE elem ->> 'name' IN (
    'Ingalls Creek valley camps below the Sherpa and Argonaut south sides',
    'Beverly and De Roux campgrounds and the North Fork Teanaway roadside camps'
  )
)
WHERE id = 'wa_south_face_12'
  AND jsonb_array_length(bivy) = 8;

-- =========================================================================
-- Pernod Spire -- South Face (wa_south_face_2)
-- =========================================================================

-- outing_shape set to 'outback' (was null) -- descent_text is explicit that this is not a
-- walk-off and every rappel option reverses back toward the same SR-20 pullout used to start.
UPDATE routes SET outing_shape = 'outback'
WHERE id = 'wa_south_face_2' AND outing_shape IS NULL;

-- bivy pruned 6 -> 4, removing two entries that self-disqualify in their own text: "Upper Silver
-- Star Creek basin camp" and "Lower Silver Star Creek basin" are both explicitly labeled
-- "EAST side, Silver Star only" and the former states outright "it is no use for the Wine
-- Spires on the west side" -- Pernod Spire is one of the Wine Spires, approached (per this
-- route's own approach text) from the WEST side via Burgundy Col. Kept the three west-side
-- Wine Spires camps (Burgundy Col, Burgundy Creek bench, upper scree benches) plus Lone Fir
-- Campground, a generic SR-20 roadside campground used the night before any Washington Pass
-- objective (also present, unpruned, on this same peak's sibling South Early Winters Spire
-- routes in this batch).
UPDATE routes SET bivy = (
  SELECT jsonb_agg(elem) FROM jsonb_array_elements(bivy) elem
  WHERE elem ->> 'name' NOT IN (
    'Upper Silver Star Creek basin camp — EAST side, Silver Star only',
    'Lower Silver Star Creek basin — EAST side, Silver Star only'
  )
)
WHERE id = 'wa_south_face_2'
  AND jsonb_array_length(bivy) = 6;

COMMIT;
