-- WA alpine audit -- batch 90 (pass 2) -- 2026-08-09
-- Routes: wa_mount_steel_standard, wa_mount_stuart_cascadian_couloir, wa_mount_stuart_girth_pillar,
--         wa_mount_stuart_ice_cliff_glacier, wa_mount_stuart_north_face, wa_mount_stuart_north_ridge,
--         wa_mount_stuart_stuart_glacier_couloir, wa_mount_stuart_the_gendarme
-- Researched via 3 parallel agents grouped by peak (Steel x1; Stuart Cascadian Couloir/Girth
-- Pillar/Ice Cliff Glacier x3; Stuart North Face/North Ridge/Stuart Glacier Couloir/Gendarme x4).
-- Cross-corroborated via WebSearch citing Wikipedia, SummitPost, Mountaineers.org, USFS, Recreation.gov,
-- AAI route profiles, and guidebook-derived trip reports -- same standard as prior batches.
-- North Face: no action. Already self-flagged (verif.status: unverified) as a likely duplicate of the
-- real Ice Cliff Glacier route (near-identical stats, no independently-sourced "North Face" line found
-- in any Stuart route listing checked). Left as-is per the existing self-flag; not deleted since it may
-- carry user content and that's a human call, not a fact-audit fix.

-- wa_mount_steel_standard: dist_km (80.47) stored the already-doubled round-trip mileage (50 mi) rather
-- than the one-way figure the app convention expects (UI doubles dist_km again for round-trip display,
-- which would have shown a phantom 100-mile round trip). This row's own waypoints put the summit at
-- distMi=25 one-way from the Duckabush Trailhead, consistent with Wikipedia's ~21 mi one-way to Marmot
-- Lake plus the final push to the summit. Fixed to 25 mi = 40.23 km.
UPDATE routes SET dist_km = 40.23
WHERE id = 'wa_mount_steel_standard'
  AND dist_km = 80.47;

-- wa_mount_steel_standard: approach_logistics named the Staircase Trailhead (North Fork Skokomish) as
-- this route's trailhead, contradicting the route's own name ("...Duckabush approach"), its waypoints
-- (all keyed to the Duckabush Trailhead), and its own beta field, which states the Staircase/First
-- Divide line is currently closed due to Bear Gulch Fire damage and that Duckabush is "the only
-- currently reliable approach." Corrected to the Duckabush Trailhead, matching this row's own
-- waypoints[0] (externally confirmed via USFS Olympic NF trailhead info, ~47.685, -123.040).
UPDATE routes SET approach_logistics = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(approach_logistics, '{trailhead}', '"Duckabush Trailhead"'),
        '{trailheadLat}', '47.685162'
      ),
      '{trailheadLng}', '-123.039683'
    ),
    '{trailheadDirection}', '"From US 101 via Duckabush River Road (FR 2510) to the Duckabush Trailhead (FR 2510-060)"'
  )
WHERE id = 'wa_mount_steel_standard'
  AND approach_logistics->>'trailhead' = 'Staircase Trailhead (North Fork Skokomish, Olympic NP)';

-- wa_mount_stuart_cascadian_couloir: fa "Samuel Gannett, 1895" has no corroborating source anywhere --
-- no source connects Gannett to Stuart at all. Wikipedia and SummitPost independently agree the first
-- confirmed ascent was Frank Tweedy, solo (Aug 5, 1883), returning two days later with Richard Goode
-- (Aug 7, 1883) via the south gully -- the same line as today's standard route.
UPDATE routes SET fa = 'Frank Tweedy, 1883 (solo Aug 5; returned with Richard Goode Aug 7, via the south gully)'
WHERE id = 'wa_mount_stuart_cascadian_couloir'
  AND fa = 'Samuel Gannett, 1895';

-- wa_mount_stuart_cascadian_couloir: dist_km (19.3) equals this row's own round-trip mileage (12 mi
-- per its own totalNote, and the final waypoint's distMi=6 one-way to the summit) rather than the
-- one-way figure the app doubles for round-trip display -- was rendering as a phantom 24 mi round trip.
-- One-way = 6 mi = 9.66 km.
UPDATE routes SET dist_km = 9.66
WHERE id = 'wa_mount_stuart_cascadian_couloir'
  AND dist_km = 19.3;

-- wa_mount_stuart_cascadian_couloir: high_point_ft (9416) disagreed with this row's own final waypoint
-- (Mount Stuart Summit, elev 9415) and the area row's canonical elevation_ft (9415).
UPDATE routes SET high_point_ft = 9415
WHERE id = 'wa_mount_stuart_cascadian_couloir'
  AND high_point_ft = 9416;

-- wa_mount_stuart_cascadian_couloir: waypoints[0] (Esmeralda Basin Trailhead) elev=3200 contradicted
-- this same row's own approach text ("elevation ~4,243 ft") and external sources (Mountaineers.org,
-- AllTrails, WTA), which all converge on 4,243 ft for the trailhead.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '4243')
WHERE id = 'wa_mount_stuart_cascadian_couloir'
  AND (waypoints->0->>'elev')::int = 3200;

-- wa_mount_stuart_girth_pillar: waypoints[1] (Mount Stuart Summit) elevFt=9416 disagreed with this
-- row's own high_point_ft (9415) and the area row's canonical elevation_ft (9415).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '9415')
WHERE id = 'wa_mount_stuart_girth_pillar'
  AND (waypoints->1->>'elevFt')::int = 9416;

-- wa_mount_stuart_girth_pillar: length_m (610) didn't match the sum of this row's own 11
-- pitch_detail[].lengthM values (45+45+45+45+40+30+35+40+40+45+45 = 455).
UPDATE routes SET length_m = 455
WHERE id = 'wa_mount_stuart_girth_pillar'
  AND length_m = 610;

