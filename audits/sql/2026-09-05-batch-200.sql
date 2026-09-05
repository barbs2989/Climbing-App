-- WA alpine audit batch 200 (pass 4)
-- wa_liberty_bell_overexposure .. wa_liberty_traverse
--
-- NOTE on `npm run check:sql`: three of the five UPDATEs below hit its "no literal id
-- predicate -- not checkable" warning, because several jsonb text values being written
-- contain a genuine semicolon (e.g. "...for fit parties; some bivy..."), and the
-- checker's statement splitter is a plain `.split(";")` -- it does not track quoting, so
-- it cuts those three UPDATEs apart at that semicolon and the fragment holding the SET
-- clause loses its WHERE id=... guard before the id regex ever sees it. Confirmed this is
-- the cause (not a real problem with these statements) and manually re-verified all five
-- target ids exist and every WHERE-clause guard value still matches the live row,
-- immediately before finalizing this file. The other two statements (no embedded
-- semicolons) were checked normally and passed: "OK every target id exists; no DELETE
-- removes an only copy".

-- wa_liberty_bell_thin_red_line: THREE fixes.
-- (a) Trailhead waypoint (idx 0, 'SR-20 Hairpin / Pond Pullout (east of Washington Pass)',
--     48.51454,-120.64332) carries a 'note' that describes the BLUE LAKE trailhead
--     ('...about 1.5 mi WEST of Washington Pass...') -- this route's own 'approach' field,
--     'face' (East Face) and 'directions' on this same waypoint all agree the real
--     trailhead is the SR-20 hairpin/pond pullout EAST of the pass, not Blue Lake. Same
--     coordinate, same contamination class already identified for wa_liberty_bell_east_face
--     (proposed fix in batch 199) and wa_liberty_crack_free (this batch) -- replaced with
--     the identical corrected east-side description used there.
-- (b) itinerary.days[0].note and timing.sectionBreakdown[0].note both say 'Approach from
--     Blue Lake TH...', contradicting the row's own 'approach' field ('From Highway 20
--     hairpin curve on east side of Washington Pass...'). Re-homed using the row's own
--     itinerary text with only the wrong trailhead name swapped -- no new facts introduced.
--     This also completes timing.sectionBreakdown[0].note, which was truncated mid-word
--     ('...then rappel the route/stand...') -- completed to match the full, untruncated
--     itinerary.days[0].note already on file.
-- (c) gain_ft (1312) is far below the physical floor implied by the row's own data:
--     Trailhead 5,200 ft -> Liberty Bell summit 7,720 ft (both values corroborated across
--     14+ sibling Liberty Bell routes and Wikipedia) = 2,520 ft minimum net gain. loss_ft
--     (2,400) is also below that floor. This route's own beta/pitch_detail confirm the
--     line finishes on the true summit ('Grade V outing tops out on the true summit').
--     Corrected both to the floor value (2,520), matching the convention used by sibling
--     routes wa_liberty_bell_beckey_route/nw_face/sidewinder/girl_next_door (gain_ft=2520).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,note}', '"Pullout on the north shoulder of SR-20 at the hairpin curve just east of Washington Pass, below Liberty Bell; walk back toward the pass to the small pond on the south side of the highway."'::jsonb),
    itinerary = jsonb_set(itinerary, '{days,0,note}', '"Approach from the SR-20 hairpin/pond pullout (not Blue Lake TH) to the base (about 45 min-1 hr on the climbers'' trail/snowfield), climb the sustained free line (5.10-5.12, crux by pitch 9), then rappel the route/standard Beckey-side descent back to the car."'::jsonb),
    timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"Approach from the SR-20 hairpin/pond pullout (not Blue Lake TH) to the base (about 45 min-1 hr on the climbers'' trail/snowfield), climb the sustained free line (5.10-5.12, crux by pitch 9), then rappel the route/standard Beckey-side descent back to the car."'::jsonb),
    gain_ft = 2520,
    loss_ft = 2520
WHERE id = 'wa_liberty_bell_thin_red_line'
  AND waypoints->0->>'note' = 'Signed pullout on SR-20 about 1.5 mi west of Washington Pass; Northwest Forest Pass required, privy at the lot.'
  AND itinerary->'days'->0->>'note' = 'Approach from Blue Lake TH to the base (about 45 min-1 hr on the climbers'' trail/snowfield), climb the sustained free line (5.10-5.12, crux by pitch 9), then rappel the route/standard Beckey-side descent back to the car.'
  AND timing->'sectionBreakdown'->0->>'note' = 'Approach from Blue Lake TH to the base (about 45 min-1 hr on the climbers'' trail/snowfield), climb the sustained free line (5.10-5.12, crux by pitch 9), then rappel the route/stand…'
  AND gain_ft = 1312
  AND loss_ft = 2400;

