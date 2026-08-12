-- WA alpine route audit -- batch 43 (pass 1)
-- Peaks checked: Argonaut Peak (South Face), Pernod Spire (South Face), Concord Tower (South
-- Face, South Face Center), Kangaroo Temple (South Face), Inspiration Peak (South Face), Guye
-- Peak (South Gully/South Spur, South Rib), Mount Stuart (South Headwall), Luna Peak (South
-- Ridge).
-- See audits/wa-alpine-audit-log.md for the full writeup of this batch, including items
-- flagged for human review that are NOT included in this file.

-- =========================================================================
-- Argonaut Peak
-- =========================================================================

-- wa_south_face_12: top-level `permit` claimed this route sits inside the Enchantment Permit
-- Area lottery boundary (quota permit, Recreation.gov lottery for overnight stays), directly
-- contradicting this same row's own access.fees/access.notes/access.permit fields, which
-- already correctly state the Teanaway-side Beverly Creek/Ingalls Creek approach sits entirely
-- outside the Enchantment lottery boundary and needs only a free self-issue wilderness permit.
UPDATE routes
SET permit = 'Free self-issued USFS wilderness permit at the trailhead -- no quota, no lottery. This Teanaway-side (Beverly Creek/Ingalls Creek) approach sits entirely outside the Enchantment Permit Area boundary, which covers only the Stuart Lake/Colchuck/Snow Lakes/Eightmile/Core zones reached via the Icicle Creek corridor.',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: top-level permit corrected -- wrongly claimed an Enchantment Permit Area lottery requirement, contradicting this row''s own access.fees/access.notes/access.permit fields, which already correctly state no lottery applies to this Teanaway-side approach.'
WHERE id = 'wa_south_face_12'
  AND permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.';

-- wa_south_face_12: loss_ft (1400) contradicted this row's own itinerary day-by-day sums
-- (day1 lossFt 1350 + day2 lossFt 4807 = 6157), which are roughly symmetric with gain_ft
-- (2000+4257=6257) as expected for a car-to-car out-and-back. Aligned both fields to the
-- itinerary's own totals.
UPDATE routes
SET gain_ft = 6257,
    loss_ft = 6157,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gain_ft corrected from 6000 to 6257 and loss_ft corrected from 1400 to 6157, to match this row''s own itinerary day-by-day gain/loss sums for this car-to-car out-and-back trip.'
WHERE id = 'wa_south_face_12'
  AND gain_ft = 6000 AND loss_ft = 1400;

-- =========================================================================
-- Pernod Spire
-- =========================================================================

-- wa_south_face_2: alpine_grade held "UIAA VI" -- a UIAA rock-difficulty grade (roughly
-- 5.9-5.10 YDS), not a value on the French adjectival alpine-commitment scale
-- (F/PD/AD/D/TD/ED) this column is documented to hold per
-- supabase/migrations/0006_composite_grades.sql. Unlike the many DB-wide cases where
-- alpine_grade merely duplicates the NCCS commitment grade (left flagged elsewhere in this
-- audit rather than guessed), this is a different grading system entirely stuffed into the
-- wrong column, with no French-scale value findable for this short (2-pitch) route. Cleared
-- rather than guessed, matching the sibling wa_south_face_12 row, which already leaves this
-- column null.
UPDATE routes
SET alpine_grade = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: alpine_grade cleared -- held "UIAA VI", a rock-difficulty grade from the wrong grading system entirely (not the French adjectival scale this column is documented to hold), with no French-scale value found for this route.'
WHERE id = 'wa_south_face_2'
  AND alpine_grade = 'UIAA VI';

