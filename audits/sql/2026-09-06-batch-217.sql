-- Batch 217 (pass 4): Mount St. Helens (Monitor Ridge, Worm Flows), Mount Steel
-- (First Divide), Mount Stuart (Girth Pillar, Ice Cliff Glacier, North Face,
-- North Ridge, Stuart Glacier Couloir).
--
-- Verified against: WebSearch corroboration (Wikipedia for Mount Stuart's 9,415 ft
-- summit elevation and Mount Steel's 6,225 ft summit elevation; Mount St. Helens
-- Institute / Recreation.gov for the current 2026 climbing-permit quota and fee
-- schedule; WTA/ProTrails/Willhite for the North Fork Skokomish -> First Divide
-- trail mileage; Mountaineers.org/WTA/AllTrails for Worm Flows' total elevation
-- gain; Recreation.gov/Enchantments-lottery sources for the current 2026 Enchantment
-- Permit Area lottery window), plus each row's own other fields (sibling routes on
-- the same peak, and a route's own waypoints/overview/permit columns disagreeing
-- with one another).
--
-- NOTE: string/jsonb literals below deliberately avoid embedded semicolons -- the
-- checker (scripts/check-sql-targets.mjs) splits statements on bare ";".

-- =========================================================================
-- Mount St. Helens
-- =========================================================================

-- wa_mount_st_helens_worm_flows: gain_ft stored 5563 (a trailhead(2,800 ft) ->
-- summit(8,363 ft) subtraction using the *approach* text's rounder trailhead
-- figure), but this same row's own overview text says "about 5,700 ft of gain"
-- and its own loss_ft already stores 5700 -- the row disagrees with itself.
-- Multiple external sources (Mountaineers.org, WTA-adjacent search results,
-- AllTrails) independently and consistently give "5,700 feet of elevation gain"
-- for this route. Corrected gain_ft to match loss_ft, the row's own overview
-- prose, and the external figure.
UPDATE routes SET gain_ft = 5700
WHERE id = 'wa_mount_st_helens_worm_flows' AND gain_ft = 5563 AND loss_ft = 5700;

-- wa_mount_st_helens_worm_flows: dist_km stored 8 (= 4.97 mi one-way), but this
-- same row's own summit waypoint records distMi: 5.4 from the trailhead --
-- disagreeing with its own waypoint chain by nearly half a mile. 5.4 mi one-way
-- is also much closer to the ~12-mile-round-trip figure widely reported by
-- Mountaineers.org/WTA/AllTrails (6 mi one-way) than the stored 4.97 mi was.
-- Corrected dist_km to match this row's own waypoint-derived one-way distance
-- (5.4 mi = 8.69 km).
UPDATE routes SET dist_km = 8.69
WHERE id = 'wa_mount_st_helens_worm_flows'
  AND dist_km = 8
  AND waypoints->1->>'type' = 'Summit'
  AND (waypoints->1->>'distMi')::numeric = 5.4;

-- wa_mount_st_helens_monitor_ridge, wa_mount_st_helens_worm_flows: this session
-- independently verified the stored permit quota (350/day Apr 1-May 14, 110/day
-- May 15-Oct 31), the $20/climber quota-season fee, and the free/self-issued
-- Nov 1-Mar 31 off-season permit against the Mount St. Helens Institute and
-- Recreation.gov's current 2026 listing -- all of it matches the access/permit
-- columns on file exactly. Stamping access_checked_at.
UPDATE routes SET access_checked_at = '2026-09-06'
WHERE id IN ('wa_mount_st_helens_monitor_ridge', 'wa_mount_st_helens_worm_flows');

-- =========================================================================
-- Mount Steel
-- =========================================================================

-- wa_mount_steel_first_divide: approach/beta both give the North Fork Skokomish
-- trail distance from Staircase to First Divide as 12.7 mi, and dist_km (20.4)
-- is internally consistent with that figure -- but three independent trail
-- sources (Washington Trails Association, ProTrails, Willhite Web) all
-- consistently give this exact same trail segment as 13.1 miles. First Divide's
-- own elevation (4,688 ft) and the Staircase trailhead's own coordinates already
-- on file both check out exactly against external sources, so only the mileage
-- figure was corrected, to 13.1 mi / 21.08 km.
UPDATE routes SET approach = replace(
  approach,
  'North Fork Skokomish River Trail 12.7 miles to First Divide',
  'North Fork Skokomish River Trail 13.1 miles to First Divide'
) WHERE id = 'wa_mount_steel_first_divide';

