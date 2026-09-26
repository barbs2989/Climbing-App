-- WA alpine audit batch 234 (pass 4)

-- wa_the_devils_club (Southeast Mox Peak, The Devils Club / East Face): the waypoints
-- array mixes in three landmarks from a DIFFERENT, undescribed approach corridor.
-- "Depot Creek Falls", "Ouzel Lake" (elev 5,700 ft), and "Redoubt Glacier Camp" (elev
-- 7,300 ft) are all landmarks on the CANADIAN "Depot Creek" approach to the Mox
-- massif, reached from Chilliwack Lake, BC via a 4x4 road and a border crossing
-- (confirmed against countryhighpoints.com's route descriptions: Perry Creek and
-- Redoubt Creek are both reached from the Little Beaver landing on Ross Lake -- the
-- US side -- while the Depot Creek approach via Ouzel Lake and the Redoubt Glacier is
-- the separate BC route; "the flat area on the Redoubt Glacier at ~7,300 ft" is cited
-- there as a camp on that Canadian approach, matching this row's elevation exactly).
-- This route's OWN approach/approach_variants/overview text describes ONLY the US-side
-- Ross Lake -> Little Beaver dock -> Perry Creek drainage approach, and the row's own
-- Trailhead waypoint note makes the distinction explicit: "US-side approach, OPPOSITE
-- the Depot Creek approach used for the West Ridge/Beckey route." A party following
-- this row's waypoint list in order would be sent from the Ross Dam trailhead (US) to
-- Depot Creek Falls / Ouzel Lake / Redoubt Glacier (Canada) with no border crossing or
-- alternate approach ever mentioned in the prose. Removing the three contaminated
-- waypoints; the remaining Trailhead -> Junction (Base of East Face Headwall) ->
-- Summit sequence matches the row's own approach text and trailhead note.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' NOT IN ('Depot Creek Falls', 'Ouzel Lake', 'Redoubt Glacier Camp')
)
WHERE id = 'wa_the_devils_club'
  AND waypoints @> '[{"name": "Depot Creek Falls"}]'::jsonb;

-- wa_the_brothers_south_couloir (The Brothers, South Couloir/Standard Route):
-- grade_num is stored as 3 for grade "Grade II" -- a bare commitment grade with no
-- YDS technical component. The app's own gradeNumFrom() parser (lib/grade.js) has no
-- branch that matches a roman numeral preceded by the word "Grade" (its roman-numeral
-- fallback is anchored to the start of the string), so it would return null for this
-- exact string -- and that is exactly what the live catalog's own convention already
-- is: of the 10 WA routes graded plain "Grade II", 7 store grade_num = null, while
-- only this row and one other (wa_bedal_peak_standard, out of this batch's scope)
-- store 3. Correcting this outlier to match the parser's own output and the dominant
-- in-catalog convention for the same grade string.
UPDATE routes SET grade_num = NULL WHERE id = 'wa_the_brothers_south_couloir' AND grade_num = 3;

-- wa_the_brothers_traverse (The Brothers, Brothers Traverse): this row's own
-- access.permit field directly contradicts its own top-level permit field. Top-level
-- permit reads "Free self-issue The Brothers Wilderness permit at the trailhead;
-- Northwest Forest Pass to park." -- but access.permit reads "No permit for day
-- climbs; overnight camping within the Olympic National Park boundary requires a park
-- wilderness permit," omitting the Forest Service wilderness self-issue day permit
-- the row itself says is required. The sibling South Couloir route (same trailhead,
-- same Olympic National Forest / The Brothers Wilderness land manager) already states
-- this correctly and without contradiction: "Free self-issue wilderness permit at the
-- trailhead register; The Brothers Wilderness itself is not quota-limited (unlike
-- Upper Lena Lake camping, which requires a reserved permit May 1-Sep 30)." Aligning
-- this row's access.permit with its own top-level statement and its sibling's wording,
-- while keeping the useful (and separately correct) note about NPS backcountry
-- permits for any overnight stay that crosses into the adjacent Olympic National Park.
UPDATE routes
SET access = jsonb_set(
  access,
  '{permit}',
  '"Free self-issue wilderness permit at the trailhead register. The Brothers Wilderness itself is not quota-limited for day climbs (unlike Upper Lena Lake camping, which requires a reserved permit May 1-Sep 30). Overnight camping within the adjacent Olympic National Park boundary near the upper mountain would separately require an NPS backcountry permit."'::jsonb
)
WHERE id = 'wa_the_brothers_traverse'
  AND access->>'permit' = 'No permit for day climbs; overnight camping within the Olympic National Park boundary requires a park wilderness permit.';
