-- WA Alpine Audit — Pass 1, Batch 24 — 2026-07-30
-- Peaks: Mount Challenger (Challenger Glacier), Mount Constance (Finger
--        Traverse, North Chimney, North Chute, Terrible Traverse, West
--        Arête), Mount Crowder (Northeast Ridge, Southwest Route), Mount
--        Cruiser (Northwest Face/Corner, South Corner)

-- =========================================================================
-- Mount Challenger
-- =========================================================================

-- areas.wa_mount_challenger: elevation_ft stored 8238, but the peak's own
-- route (wa_mount_challenger_challenger_glacier) has high_point_ft = 8207,
-- a summit waypoint already corrected to 8207, and a data_quality.gaps note
-- that explicitly says "this record's own high_point_ft (8,207 ft) matches
-- the most-cited USGS/Wikipedia figure, and the summit waypoint has been
-- corrected to match" -- i.e. the route side of this correction was applied
-- but the area row never was. The area row's own prominence_ft (567) is
-- also only consistent with an 8,207 ft summit (Wikipedia/Wikidata give
-- 8,207 ft / 567 ft prominence together), not 8238. Fixed to match.
UPDATE areas SET elevation_ft = 8207 WHERE id = 'wa_mount_challenger';

-- wa_mount_challenger_challenger_glacier: access.notes ended with "Mount Tom
-- area, North Cascades." -- the same DB-wide boilerplate-contamination
-- string already identified and stripped from other routes in batch 15
-- (found on 35 rows DB-wide, including a Wyoming route with no possible
-- North Cascades connection). Mount Challenger is in the Picket Range, not
-- any "Mount Tom area." Stripped rather than fabricate replacement text.
UPDATE routes SET access = jsonb_set(
  access, '{notes}',
  '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."'
) WHERE id = 'wa_mount_challenger_challenger_glacier';

-- wa_mount_challenger_challenger_glacier: dist_km (48, i.e. ~29.8 mi) is
-- contradicted by this same row's own itinerary.sourceNote, which asserts
-- "On-file distKm (59.55 km, ~37 mi round trip) is consistent with this
-- profile" -- i.e. the row's own prose already describes what dist_km
-- should read, but the column itself was never updated to match (same
-- "correction documented but not applied" bug as batch 14's Southwest
-- Couloir gain_ft and batch 15's Helmet Butte elevation). Independently
-- corroborated: this row's own waypoints give a one-way summit distance of
-- 19.5 mi (implying ~39 mi round trip), and external Hannegan/Whatcom Pass
-- trip reports consistently cite ~37 mi round trip for this route. Fixed to
-- match the row's own sourceNote.
UPDATE routes SET dist_km = 59.55 WHERE id = 'wa_mount_challenger_challenger_glacier';

-- wa_mount_challenger_challenger_glacier: itinerary.totalNote said "roughly
-- 21 miles ... round trip", which matches neither the corrected 59.55 km
-- (~37 mi) above nor even this row's own itinerary.days mileage sum (10.4 +
-- 9 + 10.4 = 29.8 mi) -- updated to match the corrected round-trip mileage.
-- NOTE: the itinerary.days-level mile splits (10.4/9/10.4) still don't sum
-- to 37 mi and likely need their own reconciliation -- left as a flag (see
-- audit log) rather than guessing a new day-by-day split.
UPDATE routes SET itinerary = jsonb_set(
  itinerary, '{totalNote}',
  '"A remote 3-day trip (parties often pad in a 4th weather/contingency day): roughly 37 miles and ~10,000 ft of cumulative gain round trip, anchored by an 11-hour glacier summit day out of Whatcom Pass camp."'
) WHERE id = 'wa_mount_challenger_challenger_glacier';

-- =========================================================================
-- Mount Constance
-- =========================================================================

-- wa_mount_constance_finger_traverse / wa_mount_constance_terrible_traverse:
-- both stored grade = "Grade III", directly contradicting each row's own
-- alpine_grade ("II") and commitment ("II") fields -- unlike sibling
-- wa_mount_constance_west_arete, whose grade/alpine_grade/commitment are all
-- internally consistent at "III". The mismatched value on both rows exactly
-- matches West Arête's correct "III", suggesting it was copied across
-- sibling rows in error. Fixed to match each row's own alpine_grade/
-- commitment ("II"), consistent with sibling wa_mount_constance_north_chute
-- (alpine_grade "II") and wa_mount_constance_north_chimney ("Grade II-III").
UPDATE routes SET grade = 'Grade II' WHERE id = 'wa_mount_constance_finger_traverse';
UPDATE routes SET grade = 'Grade II' WHERE id = 'wa_mount_constance_terrible_traverse';

