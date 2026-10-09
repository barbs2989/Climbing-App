-- WA alpine route audit -- batch 260 (pass 5)
-- Routes checked: wa_guye_peak_r1, wa_guye_peak_r2, wa_guye_peak_southeast_gully,
-- wa_hadley_peak_cougar_divide, wa_hadley_peak_skyline_divide,
-- wa_helmet_butte_standard_route, wa_himmelhorn_southeast_route,
-- wa_honeymoon_route

-- Guye Peak, North Route ("Hidden Ridge" variation) (wa_guye_peak_r2):
-- descent_text opens "North Rib tops out on the same summit ridge system as
-- Guye's other routes..." -- but this row's own name field is "North Route",
-- and its own overview explicitly distinguishes THIS route from a separate,
-- harder "5.6-5.8 technical rib route" ("This is measurably easier ... than
-- the 5.6-5.8 technical rib route on Guye Peak"). The row's own data_quality
-- gap even says a distinct "North Rib" could not be independently confirmed
-- as a real, separate line. So calling this route "North Rib" in its own
-- descent text contradicts the row's own name and overview -- a naming slip,
-- not a fact requiring outside sourcing. "North Rib" occurs exactly once in
-- the field (confirmed live before writing).
UPDATE routes SET descent_text = replace(
  descent_text,
  'North Rib tops out',
  'North Route tops out'
) WHERE id = 'wa_guye_peak_r2'
  AND descent_text LIKE '%North Rib tops out%';

-- Hadley Peak, Cougar Divide Route: approach_logistics.trailheadDirection is
-- truncated mid-sentence ("From Glacier, WA, drive Mt."), the same defect on
-- both Hadley Peak routes in this batch. The full, correct directions are
-- already present verbatim in this same row's road.driveNote field ("From
-- Glacier, take Mt. Baker Highway (SR 542) east and turn onto FS Road 33;
-- follow the gravel road roughly 11 miles to its end at the Cougar Divide
-- Trailhead/parking area."). No outside research needed -- completing the
-- cut-off sentence from the row's own, uncut field.
UPDATE routes SET approach_logistics = jsonb_set(
  approach_logistics,
  '{trailheadDirection}',
  '"From Glacier, WA, drive Mt. Baker Highway (SR 542) east and turn onto Forest Service Road 33, then follow the gravel road roughly 11 miles to its end at the Cougar Divide Trailhead (~4,920 ft)."'
) WHERE id = 'wa_hadley_peak_cougar_divide'
  AND approach_logistics->>'trailheadDirection' = 'From Glacier, WA, drive Mt.';

-- Hadley Peak, Skyline Divide Route: identical truncation bug in the same
-- field. Completed from this row's own road.driveNote ("From Glacier, drive
-- SR 542 east about 1 mile, turn right onto Glacier Creek Road (FS 39), then
-- take an immediate left onto Deadhorse Road (FS 37); FS 37 normally
-- continues 12.7 miles to the Skyline Divide Trailhead, but is currently
-- gated at mile 0.03 for repair work.") and this row's own road.status,
-- which already documents the current washout closure.
UPDATE routes SET approach_logistics = jsonb_set(
  approach_logistics,
  '{trailheadDirection}',
  '"From Glacier, WA, drive SR 542 east about 1 mile, turn right onto Glacier Creek Road (FS 39), then take an immediate left onto Deadhorse Road (FS 37) toward the Skyline Divide Trailhead (~4,250 ft) -- currently gated at mile 0.03 for flood-damage repair, per the Mt. Baker-Snoqualmie alert of June 1, 2026."'
) WHERE id = 'wa_hadley_peak_skyline_divide'
  AND approach_logistics->>'trailheadDirection' = 'From Glacier, WA, drive Mt.';

-- Helmet Butte, Standard Route: access carries TWO differently-spelled land
-- manager keys that contradict each other. The camelCase key (landManager,
-- left untouched) correctly says the Trinity/Buck Creek Pass approach is
-- managed by the Chelan Ranger District of the Okanogan-Wenatchee National
-- Forest -- confirmed via the US Forest Service's own Okanogan-Wenatchee NF
-- recreation pages for Trinity Trailhead and Buck Creek Trail #1513, and by
-- WTA/Mountaineers.org route descriptions, all of which place this Chiwawa
-- River Road / Coles Corner / Lake Wenatchee approach in the
-- Okanogan-Wenatchee NF. The snake_case duplicate (land_manager) instead
-- names "Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"
-- -- the correct manager for the Mountain Loop Highway / North Fork Sauk
-- side of Glacier Peak Wilderness, a different valley system roughly 60+
-- miles away with no connection to this route's actual approach. The same
-- access object also carries a "parking_pass" key referencing "Mountain
-- Loop Highway trailheads," which is likewise nowhere on this route's
-- approach (Coles Corner -> WA-207 -> Chiwawa River Road). Both contaminated
-- keys are dropped; the correct landManager/passRequired/fees keys already
-- cover the same information without the errors.
UPDATE routes SET access = access - 'land_manager' - 'parking_pass'
WHERE id = 'wa_helmet_butte_standard_route'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year.';

-- Helmet Butte, Standard Route: this row's own "corrections" field already
-- resolved the summit elevation to 7,400 ft (Wikipedia / most consistently
-- corroborated topo/USGS figure), explicitly rejecting ListsOfJohn's 7,420
-- ft as a non-authoritative secondary figure, and high_point_ft was set to
-- 7400 accordingly. The "Helmet Butte Summit" waypoint's own elev/elevFt
-- were never updated to match and still store the rejected 7,420 value --
-- self-inconsistent with the row's own documented correction. Brought into
-- line with high_point_ft using the row's own prior research, no new
-- sourcing needed.
UPDATE routes SET waypoints = (
  SELECT jsonb_agg(
    CASE
      WHEN wp->>'name' = 'Helmet Butte Summit'
        THEN jsonb_set(jsonb_set(wp, '{elev}', '7400'), '{elevFt}', '7400')
      ELSE wp
    END
  )
  FROM jsonb_array_elements(waypoints) AS wp
)
WHERE id = 'wa_helmet_butte_standard_route'
  AND waypoints @> '[{"name": "Helmet Butte Summit", "elev": 7420}]';

-- Himmelhorn, Southeast Route: fa/overview corroborated externally this
-- pass (Wild Hair Crack FA -- Roper/Wild/Kroeker 1981, west face, 5.7 -- and
-- the "Stonehenge" South Face FA -- Schilling/Halder, July 2015, 5.10-, 8
-- pitches -- both confirmed via WebSearch against independent AAC/Alpinist/
-- Mountain Project coverage, matching this row's overview text closely, and
-- the 7,880 ft summit elevation independently confirmed the same way). No
-- fix needed for this route this pass -- see audit log for the one item
-- flagged for human review (the bare "rappels": "2" count, which is in
-- tension with this row's own hedged descent_text and its own admission
-- that exact SE-route beta was not found).

-- Honeymoon Route (Mount Deception, wa_honeymoon_route): gain_ft (7,861)
-- cannot be reconciled with this row's own data. Its own waypoints give a
-- 2,900 ft trailhead and a 7,788 ft summit (net rise 4,888 ft), and its own
-- approach text describes a materially monotonic ascent (Royal Basin trail,
-- then a direct gully to the east ridge) with no described intermediate
-- descents -- nothing in the row's own account explains nearly 3,000 ft of
-- extra gain beyond the net rise. loss_ft (5,400) is a plausible ~10% over
-- the same 4,888 ft net rise, in line with ordinary trail undulation, and
-- is close to the same peak's Standard Route (wa_mount_deception_standard,
-- corrected in an earlier pass to gain_ft=loss_ft=5,500 for a route that
-- explicitly detours around Gilhooley Tower and dips ~100 ft onto a glacier
-- remnant) despite this "Honeymoon"/NE Couloir line being explicitly
-- described as the shorter, more direct alternative to that standard line
-- -- it should not need more total gain than the longer, more circuitous
-- route. descent_text confirms this is a closed out-and-back to the same
-- trailhead ("the exit funnels back through upper Royal Basin to Royal Lake
-- and the maintained trail"), so gain must equal loss; loss_ft is the value
-- corroborated by the row's own data, so gain_ft is brought to match it
-- rather than the reverse.
UPDATE routes SET gain_ft = 5400
WHERE id = 'wa_honeymoon_route' AND gain_ft = 7861 AND loss_ft = 5400;

-- Honeymoon Route (Mount Deception): hazards contained two entries that
-- describe the peak's separate Standard Route, not this route. (1) "parties
-- have strayed from the standard gully into steeper terrain north of the
-- saddle..." explicitly names "the standard gully" (i.e. a different,
-- named route) and "the saddle" -- this route's own approach/descent never
-- mentions a saddle at all, climbing instead via Deception Basin directly
-- to the east ridge; the Standard Route's approach (already on file at
-- wa_mount_deception_standard) is the one built around the
-- Deception-Martin/Mystery saddle and Gilhooley Tower. (2) "Recent
-- documented incident (May 2026): a climber took a 300 ft fall and
-- required a helicopter rescue" -- independently confirmed via multiple
-- news sources (Yahoo News, KING5, Tacoma News Tribune coverage of the May
-- 23, 2026 rescue of Rizka Budiati-Szkutnik and Rochelle Garcia) that this
-- specific, well-documented accident happened on Mount Deception's Standard
-- Route, in a couloir on that route's approach -- not on the Honeymoon
-- Route/NE Couloir. Both entries removed from this row as misattributed;
-- the remaining hazards (loose pillow-lava rock, the unbridged Royal
-- Basin stream crossing, and the peak's cloud-cover-derived name, all of
-- which do apply to this route or the shared approach) are left in place.
UPDATE routes SET hazards = (
  SELECT jsonb_agg(to_jsonb(h))
  FROM jsonb_array_elements_text(hazards) AS h
  WHERE h !~ 'strayed from the standard gully'
    AND h !~ 'Recent documented incident \(May 2026\)'
)
WHERE id = 'wa_honeymoon_route';