-- wa_liberty_crack: TWO fixes.
-- (a) high_point_ft (7746) disagrees with this row's OWN Summit waypoint (elev '7720')
--     and with every other route on Liberty Bell: checked all 20 routes sharing
--     area_id='wa_liberty_bell' -- 15 of them store a high_point_ft and EVERY ONE of the
--     other 14 uses 7720 (matches Wikipedia's 'Liberty Bell Mountain ... 7,720+ ft').
--     wa_liberty_crack is the sole outlier. Corrected to 7720. gain_ft (2546) was computed
--     from the wrong 7746 (7746-5200=2546); recomputed against the corrected summit and the
--     row's own corroborated trailhead (5200 ft, matches 15+ sibling routes at this exact
--     coordinate): 7720-5200=2520, matching sibling wa_liberty_bell_beckey_route's gain_ft
--     exactly. loss_ft (2546) is left unchanged: it already matches
--     wa_liberty_bell_beckey_route's loss_ft, which reflects the descent's own up/down
--     profile (not just the direct net-rise), and this route's descent_text explicitly
--     follows that same Beckey-side descent.
-- (b) itinerary.days[0].note and timing.sectionBreakdown[0].note both say 'Pre-dawn
--     approach from Blue Lake TH...', directly contradicting this row's own 'approach'
--     field, which states in as many words: 'its approach does NOT start from the Blue
--     Lake Trailhead -- that's the trailhead for the west-side Beckey Route'. Re-homed
--     using the row's own itinerary text with only the wrong trailhead name swapped.
--     This also completes timing.sectionBreakdown[0].note, truncated mid-word ('...with
--     two rope...'), to match the full itinerary.days[0].note already on file.
UPDATE routes
SET high_point_ft = 7720,
    gain_ft = 2520,
    itinerary = jsonb_set(itinerary, '{days,0,note}', '"Pre-dawn approach from the SR-20 hairpin/pond pullout (not Blue Lake TH); climb the 12-pitch aid/free line, then rappel the standard two-rope Liberty Crack/Beckey descent. Documented ascents run 9-10 hrs car-to-car for fit parties; some bivy at the base for an easier pre-dawn start."'::jsonb),
    timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"Pre-dawn approach from the SR-20 hairpin/pond pullout (not Blue Lake TH); climb the 12-pitch aid/free line, then rappel the standard two-rope Liberty Crack/Beckey descent. Documented ascents run 9-10 hrs car-to-car for fit parties; some bivy at the base for an easier pre-dawn start."'::jsonb)
WHERE id = 'wa_liberty_crack'
  AND high_point_ft = 7746
  AND gain_ft = 2546
  AND loss_ft = 2546
  AND itinerary->'days'->0->>'note' = 'Pre-dawn approach from Blue Lake TH; climb the 12-pitch aid/free line, then rappel the standard two-rope Liberty Crack/Beckey descent. Documented ascents run 9-10 hrs car-to-car for fit parties; some bivy at the base for an easier pre-dawn start.'
  AND timing->'sectionBreakdown'->0->>'note' = 'Pre-dawn approach from Blue Lake TH; some parties bivy at the base the night before to start at first light. Climb all 12 pitches, then rappel the Beckey-side descent with two rope…';

-- wa_liberty_crack_free: THREE fixes, the same contamination class as
-- wa_liberty_bell_east_face (batch 199) and wa_liberty_bell_thin_red_line (this batch),
-- all at the identical SR-20 hairpin/pond pullout coordinate (48.51454,-120.64332).
-- (a) Trailhead waypoint's 'note' field reads 'Blue Lake Trail #314 trailhead on
--     SR-20; shared approach for Liberty Bell and South Early Winters Spire' -- but this
--     row's own 'approach' field says explicitly 'this is a different trailhead than the
--     Blue Lake TH used for the SW/NW Face routes'. Replaced with the corrected east-side
--     description already established for this coordinate.
-- (b) itinerary.days[0].note and timing.sectionBreakdown[0].note both say 'Pre-dawn start
--     from Blue Lake TH...', contradicting (a) and the row's own 'approach' field. Re-homed
--     using the row's own itinerary text with only the wrong trailhead name swapped; also
--     completes timing.sectionBreakdown[0].note, truncated mid-word ('...descent back ...'),
--     to match the full itinerary.days[0].note already on file.
-- (c) gain_ft (2546) and loss_ft (null): high_point_ft here is already the corroborated
--     7720 (matches 14 of 15 sibling Liberty Bell routes; see wa_liberty_crack fix above).
--     Trailhead (5200) to summit (7720) = 2520 ft, matching sibling
--     wa_liberty_bell_beckey_route's gain_ft exactly; gain_ft corrected 2546->2520.
--     loss_ft filled from wa_liberty_bell_beckey_route/wa_liberty_crack's shared value
--     (2546), since this route's own descent_text says it uses 'the same rap line used by
--     the standard Liberty Crack and Beckey Route descents'.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,note}', '"Pullout on the north shoulder of SR-20 at the hairpin curve just east of Washington Pass, below Liberty Bell; walk back toward the pass to the small pond on the south side of the highway."'::jsonb),
    itinerary = jsonb_set(itinerary, '{days,0,note}', '"Pre-dawn start from the SR-20 hairpin/pond pullout (not Blue Lake TH), approach to the base (about 1.5-2 hr), climb all 12 pitches of the free line, then rappel the standard two-rope Liberty Crack/Beckey descent back to the car. Most fit parties do it in a single big day; some bivy at the base to get first light on the route."'::jsonb),
    timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"Pre-dawn start from the SR-20 hairpin/pond pullout (not Blue Lake TH), approach to the base (about 1.5-2 hr), climb all 12 pitches of the free line, then rappel the standard two-rope Liberty Crack/Beckey descent back to the car. Most fit parties do it in a single big day; some bivy at the base to get first light on the route."'::jsonb),
    gain_ft = 2520,
    loss_ft = 2546