-- wa_mount_constance_terrible_traverse: descent field said "Be aware of
-- loose rock and snow bridge hazards," but this same row's own
-- seasonal_hazards.crevasses field states "N/A - no glacier travel ... not
-- glacial ice" -- snow bridges are a glacier/crevasse-crossing hazard that
-- doesn't apply here (this looks like shared generic boilerplate reused
-- verbatim across many non-glaciated routes DB-wide, e.g. the identical
-- sentence also appears on wa_mount_crowder_southwest_route). Removed the
-- inapplicable clause rather than rewrite the whole boilerplate sentence
-- DB-wide, which is out of this batch's scope.
UPDATE routes SET descent =
  'Descend via the standard descent route, retracing the ascent when possible. Be aware of loose rock. Maintain group cohesion on exposed sections.'
WHERE id = 'wa_mount_constance_terrible_traverse';

-- wa_mount_constance_north_chimney: hazards[0] was a verbatim copy of
-- sibling wa_mount_constance_finger_traverse's hazards[0], naming only "the
-- 'Finger Traverse'" -- but this row's own overview explicitly describes
-- climbers crossing "either the snow-dependent 'Terrible Traverse' or its
-- rock alternative the 'Finger Traverse'" to reach the summit block. Fixed
-- to name both, using this row's own overview text rather than fabricating
-- new content.
UPDATE routes SET hazards = array_replace(
  hazards,
  'highly exposed narrow ledge traverse (the ''Finger Traverse'')',
  'highly exposed narrow ledge traverse (Terrible Traverse or Finger Traverse)'
) WHERE id = 'wa_mount_constance_north_chimney';

-- wa_mount_constance_north_chute: waypoints[0] ("Lake Constance Trailhead
-- (current road-end)", lat 47.75095/lng -123.14012, elevFt null)
-- contradicts this same row's own approach_logistics field (trailheadLat
-- 47.740259/trailheadLng -123.065764) and all 4 sibling Constance routes'
-- consistent trailhead waypoint (~47.7403/-123.0658, elevFt 1400). The
-- errant coordinate also turns up as a mid-route point (well up the
-- mountain, not at the road-end) inside the siblings' own recorded GPX
-- tracks. Fixed to match this row's own approach_logistics field and every
-- sibling.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(waypoints, '{0,lat}', '47.740259'::jsonb),
      '{0,lng}', '-123.065764'::jsonb
    ),
    '{0,name}', '"Lake Constance Trailhead (Dosewallips Road)"'::jsonb
  ),
  '{0,elevFt}', '1400'::jsonb
) WHERE id = 'wa_mount_constance_north_chute';

-- wa_mount_constance_west_arete: fa field contained a hedged but fabricated-
-- sounding guess ("similar vintage to other Constance routes (early-to-mid
-- 1900s likely)"), directly contradicting this same row's own corrections
-- field, which states plainly: "No confirmed first-ascent record for this
-- specific route was found ... so 'fa' is left null rather than guessed."
-- The correction was written down but never actually applied to the fa
-- column (same bug pattern as batch 14/15). Nulled to match what the row's
-- own corrections field says was already decided.
UPDATE routes SET fa = NULL WHERE id = 'wa_mount_constance_west_arete';

