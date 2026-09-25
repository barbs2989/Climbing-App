-- WA alpine audit batch 342 (pass 6)
-- Routes: wa_mount_daniel_lynch_glacier (clean), wa_mount_deception_standard (2 fixes),
--         wa_mount_degenhardt_southwest_route (flagged only), wa_mount_despair_east_route (fix),
--         wa_mount_despair_northeast_buttress (flagged only), wa_mount_ellinor_standard (clean),
--         wa_mount_fairchild_standard (flagged only -- needs re-enrichment, not a value fix),
--         wa_mount_fernow_southeast_face (clean)

-- =========================================================================
-- Mount Deception, Standard Scramble -- wa_mount_deception_standard
-- =========================================================================
-- The row's own overview text and its high_point_ft column both already say 7,788 ft, but the
-- "Mount Deception" summit waypoint (index 2) still carries the stale 7,786 ft figure in both
-- elev and elevFt. Wikipedia ("Mount Deception (Washington)") and olympicpeninsula.org's page
-- titled "Mount Deception (7,788 ft)" both independently agree on 7,788 ft -- the waypoint is
-- the outlier and is corrected to match the row's own already-correct figure.
UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{2,elev}', '7788'::jsonb),
  '{2,elevFt}', '7788'::jsonb
)
WHERE id = 'wa_mount_deception_standard'
  AND waypoints->2->>'name' = 'Mount Deception'
  AND waypoints->2->>'type' = 'Summit'
  AND (waypoints->2->>'elev')::int = 7786
  AND (waypoints->2->>'elevFt')::int = 7786;

-- Olympic National Forest's current org structure has only two ranger districts -- Pacific and
-- Hood Canal (Quilcene is the Hood Canal district's office town, not a district name). This same
-- row's access.landManager ("...Olympic National Forest, Hood Canal Ranger District...") and
-- access.overnight_permit / emergency.rangerStation ("USFS Hood Canal Ranger District (Quilcene),
-- (360) 765-2200") already say Hood Canal -- access.parking_pass was the odd one out, naming a
-- "Quilcene Ranger District" that does not exist. Confirmed via USFS Olympic NF's org page and
-- WTA's ranger-station index.
UPDATE routes
SET access = jsonb_set(
  access,
  '{parking_pass}',
  '"Northwest Forest Pass, Interagency Pass or Scan & Pay at the Upper Dungeness Trailhead — $5 per vehicle per day or $30 annual. The trailhead is on Olympic National Forest land (Hood Canal Ranger District), so no Olympic National Park entrance fee is charged to park there."'::jsonb
)
WHERE id = 'wa_mount_deception_standard'
  AND access->>'parking_pass' = 'Northwest Forest Pass, Interagency Pass or Scan & Pay at the Upper Dungeness Trailhead — $5 per vehicle per day or $30 annual. The trailhead is on Olympic National Forest land (Quilcene Ranger District), so no Olympic National Park entrance fee is charged to park there.';

-- =========================================================================
-- Mount Despair, East Route -- wa_mount_despair_east_route
-- =========================================================================
-- access.passRequired claims no parking pass is needed because "the Thornton Lakes Trailhead
-- lies inside North Cascades National Park" -- that's wrong on two counts. The trailhead itself
-- sits on Mt. Baker-Snoqualmie National Forest land (multiple independent Thornton Lakes Trail
-- trip-report sources agree a $5/day or $30/annual Northwest Forest Pass is required to park
-- there), and the trail does not actually cross into North Cascades National Park until roughly
-- mile 4. This also contradicts the row's OWN waypoints[0] note for this same trailhead, which
-- already correctly says "Northwest Forest Pass and a self-issue wilderness permit are needed
-- for overnight camps" -- passRequired was the field that hadn't been corrected to match.
UPDATE routes
SET access = jsonb_set(
  access,
  '{passRequired}',
  '"A Northwest Forest Pass (or Interagency/America the Beautiful pass) is required to park at the Thornton Lakes Trailhead — it sits on Mt. Baker-Snoqualmie National Forest land, and the trail does not enter North Cascades National Park until roughly mile 4. The overnight wilderness permit above is separately required for camping at Thornton Pass, Triumph Pass, or the Despair Lakes basin."'::jsonb
)
WHERE id = 'wa_mount_despair_east_route'
  AND access->>'passRequired' = 'None — the Thornton Lakes Trailhead lies inside North Cascades National Park, so no Northwest Forest Pass or NPS entrance fee applies; only the overnight wilderness permit above is required.';
