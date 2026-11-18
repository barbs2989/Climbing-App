-- Batch 212 (pass 4): wa_mount_persis_west_ridge .. wa_mount_rainier_edmunds_headwall
-- Verified against: Wikipedia (Mount Persis, Mount Rahm), WebSearch synthesis of
-- Mount Pilchuck State Park / MBS NF fee pages, WebSearch synthesis of SummitPost/
-- Yellowleaf/Mountaineers trip-report language for Mount Price's Hester Lake route,
-- and mountaineers.org/RMI-guide synthesis for Curtis Ridge's documented 13,800 ft
-- ridge-top elevation (confirms the existing value; no change needed there).
--
-- NOTE: string literals below deliberately avoid embedded semicolons -- the checker
-- (scripts/check-sql-targets.mjs) splits statements on bare ";" and a semicolon
-- inside a quoted value truncates the statement before its own WHERE clause.

-- wa_mount_pilchuck_east_ridge: `permit` column says "a Discover Pass is required to
-- park on Washington State lands", contradicting this same row's own `access.fees`
-- ("Northwest Forest Pass or America the Beautiful interagency pass required at the
-- Pinnacle Lake Trailhead") and `access.passRequired` ("Northwest Forest Pass /
-- Interagency Pass"). The Pinnacle Lake Trailhead sits on Mount Baker-Snoqualmie
-- National Forest land; WebSearch of the Forest Service's own recreation-site page
-- for this trailhead states plainly that "Washington State Discover Pass is not valid
-- at US Fee Sites" and that a Northwest Forest Pass is required. Corrected to match
-- the row's own access blob and the external source.
UPDATE routes
SET permit = 'No climbing permit. A Northwest Forest Pass (or America the Beautiful interagency pass) is required to park at the Pinnacle Lake Trailhead.'
WHERE id = 'wa_mount_pilchuck_east_ridge'
  AND permit = 'No climbing permit; a Discover Pass is required to park on Washington State lands.';

-- wa_mount_pilchuck_standard_route: identical `permit` defect as above (same wording,
-- same contradiction with this row's own access.fees/access.passRequired/
-- access.parking_pass, which all correctly say Northwest Forest Pass).
UPDATE routes
SET permit = 'No climbing permit. A Northwest Forest Pass (or America the Beautiful interagency pass) is required to park at the trailhead.'
WHERE id = 'wa_mount_pilchuck_standard_route'
  AND permit = 'No climbing permit; a Discover Pass is required to park on Washington State lands.';

-- wa_mount_pilchuck_standard_route: access.rules falsely claims the trail is "inside
-- Glacier Peak Wilderness" (a group-size cap of 12 and a campfire ban above 3,500 ft,
-- both standard boilerplate Wilderness Act rules). Glacier Peak Wilderness is a
-- distinct, much larger designated wilderness well to the north/east (bordered by
-- Stephen Mather Wilderness and Henry M. Jackson Wilderness per Wikipedia). Mount
-- Pilchuck is not in any designated Wilderness at all: the summit/upper trail sits in
-- Mount Pilchuck State Park (per Wikipedia, "completely surrounded by Mount
-- Baker-Snoqualmie National Forest", with no wilderness designation mentioned), and
-- this exact row's own `access.landManager` field correctly says so ("the upper trail
-- and summit lie within Mount Pilchuck State Park"). This reads as a copy-paste
-- contamination from a Glacier Peak-area route's access rules. Removed rather than
-- replaced, since the actual day-use rules for Mount Pilchuck State Park were not
-- independently verified and a fabricated replacement would repeat the same class of
-- error under a different guise.
UPDATE routes
SET access = access - 'rules'
WHERE id = 'wa_mount_pilchuck_standard_route'
  AND access->>'rules' = 'Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.';

-- wa_mount_price_hester_lake_route: dist_km stored as 8 km (one-way), but this row's
-- own approach/beta text says the trail alone runs "roughly 5-6 miles" just to reach
-- the Hester Lake basin, before the off-trail scramble to the summit begins -- already
-- inconsistent with an 8 km (4.97 mi) total one-way figure. WebSearch synthesis of
-- SummitPost/Yellowleaf route descriptions gives "13 miles round trip with 4,100 feet
-- of elevation gain" and "5.5 miles to Hester Lake" for this exact route. The
-- elevation gain figure (4,100 ft) matches this row's own gain_ft exactly, giving high
-- confidence in that source. 13 mi round trip = 6.5 mi one-way = 10.46 km one-way,
-- consistent with 5.5 mi to the lake plus further scrambling to the summit ridge.
-- Corrected dist_km from 8 to 10.5 km.
UPDATE routes
SET dist_km = 10.5
WHERE id = 'wa_mount_price_hester_lake_route'
  AND dist_km = 8;