-- wa_mount_constance_west_arete: waypoints[1].note contained leftover
-- internal research/audit commentary ("CORRECTION: existing DB entry
-- (47.7296,-123.1417) is mislabeled/wrong ...") baked into a live,
-- user-facing waypoint note -- the same "leaked meta-comment" bug found on
-- Serpentine Crack in batch 19. The underlying lat/lng values are already
-- correct (they match every sibling's trailhead); only the note text itself
-- needed cleanup, replaced with a normal description in the same style used
-- by sibling wa_mount_constance_north_chimney's equivalent waypoint.
UPDATE routes SET waypoints = jsonb_set(
  waypoints, '{1,note}',
  '"Same Dosewallips Road / Lake Constance approach as the other Constance routes, diverging higher up at Crystal Pass."'
) WHERE id = 'wa_mount_constance_west_arete';

-- =========================================================================
-- Mount Crowder — Southwest Route
-- =========================================================================

-- wa_mount_crowder_southwest_route: waypoints[6] ("Hannegan Pass
-- Trailhead", lat 48.9101/lng -121.5927) is an exact-coordinate duplicate of
-- the Hannegan Pass Trailhead waypoint that legitimately belongs to the
-- separate wa_mount_challenger_challenger_glacier route (a genuine northern
-- Pickets trailhead). Its attached note argues this should replace the
-- row's actual Goodell Creek trailhead, citing Steph Abegg's "Mystery Ridge
-- Enchainment" TR -- but that TR in fact ran Berdeen -> Hagan -> Mystery ->
-- Despair -> Pioneer -> Crowder -> Swiss -> Mid Challenger -> Whatcom ->
-- Easy -> Mineral, i.e. Hannegan Pass was the party's EXIT after continuing
-- well past Crowder, not their means of reaching it. This waypoint directly
-- contradicts this same row's own approach text, approach_logistics field
-- (Goodell Creek / Newhalem, SR-20), and itinerary (which opens "From the
-- Goodell Creek trailhead..." and cites SummitPost's "Approach into the
-- Southern Pickets: Goodell Creek to Terror Basin" as its source) -- none of
-- which mention Hannegan Pass. Removed as contamination; the corresponding
-- gpx point for the same coordinate is removed alongside it.
UPDATE routes SET
  waypoints = waypoints - 6,
  gpx = gpx - 2
WHERE id = 'wa_mount_crowder_southwest_route';

-- =========================================================================
-- Mount Cruiser
-- =========================================================================

-- wa_mount_cruiser_nw_face_corner / wa_mount_cruiser_south_corner: both
-- routes' "Mount Cruiser" summit waypoint gives elevFt 6106, contradicting
-- each route's own high_point_ft (6104), the area row's elevation_ft (6104),
-- and external sources (Wikipedia/Peakbagger both give 6,104 ft). Fixed both
-- to match.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '6104'::jsonb)
  WHERE id = 'wa_mount_cruiser_nw_face_corner';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '6104'::jsonb)
  WHERE id = 'wa_mount_cruiser_south_corner';

-- wa_mount_cruiser_nw_face_corner: access.land_manager flatly said "National
-- Park Service -- Olympic National Park (Olympic Wilderness)", contradicting
-- this same row's own (more careful) access.landManager field two lines
-- above, which correctly notes the summit/Sawtooth Ridge sits just south of
-- the park boundary in the Mount Skokomish Wilderness, Olympic National
-- Forest -- matching the area row's own blurb and external sources
-- (Peakbagger: managed by Olympic National Forest). Fixed land_manager to
-- match this row's own already-correct landManager field.
UPDATE routes SET access = jsonb_set(
  access, '{land_manager}',
  '"U.S. Forest Service -- Mount Skokomish Wilderness, Olympic National Forest (summit/Sawtooth Ridge); the approach trail via Staircase lies within Olympic National Park."'
) WHERE id = 'wa_mount_cruiser_nw_face_corner';

-- wa_mount_cruiser_south_corner: gain_ft (5700) contradicted this same row's
-- own itinerary, whose day-by-day gainFt sums to 3000 + 2250 = 5250 -- and
-- matches elevation math (6,104 ft summit - ~850 ft trailhead =~ 5,250 ft)
-- and the sibling route's own already-consistent 5250. loss_ft was null
-- despite the same itinerary explicitly giving day 2 lossFt: 5250 for the
-- same round trip. Fixed both to 5250.
UPDATE routes SET gain_ft = 5250, loss_ft = 5250 WHERE id = 'wa_mount_cruiser_south_corner';

-- wa_mount_cruiser_south_corner: both access.landManager and
-- access.land_manager flatly said "National Park Service (Olympic National
-- Park)" / "... (Olympic Wilderness)" with no acknowledgment that the
-- summit/Sawtooth Ridge itself sits in the Mount Skokomish Wilderness
-- (Olympic National Forest) -- unlike sibling wa_mount_cruiser_nw_face_corner,
-- whose landManager field already states this split correctly. Fixed both
-- fields to match the sibling's correct language.
UPDATE routes SET access = jsonb_set(
  jsonb_set(
    access, '{landManager}',
    '"Approach trail (Staircase, North Fork Skokomish River Trail, Flapjack Lakes Trail, Gladys Divide) is within Olympic National Park (NPS); the summit and Sawtooth Ridge itself sit just south of the park boundary in the Mount Skokomish Wilderness, Olympic National Forest."'
  ),
  '{land_manager}',
  '"U.S. Forest Service -- Mount Skokomish Wilderness, Olympic National Forest (summit/Sawtooth Ridge); the approach trail via Staircase lies within Olympic National Park."'
) WHERE id = 'wa_mount_cruiser_south_corner';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_mount_challenger_challenger_glacier: headline grade ("5.6-5.7") vs.
--    rock_grade/pitch_detail/descent_text (all "5.5") for the summit block --
--    external sources themselves disagree (5.5/5.6/5.7 across different
--    trip reports/eras), so this looks like genuine real-world grading
--    ambiguity, not solely a DB bug; left for a human to pick one canonical
--    grade. Also: itinerary.days mile splits (10.4/9/10.4) still don't sum
--    to the now-corrected 37 mi round trip and need their own
--    reconciliation; access.rules' claim that Picket Range cross-country
--    zones share a 6-person cap with Boston Basin/Eldorado could not be
--    confirmed against a primary NPS source (403'd); gain_ft/loss_ft
--    (11,500) vs. itinerary-day sum (10,100) is an ~12% gap that may be a
--    legitimate Naismith-style estimate rather than an error;
--    approach_logistics trailhead coords vs. the waypoints[0] trailhead
--    coords differ by ~250 m, unconfirmed which is more precise; area
--    lat/lng vs. the (externally-matching) summit waypoint differ by ~100 m
--    but Mount Challenger has 5 named summits along one ridge, so the area
--    point may legitimately be a different reference point, not an error.
--  - wa_mount_constance_finger_traverse / wa_mount_constance_terrible_traverse:
--    both routes' beta text says the traverse is "typically encountered
--    during descent," while each row's own itinerary/pitch_detail/timing
--    consistently place the crossing during the AM ascent -- contradictory,
--    needs a human call on which direction was actually intended.
--  - wa_mount_constance_north_chimney: named "North Chimney (Standard
--    Route)", but this row's own overview says the route is "generally known
--    among Olympic climbers as the 'South Chute' (or 'College Route')" and
--    that "'North Chimney' refers specifically to the final short chimney on
--    the summit block" -- externally corroborated (Mazamas/Mountaineers/
--    SummitPost/Willhiteweb all title the standard line "South Chute"/
--    "College Route"). A rename is an editorial call for a human, not
--    something to force via SQL.
--  - wa_mount_crowder_southwest_route: fa field credits the 1962 Cal
--    Magnusson/Jack Ardussi/Don Mech/Don Schmechel FA to this route
--    (hedged), while this same row's own corrections field asserts instead
--    that the FA climbed the NE Ridge line and that "no fa credit is
--    attached to this route entry" -- but no external source found (search
--    only; Wikipedia/Peakbagger/SummitPost/CascadeClimbers/Steph Abegg's
--    site/AAJ index all checked) actually states which line the 1962 party
--    used, and the NE Ridge is independently documented in this same
--    dataset as a difficult, "convoluted," cliff-banded technical descent --
--    an implausible choice for an exploratory first ascent when the SW
--    Flank is explicitly the range's easiest/standard line. The
--    corrections field's specific claim looks unsupported, not confirmed;
--    left both fields as-is rather than guess a resolution either way.
--    Also: dist_km (61.15 km) doubled per the app's distKm*2 rendering
--    convention lands suspiciously close to a whole-number 76 mi RT, while
--    this row's own itinerary.totalNote separately claims "~32-mile round
--    trip" -- flagging for the dedicated audit:distances script rather than
--    resolving here, per CLAUDE.md's warning against ad hoc fixes to this
--    column.
--  - wa_mount_cruiser_nw_face_corner / wa_mount_cruiser_south_corner: both
--    routes' top-level `permit` field ("...Northwest Forest Pass to park")
--    contradicts each row's own access.passRequired field (day climbs need
--    only the NPS entrance pass, no Northwest Forest Pass, since the
--    trailhead is inside the park) -- needs reconciliation but unclear which
--    field should win without a broader DB-wide pass to check this pattern.
--    South Corner additionally has: an access._raw.permit_cost sub-object
--    with stale fee figures contradicting its own access.parking_pass
--    figures (looks like an unprocessed source-scrape remnant, not
--    something to hand-patch); a populated 137-point gpx track that
--    contradicts this same row's own data_quality.gaps note ("No public GPS
--    track found for this route") and whose shape (an unnaturally smooth
--    curve, then a coarse low-precision tail) looks possibly synthetic --
--    a human should verify whether this is a real recorded track before
--    trusting it; and length_m (107) that doesn't match the pitch_detail
--    sum (60+25=85m) or match either of two external trip-report figures
--    found (a "full 50m" first pitch, a "70 ft" crux) -- no authoritative
--    figure found to resolve it. Both routes' fa fields remain appropriately
--    unconfirmed/hedged (South Corner: null; NW Face/Corner: hedged 2004
--    Wallace/Parker credit, only loosely corroborated) -- left as-is.
-- =========================================================================

-- Verify afterward:
select id, elevation_ft, prominence_ft from areas where id = 'wa_mount_challenger';
select id, access, dist_km, itinerary from routes where id = 'wa_mount_challenger_challenger_glacier';
select id, grade, alpine_grade, commitment from routes where id = 'wa_mount_constance_finger_traverse';
select id, grade, alpine_grade, commitment, descent from routes where id = 'wa_mount_constance_terrible_traverse';
select id, hazards from routes where id = 'wa_mount_constance_north_chimney';
select id, waypoints from routes where id = 'wa_mount_constance_north_chute';
select id, fa, waypoints from routes where id = 'wa_mount_constance_west_arete';
select id, waypoints, gpx from routes where id = 'wa_mount_crowder_southwest_route';
select id, waypoints, access from routes where id = 'wa_mount_cruiser_nw_face_corner';
select id, waypoints, gain_ft, loss_ft, access from routes where id = 'wa_mount_cruiser_south_corner';