-- wa_mount_stuart_girth_pillar: dist_km (24.14) equals this row's own round-trip mileage (15 mi per
-- its own totalNote/itinerary), doubled again on display -- one-way = 7.5 mi = 12.07 km.
UPDATE routes SET dist_km = 12.07
WHERE id = 'wa_mount_stuart_girth_pillar'
  AND dist_km = 24.14;

-- wa_mount_stuart_ice_cliff_glacier: dist_km (24.14) shows the same round-trip-stored-as-one-way bug
-- as its Girth Pillar sibling above (15 mi round trip per its own totalNote/itinerary) -- one-way =
-- 7.5 mi = 12.07 km.
UPDATE routes SET dist_km = 12.07
WHERE id = 'wa_mount_stuart_ice_cliff_glacier'
  AND dist_km = 24.14;

-- wa_mount_stuart_ice_cliff_glacier: access.notes ("Northwest Forest Pass required... No specific
-- climbing permit") flatly contradicted this route's own permit field and its Girth Pillar sibling's
-- access.notes -- the Stuart Lake Trailhead approach sits inside the Enchantment Permit Area's Stuart
-- Zone (confirmed via Recreation.gov), requiring the same May 15-Oct 31 lottery permit for overnight
-- stays as every other Stuart route in this dataset.
UPDATE routes SET access = jsonb_set(access, '{notes}',
    '"2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery."'
  )
WHERE id = 'wa_mount_stuart_ice_cliff_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.';

-- wa_mount_stuart_stuart_glacier_couloir: access.notes carries the identical wrong text as the Ice
-- Cliff Glacier row above (same contradiction with this route's own permit field and its Girth
-- Pillar/Ice Cliff Glacier siblings) -- found by direct comparison while fixing the sibling row above,
-- same fix applied here.
UPDATE routes SET access = jsonb_set(access, '{notes}',
    '"2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery."'
  )
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.';

-- wa_mount_stuart_north_ridge: pitches (20) contradicted this row's own pitch_detail array (18
-- entries, verified by counting) and its own overview text ("roughly 18 pitches and 3,000 ft total").
UPDATE routes SET pitches = 18
WHERE id = 'wa_mount_stuart_north_ridge'
  AND pitches = 20;

-- wa_mount_stuart_north_ridge: fa self-contradicted this same row's own overview field, which
-- correctly credits "John Rupley and Don Gordon in 1956" for the lower ridge FA (bypassing the
-- Gendarme) and "James Wickwire and Fred Stanley in 1964" for the Gendarme's first direct ascent --
-- while the fa field instead named "Don Claunch" (not Gordon) for 1956 and omitted Wickwire/Stanley
-- entirely, crediting the Gendarme's first ascent to the 1970 Hargis/Ossiander toe-to-summit line
-- instead. Corrected to match this row's own overview and 2+ independent external sources
-- (Mountaineers.org, SummitPost, AAI route profile), keeping all four real, distinct historical
-- events (1956/1963/1964/1970) rather than conflating two of them.
UPDATE routes SET fa = 'John Rupley & Don Gordon, 1956 (first ascent of the North Ridge, bypassing the Great Gendarme). Fred Beckey & Steve Marts completed an earlier full ascent via the Lower North Ridge West Side variation in 1963. James Wickwire & Fred Stanley made the first direct ascent of the Great Gendarme in 1964. Mead Hargis & Jay Ossiander established the now-standard direct toe-to-summit line in 1970.'
WHERE id = 'wa_mount_stuart_north_ridge'
  AND fa = 'Mead Hargis & Jay Ossiander, 1970 (toe-to-summit line over the Great Gendarme — Don Claunch & John Rupley first climbed the upper ridge alone in 1956, and Fred Beckey & Steve Marts completed an earlier full ascent via a lower-ridge variation in 1963)';

-- wa_mount_stuart_stuart_glacier_couloir: gain_ft (6015) didn't sum from this row's own
-- itinerary.days[].gainFt (2600+3400=6000), and 6015 is exactly the sibling North Ridge row's figure
-- -- looks like a copy-paste bleed rather than a computed value for this route. Fixed to 6000, which
-- also matches this row's own loss_ft (6000) for a route that returns to trailhead elevation.
UPDATE routes SET gain_ft = 6000
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND gain_ft = 6015;

-- wa_mount_stuart_the_gendarme: descent ("retracing the ascent when possible") contradicted this same
-- row's own descent_text (which correctly describes the Cascadian Couloir exit) and the sibling North
-- Ridge row's bail field, which explicitly states retreat above the Gendarme is committing and rarely
-- attempted -- the exact "descent describes reversing a route other fields say never to reverse"
-- pattern seen repeatedly in this dataset. Rewritten to match the row's own descent_text.
UPDATE routes SET descent = 'Descend via the Cascadian Couloir (south side) to Ingalls Creek -- not by reversing the Gendarme''s pitches, which is a committing, rarely-attempted retreat (see the North Ridge route''s bail notes).'
WHERE id = 'wa_mount_stuart_the_gendarme'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible.';

-- wa_mount_stuart_the_gendarme: fa was null. The Great Gendarme's first direct ascent is
-- well-corroborated (2+ independent sources, and consistent with the corrected North Ridge row above)
-- as James Wickwire & Fred Stanley, 1964.
UPDATE routes SET fa = 'James Wickwire & Fred Stanley, 1964 (first direct ascent of the Great Gendarme)'
WHERE id = 'wa_mount_stuart_the_gendarme'
  AND fa IS NULL;