WHERE id = 'wa_liberty_crack_free'
  AND waypoints->0->>'note' = 'Blue Lake Trail #314 trailhead on SR-20; shared approach for Liberty Bell and South Early Winters Spire (NW Forest Pass required).'
  AND itinerary->'days'->0->>'note' = 'Pre-dawn start from Blue Lake TH, approach to the base (about 1.5-2 hr), climb all 12 pitches of the free line, then rappel the standard two-rope Liberty Crack/Beckey descent back to the car. Most fit parties do it in a single big day; some bivy at the base to get first light on the route.'
  AND timing->'sectionBreakdown'->0->>'note' = 'Pre-dawn start from Blue Lake TH, approach to the base (about 1.5-2 hr), climb all 12 pitches of the free line, then rappel the standard two-rope Liberty Crack/Beckey descent back …'
  AND gain_ft = 2546
  AND loss_ft IS NULL;

-- wa_liberty_bell_serpentine_crack: 'approach' field (was just "West, from
-- Washington Pass area near Winthrop, Washington") is byte-identical to this row's own
-- approach_logistics.trailheadDirection value -- a one-line stub, not an approach
-- description, unlike every sibling Liberty Bell route's 'approach' field. This row's own
-- itinerary.days[0].note and beta fields already carry a full, self-consistent approach
-- description ("Approach from the Blue Lake Trailhead up into Liberty Bell Basin to the
-- base of the west face (about 1.5-2 hr)"; beta: "Approach via Beckey Route approach,
-- staying left at fork in gully"). Re-homed a proper approach value assembled from those
-- two fields already on file -- no new facts introduced.
UPDATE routes
SET approach = 'Approach from the Blue Lake Trailhead up into Liberty Bell Basin to the base of the west face, via the Beckey Route approach staying left at the fork in the gully (roughly 1.5-2 hours).'
WHERE id = 'wa_liberty_bell_serpentine_crack'
  AND approach = 'West, from Washington Pass area near Winthrop, Washington';


-- wa_liberty_traverse: gain_ft (2001) is below the physical floor implied by the row's
-- own data -- even just reaching the FIRST summit on this link-up (Liberty Bell, via the
-- Beckey Route, per descent_text: "after topping out Liberty Bell via the Beckey Route,
-- the traverse continues over...") requires Trailhead (5,200 ft) -> Liberty Bell summit
-- (7,720 ft, this row's own Summit waypoint) = 2,520 ft minimum, before any of the
-- additional up/down over Concord Tower, Lexington Tower and the two Early Winter Spires.
-- This row's own itinerary.days[0] already states the fuller, self-consistent figure for
-- the whole link-up: gainFt=3500, lossFt=3500 (an out-and-back day per descent_text: "hike
-- back to the Blue Lake Trail"). Corrected the top-level gain_ft/loss_ft to match that
-- value already on file, rather than the smaller, floor-violating 2001/null.
UPDATE routes
SET gain_ft = 3500,
    loss_ft = 3500
WHERE id = 'wa_liberty_traverse'
  AND gain_ft = 2001
  AND loss_ft IS NULL
  AND itinerary->'days'->0->>'gainFt' = '3500'
  AND itinerary->'days'->0->>'lossFt' = '3500';