-- wa_south_face_2: waypoints[4] ("SR-20 Burgundy Col / Wine Spires pullout") and the matching
-- gpx[4] point are a leaked internal-research-session artifact, not real trail beta -- the
-- note text ("Confirms existing DB entry's location/description; minor coordinate refinement
-- based on Cutthroat Lake Rd junction cross-reference.") reads as a research agent's internal
-- reasoning that leaked into the data, and unlike every other waypoint on this row it carries
-- no elev/distMi. Its coordinates sit ~0.6 km from the row's own legitimate "Early Winters
-- Creek crossing" waypoint (index 0), reinforcing it's a stray duplicate rather than new
-- information. Removed both array entries.
UPDATE routes
SET waypoints = waypoints - 4,
    gpx = gpx - 4,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: removed waypoints[4]/gpx[4] ("SR-20 Burgundy Col / Wine Spires pullout") -- a leaked internal-research-session artifact (its note text is an AI research agent''s internal reasoning, not trail beta), missing elev/distMi unlike every other waypoint on this row.'
WHERE id = 'wa_south_face_2'
  AND waypoints->4->>'name' = 'SR-20 Burgundy Col / Wine Spires pullout'
  AND jsonb_array_length(waypoints) = 6;

-- wa_south_face_2: the summit waypoint (index 4 after the removal above) had no elev field,
-- unlike every other Summit-type waypoint in this dataset. Filled from this row's own
-- already-verified high_point_ft/areas.elevation_ft (8507 ft, both already agree).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{4,elev}', '8507', true),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: filled waypoints[4] (Pernod Spire summit) elev = 8507, matching this row''s own high_point_ft and the parent area''s elevation_ft (both already 8507).'
WHERE id = 'wa_south_face_2'
  AND waypoints->4->>'name' = 'Pernod Spire summit'
  AND NOT (waypoints->4 ? 'elev');

-- wa_south_face_2: rope_type ("single") contradicted this row's own gear ("two 60m ropes") and
-- rappels/descent/descent_text fields, all of which specify double-rope (60m) rappels.
UPDATE routes
SET rope_type = 'double',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: rope_type corrected from "single" to "double" to match this row''s own gear list ("two 60m ropes") and rappels/descent/descent_text fields, all of which specify double-rope rappels.'
WHERE id = 'wa_south_face_2'
  AND rope_type = 'single';

-- wa_south_face_2: sling_rack.cams ("0.3-3 in") undersold the rack -- this row's own gear/
-- detailed_rack fields explicitly call for a #4 Camalot (4 in) alongside the #3, so the
-- summary range should extend to 4 in.
UPDATE routes
SET sling_rack = jsonb_set(sling_rack, '{cams}', '"0.3-4 in"', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: sling_rack.cams corrected from "0.3-3 in" to "0.3-4 in" to match this row''s own gear/detailed_rack fields, which explicitly call for a #4 Camalot.'
WHERE id = 'wa_south_face_2'
  AND sling_rack->>'cams' = '0.3-3 in';

-- =========================================================================
-- Kangaroo Temple
-- =========================================================================

-- wa_south_face_4: overview called this route "An eight-pitch... line," contradicting this
-- same row's own pitches (7), pitch_detail array (7 entries, P1-P7), and rope_note ("7-pitch
-- III-IV 5.8 route").
UPDATE routes
SET overview = 'A seven-pitch, III 5.8 line up Kangaroo Temple''s South Face -- the longest and most sustained of the peak''s moderate routes, with variable rock quality and genuine route-finding challenge.',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: overview corrected from "eight-pitch" to "seven-pitch" to match this row''s own pitches (7), pitch_detail (7 entries), and rope_note ("7-pitch").'
WHERE id = 'wa_south_face_4'
  AND overview = 'An eight-pitch, III 5.8 line up Kangaroo Temple''s South Face -- the longest and most sustained of the peak''s moderate routes, with variable rock quality and genuine route-finding challenge.';

-- wa_south_face_4: rope_note claimed the descent uses "chains atop North Face and P1 belay
-- chains," directly contradicted by this same row's own hazards field, which explicitly says
-- the same descent rappel reaches "hidden 3-bolt anchors (no chains)."
UPDATE routes
SET rope_note = '7-pitch III-IV 5.8 route up slabs/cracks/chimneys (also referenced as Southwest Face). Descent via hidden 3-bolt anchors (no chains) atop the North Face and at the P1 belay, 3 single-rope raps with a 60m rope.',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: rope_note corrected -- claimed descent chains "atop North Face and P1 belay," contradicted by this row''s own hazards field, which says the same anchors are 3-bolt with no chains.'
WHERE id = 'wa_south_face_4'
  AND rope_note = '7-pitch III-IV 5.8 route up slabs/cracks/chimneys (also referenced as Southwest Face). Descent via chains atop North Face and P1 belay chains, 3 single-rope raps with a 60m rope.';

-- =========================================================================
-- Inspiration Peak
-- =========================================================================

-- wa_south_face_5: fa gave a confident, specific date ("June 18, 1970"), but this row's own
-- data_quality.gaps field already documents the actual research finding in detail: AAJ's 1970
-- volume carries Mike Heath's own first-person FA account dated "June 18" but never states a
-- year, and per AAJ's convention of reporting the prior season's climbs the ascent likely
-- happened June 18, 1969 -- a conclusion the gaps note explicitly says should leave fa as
-- "unknown" pending a second independent source, which never happened; the fa column itself
-- was never updated to match. Applying the row's own already-completed research rather than
-- asserting the unconfirmed 1970 date.
UPDATE routes
SET fa = 'Bill Sumner and Mike Heath, June 18 (year unconfirmed -- Heath''s own 1970 AAJ account never states a year; per AAJ''s prior-season convention likely 1969, not independently corroborated)',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: fa corrected -- was asserted as "June 18, 1970" despite this row''s own data_quality.gaps field already concluding the year is unconfirmed (AAJ''s account never states one) and explicitly saying fa should be left unresolved pending a second source; that conclusion was never applied to the fa column itself.'
WHERE id = 'wa_south_face_5'
  AND fa = 'Bill Sumner and Mike Heath, June 18, 1970';

-- =========================================================================
-- Guye Peak
-- =========================================================================

-- wa_south_gully_south_spur / wa_south_rib: both rows' access._raw block is a stale
-- failed-research placeholder ("Area name not found in standard Washington climbing databases
-- or USFS/NPS resources" / every sub-field "Unknown"), directly contradicted by the sibling
-- access.* fields on each same row, which already carry real, corroborated data (Mt.
-- Baker-Snoqualmie NF / Snoqualmie Ranger District land manager, Alpental/Snow Lake Trailhead
-- fee structure) from a later enrichment pass that never cleared out the stale _raw block --
-- same pattern already fixed on wa_blood_sport (same peak) in batch 3.
UPDATE routes SET access = jsonb_set(
  access, '{_raw}',
  '{"note": "Superseded by the sibling access.* fields on this row (added in a later enrichment pass) -- land_manager, parking_pass, and rules there are the current researched values. This _raw block is kept only as a record of an earlier failed auto-lookup, same pattern already fixed on this peak''s wa_blood_sport route in batch 3."}'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access._raw replaced -- was a stale "area not found" failed-research placeholder contradicting this row''s own populated access.* fields, same leaked-artifact pattern already fixed on wa_blood_sport (batch 3).'
WHERE id = 'wa_south_gully_south_spur'
  AND access->'_raw'->>'note' = 'Area name not found in standard Washington climbing databases or USFS/NPS resources';

UPDATE routes SET access = jsonb_set(
  access, '{_raw}',
  '{"note": "Superseded by the sibling access.* fields on this row (added in a later enrichment pass) -- land_manager, parking_pass, and rules there are the current researched values. This _raw block is kept only as a record of an earlier failed auto-lookup, same pattern already fixed on this peak''s wa_blood_sport route in batch 3."}'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access._raw replaced -- was a stale "area not found" failed-research placeholder contradicting this row''s own populated access.* fields, same leaked-artifact pattern already fixed on wa_blood_sport (batch 3).'
WHERE id = 'wa_south_rib'
  AND access->'_raw'->>'note' = 'Area name not found in standard Washington climbing databases or USFS/NPS resources';

-- =========================================================================
-- Mount Stuart
-- =========================================================================

-- wa_south_headwall: permit and access.notes/access.rules/access.group_limit all describe
-- Enchantment Permit Area quota rules (8-person cap, single previously-impacted campsite,
-- non-transferable permits, advance-booking lottery). Confirmed externally (multiple
-- independent trip-report/guide sources) that no Enchantment permit applies to any south-side
-- Mount Stuart route -- the Enchantment lottery covers only the Stuart Lake/Colchuck/Snow
-- Lakes zones reached via Icicle Creek Road, not the Longs Pass/Ingalls Way (Teanaway-side)
-- approach this route's own `approach` field describes. Standard Alpine Lakes Wilderness rules
-- (free self-issue permit, 12-person group limit) apply instead, matching the same distinction
-- already correctly documented on this batch's wa_south_face_12 (Argonaut Peak) row.
UPDATE routes SET
  permit = 'Free self-issue USFS wilderness permit at the trailhead -- no quota, no lottery. The Longs Pass/Ingalls Way (Teanaway-side) approach used by this route does not enter the Enchantment Permit Area''s quota boundary, which covers only the Stuart Lake/Colchuck/Snow Lakes zones reached via Icicle Creek Road.',
  access = access
    || jsonb_build_object(
      'notes', 'Northwest Forest Pass required ($5/day or $30/annual) once the Teanaway River Road is open. Free self-issuing wilderness permits at the trailhead -- no Enchantment-lottery quota applies to this south-side (Longs Pass/Ingalls Way) approach. Limited parking; full in summer. Teanaway River Road may close until June. Located in Okanogan-Wenatchee National Forest.',
      'rules', 'Standard USFS Alpine Lakes Wilderness group-size limit of 12 (people + stock). Bear-resistant food storage mandatory forest-wide.',
      'permit', 'Free self-issue wilderness permit at the trailhead -- no lottery',
      'group_limit', 12
    ),
  corrections = COALESCE(corrections, '') || ' 2026-08-05: permit and access.notes/rules/group_limit corrected -- wrongly carried Enchantment Permit Area quota rules (8-person cap, single site, non-transferable, lottery), which do not apply to this route''s actual Longs Pass/Ingalls Way south-side approach; replaced with standard Alpine Lakes Wilderness rules (free self-issue permit, 12-person group limit), matching the same distinction already documented on wa_south_face_12 (Argonaut Peak).'
WHERE id = 'wa_south_headwall'
  AND permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.'
  AND access->>'group_limit' = '8';

-- wa_south_headwall: waypoints[1] was named "Ingalls Pass" at elev 6457, but this row's own
-- `approach` field says the route is reached via "Longs Pass Trail #1229," not Ingalls Pass
-- Trail (a different trail from the same trailhead area leading to Lake Ingalls, an unrelated
-- basin). Multiple independent external sources (guide/trip-report descriptions of this exact
-- South Headwall/Cascadian approach) confirm the route goes over Longs Pass at ~6,200 ft, and
-- the stored 6457 ft matches Ingalls Pass's real elevation (~6,500 ft per the same sources),
-- not Longs Pass's -- the waypoint's name and elevation were swapped for the wrong pass.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{1,name}', '"Longs Pass"', false),
      '{1,elev}', '6200', false
    ),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: waypoints[1] corrected from "Ingalls Pass" (elev 6457, that pass''s real elevation but the wrong pass -- it leads to Lake Ingalls, an unrelated basin) to "Longs Pass" (elev 6200), matching this row''s own approach text ("Longs Pass Trail #1229") and external sources for the real South Headwall/Cascadian Couloir approach.'
WHERE id = 'wa_south_headwall'
  AND waypoints->1->>'name' = 'Ingalls Pass'
  AND (waypoints->1->>'elev')::numeric = 6457;

-- wa_south_headwall: watch_out was stored as one newline-joined string instead of a JSON
-- array (same rendering bug found and fixed repeatedly elsewhere in this DB -- lib/db.js's
-- toArr() only splits on commas, not newlines, so the app renders all items as a single
-- run-on bullet). Converted to a proper array. Also dropped "Descent involves multiple
-- rappels" -- contradicted by this same row's own descent/descent_text fields (a walk-down via
-- the Cascadian Couloir) and rappels field (null); no rappelling is documented anywhere else
-- on this row.
UPDATE routes
SET watch_out = '["Sustained 5.7 climbing on south-facing vertical terrain", "Weather exposure creates hazard; sun exposure can accelerate ice melt", "Route-finding complexity on headwall", "Mixed terrain with loose rock throughout"]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: watch_out converted from a newline-joined string to a proper JSON array (rendering bug -- lib/db.js''s toArr() only splits on commas). Also dropped "Descent involves multiple rappels," contradicted by this row''s own descent/descent_text (walk-down via Cascadian Couloir) and null rappels field.'
WHERE id = 'wa_south_headwall'
  AND watch_out = '"Sustained 5.7 climbing on south-facing vertical terrain\nWeather exposure creates hazard; sun exposure can accelerate ice melt\nRoute-finding complexity on headwall\nMixed terrain with loose rock throughout\nDescent involves multiple rappels"'::jsonb;

-- =========================================================================
-- Luna Peak
-- =========================================================================

-- wa_south_ridge_2: gain_ft (8600) / loss_ft (8009) were asymmetric and didn't match this
-- row's own itinerary day-by-day sums (day1 gain 3400/loss 700 + day2 gain 4600/loss 4600 +
-- day3 gain 700/loss 3400 = 8700/8700 both ways), as expected for a true out-and-back trip.
-- Aligned both fields to the itinerary's own totals.
UPDATE routes
SET gain_ft = 8700,
    loss_ft = 8700,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gain_ft corrected from 8600 to 8700 and loss_ft corrected from 8009 to 8700, to match this row''s own itinerary day-by-day gain/loss sums (which are already symmetric at 8700/8700) for this out-and-back trip.'
WHERE id = 'wa_south_ridge_2'
  AND gain_ft = 8600 AND loss_ft = 8009;

-- wa_south_ridge_2: dist_km (16.1) doesn't match this row's own itinerary, whose three days
-- sum to 48 miles round trip (19+10+19), nor its own `approach` text, which independently
-- states "the ~77 km on-file round-trip distance reflects the long lakeshore/Big Beaver Trail
-- miles plus off-trail basin approach." Per this app's documented one-way dist_km convention
-- (CLAUDE.md -- the UI doubles dist_km for round-trip display), the correct one-way value is
-- half of 48 miles (24 mi = 38.62 km), not 16.1.
UPDATE routes
SET dist_km = 38.62,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: dist_km corrected from 16.1 to 38.62 (one-way) -- this row''s own itinerary sums to 48 miles round trip and its own approach text independently states "~77 km round-trip," matching 38.62 km one-way under this app''s distKm*2 display convention; 16.1 was off by more than 2x.'
WHERE id = 'wa_south_ridge_2'
  AND dist_km = 16.1;

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_south_face_3 (Concord Tower, South Face): FA fourth-climber name "Bruce Schuler"
--    could not be independently confirmed or refuted (primary sources 403'd); trailhead/summit
--    elevation dualities (5,200 vs 5,400 ft; 7,560 vs 7,611/7,612 ft) are genuine real-world
--    source splits already explained by the area's own blurb, not DB self-contradictions.
--  - wa_south_face_center (Concord Tower, South Face Center): fa is currently "Not Known,"
--    cleared by a prior pass whose itinerary.sourceNote says the "Fielding & Tarver, 1966"
--    attribution "could not be verified anywhere and appears to be a mix-up with a different
--    Washington Pass route." A fresh search this batch found consistent snippet-level
--    corroboration for exactly that FA, matching this row's own overview/beta almost verbatim
--    -- but every primary source (SummitPost et al.) 403'd, so this rests on search snippets,
--    not a directly-verified source. Given a prior pass already investigated and reversed this
--    same fact, left flagged for a human with direct SummitPost/Mountain Project access rather
--    than reversed again on secondary evidence.
--  - wa_south_gully_south_spur (Guye Peak): pitches (4)/grade ("Easy 5th")/length_m (457,
--    matching only the longer ~1,500 ft winter-traverse variant per this row's own pitch_detail
--    text) mix data from the route's two seasonal variants (summer scramble vs. winter mixed
--    line) inconsistently across fields -- needs a human decision on how to represent both
--    variants, not a single field patch.
--  - wa_south_gully_south_spur / wa_south_rib (Guye Peak): whether Alpine Lakes Wilderness'
--    surveyed boundary actually reaches these two short roadside-adjacent lines (top-level
--    `permit` is null on both, `access.permit`/`access.passRequired` say "Unknown" despite
--    Guye Peak being wilderness-listed) is unresolved -- needs an authoritative USFS boundary
--    map, not guessed from conflicting internal fields.
--  - wa_south_gully_south_spur / wa_south_rib / wa_south_headwall / wa_south_ridge_2:
--    alpine_grade duplicates the NCCS commitment grade ("II"/"Grade II") rather than holding a
--    French adjectival value (F/PD/AD/D/TD/ED per 0006_composite_grades.sql) -- same
--    DB-wide-recurring ambiguity flagged unfixed in many prior batches (9/19/21/23/25/29/31/32);
--    no source found assigning any of these moderate PNW lines a real French-scale grade, so
--    left as-is rather than guessed, consistent with precedent.
--  - wa_south_headwall (Mount Stuart): length_m and loss_ft (independent of the itinerary-based
--    fix above -- this route has no itinerary object) remain null; dist_km (9.2, implying 5.7
--    mi one-way) doesn't match the route's own waypoint list (summit at distMi 7.5) -- no
--    external source found to resolve either gap.
--  - wa_south_face_5 (Inspiration Peak): pitches (8)/length_m (305, ~1,000 ft) are corroborated
--    by Mike Heath's own 1970 AAJ first-ascent account ("this impressive 1000-foot face," ~8
--    leads), but overview/beta/itinerary all separately describe a compressed 4-pitch, ~600 ft
--    version -- a real internal inconsistency needing a human prose rewrite across multiple
--    fields, not a single value patch.
-- =========================================================================

-- Verify afterward:
select id, permit, gain_ft, loss_ft from routes where id = 'wa_south_face_12';
select id, alpine_grade, jsonb_array_length(waypoints) as n_waypoints, rope_type, sling_rack from routes where id = 'wa_south_face_2';
select id, overview, rope_note from routes where id = 'wa_south_face_4';
select id, fa from routes where id = 'wa_south_face_5';
select id, access->'_raw' as raw from routes where id in ('wa_south_gully_south_spur', 'wa_south_rib');
select id, permit, access->'group_limit' as group_limit, waypoints->1 as waypoint_1, watch_out from routes where id = 'wa_south_headwall';
select id, gain_ft, loss_ft, dist_km from routes where id = 'wa_south_ridge_2';
