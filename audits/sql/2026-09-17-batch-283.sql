-- WA alpine route audit, pass 5, batch 283 -- 2026-09-17
-- Two peaks, 8 routes: Mount Stuart (Ice Cliff Glacier, North Face, North Ridge
-- (Complete), Stuart Glacier Couloir, The Gendarme, West Ridge) and Mount Teneriffe
-- (Kamikaze Trail, Standard Route).
--
-- Every fix below except the two Teneriffe bivy-array prunes was already correctly
-- diagnosed by earlier passes over this same peak cluster (batch 90 / pass 2,
-- 2026-08-09; batch 153 / pass 3, 2026-08-27; batch 217 / pass 4, 2026-09-06) but
-- never actually applied to the live database -- re-confirmed against the CURRENT
-- live rows before writing fresh, guarded UPDATEs here rather than re-deriving from
-- scratch. See audits/wa-alpine-audit-log.md batches 90/153/217 for the original
-- research and external corroboration; this file only re-verifies current values
-- and re-confirms the I-90 exit number and Enchantment lottery window facts
-- independently (WSDOT/iExit; explorewithalec.com/outdoorstatus.com/PermitSnag, all
-- agreeing on Feb 15-Mar 1 2026 application window, results Mar 17).

-- wa_mount_stuart_ice_cliff_glacier: dist_km (24.14 km = 15.0 mi) stores this
-- route's own already-doubled round-trip mileage instead of the one-way figure the
-- app convention doubles for display. The row's own itinerary.totalNote states
-- "~6,000 ft gain over ~15 mi round trip" -- so at 15 mi round trip, one-way is
-- 7.5 mi = 12.07 km. (Originally diagnosed batch 90, alongside the identical bug on
-- Girth Pillar, which was separately re-confirmed already fixed live at 12.07.)
UPDATE routes SET dist_km = 12.07
WHERE id = 'wa_mount_stuart_ice_cliff_glacier'
  AND dist_km = 24.14;

-- wa_mount_stuart_ice_cliff_glacier, wa_mount_stuart_stuart_glacier_couloir: both
-- rows' access.notes says "Northwest Forest Pass required ($5/day or $30/annual).
-- No specific climbing permit." -- directly contradicting each row's own `permit`
-- column and `access.rules` (which describes the Enchantment Permit Area's 8-person
-- group cap), and both routes' standard itinerary involves an overnight bivy inside
-- that same permit boundary. Originally diagnosed batch 90 and batch 217; the
-- Feb 15-Mar 1 2026 lottery window is independently re-confirmed current here.
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

-- wa_mount_stuart_north_face, wa_mount_stuart_the_gendarme: both rows' "Mount
-- Stuart summit" waypoint stores lng -120.9022, off by ~68 m from the peak's own
-- established coordinate (47.475118, -120.903144), which matches areas.wa_mount_stuart
-- and the summit waypoint already correctly used on the sibling
-- wa_mount_stuart_ice_cliff_glacier row. Externally confirmed against the
-- USGS-cited Mount Stuart summit coordinate (47.4751179 N, 120.9031444 W).
-- Originally diagnosed batch 153.
UPDATE routes SET waypoints = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Mount Stuart summit'
         THEN jsonb_set(elem, '{lng}', '-120.903144'::jsonb)
         ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
)
WHERE id = 'wa_mount_stuart_north_face'
  AND waypoints @> '[{"name": "Mount Stuart summit", "lng": -120.9022}]';

UPDATE routes SET waypoints = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Mount Stuart summit'
         THEN jsonb_set(elem, '{lng}', '-120.903144'::jsonb)
         ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
)
WHERE id = 'wa_mount_stuart_the_gendarme'
  AND waypoints @> '[{"name": "Mount Stuart summit", "lng": -120.9022}]';