UPDATE routes SET beta = replace(
  beta,
  'First Divide (12.7 mi, climbing',
  'First Divide (13.1 mi, climbing'
) WHERE id = 'wa_mount_steel_first_divide';

UPDATE routes SET dist_km = 21.08
WHERE id = 'wa_mount_steel_first_divide' AND dist_km = 20.4;

-- wa_mount_steel_first_divide: this session independently verified the "wilderness
-- backcountry camping permit required year-round, reserved through recreation.gov"
-- claim (and that day climbs need no permit) against NPS's current Olympic National
-- Park wilderness-permit policy. Matches. Stamping access_checked_at.
UPDATE routes SET access_checked_at = '2026-09-06'
WHERE id = 'wa_mount_steel_first_divide';

-- =========================================================================
-- Mount Stuart
-- =========================================================================

-- wa_mount_stuart_girth_pillar: the summit waypoint ("Mount Stuart Summit") stores
-- elev/elevFt 9416, one foot off this same row's own high_point_ft (9415) and off
-- Mount Stuart's externally confirmed 9,415 ft summit elevation (Wikipedia, NGVD29).
-- All four sibling Mount Stuart routes in this batch (Ice Cliff Glacier, North
-- Face, North Ridge, Stuart Glacier Couloir) agree on 9415 in both their
-- high_point_ft column and their own summit waypoints. Corrected to match.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{1,elev}', '9415'::jsonb),
      '{1,elevFt}', '9415'::jsonb
    )
WHERE id = 'wa_mount_stuart_girth_pillar'
  AND waypoints->1->>'name' = 'Mount Stuart Summit'
  AND (waypoints->1->>'elev')::numeric = 9416
  AND (waypoints->1->>'elevFt')::numeric = 9416;

-- wa_mount_stuart_ice_cliff_glacier, wa_mount_stuart_stuart_glacier_couloir: both
-- rows' access.notes field says "Northwest Forest Pass required ($5/day or
-- $30/annual). No specific climbing permit." -- but both rows' own `permit` column
-- (and their own access.rules field, describing the permit boundary's 8-person
-- group cap) correctly say the Enchantment Permit Area requires a Recreation.gov
-- quota permit for overnight stays May 15-Oct 31. Both routes' standard itinerary
-- involves an overnight bivy inside that same permit boundary (the Mountaineer
-- Creek/Ice Cliff-Sherpa basin), so "no specific climbing permit" both contradicts
-- this project's own sibling routes on the identical Stuart Lake trailhead/approach
-- (Girth Pillar, North Face) -- which correctly carry the 2026 lottery window in
-- this same field -- and was independently confirmed current against
-- Recreation.gov's 2026 Enchantments lottery schedule (Feb 15-Mar 1 application,
-- results after Mar 17). Corrected both rows' access.notes to match, and stamped
-- access_checked_at.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery."'::jsonb
)
WHERE id = 'wa_mount_stuart_ice_cliff_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.';

UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery."'::jsonb
)
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.';

-- wa_mount_stuart_north_ridge: this row's access blob has no `notes` key at all --
-- unlike its Stuart Lake trailhead siblings above, it never states the Enchantment
-- lottery requirement anywhere in `access`, though its own `permit` column already
-- states it correctly. This is the mountain's most-climbed technical route (one of
-- the Fifty Classic Climbs), so the omission is worth closing rather than leaving
-- silent. Added the same, externally-verified notes text.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery."'::jsonb
)
WHERE id = 'wa_mount_stuart_north_ridge'
  AND NOT (access ? 'notes');

-- wa_mount_stuart_girth_pillar, wa_mount_stuart_ice_cliff_glacier,
-- wa_mount_stuart_north_face, wa_mount_stuart_north_ridge,
-- wa_mount_stuart_stuart_glacier_couloir: this session independently verified the
-- 2026 Enchantment Permit Area lottery window (Feb 15-Mar 1 application, results
-- after Mar 17) against Recreation.gov / current Enchantments-lottery guidance, and
-- (for the three that already had it) found it accurate. Stamping access_checked_at
-- for all five Stuart Lake trailhead routes now that all five agree.
UPDATE routes SET access_checked_at = '2026-09-06'
WHERE id IN (
  'wa_mount_stuart_girth_pillar',
  'wa_mount_stuart_ice_cliff_glacier',
  'wa_mount_stuart_north_face',
  'wa_mount_stuart_north_ridge',
  'wa_mount_stuart_stuart_glacier_couloir'
);