-- wa_mount_stuart_north_ridge: `pitches` (20) contradicts this row's own 18-entry
-- `pitch_detail` array (pitches numbered 1 through 18) and its own `overview`
-- ("roughly 18 pitches and 3,000 ft total") and `itinerary.totalNote` ("~18
-- pitches"). Originally diagnosed batch 90.
UPDATE routes SET pitches = 18
WHERE id = 'wa_mount_stuart_north_ridge'
  AND pitches = 20
  AND jsonb_array_length(pitch_detail) = 18;

-- wa_mount_stuart_north_ridge: access blob has no `notes` key at all -- unlike its
-- Stuart Lake trailhead siblings, it never states the Enchantment lottery
-- requirement anywhere in `access`, though its own `permit` column already states
-- it correctly. This is the mountain's most-climbed technical route (one of the
-- Fifty Classic Climbs), so the omission is worth closing. Originally diagnosed
-- batch 217.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery."'::jsonb
)
WHERE id = 'wa_mount_stuart_north_ridge'
  AND NOT (access ? 'notes');

-- wa_mount_stuart_stuart_glacier_couloir: gain_ft (6015) doesn't sum from this
-- row's own itinerary days (2600 + 3400 = 6000) and is exactly the sibling North
-- Ridge row's figure -- a likely copy-paste bleed. Corrected to match this row's
-- own loss_ft (6000) and its own itinerary.totalNote ("roughly 6,000 ft gain").
-- Originally diagnosed batch 90.
UPDATE routes SET gain_ft = 6000
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND gain_ft = 6015
  AND loss_ft = 6000;

-- wa_mount_stuart_the_gendarme: `descent` says "Descend via the standard descent
-- route, retracing the ascent when possible," directly contradicting this same
-- row's own `descent_text` (which describes descending via the false summit and
-- the Cascadian Couloir to Ingalls Creek -- consistent with every sibling Stuart
-- North Ridge route in this cluster, none of which treat retracing the ascent as
-- an option above the Gendarme). Rewritten to match descent_text. Originally
-- diagnosed batch 90.
UPDATE routes SET descent = 'From the summit, descend east to the false summit through blocky terrain, then down the Cascadian Couloir to Ingalls Creek, the standard descent for the whole North Ridge. Retreating back over the Gendarme is not a normal option once above it.'
WHERE id = 'wa_mount_stuart_the_gendarme'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible.';

-- wa_mount_stuart_the_gendarme: `fa` is null, though this row's own `corrections`
-- field says it describes only the Gendarme's own two pitches (not a full base-to-
-- summit route), and the specific first DIRECT ascent of the Gendarme tower itself
-- (as opposed to the 1956 ascent, which turned it on ledges to the west, per this
-- row's own approach_variants baseFinding) is James Wickwire & Fred Stanley, 1964 --
-- externally corroborated in batch 153 and consistent with the sibling North Ridge
-- row's own overview ("the Gendarme itself was first climbed directly by James
-- Wickwire and Fred Stanley in 1964"). Originally diagnosed batch 90.
UPDATE routes SET fa = 'James Wickwire & Fred Stanley, 1964 (first direct ascent of the Gendarme tower itself — the original 1956 North Ridge ascent by Rupley and partner turned it on ledges to the west)'
WHERE id = 'wa_mount_stuart_the_gendarme'
  AND fa IS NULL;

-- wa_mount_teneriffe_kamikaze_trail, wa_mount_teneriffe_standard_route:
-- road.driveNote (and the standard route's own `approach` text) cite "I-90 Exit 31
-- (North Bend)" for reaching SE Mount Si Road. WSDOT's own interchange
-- documentation identifies Exit 31 as SR-202/Bendigo Blvd into downtown North
-- Bend; WSDOT/iExit both identify Exit 32 (436th Ave SE) as the interchange for
-- Mount Si Road and the Mount Si/Little Si/Mount Teneriffe trailheads, matching
-- the driving directions this catalog's own text describes (turn north over the
-- freeway onto North Bend Way, then onto Mount Si Road) under the wrong exit
-- number. Originally diagnosed and externally confirmed batch 153; independently
-- re-confirmed here against WSDOT's SR090 exit-31 interchange PDF and iExit's
-- exit-32 listing.
-- Note: the semicolon inside the ORIGINAL driveNote text ("...Mount Si Road; the
-- paved...") breaks this checker's naive statement-splitting if matched with `=`
-- and a full literal (same trap CLAUDE.md and batch 216 already record) -- matched
-- with a prefix LIKE ending before the semicolon instead, and the replacement text
-- below uses an em dash rather than a semicolon so it cannot recreate the trap.
UPDATE routes SET road = jsonb_set(road, '{driveNote}',
  '"From I-90 Exit 32 (436th Ave SE), follow North Bend Way then turn onto SE Mount Si Road — the paved Mount Teneriffe Trailhead lot is about 2.9 miles past the Mount Si trailhead."'::jsonb
)
WHERE id = 'wa_mount_teneriffe_kamikaze_trail'
  AND road->>'driveNote' LIKE 'From I-90 Exit 31 (North Bend), follow North Bend Way then turn onto SE Mount Si Road%';

UPDATE routes SET road = jsonb_set(road, '{driveNote}',
  '"From I-90 Exit 32 (436th Ave SE), follow North Bend Way then turn onto SE Mount Si Road — the paved Mount Teneriffe Trailhead lot is about 2.9 miles past the Mount Si trailhead."'::jsonb
)
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND road->>'driveNote' LIKE 'From I-90 Exit 31 (North Bend), follow North Bend Way then turn onto SE Mount Si Road%';

UPDATE routes SET approach = 'From I-90 take Exit 32 (436th Ave SE) into North Bend and continue on North Bend Way, then turn left (north) on SE Mount Si Road. Continue about 2.9 miles past the Mount Si trailhead to the paved, ~70-car Mount Teneriffe Trailhead lot (Discover Pass required). From the lot, a half-mile access path switchbacks up through second-growth forest to an old logging-road grade, which climbs gently for about 1.5 miles through young forest and meadow, passing the signed spur down to Teneriffe Falls at roughly 2.8 miles. Beyond the falls junction the trail narrows and climbs via switchbacks (with a Middle Fork Snoqualmie viewpoint) for another ~2.7 miles, then continues about 2.3 more miles, dipping briefly to Rachor Pass (~4,200 ft saddle) before the final short, rocky summit scramble.'
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND approach LIKE 'From I-90 take Exit 31 into North Bend%';

-- wa_mount_teneriffe_kamikaze_trail, wa_mount_teneriffe_standard_route: both
-- rows' `bivy` array carries the identical 7-entry list shared verbatim across
-- five Exit-34 Middle Fork/Taylor River corridor routes
-- (wa_garfield_mountain_scramble, wa_mount_price_north_route,
-- wa_mount_price_hester_lake_route, wa_preacher_mountain_scramble,
-- wa_treen_peak_scramble -- confirmed by direct query, all five carry the same
-- array). Mount Teneriffe is not part of that corridor: its area row's parent is
-- wa_north_bend_vicinity, not wa_exit_34_middle_fork_amp_taylor_river, and it is
-- reached from an entirely different trailhead/road system (SE Mount Si Road /
-- WA DNR Mount Si NRCA vs. the Middle Fork Road). Six of the seven entries
-- (Middle Fork Campground, Middle Fork road pull-outs, Hester/Myrtle Lake basins,
-- Green Ridge Lake, Rainy Lake, Garfield Mountain improvised bivouac) describe
-- camps/bivies for Mount Price, Treen Peak, Preacher Mountain and Garfield
-- Mountain specifically and have no connection to a Teneriffe climb -- the
-- surviving seventh entry ("Mount Teneriffe and the Mount Si conservation area,
-- no overnight") is self-aware of exactly this, stating in its own text that
-- Teneriffe "has a different land manager, a different pass and different rules"
-- from "the other peaks here" and already contains everything a Teneriffe party
-- needs to know (there is no legal overnight option on the mountain; the nearest
-- developed camp, Middle Fork Campground, is ~20 minutes' drive away). Pruned the
-- six unrelated corridor entries from both Teneriffe rows, leaving only the one
-- entry that is actually about this peak. (The five real Middle Fork corridor
-- routes, and their own "no overnight" entry about Teneriffe, are out of scope for
-- this batch and untouched.)
UPDATE routes SET bivy = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(bivy) AS elem
  WHERE elem->>'name' = 'Mount Teneriffe and the Mount Si conservation area, no overnight'
)
WHERE id = 'wa_mount_teneriffe_kamikaze_trail'
  AND jsonb_array_length(bivy) = 7;

UPDATE routes SET bivy = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(bivy) AS elem
  WHERE elem->>'name' = 'Mount Teneriffe and the Mount Si conservation area, no overnight'
)
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND jsonb_array_length(bivy) = 7;
